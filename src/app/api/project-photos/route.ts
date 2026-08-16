import { readdir, stat } from 'fs/promises';
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
   запрос, так что локально файлы подхватываются как раньше. */
const BASE = join(process.cwd(), 'public', 'images', 'projects');
const PROJECT_DIRS = ['kitchen', 'vine', 'coda di rondine', 'rafia']; // slide order: project1, project2, …
const IMG_RE = /\.(jpe?g|png|webp|avif)$/i;
const VID_RE = /\.(mp4|webm|mov)$/i;

export type MediaItem = { src: string; type: 'image' | 'video' };

export const dynamic = 'force-static';

export async function GET() {
  const media = await Promise.all(
    PROJECT_DIRS.map(async dir => {
      try {
        const files = (await readdir(join(BASE, dir)))
          .filter(f => IMG_RE.test(f) || VID_RE.test(f))
          .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
        return await Promise.all(
          files.map(async (f): Promise<MediaItem> => {
            const { mtimeMs } = await stat(join(BASE, dir, f));
            // Сегменты кодируем: имена папок/файлов могут содержать пробелы.
            return {
              src: `/images/projects/${encodeURIComponent(dir)}/${encodeURIComponent(f)}?v=${Math.round(mtimeMs)}`,
              type: VID_RE.test(f) ? 'video' : 'image',
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
