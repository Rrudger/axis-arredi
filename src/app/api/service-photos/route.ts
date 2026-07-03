import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { NextResponse } from 'next/server';

/* Lists the service photos that actually exist in /public/images/services so the
   services screen reflects the folder automatically — rename/add/remove files and
   the change shows up on the next request, no code edit needed.

   Files are named "{slide}_{n}.{ext}": the first number is the service-slide
   (1‑4), the second is the slot (1 = desktop centre / mobile top, 2 = mobile
   bottom). The response maps that "{slide}_{n}" key to the public src path,
   with a "?v=<mtime>" version so replacing a file (same name, new content)
   changes the URL and busts the next/image + browser caches. */
const DIR = join(process.cwd(), 'public', 'images', 'services');
const FILE_RE = /^(\d+)_(\d+)\.(jpe?g|png|webp|avif)$/i;

export const dynamic = 'force-dynamic';

export async function GET() {
  const photos: Record<string, string> = {};
  try {
    for (const file of await readdir(DIR)) {
      const m = FILE_RE.exec(file);
      if (!m) continue;
      const { mtimeMs } = await stat(join(DIR, file));
      photos[`${m[1]}_${m[2]}`] = `/images/services/${file}?v=${Math.round(mtimeMs)}`;
    }
  } catch {
    // folder missing — return an empty map, every container stays empty
  }
  return NextResponse.json({ photos });
}
