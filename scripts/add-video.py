#!/usr/bin/env python3
"""Готовит видео проекта к заливке в GitHub Release и создаёт файл-ссылку.

    python3 scripts/add-video.py <проект> <файл> [--as 0.mp4]

<проект> — имя папки в public/images/projects (например «rafia»).
--as     — под каким именем видео встанет в сортировке слайда: «0.mp4» делает
           его крупным, остальные идут по натуральному порядку имён. По
           умолчанию берётся имя исходного файла.

Скрипт делает три вещи:

1. Ремуксит mp4/mov, перенося атом moov в начало (qt-faststart). Потоки
   копируются дословно — качество не меняется, но браузер начинает
   воспроизведение сразу, не скачав файл целиком.
2. Кладёт результат в ~/axis-video/ под именем ассета «<проект>-<имя>»:
   имена ассетов уникальны в пределах релиза, а имя в папке проекта —
   отдельно, поэтому «0.mp4» может быть в каждом проекте свой.
3. Пишет public/images/projects/<проект>/<имя>.url с готовым URL.

Остаётся открыть релиз, перетащить туда файл из ~/axis-video/ и закоммитить
файл-ссылку. Порядок роли не играет: ссылка заработает, как только ассет
окажется в релизе.

Менять уже залитый ассет нельзя — URL кэшируется браузером и CDN. Новая
версия ролика = новое имя (--as 0-v2.mp4), старый ассет потом удаляется.
"""
import argparse, os, re, shutil, struct, sys
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

CONTAINERS = {b'moov', b'trak', b'mdia', b'minf', b'stbl', b'edts', b'udta'}


def parse(buf, start, end):
    """Перебирает боксы ISO-BMFF в buf[start:end]."""
    pos = start
    while pos + 8 <= end:
        size, typ = struct.unpack_from('>I4s', buf, pos)
        hsize = 8
        if size == 1:
            size = struct.unpack_from('>Q', buf, pos + 8)[0]
            hsize = 16
        elif size == 0:
            size = end - pos
        if size < hsize or pos + size > end:
            raise ValueError(f'битый бокс {typ!r} на позиции {pos}')
        yield typ, hsize, pos, pos + size
        pos += size


def shift_offsets(buf, start, end, delta):
    """Сдвигает на delta каждую запись stco/co64 внутри buf[start:end]."""
    n = 0
    for typ, hsize, bs, be in parse(buf, start, end):
        if typ in CONTAINERS:
            n += shift_offsets(buf, bs + hsize, be, delta)
        elif typ in (b'stco', b'co64'):
            wide = typ == b'co64'
            fmt, width = ('>Q', 8) if wide else ('>I', 4)
            count = struct.unpack_from('>I', buf, bs + hsize + 4)[0]
            off = bs + hsize + 8
            for i in range(count):
                v = struct.unpack_from(fmt, buf, off + width * i)[0] + delta
                if not wide and v > 0xFFFFFFFF:
                    raise ValueError('переполнение stco — файлу нужен co64')
                struct.pack_into(fmt, buf, off + width * i, v)
            n += count
    return n


def faststart(src: Path, dst: Path) -> None:
    """Пересобирает файл с moov впереди. mdat переносится байт в байт."""
    data = src.read_bytes()
    top = list(parse(data, 0, len(data)))
    names = [t.decode('latin1') for t, _, _, _ in top]
    if 'moov' not in names or 'mdat' not in names:
        raise ValueError('в файле нет moov/mdat — это не mp4/mov')
    if names.index('moov') < names.index('mdat'):
        shutil.copyfile(src, dst)
        print('  moov уже впереди — копирую как есть')
        return

    ms, me = next((bs, be) for t, _, bs, be in top if t == b'moov')
    moov = bytearray(data[ms:me])
    # Всё, что лежало после ftyp, съезжает ровно на размер moov.
    patched = shift_offsets(moov, 8, len(moov), len(moov))
    with dst.open('wb') as f:
        f.write(next(data[bs:be] for t, _, bs, be in top if t == b'ftyp'))
        f.write(moov)
        for typ, _, bs, be in top:
            if typ not in (b'ftyp', b'moov'):
                f.write(data[bs:be])
    print(f'  moov {len(moov)} Б перенесён в начало, исправлено {patched} смещений чанков')


def main() -> int:
    ap = argparse.ArgumentParser(description='Подготовка видео проекта к заливке в GitHub Release')
    ap.add_argument('project', help='папка в public/images/projects')
    ap.add_argument('video', type=Path, help='исходный файл')
    ap.add_argument('--as', dest='name', help='имя в папке проекта, задаёт порядок (напр. 0.mp4)')
    args = ap.parse_args()

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

    print(f'{args.video} → {dst}')
    if args.video.suffix.lower() in ('.mp4', '.mov'):
        faststart(args.video, dst)
    else:
        shutil.copyfile(args.video, dst)
        print('  webm — ремукс не нужен, копирую как есть')

    url = f'https://github.com/{REPO}/releases/download/{TAG}/{asset}'
    sidecar = folder / f'{name}.url'
    sidecar.write_text(url + '\n', encoding='utf-8')

    print(f'\nфайл-ссылка: {sidecar.relative_to(ROOT)}')
    print(f'URL:         {url}')
    print(f'\nОсталось: залить {dst.name} в релиз {TAG}')
    print(f'           https://github.com/{REPO}/releases/edit/{TAG}')
    print(f'           и закоммитить {sidecar.name}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
