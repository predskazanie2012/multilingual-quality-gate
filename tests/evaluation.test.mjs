import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCouncil } from '../demo/evaluation.mjs';
import { createMockEvaluators } from '../demo/mock-evaluators.mjs';
import { example } from '../demo/fixture.mjs';

const input = { source: 'Synthetic source.', translation: 'Synthetic translation.' };
const scores = { accuracy: 90, fluency: 80, terminology: 85 };
const finding = {
  id: 'synthetic-finding',
  category: 'accuracy',
  severity: 'high',
  title: 'Synthetic finding',
  detail: 'A synthetic detail.',
  suggestion: 'A synthetic suggestion.',
};
const reviewers = () => ['A', 'B', 'C'].map((name) => ({
  name,
  evaluate: async () => ({ scores: { ...scores }, findings: [] }),
}));

test('complete results retain conservative dimension minima and largest disagreement', async () => {
  const council = reviewers();
  council[0].evaluate = async () => ({
    scores: { accuracy: 95, fluency: 70, terminology: 99 }, findings: [finding],
  });
  council[1].evaluate = async () => ({
    scores: { accuracy: 60, fluency: 85, terminology: 80 }, findings: [],
  });
  const result = await evaluateCouncil(input, council);
  assert.equal(result.status, 'complete');
  assert.deepEqual(result.scores, { accuracy: 60, fluency: 70, terminology: 80 });
  assert.equal(result.overallScore, 60);
  assert.deepEqual(result.largestSpread, { dimension: 'accuracy', value: 35 });
  assert.deepEqual(result.reviewers.map(({ name }) => name), ['A', 'B', 'C']);
  assert.deepEqual(result.findings, [finding]);
});

test('reviewers start independently before any reviewer finishes', async () => {
  const started = [];
  const finish = [];
  const council = reviewers().map(({ name }) => ({
    name,
    evaluate() {
      started.push(name);
      return new Promise((resolve) => finish.push(resolve));
    },
  }));
  const pending = evaluateCouncil(input, council);
  assert.deepEqual(started, ['A', 'B', 'C']);
  for (const resolve of finish.reverse()) resolve({ scores: { ...scores }, findings: [] });
  assert.equal((await pending).status, 'complete');
});

test('one failed reviewer closes aggregation while retaining successful review details', async () => {
  const council = reviewers();
  council[1].evaluate = async () => { throw new Error('Synthetic reviewer unavailable.'); };
  const result = await evaluateCouncil(input, council);
  assert.equal(result.status, 'incomplete');
  assert.equal(result.scores, null);
  assert.equal(result.overallScore, null);
  assert.equal(result.largestSpread, null);
  assert.deepEqual(result.findings, []);
  assert.equal(result.reviewers.length, 2);
  assert.deepEqual(result.errors, [{ reviewer: 'B', message: 'Synthetic reviewer unavailable.' }]);
});

test('missing, sparse, and duplicate reviewers cannot produce a complete council', async () => {
  const sparse = reviewers();
  delete sparse[1];
  for (const council of [[], sparse, reviewers().slice(0, 2), [...reviewers(), reviewers()[0]],
    [reviewers()[0], reviewers()[0], reviewers()[2]]]) {
    const result = await evaluateCouncil(input, council);
    assert.equal(result.status, 'incomplete');
    assert.equal(result.overallScore, null);
    assert.ok(result.errors.length > 0);
  }
});

test('each score must be present, numeric, finite, and in range', async () => {
  for (const value of [undefined, null, NaN, Infinity, -Infinity, -1, 101, '90']) {
    const council = reviewers();
    council[1].evaluate = async () => ({ scores: { ...scores, accuracy: value }, findings: [] });
    const result = await evaluateCouncil(input, council);
    assert.equal(result.status, 'incomplete', `unexpected acceptance: ${String(value)}`);
    assert.equal(result.scores, null);
    assert.equal(result.overallScore, null);
    assert.equal(result.largestSpread, null);
    assert.deepEqual(result.findings, []);
  }
  const council = reviewers();
  council[0].evaluate = async () => ({ scores: { accuracy: 0, fluency: 100, terminology: 99.5 }, findings: [] });
  assert.equal((await evaluateCouncil(input, council)).status, 'complete');
});

test('malformed findings also prevent a complete result', async () => {
  for (const findings of [undefined, null, {}, Array(1), [{ ...finding, suggestion: '' }]]) {
    const council = reviewers();
    council[0].evaluate = async () => ({ scores: { ...scores }, findings });
    assert.equal((await evaluateCouncil(input, council)).status, 'incomplete');
  }
});

test('each reviewer gets a separate immutable input and returned data is copied', async () => {
  const original = { ...input };
  const seen = [];
  const response = { scores: { ...scores }, findings: [{ ...finding }] };
  const council = reviewers().map(({ name }) => ({
    name,
    async evaluate(snapshot) {
      seen.push(snapshot);
      assert.notEqual(snapshot, original);
      assert.ok(Object.isFrozen(snapshot));
      assert.throws(() => { snapshot.source = 'Changed'; }, TypeError);
      return response;
    },
  }));
  const result = await evaluateCouncil(original, council);
  assert.equal(result.status, 'complete');
  assert.deepEqual(original, input);
  assert.equal(new Set(seen).size, 3);
  response.scores.accuracy = 0;
  response.findings[0].title = 'Changed';
  assert.equal(result.reviewers[0].scores.accuracy, 90);
  assert.equal(result.findings[0].title, finding.title);
});

test('synthetic before and after fixtures have deterministic improvement', async () => {
  const beforeInput = { source: example.source, translation: example.translation };
  const afterInput = { source: example.source, translation: example.revision };
  const before = await evaluateCouncil(beforeInput, createMockEvaluators());
  const repeated = await evaluateCouncil(beforeInput, createMockEvaluators());
  const after = await evaluateCouncil(afterInput, createMockEvaluators());
  assert.deepEqual(before, repeated);
  assert.equal(before.status, 'complete');
  assert.deepEqual(before.scores, { accuracy: 38, fluency: 75, terminology: 74 });
  assert.equal(before.overallScore, 38);
  assert.deepEqual(before.largestSpread, { dimension: 'accuracy', value: 6 });
  assert.deepEqual(new Set(before.findings.map(({ id }) => id)),
    new Set(['lesson-day', 'subtitle-count', 'account-access', 'phrasing']));
  assert.equal(after.status, 'complete');
  assert.deepEqual(after.scores, { accuracy: 92, fluency: 89, terminology: 90 });
  assert.equal(after.overallScore, 89);
  assert.deepEqual(after.largestSpread, { dimension: 'accuracy', value: 3 });
  assert.deepEqual(after.findings, []);
  for (const dimension of Object.keys(before.scores)) {
    assert.ok(after.scores[dimension] > before.scores[dimension]);
  }
});

test('mock evaluators reject unsupported text instead of inventing an assessment', async () => {
  const result = await evaluateCouncil(input, createMockEvaluators());
  assert.equal(result.status, 'incomplete');
  assert.equal(result.errors.length, 3);
  assert.equal(result.overallScore, null);
  assert.deepEqual(result.findings, []);
});

test('empty or malformed input fails before invoking reviewers', async () => {
  let calls = 0;
  const council = reviewers().map(({ name }) => ({ name, evaluate: () => { calls += 1; } }));
  for (const value of [null, {}, { source: '', translation: 'text' }, { source: 'text', translation: '  ' }]) {
    assert.equal((await evaluateCouncil(value, council)).status, 'incomplete');
  }
  assert.equal(calls, 0);
});
