/** Hand-authored synthetic example. Not model-produced, customer data, or a benchmark. */
export const example = Object.freeze({
  id: 'lesson-announcement',
  title: 'A lesson worth getting right',
  sourceLanguage: 'English',
  targetLanguage: 'Spanish',
  source: 'Our next lesson takes place on Friday at 10:00 UTC. We will explore simple ways to organise a study routine. Subtitles will be available in three languages. You can join without creating an account.',
  translation: 'Nuestra próxima lección será el jueves a las 10:00 UTC. Vamos a explorar formas simples para organizar una rutina de estudio. Los subtítulos estarán disponibles en dos idiomas. Necesitas crear una cuenta para participar.',
  revision: 'Nuestra próxima lección tendrá lugar el viernes a las 10:00 UTC. Exploraremos formas sencillas de organizar una rutina de estudio. Habrá subtítulos en tres idiomas. Puedes participar sin crear una cuenta.',
  provenance: 'The text, revision, findings, and scores are hand-authored for this synthetic example. They are not model outputs or benchmark results.',
  correctionNotes: Object.freeze([
    Object.freeze({ title: 'Keep the date', before: 'jueves · Thursday', after: 'viernes · Friday', detail: 'The lesson stays on Friday at 10:00 UTC.' }),
    Object.freeze({ title: 'Preserve the number', before: 'dos idiomas · two languages', after: 'tres idiomas · three languages', detail: 'Subtitles are available in three languages.' }),
    Object.freeze({ title: 'Keep access open', before: 'Necesitas crear una cuenta', after: 'sin crear una cuenta', detail: 'Joining does not require an account.' }),
    Object.freeze({ title: 'Make the wording smoother', before: 'formas simples para organizar', after: 'formas sencillas de organizar', detail: 'The revision uses more natural wording without changing the source meaning.' }),
  ]),
});
