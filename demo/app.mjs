import { example } from './fixture.mjs';
import { evaluateCouncil } from './evaluation.mjs';
import { createMockEvaluators } from './mock-evaluators.mjs';

const byId = (id) => document.getElementById(id);
const dimensionNames = Object.freeze({ accuracy: 'Meaning', fluency: 'Naturalness', terminology: 'Terminology' });
const tabs = [byId('translation-tab'), byId('revision-tab')];
const results = new Map();
const evaluators = createMockEvaluators();
let selectedVersion = 'translation';
let activeRun = 0;
let pending = false;

// All content is assembled as text nodes. There is no user-supplied or remote input.
function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function makeDimensions(scores) {
  const container = element('div', 'dimensions');
  for (const [dimension, name] of Object.entries(dimensionNames)) {
    const value = scores?.[dimension];
    const row = element('div', `dimension ${dimension}${value !== undefined && value < 60 ? ' low' : ''}`);
    const label = element('div', 'dimension-label');
    label.append(element('span', '', name), element('strong', '', value === undefined ? '—' : `${value} / 100`));
    const meter = element('progress');
    meter.max = 100;
    meter.value = value ?? 0;
    meter.setAttribute('aria-label', `${name}: ${value === undefined ? 'not reviewed' : `${value} out of 100, mock score`}`);
    row.append(label, meter);
    container.append(row);
  }
  return container;
}

function renderUnreviewed() {
  const score = element('div', 'empty-score');
  score.append(element('p', 'score-number', '—'), element('p', 'score-description muted', 'Ready for a closer look'), makeDimensions());
  byId('score-content').replaceChildren(score);
  const note = element('div', 'empty-findings');
  const icon = element('div', 'empty-symbol', '◎');
  icon.setAttribute('aria-hidden', 'true');
  const copy = element('div');
  copy.append(element('h4', '', 'Three perspectives. One sample.'), element('p', '', 'Check this sample to reveal the hand-authored reviewer scores and notes. Compare each finding with the source and make your own assessment.'));
  const preview = element('div', 'review-preview');
  for (const name of Object.values(dimensionNames)) preview.append(element('span', '', name));
  copy.append(preview);
  note.append(icon, copy);
  byId('findings-content').replaceChildren(note);
  byId('findings-count').textContent = '—';
  const ready = element('div', 'reviewer-ready');
  ready.append(element('span', '', 'Reviewer A · Reviewer B · Reviewer C'), element('span', '', 'Deterministic mock assessments · run locally'));
  byId('reviewer-content').replaceChildren(ready);
}

function renderIncomplete(result) {
  const score = element('div', 'error-panel');
  score.append(element('h4', '', 'Review incomplete'), element('p', '', 'A complete, valid result is required from every reviewer. No aggregate score is shown.'));
  byId('score-content').replaceChildren(score);
  const notes = element('div', 'error-panel');
  notes.append(element('p', '', 'The mock review could not be completed. Reset the example and try again.'));
  byId('findings-content').replaceChildren(notes);
  byId('findings-count').textContent = '—';
  byId('reviewer-content').replaceChildren();
}

function renderFindings(findings) {
  const uniqueFindings = [...new Map(findings.map((finding) => [finding.id, finding])).values()];
  byId('findings-count').textContent = String(uniqueFindings.length);
  if (!uniqueFindings.length) {
    const note = element('div', 'empty-findings success-findings');
    const icon = element('div', 'empty-symbol', '✓');
    icon.setAttribute('aria-hidden', 'true');
    const copy = element('div');
    copy.append(element('h4', '', 'The three factual issues are addressed'), element('p', '', 'The revised sample restores the day, subtitle count, and account requirement. These mock reviewers have no further notes. Read both versions yourself before drawing a conclusion.'));
    note.append(icon, copy);
    byId('findings-content').replaceChildren(note);
    return;
  }
  const list = element('ul', 'findings-list');
  for (const finding of uniqueFindings) {
    const item = element('li', 'finding');
    const heading = element('div', 'finding-title');
    const dot = element('span', `finding-dot ${finding.severity}`);
    dot.setAttribute('aria-hidden', 'true');
    heading.append(dot, element('h4', '', finding.title));
    item.append(heading, element('p', '', finding.detail));
    if (finding.suggestion) item.append(element('p', 'finding-suggestion', finding.suggestion));
    list.append(item);
  }
  byId('findings-content').replaceChildren(list);
}

function renderReviewers(reviewers) {
  const wrap = element('div', 'reviewer-table-wrap');
  const table = element('table', 'reviewer-table');
  table.append(element('caption', '', 'Individual mock scores · differences are intentionally hand-authored'));
  const head = element('thead');
  const headRow = element('tr');
  for (const title of ['Reviewer', ...Object.values(dimensionNames)]) {
    const cell = element('th', '', title);
    cell.scope = 'col';
    headRow.append(cell);
  }
  head.append(headRow);
  const body = element('tbody');
  for (const [index, reviewer] of reviewers.entries()) {
    const row = element('tr');
    const name = element('th');
    name.scope = 'row';
    const label = element('span', 'reviewer-name');
    const avatar = element('span', 'reviewer-avatar', String.fromCharCode(65 + index));
    avatar.setAttribute('aria-hidden', 'true');
    label.append(avatar, document.createTextNode(reviewer.name));
    name.append(label);
    row.append(name);
    for (const dimension of Object.keys(dimensionNames)) row.append(element('td', '', String(reviewer.scores[dimension])));
    body.append(row);
  }
  table.append(head, body);
  wrap.append(table);
  byId('reviewer-content').replaceChildren(wrap);
}

