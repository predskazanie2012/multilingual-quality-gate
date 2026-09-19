// Offline showcase aggregation. These rules are illustrative, not a production policy.
export const DIMENSIONS = Object.freeze(['accuracy', 'fluency', 'terminology']);

function incomplete(errors, reviewers = []) {
  return {
    status: 'incomplete',
    scores: null,
    overallScore: null,
    largestSpread: null,
    reviewers,
    findings: [],
    errors,
  };
}

function validateReview(name, result) {
  if (!result || typeof result !== 'object' || !result.scores) {
    throw new Error('The reviewer did not return scores.');
  }

  const scores = {};
  for (const dimension of DIMENSIONS) {
    const score = result.scores[dimension];
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      throw new Error(`The ${dimension} score must be a finite number from 0 to 100.`);
    }
    scores[dimension] = score;
  }

  if (!Array.isArray(result.findings)) {
    throw new Error('The reviewer did not return a findings array.');
  }

  const fields = ['id', 'category', 'severity', 'title', 'detail', 'suggestion'];
  const findings = Array.from(result.findings, (finding) => {
    const copy = {};
    for (const field of fields) {
      if (!finding || typeof finding[field] !== 'string' || !finding[field].trim()) {
        throw new Error(`Each finding must include a non-empty ${field}.`);
      }
      copy[field] = finding[field];
    }
    return copy;
  });

  return { name, scores, findings };
}

/**
 * Evaluate independent reviewers concurrently, then keep the lowest score in
 * each dimension. All three reviewers must succeed before any aggregate exists.
 * Reviewers receive separate frozen copies of the two input strings.
 */
export async function evaluateCouncil(input, evaluators) {
  let snapshot;
  let council;
  try {
    snapshot = { source: input?.source, translation: input?.translation };
    if (typeof snapshot.source !== 'string' || !snapshot.source.trim()
      || typeof snapshot.translation !== 'string' || !snapshot.translation.trim()) {
      throw new Error('Source and translation must be non-empty strings.');
    }

    if (!Array.isArray(evaluators) || evaluators.length !== 3) {
      throw new Error('This demonstration requires exactly three reviewers.');
    }
    council = Array.from(evaluators, (evaluator) => {
      if (!evaluator || typeof evaluator.name !== 'string' || !evaluator.name.trim()
        || typeof evaluator.evaluate !== 'function') {
        throw new Error('Each reviewer must have a name and an evaluate function.');
      }
      return { name: evaluator.name.trim(), evaluate: evaluator.evaluate, owner: evaluator };
    });
    if (new Set(council.map(({ name }) => name)).size !== council.length) {
      throw new Error('Each reviewer must have a unique name.');
    }
  } catch (error) {
    return incomplete([{
      reviewer: 'Council',
      message: error instanceof Error ? error.message : 'The council input is invalid.',
    }]);
  }

  const outcomes = await Promise.all(council.map(async ({ name, evaluate, owner }) => {
    try {
      const result = await evaluate.call(owner, Object.freeze({ ...snapshot }));
      return { reviewer: validateReview(name, result) };
    } catch (error) {
      return {
        error: {
          reviewer: name,
          message: error instanceof Error ? error.message : 'The reviewer failed.',
        },
      };
    }
  }));

  const reviewers = outcomes.filter(({ reviewer }) => reviewer).map(({ reviewer }) => reviewer);
  const errors = outcomes.filter(({ error }) => error).map(({ error }) => error);
  if (errors.length) return incomplete(errors, reviewers);

  const scores = {};
  let largestSpread = null;
  for (const dimension of DIMENSIONS) {
    const values = reviewers.map((reviewer) => reviewer.scores[dimension]);
    scores[dimension] = Math.min(...values);
    const value = Math.max(...values) - scores[dimension];
    // The declared dimension order gives stable results when spreads tie.
    if (!largestSpread || value > largestSpread.value) {
      largestSpread = { dimension, value };
    }
  }

  return {
    status: 'complete',
    scores,
    overallScore: Math.min(...Object.values(scores)),
    largestSpread,
    reviewers,
    findings: reviewers.flatMap(({ findings }) => findings),
  };
}
