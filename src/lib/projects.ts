/* Единый список проектов портфолио — источник правды и для сервера, и для
   клиента. Порядок здесь = порядок плиток на третьем экране.

   - dir  — папка медиа в public/images/projects (её читает роут
            /api/project-photos, индекс в ответе совпадает с индексом здесь);
   - key  — блок в messages/*.json → projects.<key>.{label,title,description};
   - slug — то, что уходит в URL (?project=<slug>) и остаётся стабильным,
            даже если папку или порядок переименуют.

   Добавить проект = строка здесь + папка с медиа + блок в трёх messages/*.json.
   Больше нигде числа проектов нет. */
export type ProjectDef = { slug: string; dir: string; key: string };

export const PROJECTS: ProjectDef[] = [
  { slug: 'kitchen',   dir: 'kitchen',          key: 'project1' },
  { slug: 'wine-unit', dir: 'vine',             key: 'project2' },
  { slug: 'dovetail',  dir: 'coda di rondine',  key: 'project3' },
  { slug: 'raffia',    dir: 'rafia',            key: 'project4' },
];

export const PROJECT_DIRS = PROJECTS.map(p => p.dir);

// Индекс проекта по slug из URL; -1, если такого нет (мусор в адресе игнорим).
export const projectIndexBySlug = (slug: string | null) =>
  slug ? PROJECTS.findIndex(p => p.slug === slug) : -1;
