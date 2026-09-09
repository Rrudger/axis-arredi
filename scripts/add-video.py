#!/usr/bin/env python3
"""Готовит видео проекта к заливке в GitHub Release: энкод, постер, файл-ссылка.

    python3 scripts/add-video.py <проект> <файл> [--as 0.mp4] [--crf 21]

<проект> — имя папки в public/images/projects (например «rafia»).
--as     — под каким именем видео встанет в сортировке слайда: «0.mp4» делает
           его крупным, остальные идут по натуральному порядку имён. По
           умолчанию берётся имя исходного файла.
--crf    — качество энкода: меньше значение — выше битрейт и вес. 21 по
           умолчанию, 23 заметно легче при почти той же картинке.

Скрипт делает четыре вещи:

1. Перекодирует в веб-профиль: H.264, CRF 21, потолок битрейта 4 Мбит/с,
   разрешение исходника не меняется. Камерные 8–13 Мбит/с телефон по
   мобильной сети не вытягивает — ролик не набирает буфер и не стартует.
   Разница на глаз не видна: запас по битрейту у исходника четырёхкратный.
   Атом moov уезжает в начало файла (+faststart), иначе браузер не может
   начать воспроизведение, не докачав всё до конца.
2. Кладёт результат в ~/axis-video/ под именем ассета «<проект>-<имя>»:
   имена ассетов уникальны в пределах релиза, а имя в папке проекта —
   отдельно, поэтому «0.mp4» может быть в каждом проекте свой.
3. Снимает первый кадр в public/images/projects/<проект>/poster/<имя>.jpg.
   Без постера Chrome на Android держит слот чёрным, пока воспроизведение не
   началось. Подпапка «poster» в список медиа не попадает — у неё нет
   расширения, фильтр роута её отбрасывает.
4. Пишет public/images/projects/<проект>/<имя>.url с готовым URL.

Остаётся открыть релиз, перетащить туда файл из ~/axis-video/ и закоммитить
постер с файлом-ссылкой. Порядок роли не играет: ссылка заработает, как
только ассет окажется в релизе.

Менять уже залитый ассет нельзя — URL кэшируется браузером и CDN. Новая
версия ролика = новое имя (--as 0-v2.mp4), старый ассет потом удаляется.
"""
# Аннотации строками: системный python 3.8 не понимает list[str] в рантайме.
from __future__ import annotations

import argparse, re, shutil, subprocess, sys
from pathlib import Path

REPO = 'Rrudger/axis-arredi'
TAG = 'media-v1'
ROOT = Path(__file__).resolve().parent.parent
BASE = ROOT / 'public' / 'images' / 'projects'
OUT = Path.home() / 'axis-video'
VID_RE = re.compile(r'\.(mp4|webm|mov)$', re.I)
# GitHub заменяет в именах ассетов всё, кроме букв, цифр, точки, дефиса и
# подчёркивания — приводим имя сами, чтобы URL совпал с тем, что мы записали.
SAFE_RE = re.compile(r'[^A-Za-z0-9._-]+')
MAXRATE = '4M'
POSTER_WIDTH = 1280


def run(cmd: list[str]) -> None:
    p = subprocess.run(cmd, capture_output=True, text=True)
    if p.returncode:
        sys.exit(f'ffmpeg не справился:\n{p.stderr.strip()[-2000:]}')


def encode(src: Path, dst: Path, crf: int) -> None:
    run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-i', str(src),
         '-c:v', 'libx264', '-crf', str(crf), '-preset', 'slow',
         '-profile:v', 'high', '-pix_fmt', 'yuv420p',
         '-maxrate', MAXRATE, '-bufsize', '8M',
         '-c:a', 'aac', '-b:a', '128k', '-ac', '2',
         '-movflags', '+faststart', str(dst)])


def poster(src: Path, dst: Path) -> None:
    dst.parent.mkdir(exist_ok=True)
    run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-i', str(src),
         '-frames:v', '1', '-vf', f"scale='min({POSTER_WIDTH},iw)':-2",
         '-q:v', '4', str(dst)])


def main() -> int:
    ap = argparse.ArgumentParser(description='Подготовка видео проекта к заливке в GitHub Release')
    ap.add_argument('project', help='папка в public/images/projects')
    ap.add_argument('video', type=Path, help='исходный файл')
    ap.add_argument('--as', dest='name', help='имя в папке проекта, задаёт порядок (напр. 0.mp4)')
    ap.add_argument('--crf', type=int, default=21, help='качество энкода, по умолчанию 21')
    args = ap.parse_args()

    if not shutil.which('ffmpeg'):
        return print('нужен ffmpeg: sudo apt install ffmpeg', file=sys.stderr) or 1

    folder = BASE / args.project
    if not folder.is_dir():
        print(f'нет папки проекта: {folder}', file=sys.stderr)
        print(f'есть: {", ".join(sorted(p.name for p in BASE.iterdir() if p.is_dir()))}', file=sys.stderr)
        return 1
    if not args.video.is_file():
        print(f'нет файла: {args.video}', file=sys.stderr)
        return 1

    name = args.name or args.video.name
    if not VID_RE.search(name):
        print(f'имя «{name}» не похоже на видео (нужно .mp4/.webm/.mov)', file=sys.stderr)
        return 1

    asset = SAFE_RE.sub('.', f'{args.project}-{name}')
    OUT.mkdir(exist_ok=True)
    dst = OUT / asset

    print(f'энкод (CRF {args.crf}, потолок {MAXRATE}): {args.video} → {dst}')
    encode(args.video, dst, args.crf)
    before, after = args.video.stat().st_size, dst.stat().st_size
    print(f'  {before / 1e6:.1f} МБ → {after / 1e6:.1f} МБ')

    shot = folder / 'poster' / f'{name}.jpg'
    poster(dst, shot)
    print(f'постер:      {shot.relative_to(ROOT)} ({shot.stat().st_size // 1024} КБ)')

    url = f'https://github.com/{REPO}/releases/download/{TAG}/{asset}'
    sidecar = folder / f'{name}.url'
    sidecar.write_text(url + '\n', encoding='utf-8')
    print(f'файл-ссылка: {sidecar.relative_to(ROOT)}')
    print(f'URL:         {url}')

    print(f'\nОсталось: залить {dst.name} в релиз {TAG}')
    print(f'           https://github.com/{REPO}/releases/edit/{TAG}')
    print(f'           и закоммитить {sidecar.name} с постером')
    return 0


if __name__ == '__main__':
    sys.exit(main())
