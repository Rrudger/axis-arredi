'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import Flourish from '@/components/ui/flourish';
import { coverOf, PlayBadge, type MediaItem } from '@/components/portfolio/media';
import { PROJECTS } from '@/lib/projects';

/* Список проектов — то, с чего начинается третий экран.

   На десктопе это страница плитки: 4 контейнера (2×2), лишние проекты уходят
   на следующие страницы, между ними листают стрелки. Стрелки и индикатор
   страниц есть всегда: проектов будет больше, и элемент управления не должен
   появляться из ниоткуда при добавлении пятого.

   На мобиле страниц нет вовсе: все проекты идут одной колонкой, один за
   другим, и секция становится выше экрана — список проходят обычной
   прокруткой страницы. Листать нечего, поэтому и стрелок там нет.

   Десктопное и мобильное дерево — два экземпляра <Board> с разными правилами
   страниц. Так число контейнеров не зависит от JS-замера ширины и не
   «прыгает» после гидрации. */

const Arrow = ({ dir }: { dir: 'prev' | 'next' }) => (
  <svg width="13" height="11" viewBox="0 0 13 11" fill="none">
    {dir === 'prev'
      ? <path d="M13 5.5H2M6 1L1.5 5.5 6 10" stroke="var(--color-primary)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
      : <path d="M0 5.5h11M7 1l4.5 4.5L7 10" stroke="var(--color-primary)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />}
  </svg>
);

const Board = ({ media, onOpen, perPage, className, tileSizes, titleClass }: {
  media: MediaItem[][];
  onOpen: (index: number) => void;
  /* Сколько контейнеров на странице. Не задан — страниц нет: все проекты идут
     одним списком, и строка листания не рисуется вовсе. */
  perPage?: number;
  className: string;
  tileSizes: string;
  /* Заголовок экрана: на десктопе — крупная разрядка t-hero, как на втором
     экране; на мобиле — t-display, которым набраны все мобильные заголовки
     сайта (в t-hero «I Nostri Lavori» разъезжается на две строки). */
  titleClass: string;
}) => {
  const t = useTranslations('projects');
  const [page, setPage] = useState(0);

  // Шапку меряем, а не хардкодим её размеры: они зависят от языка (три
  // локали), кегля на брейке и загрузки Cinzel. Ширина строки заголовка задаёт
  // длину виньетки, высота строки — сторону квадратных стрелок листания, а
  // высота всей шапки — сколько экрана остаётся контейнерам (мобильный
  // список считает от неё высоту контейнера).
  // Заголовок набран с разрядкой, и после последней буквы висит лишний
  // интервал — коробка шире надписи. Поэтому длину виньетки берём без него, а
  // сам заголовок сдвигаем на него влево: иначе надпись и виньетка
  // центрировались бы по разным серединам и виньетка ехала бы вправо.
  const titleRef = useRef<HTMLSpanElement | null>(null);
  const headRef = useRef<HTMLDivElement | null>(null);
  const [title, setTitle] = useState({ w: 0, h: 0, tail: 0 });
  const [headH, setHeadH] = useState(0);
  useEffect(() => {
    const el = titleRef.current;
    const head = headRef.current;
    if (!el || !head) return;
    // Первый вызов ResizeObserver приходит сразу на observe(), так что
    // отдельного замера при монтировании не нужно.
    const ro = new ResizeObserver(() => {
      const tail = parseFloat(getComputedStyle(el).letterSpacing) || 0;
      setTitle({ w: el.offsetWidth - tail, h: el.offsetHeight, tail });
      setHeadH(head.offsetHeight);
    });
    ro.observe(el);
    ro.observe(head);
    return () => ro.disconnect();
  }, []);

  const paged = perPage !== undefined;
  const pages = paged ? Math.max(1, Math.ceil(PROJECTS.length / perPage)) : 1;
  // Страницу зажимаем, а не заворачиваем: плитка — это список, у него есть край.
  const at = Math.min(page, pages - 1);
  const shown = paged ? PROJECTS.slice(at * perPage, at * perPage + perPage) : PROJECTS;
  const first = paged ? at * perPage : 0;

  const arrow = (dir: 'prev' | 'next') => (
    <button
      className="pf-arrow"
      onClick={() => setPage(at + (dir === 'next' ? 1 : -1))}
      disabled={dir === 'prev' ? at === 0 : at >= pages - 1}
      aria-label={dir === 'prev' ? 'Previous' : 'Next'}
    >
      <Arrow dir={dir} />
    </button>
  );

  return (
    <div
      className={className}
      style={title.h || headH
        ? ({
            '--pf-arrow': `${title.h}px`,
            '--pf-head': `${headH}px`,
          } as React.CSSProperties)
        : undefined}
    >
      <div ref={headRef} className="pf-head">
        <span ref={titleRef} className={`pf-title ${titleClass}`} style={{ marginRight: -title.tail }}>
          {t('title')}
        </span>
        {/* До замера рисуем прикидочную ширину, а не прячем виньетку: иначе на
            первой отрисовке её строки нет, и весь список встал бы на 16px выше,
            а после гидрации прыгнул бы вниз. */}
        <Flourish w={title.w || 200} curlW={56} color="var(--color-accent1)" />
      </div>

      <div className="pf-tiles">
        {shown.map((project, slot) => {
          const index = first + slot;
          const items = media[index] ?? [];
          const cover = coverOf(items);
          return (
            <button
              key={project.slug}
              className="pf-tile"
              onClick={() => onOpen(index)}
              aria-label={t(`${project.key}.title`)}
            >
              <div className="pf-tile-img">
                {cover ? (
                  <Image src={cover} alt="" fill sizes={tileSizes} style={{ objectFit: 'cover' }} priority={index === 0} />
                ) : (
                  /* Медиа ещё не пришло (или в папке одни видео без постеров) —
                     держим тон мозаики, чтобы плитка не мигала белым. */
                  <div style={{ width: '100%', height: '100%', background: 'var(--color-mosaic-3)' }} />
                )}
              </div>
              <div className="pf-tile-veil" />
              {items[0]?.type === 'video' && <PlayBadge size={34} />}
              <div className="pf-cap">
                <span className="pf-num t-label">{String(index + 1).padStart(2, '0')}</span>
                <span className="pf-name t-title">{t(`${project.key}.title`)}</span>
              </div>
            </button>
          );
        })}
      </div>

      {paged && (
        <div className="pf-foot">
          <div className="pf-arrows">{arrow('prev')}{arrow('next')}</div>
          {/* Индикатор страниц — те же штрихи, что на остальных экранах */}
          <div className="pf-dots">
            {Array.from({ length: pages }, (_, i) => (
              <span
                key={i} onClick={() => setPage(i)} className="pf-dot"
                style={{
                  backgroundColor: i === at ? 'var(--color-primary)' : 'var(--color-primary-border)',
                  width: i === at ? '22px' : '12px',
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const PortfolioGrid = ({ media, onOpen }: {
  media: MediaItem[][];
  onOpen: (index: number) => void;
}) => (
  <div className="w-full h-full">
    <style>{`
      .pf-board { flex-direction: column; width: 100%; height: 100%; }

      .pf-head { flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 12px; }
      .pf-title { color: var(--color-primary); text-align: center; }

      /* Контейнеры забирают всю высоту, что осталась от заголовка и стрелок:
         min-height:0 снимает авто-минимум грид-элемента, иначе на низком
         вьюпорте плитка выдавила бы нижнюю строку за край экрана. */
      .pf-tiles { flex: 1; min-height: 0; display: grid; grid-template-rows: 1fr 1fr; }

      .pf-tile {
        position: relative; overflow: hidden; padding: 0;
        background: var(--color-mosaic-2);
        border: 0.5px solid var(--color-border);
        cursor: pointer; outline: none; box-sizing: border-box;
        transition: border-color 0.3s;
      }
      .pf-tile-img { position: absolute; inset: 0; transition: transform 0.6s cubic-bezier(0.4,0,0.2,1); }
      .pf-tile-veil {
        position: absolute; inset: 0;
        background: linear-gradient(to top, var(--color-scrim) 0%, transparent 60%);
        transition: opacity 0.35s;
      }
      .pf-cap {
        position: absolute; left: 0; right: 0; bottom: 0;
        display: flex; flex-direction: column; gap: 6px;
        text-align: left; z-index: 1;
        transition: transform 0.35s cubic-bezier(0.4,0,0.2,1);
      }
      .pf-num  { color: var(--color-accent1); }
      .pf-name { color: var(--color-overlay-88); white-space: pre-line; }

      /* Наведение — только там, где есть настоящий курсор: на тач-экране
         :hover залипает после тапа, и плитка осталась бы «приподнятой». */
      @media (hover: hover) {
        .pf-tile:hover { border-color: var(--color-accent1); }
        .pf-tile:hover .pf-tile-img { transform: scale(1.05); }
        .pf-tile:hover .pf-tile-veil { opacity: 0.75; }
        .pf-tile:hover .pf-cap { transform: translateY(-4px); }
      }
      @media (prefers-reduced-motion: reduce) {
        .pf-tile-img, .pf-cap { transition: none; }
        .pf-tile:hover .pf-tile-img { transform: none; }
      }

      .pf-foot { flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; }
      .pf-arrows { display: flex; gap: 8px; }
      .pf-arrow {
        width: var(--pf-arrow); height: var(--pf-arrow);
        border: 0.5px solid color-mix(in srgb, var(--color-primary) 45%, transparent);
        background: none; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: border-color 0.2s, opacity 0.2s;
      }
      @media (hover: hover) {
        .pf-arrow:hover:not(:disabled) { border-color: color-mix(in srgb, var(--color-accent1) 55%, transparent); }
      }
      /* На краю списка стрелка остаётся на месте — гаснет, но не исчезает,
         чтобы строка управления не перестраивалась. */
      .pf-arrow:disabled { opacity: 0.3; cursor: default; }

      .pf-dots { display: flex; gap: 10px; align-items: center; }
      .pf-dot { display: inline-block; height: 0.5px; cursor: pointer; transition: width 0.3s, background-color 0.3s; }

      /* ── Мобайл ──
         Проекты идут одной колонкой, все сразу: страниц нет, листать нечем и
         незачем. Секция от этого становится выше экрана — список проходят
         обычной прокруткой страницы.

         Высота контейнера остаётся прежней, «двухплиточной»: экран минус
         отступы, шапка и зазор, пополам. Так первый экран списка выглядит
         ровно как раньше, а остальные проекты продолжают его ниже.

         Нижний отступ — резерв под плашку меню: она position: fixed и прибита
         к ВИДИМОМУ низу, а секция это 100vh («большой» вьюпорт). Разница между
         этими низами — высота адресной строки, около 55px, — и входит в резерв,
         иначе подпись последнего проекта оказывается под меню. */
      .pf-board--mob {
        --pf-pad-top: 28px;
        --pf-pad-bottom: 84px;
        --pf-pad-x: 16px;
        --pf-step: 12px;
        padding: var(--pf-pad-top) var(--pf-pad-x) var(--pf-pad-bottom);
        height: auto;
        min-height: 100vh;
      }
      /* Виньетка отбита поровну: сверху до строки заголовка, снизу до первого
         контейнера — по два шага. Шаг тот же, что и зазор между контейнерами,
         как на десктопе. */
      .pf-board--mob .pf-head { gap: calc(var(--pf-step) * 2); }
      .pf-board--mob .pf-tiles {
        flex: none;
        grid-template-columns: 1fr;
        grid-template-rows: none;
        /* Из экрана вычитается всё, что контейнерам не принадлежит: отступы,
           шапка (--pf-head приносит ResizeObserver — до первого замера работает
           запасное значение) и два шага её нижней отбивки. Остаток делится
           надвое за вычетом зазора между контейнерами. */
        grid-auto-rows: calc(
          (100vh - var(--pf-pad-top) - var(--pf-pad-bottom) - var(--pf-head, 72px)
            - var(--pf-step) * 3) / 2
        );
        gap: var(--pf-step);
        margin: calc(var(--pf-step) * 2) 0 0;
      }
      .pf-board--mob .pf-cap { padding: 14px 16px; }

      /* Ноль там, где выезжающей панели нет; запасное значение выше остаётся
         для браузеров без svh. */
      @supports (height: 100svh) {
        .pf-board--mob {
          --pf-pad-bottom: calc(80px + env(safe-area-inset-bottom, 0px) + (100vh - 100svh));
        }
      }

      /* ── Десктоп ──
         Вертикальный ритм экрана считается от одного шага — зазора между
         плитками. Удвоенный шаг стоит вокруг виньетки (сверху до заголовка,
         снизу до плитки — поровну) и под плиткой, до строки управления;
         четверть шага разделяет номер и название на самой плитке. Внешняя рамка 80px в ритм не входит: это общий отступ
         экранов сайта, тот же, что на первом и втором. */
      @media (min-width: 1023px) {
        .pf-board--desk { padding: 80px 232px 80px 130px; --pf-arrow: 42px; --pf-step: 24px; }
        .pf-board--desk .pf-head  { gap: calc(var(--pf-step) * 2); }
        .pf-board--desk .pf-tiles {
          grid-template-columns: 1fr 1fr;
          gap: var(--pf-step);
          margin: calc(var(--pf-step) * 2) 0;
        }
        .pf-board--desk .pf-cap { padding: var(--pf-step); gap: calc(var(--pf-step) / 4); }
      }

      /* Компактный вьюпорт (узкий ИЛИ низкий): воздух вокруг списка урезаем,
         сами контейнеры от этого только выигрывают в высоте. */
      /* Низ не трогаем — он считается выше и от компактности не зависит. */
      :where(html[data-vp]) .pf-board--mob { --pf-pad-top: 18px; --pf-pad-x: 12px; --pf-step: 10px; }
      :where(html[data-vp]) .pf-board--mob .pf-cap { padding: 10px 12px; gap: 4px; }
      @media (min-width: 1023px) {
        /* Ужимается сам шаг — вместе с ним пропорционально садятся все
           интервалы разом, отдельных чисел для компактного вьюпорта не нужно. */
        :where(html[data-vp]) .pf-board--desk { padding: 48px 232px 48px 130px; --pf-step: 16px; }
      }
    `}</style>

    <Board
      media={media} onOpen={onOpen} perPage={4} tileSizes="40vw"
      titleClass="t-hero tracking-[0.24em]"
      className="pf-board pf-board--desk hidden desktop:flex"
    />
    <Board
      media={media} onOpen={onOpen} tileSizes="100vw"
      titleClass="t-display"
      className="pf-board pf-board--mob flex desktop:hidden"
    />
  </div>
);

export default PortfolioGrid;
