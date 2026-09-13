'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { MediaLayer, type MediaItem } from '@/components/portfolio/media';

/* Полноэкранный просмотр кадра — один слой на десктоп и на мобайл.

   Зачем он нужен. В раскладке проекта кадр всегда сидит в чужой пропорции:
   на десктопе это широкий слот мозаики, на мобиле — почти квадратный
   (ширина экрана на половину высоты минус пояс миниатюр). Съёмка у проектов
   разная, вертикальная и горизонтальная вперемешку, и cover режет то бока,
   то верх с низом. Слой во весь экран — единственное место, где кадр виден
   целиком: contain на тёмном фоне, ни одной обрезанной стороны. На телефоне
   горизонтальный кадр вдобавок выигрывает от поворота — размер считается от
   вьюпорта, так что в альбомной ориентации снимок получает всю ширину.

   Слой уходит порталом на <body>: внутри секции он оказался бы ниже плашки
   меню (z-50) и внутри контейнеров с анимацией transform, а они для
   position: fixed образуют собственную систему координат. */

type Props = {
  items: MediaItem[];
  index: number;
  /* Кадр, на котором вышли: раскладка под слоем встаёт на него же, иначе
     возврат бросал бы зрителя обратно к началу серии. */
  onClose: (last: number) => void;
};

// Порог свайпа — тот же, что у листания кадров в раскладке проекта.
const SWIPE_PX = 40;

const num = (i: number) => String(i).padStart(2, '0');

