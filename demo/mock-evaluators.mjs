import { example } from './fixture.mjs';

// Hand-authored scores for two synthetic fixtures. No model, service, benchmark,
// automatic translation assessment, or production policy is represented here.
const issues = Object.freeze({
  day: {
    id: 'lesson-day',
    category: 'accuracy',
    severity: 'high',
    title: 'The lesson day changed',
    detail: 'The English source says Friday, but the Spanish draft says jueves (Thursday).',
    suggestion: 'Replace «el jueves» with «el viernes».',
  },
  subtitles: {
    id: 'subtitle-count',
    category: 'accuracy',
    severity: 'high',
    title: 'One subtitle language is missing',
    detail: 'The source promises subtitles in three languages; the draft promises only two.',
    suggestion: 'Replace «en dos idiomas» with «en tres idiomas».',
  },
  account: {
    id: 'account-access',
    category: 'accuracy',
    severity: 'critical',
    title: 'The account requirement is reversed',
    detail: 'The source allows joining without an account. The draft says an account is required.',
    suggestion: 'Use «Puedes participar sin crear una cuenta».',
  },
  phrasing: {
    id: 'phrasing',
    category: 'fluency',
    severity: 'low',
    title: 'The study-routine sentence can read more smoothly',
    detail: 'For this example, «formas sencillas de organizar» offers a more concise phrasing.',
    suggestion: 'Use «Exploraremos formas sencillas de organizar una rutina de estudio».',
  },
});

const profiles = [
  {
    name: 'Reviewer A',
    initial: { accuracy: 42, fluency: 78, terminology: 76 },
    revised: { accuracy: 94, fluency: 91, terminology: 92 },
    findings: [issues.day, issues.account],
  },
  {
    name: 'Reviewer B',
    initial: { accuracy: 38, fluency: 75, terminology: 74 },
    revised: { accuracy: 92, fluency: 89, terminology: 90 },
    findings: [issues.subtitles, issues.account],
  },
  {
    name: 'Reviewer C',
    initial: { accuracy: 44, fluency: 80, terminology: 78 },
    revised: { accuracy: 95, fluency: 92, terminology: 93 },
    findings: [issues.day, issues.subtitles, issues.phrasing],
  },
];

export function createMockEvaluators() {
  return profiles.map((profile) => ({
    name: profile.name,
    async evaluate(input) {
      if (!input || input.source !== example.source
        || (input.translation !== example.translation && input.translation !== example.revision)) {
        throw new Error('Mock reviewers support only the two included synthetic examples.');
      }
      const revised = input.translation === example.revision;
      return {
        scores: { ...profile[revised ? 'revised' : 'initial'] },
        findings: revised ? [] : profile.findings.map((finding) => ({ ...finding })),
      };
    },
  }));
}