function renderResults() {
  const result = results.get(selectedVersion);
  if (!result) return renderUnreviewed();
  if (result.status !== 'complete') return renderIncomplete(result);
  const score = element('div', `score-result ${result.overallScore < 60 ? 'low' : 'high'}`);
  const number = element('p', 'score-number', String(result.overallScore));
  number.append(element('span', 'score-total', '/ 100'));
  const label = selectedVersion === 'translation' ? 'Needs a factual revision' : 'Ready for your own assessment';
  score.append(number, element('p', 'score-description', label), makeDimensions(result.scores));
  const spread = element('p', 'spread-note');
  spread.append(element('span', '', 'Largest reviewer spread'), element('strong', '', `${dimensionNames[result.largestSpread.dimension]} · ${result.largestSpread.value} pts`));
  score.append(spread);
  byId('score-content').replaceChildren(score);
  renderFindings(result.findings);
  renderReviewers(result.reviewers);
}

function renderVersion() {
  const revised = selectedVersion === 'revision';
  byId('target-text').textContent = example[selectedVersion];
  tabs.forEach((tab) => {
    const selected = tab.dataset.version === selectedVersion;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });
  byId('sample-panel').setAttribute('aria-labelledby', revised ? 'revision-tab' : 'translation-tab');
  byId('version-chip').textContent = revised ? 'Revised sample' : 'Initial sample';
  byId('version-chip').className = `version-chip${revised ? ' revised' : ''}`;
  byId('version-caption').textContent = revised ? 'Facts restored, wording refined' : 'Three facts need a closer look';
  byId('revision-button').textContent = revised ? 'Show initial sample' : 'Show revised sample';
  byId('action-hint').textContent = revised ? 'Compare the correction notes, then check the revised sample.' : 'Start with the first translation, then compare the revision.';
  byId('correction-section').hidden = !revised;
  renderResults();
}

function selectVersion(version) {
  if (selectedVersion === version) return;
  selectedVersion = version;
  renderVersion();
  byId('live-status').textContent = `${version === 'revision' ? 'Revised' : 'Initial'} sample selected. ${results.has(version) ? 'Previously checked mock assessment shown.' : 'Select Check sample to see its mock assessment.'}`;
}

tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectVersion(tab.dataset.version));
  tab.addEventListener('keydown', (event) => {
    let nextIndex;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') nextIndex = 1 - index;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = tabs.length - 1;
    else return;
    event.preventDefault();
    tabs[nextIndex].focus();
    selectVersion(tabs[nextIndex].dataset.version);
  });
});

byId('revision-button').addEventListener('click', () => selectVersion(selectedVersion === 'translation' ? 'revision' : 'translation'));
byId('reset-button').addEventListener('click', () => {
  activeRun += 1;
  pending = false;
  results.clear();
  selectedVersion = 'translation';
  byId('check-button').disabled = false;
  byId('workspace').setAttribute('aria-busy', 'false');
  renderVersion();
  byId('live-status').textContent = 'Example reset. The initial translation is selected and all mock assessments are cleared.';
});

byId('check-button').addEventListener('click', async () => {
  if (pending) return;
  const run = ++activeRun;
  const version = selectedVersion;
  pending = true;
  byId('check-button').disabled = true;
  byId('workspace').setAttribute('aria-busy', 'true');
  byId('live-status').textContent = 'Running the three local mock assessments.';
  try {
    const result = await evaluateCouncil({ source: example.source, translation: example[version] }, evaluators);
    if (run !== activeRun) return;
    results.set(version, result);
    if (version === selectedVersion) renderResults();
    byId('live-status').textContent = result.status === 'complete' ? `Mock review complete for the ${version === 'revision' ? 'revised' : 'initial'} sample. Overall mock score: ${result.overallScore} out of 100.` : 'Review incomplete. No aggregate score is available.';
  } catch {
    if (run !== activeRun) return;
    const incomplete = { status: 'incomplete' };
    results.set(version, incomplete);
    if (version === selectedVersion) renderResults();
    byId('live-status').textContent = 'Review incomplete. No aggregate score is available.';
  } finally {
    if (run === activeRun) {
      pending = false;
      byId('check-button').disabled = false;
      byId('workspace').setAttribute('aria-busy', 'false');
    }
  }
});

for (const [index, correction] of example.correctionNotes.entries()) {
  const card = element('article', 'correction-card');
  card.append(element('span', 'correction-number', `0${index + 1}`), element('h3', '', correction.title));
  const change = element('p', 'correction-change');
  const before = element('span', 'before-text', correction.before);
  before.lang = 'es';
  const after = element('span', 'after-text', correction.after);
  after.lang = 'es';
  change.append(before, after);
  card.append(change, element('p', '', correction.detail));
  byId('correction-content').append(card);
}
byId('source-text').textContent = example.source;
byId('provenance').textContent = example.provenance;
renderVersion();