const PhotoViewer = ({ items, index, onClose }: Props) => {
  const [at, setAt] = useState(index);
  const n = items.length;

  // Слушатели окна и запись в истории живут всё время показа, а индекс и
  // onClose меняются с каждым кадром. Держим их в ref: эффекты монтируются
  // один раз, иначе каждое перевешивание popstate стоило бы лишней записи.
  const atRef = useRef(at);
  const closeRef = useRef(onClose);
  useEffect(() => { atRef.current = at; closeRef.current = onClose; });

  const go = (dir: 1 | -1) => { if (n > 1) setAt(i => (i + dir + n) % n); };
  const close = () => onClose(at);

  // Тап по фону закрывает, свайп — листает. Оба приходят одним касанием
  // (touchend, затем click), поэтому после свайпа гасим ближайший клик.
  const touchStart = useRef<number | null>(null);
  const swiped = useRef(false);

  // Своя запись в истории: на телефоне полноэкранный слой обязан закрываться
  // системной кнопкой «назад», а не выбрасывать из проекта наружу. Закрытие
  // любым другим способом эту запись снимает, чтобы «назад» потом не
  // срабатывал вхолостую. Адрес не трогаем — открытый кадр в ссылке не живёт.
  useEffect(() => {
    const own = { pushed: true };
    window.history.pushState({ pv: true }, '', window.location.href);
    const pop = () => {
      // Оказались снова НА своей записи — значит «назад» сработал не от зрителя,
      // а от служебной перемотки (React в dev-режиме монтирует эффекты дважды,
      // и снятие первой записи приходит уже при живой второй). Закрывать нечего.
      if ((window.history.state as { pv?: boolean } | null)?.pv) return;
      own.pushed = false;
      closeRef.current(atRef.current);
    };
    window.addEventListener('popstate', pop);
    return () => {
      window.removeEventListener('popstate', pop);
      if (own.pushed) window.history.back();
    };
  }, []);

  // Страница под слоем не должна ехать. Полоса прокрутки на десктопе при этом
  // исчезает, и вёрстка под слоем дёрнулась бы на её ширину — компенсируем
  // отступом, чтобы возврат из просмотра был без скачка.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const overflow = html.style.overflow;
    const pad = body.style.paddingRight;
    const bar = window.innerWidth - html.clientWidth;
    html.style.overflow = 'hidden';
    if (bar > 0) body.style.paddingRight = `${bar}px`;
    return () => { html.style.overflow = overflow; body.style.paddingRight = pad; };
  }, []);

  // Клавиатура — десктопный способ листать: стрелки по кадрам, Esc наружу.
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { closeRef.current(atRef.current); return; }
      if (n < 2) return;
      if (e.key === 'ArrowRight') setAt(i => (i + 1) % n);
      if (e.key === 'ArrowLeft') setAt(i => (i - 1 + n) % n);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [n]);

  if (n === 0) return null;

  return createPortal(
    <div
      className="pv-root"
      role="dialog"
      aria-modal="true"
      /* Жесты на слое наши: свайп листает, прокрутке и оттягиванию за край
         здесь делать нечего. Исключение — кадр с видео: там жесты принадлежат
         нативным контролам плеера (перемотка ползунком). */
      style={{ touchAction: items[at]?.type === 'video' ? 'auto' : 'none' }}
      onClick={() => { if (swiped.current) { swiped.current = false; return; } close(); }}
      onTouchStart={e => {
        swiped.current = false;
        // Касание самого видео отдаём плееру: там перематывают ползунком, и
        // горизонтальное движение по нему — не свайп по серии.
        touchStart.current = (e.target as HTMLElement).tagName === 'VIDEO'
          ? null : e.touches[0].clientX;
      }}
      onTouchEnd={e => {
        if (touchStart.current === null) return;
        const dx = touchStart.current - e.changedTouches[0].clientX;
        if (Math.abs(dx) > SWIPE_PX) { swiped.current = true; go(dx > 0 ? 1 : -1); }
        touchStart.current = null;
      }}
    >
      <style>{`
        .pv-root {
          position: fixed; inset: 0; z-index: 100;
          background: var(--color-mosaic-1);
          cursor: zoom-out;
          overscroll-behavior: contain;
          animation: pv-in 0.25s ease forwards;
        }
        @keyframes pv-in { from { opacity: 0; } to { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { .pv-root { animation: none; } }

        /* Кадры — постоянные слои с перекрёстным затуханием, как в мозаике на
           десктопе. Соседние по кругу держим смонтированными: следующий кадр
           успевает загрузиться до того, как его позовут свайпом. */
        .pv-frame { position: absolute; inset: 0; transition: opacity 0.3s ease; }
        @media (prefers-reduced-motion: reduce) { .pv-frame { transition: none; } }

        .pv-btn {
          position: absolute; z-index: 2;
          width: 44px; height: 44px; padding: 0;
          display: flex; align-items: center; justify-content: center;
          background: var(--color-overlay-10);
          border: 1px solid var(--color-accent1);
          color: var(--color-overlay-88);
          cursor: pointer;
          transition: background 0.2s;
        }
        @media (hover: hover) {
          .pv-btn:hover { background: var(--color-overlay-20); }
        }
        .pv-close { top: calc(16px + env(safe-area-inset-top, 0px)); right: 16px; }
        .pv-nav { top: 50%; transform: translateY(-50%); }
        .pv-prev { left: 16px; }
        .pv-next { right: 16px; }
        /* На тач-экране стрелки лежали бы прямо на кадре — там листают свайпом. */
        @media (hover: none) { .pv-nav { display: none; } }

        .pv-count {
          position: absolute; z-index: 2; pointer-events: none;
          left: 50%; transform: translateX(-50%);
          bottom: calc(18px + env(safe-area-inset-bottom, 0px));
          color: var(--color-overlay-60);
        }
      `}</style>

      {items.map((item, i) => {
        const dist = Math.min((i - at + n) % n, (at - i + n) % n);
        const near = dist <= 1;
        const active = i === at;
        return (
          <div
            key={i}
            className="pv-frame"
            aria-hidden={!active}
            style={{ opacity: active ? 1 : 0, pointerEvents: active ? 'auto' : 'none' }}
          >
            {near && (
              <MediaLayer
                item={item}
                active={active}
                fit="contain"
                sizes="100vw"
                priority={i === index && item.type === 'image'}
              />
            )}
          </div>
        );
      })}

      {n > 1 && (
        <>
          <button
            className="pv-btn pv-nav pv-prev"
            onClick={e => { e.stopPropagation(); go(-1); }}
            aria-label="Previous"
          >
            <svg width="13" height="11" viewBox="0 0 13 11" fill="none">
              <path d="M13 5.5H2M6 1L1.5 5.5 6 10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            className="pv-btn pv-nav pv-next"
            onClick={e => { e.stopPropagation(); go(1); }}
            aria-label="Next"
          >
            <svg width="13" height="11" viewBox="0 0 13 11" fill="none">
              <path d="M0 5.5h11M7 1l4.5 4.5L7 10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="pv-count t-label">{num(at + 1)} / {num(n)}</div>
        </>
      )}

      <button
        className="pv-btn pv-close"
        onClick={e => { e.stopPropagation(); close(); }}
        aria-label="Close"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        </svg>
      </button>
    </div>,
    document.body,
  );
};

export default PhotoViewer;
