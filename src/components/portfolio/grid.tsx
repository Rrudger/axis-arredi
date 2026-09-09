'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import Flourish from '@/components/ui/flourish';
import { coverOf, PlayBadge, type MediaItem } from '@/components/portfolio/media';
import { PROJECTS } from '@/lib/projects';

/* Плитка проектов — то, с чего теперь начинается третий экран. Одна страница
   плитки: 4 контейнера на десктопе (2×2), 2 на мобиле (в столбец); лишние
   проекты уходят на следующие страницы, между ними листают стрелки. Стрелки и
   индикатор страниц есть в обеих версиях всегда: проектов будет больше, и
   элемент управления не должен появляться из ниоткуда при добавлении пятого.

   Десктопное и мобильное дерево — два экземпляра <Board> с разным числом
   контейнеров на странице, каждый со своим состоянием страницы. Так число
   плиток не зависит от JS-замера ширины и не «прыгает» после гидрации. */

const Arrow = ({ dir }: { dir: 'prev' | 'next' }) => (
  <svg width="13" height="11" viewBox="0 0 13 11" fill="none">
    {dir === 'prev'
      ? <path d="M13 5.5H2M6 1L1.5 5.5 6 10" stroke="var(--color-primary)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
      : <path d="M0 5.5h11M7 1l4.5 4.5L7 10" stroke="var(--color-primary)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />}
  </svg>
);

const Board = ({ media, onOpen, perPage, className, tileSizes, titleClass, arrowFromTitle, controlsInHead, loopPages }: {
  media: MediaItem[][];
  onOpen: (index: number) => void;
  perPage: number;
  className: string;
  tileSizes: string;
  /* Сторона стрелок = высота строки заголовка. Считается только там, где
     заголовок крупный (десктоп): на мобиле t-display дал бы стрелку около
     32px — мельче комфортного тач-таргета, поэтому там размер свой. */
  arrowFromTitle?: boolean;
  /* Управление в шапке (стрелки по краям заголовка, точки под виньеткой)
     вместо строки внизу. Так на мобиле оно не зависит от того, сколько внизу
     занимает плашка меню и адресная строка браузера. */
  controlsInHead?: boolean;
  /* Листать по кругу, без края. На мобиле стрелка под большим пальцем должна
     работать всегда: гаснущая на краю кнопка там читается как поломка. На
     десктопе край видно по индикатору страниц, и стрелки честно упираются. */
  loopPages?: boolean;
  /* Заголовок экрана: на десктопе — крупная разрядка t-hero, как на втором
     экране; на мобиле — t-display, которым набраны все мобильные заголовки
     сайта (в t-hero «I Nostri Lavori» разъезжается на две строки). */
  titleClass: string;
}) => {
  const t = useTranslations('projects');
  const [page, setPage] = useState(0);

  // Заголовок меряем, а не хардкодим его размеры: они зависят от языка (три
  // локали), кегля на брейке и загрузки Cinzel. Ширина строки задаёт длину
  // виньетки, высота строки — сторону квадратных стрелок листания.
  // Заголовок набран с разрядкой, и после последней буквы висит лишний
  // интервал — коробка шире надписи. Поэтому длину виньетки берём без него, а
  // сам заголовок сдвигаем на него влево: иначе надпись и виньетка
  // центрировались бы по разным серединам и виньетка ехала бы вправо.
  const titleRef = useRef<HTMLSpanElement | null>(null);
  const [title, setTitle] = useState({ w: 0, h: 0, tail: 0 });
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    // Первый вызов ResizeObserver приходит сразу на observe(), так что
    // отдельного замера при монтировании не нужно.
    const ro = new ResizeObserver(() => {
      const tail = parseFloat(getComputedStyle(el).letterSpacing) || 0;
      setTitle({ w: el.offsetWidth - tail, h: el.offsetHeight, tail });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pages = Math.max(1, Math.ceil(PROJECTS.length / perPage));
  // Страницу зажимаем, а не заворачиваем: плитка — это список, у него есть край.
  const at = Math.min(page, pages - 1);
  const shown = PROJECTS.slice(at * perPage, at * perPage + perPage);

  const go = (dir: 1 | -1) => setPage(loopPages ? (at + dir + pages) % pages : at + dir);
  // По кругу стрелка мертва только тогда, когда листать нечего вовсе.
  const blocked = (dir: 1 | -1) =>
    loopPages ? pages < 2 : dir < 0 ? at === 0 : at >= pages - 1;

  const prevBtn = (
    <button className="pf-arrow" onClick={() => go(-1)} disabled={blocked(-1)} aria-label="Previous">
      <Arrow dir="prev" />
    </button>
  );
  const nextBtn = (
    <button className="pf-arrow" onClick={() => go(1)} disabled={blocked(1)} aria-label="Next">
      <Arrow dir="next" />
    </button>
  );
  // Индикатор страниц — те же штрихи, что на остальных экранах
  const dots = (
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
  );

  return (
    <div
      className={className}
      style={arrowFromTitle && title.h
        ? ({ '--pf-arrow': `${title.h}px` } as React.CSSProperties)
        : undefined}
    >
      <div className="pf-head">
        <div className="pf-head-row">
          {controlsInHead && prevBtn}
          <span ref={titleRef} className={`pf-title ${titleClass}`} style={{ marginRight: -title.tail }}>
            {t('title')}
          </span>
          {controlsInHead && nextBtn}
        </div>
        {/* До замера рисуем прикидочную ширину, а не прячем виньетку: иначе на
            первой отрисовке её строки нет, и вся плитка встала бы на 16px выше,
            а после гидрации прыгнула бы вниз. */}
        <Flourish w={title.w || 200} curlW={56} color="var(--color-accent1)" />
        {controlsInHead && dots}
      </div>

      <div className="pf-tiles">
        {shown.map((project, slot) => {
          const index = at * perPage + slot;
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

      {!controlsInHead && (
        <div className="pf-foot">
          <div className="pf-arrows">{prevBtn}{nextBtn}</div>
          {dots}
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
      /* Строка заголовка. На десктопе в ней только он сам и она центрирует;
         на мобиле по краям встают стрелки листания, и заголовок остаётся по
         центру сам собой — стрелки одинаковой ширины. */
      .pf-head-row { display: flex; width: 100%; align-items: center; justify-content: center; }
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
         Управление живёт в шапке: стрелки по краям заголовка, точки под
         виньеткой. Низ экрана для него больше не нужен — а он там и не
         доставался: секция это 100vh («большой» вьюпорт), плашку меню Chrome
         на Android прибивает к ВИДИМОМУ низу, и разница между этими низами —
         высота адресной строки, около 55px, — съедала почти весь резерв.
         Строка со стрелками уходила под меню целиком. */
      .pf-board--mob {
        padding: 28px 16px 84px;
        --pf-arrow: 41.6px;
      }
      .pf-board--mob .pf-head-row { justify-content: space-between; gap: 12px; }
      /* Стрелки в шапке — золотом виньеток: они стоят вплотную к ней и к
         заголовку, и общий цвет собирает шапку в одну группу. */
      .pf-board--mob .pf-arrow { border-color: var(--color-accent1); }
      .pf-board--mob .pf-tiles { grid-template-columns: 1fr; gap: 12px; margin: 20px 0 0; }
      .pf-board--mob .pf-cap { padding: 14px 16px; }

      /* Занятый низ считаем, а не угадываем: плашка меню (56px) со своим
         отступом (12px) и просветом до неё, жестовая полоса и то самое
         расхождение вьюпортов. Иначе подпись нижней плитки оказывается под
         меню. В скобках — ноль на десктопе и в браузерах без выезжающей
         панели. Запасное значение выше остаётся там, где нет svh. */
      @supports (height: 100svh) {
        .pf-board--mob {
          padding-bottom: calc(80px + env(safe-area-inset-bottom, 0px) + (100vh - 100svh));
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

      /* Компактный вьюпорт (узкий ИЛИ низкий): воздух вокруг плитки урезаем,
         сами контейнеры от этого только выигрывают в высоте. */
      /* Низ не трогаем — он считается выше и от компактности не зависит. */
      :where(html[data-vp]) .pf-board--mob { padding-top: 18px; padding-left: 12px; padding-right: 12px; }
      :where(html[data-vp]) .pf-board--mob .pf-tiles { gap: 10px; margin: 14px 0 0; }
      :where(html[data-vp]) .pf-board--mob .pf-cap { padding: 10px 12px; gap: 4px; }
      @media (min-width: 1023px) {
        /* Ужимается сам шаг — вместе с ним пропорционально садятся все
           интервалы разом, отдельных чисел для компактного вьюпорта не нужно. */
        :where(html[data-vp]) .pf-board--desk { padding: 48px 232px 48px 130px; --pf-step: 16px; }
      }
    `}</style>

    <Board
      media={media} onOpen={onOpen} perPage={4} tileSizes="40vw"
      titleClass="t-hero tracking-[0.24em]" arrowFromTitle
      className="pf-board pf-board--desk hidden desktop:flex"
    />
    <Board
      media={media} onOpen={onOpen} perPage={2} tileSizes="100vw"
      titleClass="t-display" controlsInHead loopPages
      className="pf-board pf-board--mob flex desktop:hidden"
    />
  </div>
);

export default PortfolioGrid;
