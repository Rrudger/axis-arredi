import { readdir, readFile, stat } from 'fs/promises';
import { join } from 'path';
import { NextResponse } from 'next/server';

/* Lists the portfolio media per project folder in /public/images/projects so the
   projects screen reflects the folders automatically — rename/add/remove files and
   the change shows up after the next build, no code edit needed.

   Each project maps to one subfolder; PROJECT_DIRS order lines up with the slides
   in projects.tsx. Both photos and videos are listed, sorted together by natural
   filename order, so a file named "0.jpg" comes first, then "1", "2", … — rename a
   file to "0…" to make it the large one (works for a video too). Every src gets
   "?v=<mtime>" so replacing a file (same name, new content) changes the URL and
   busts the next/image + browser caches.

   Роут статический (пререндерится на сборке): на Vercel serverless-функция
   не видит public/ на диске, поэтому читать папку в рантайме нельзя —
   список запекается при build. В dev-режиме рендер всё равно на каждый
   запрос, так что локально файлы подхватываются как раньше.

   Медиа с внешнего хранилища подключается файлом-ссылкой: рядом кладётся
   «<имя>.url» (например «9.mp4.url»), внутри — один абсолютный URL. В списке
   он ведёт себя как обычный файл: тип и позиция в сортировке берутся из имени
   без «.url», так что переименование в «0.mp4.url» так же делает его крупным.
   Так тяжёлые видео не лежат в репозитории, но порядком по-прежнему рулят
   имена файлов в папке.

   Постер к видео — «poster/<имя видео>.jpg» внутри папки проекта (например
   «poster/v.mp4.jpg»). Подпапка в список медиа не попадает: у неё нет
   расширения, фильтр её отбрасывает. Постер нужен, чтобы слот показывал кадр
   сразу: Chrome на Android при preload="metadata" первый кадр не рисует и
   держит элемент чёрным до старта воспроизведения. */
const BASE = join(process.cwd(), 'public', 'images', 'projects');
const PROJECT_DIRS = ['kitchen', 'vine', 'coda di rondine', 'rafia']; // slide order: project1, project2, …
const IMG_RE = /\.(jpe?g|png|webp|avif)$/i;
const VID_RE = /\.(mp4|webm|mov)$/i;
const URL_RE = /\.url$/i;

export type MediaItem = { src: string; type: 'image' | 'video'; poster?: string };

export const dynamic = 'force-static';

// Путь к постеру с тем же кэш-бастером по mtime, что и у остальных файлов.
async function posterSrc(dir: string, name: string): Promise<string> {
  const file = `${name}.jpg`;
  const { mtimeMs } = await stat(join(BASE, dir, 'poster', file));
  return `/images/projects/${encodeURIComponent(dir)}/poster/${encodeURIComponent(file)}?v=${Math.round(mtimeMs)}`;
}

export async function GET() {
  const media = await Promise.all(
    PROJECT_DIRS.map(async dir => {
      try {
        const entries = (await readdir(join(BASE, dir)))
          .map(file => ({ file, name: file.replace(URL_RE, '') }))
          .filter(({ name }) => IMG_RE.test(name) || VID_RE.test(name))
          .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
        const posters = await readdir(join(BASE, dir, 'poster')).catch(() => [] as string[]);
        return await Promise.all(
          entries.map(async ({ file, name }): Promise<MediaItem> => {
            const type: MediaItem['type'] = VID_RE.test(name) ? 'video' : 'image';
            const poster = type === 'video' && posters.includes(`${name}.jpg`)
              ? await posterSrc(dir, name)
              : undefined;
            // Файл-ссылка: сам URL уже конечный, кэш-бастер не нужен.
            if (URL_RE.test(file)) {
              return { src: (await readFile(join(BASE, dir, file), 'utf8')).trim(), type, poster };
            }
            const { mtimeMs } = await stat(join(BASE, dir, file));
            // Сегменты кодируем: имена папок/файлов могут содержать пробелы.
            return {
              src: `/images/projects/${encodeURIComponent(dir)}/${encodeURIComponent(file)}?v=${Math.round(mtimeMs)}`,
              type,
              poster,
            };
          }),
        );
      } catch {
        // folder missing — this project just has no media
        return [] as MediaItem[];
      }
    }),
  );
  return NextResponse.json({ media });
}
