'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

/* Общий медиа-слой портфолио: один кадр (фото или видео), растянутый на слот.
   Используется и мозаикой на странице проекта, и обложками плитки. */

// Стартовая громкость видео. Звук выключен, пока его не включат нативными
// контролами, — и включиться он должен вполголоса, а не в упор: съёмка
// цеховая, там инструмент. Дальше уровень в руках зрителя.
const START_VOLUME = 0.4;

export type MediaItem = { src: string; type: 'image' | 'video'; poster?: string };

// Обложка проекта для плитки: первый файл папки («0…»), если это фото; у видео
// берём его постер, иначе — первое фото из списка. null = медиа ещё не пришло
// или в папке одни видео без постеров (тогда рисуем цветную заглушку).
export const coverOf = (items: MediaItem[]): string | null => {
  const first = items[0];
  if (!first) return null;
  if (first.type === 'image') return first.src;
  return first.poster ?? items.find(m => m.type === 'image')?.src ?? null;
};

// Метка «это видео»: треугольник в тонком золотом круге.
export const PlayBadge = ({ size }: { size: number }) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24" fill="none"
    style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 2 }}
  >
    <circle cx="12" cy="12" r="11" fill="var(--color-overlay-88)" stroke="var(--color-accent1)" strokeWidth="1" />
    <path d="M10 8.5l6 3.5-6 3.5V8.5z" fill="var(--color-accent1)" />
  </svg>
);

// Видео проигрывается, только пока оно в крупном слоте (active): muted + loop +
// playsInline обязательны, иначе браузер не разрешит автостарт без клика. Пока
// оно в миниатюре, грузится только метаданные, а сам поток не качается.
// Постер (первый кадр, снятый на сборке) виден сразу и до того, как метаданные
// дойдут: Chrome на Android без него держит элемент чёрным, пока
// воспроизведение реально не начнётся. Уходя из крупного, перематываем на
// начало, чтобы при следующем показе видео начиналось сначала.
export const MediaLayer = ({ item, active, sizes, priority, objectPosition = 'left center', onRatio }: {
  item: MediaItem;
  active: boolean;
  sizes: string;
  priority?: boolean;
  objectPosition?: string;
  onRatio?: (landscape: boolean) => void;
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // Вертикальное видео в широком слоте показываем целиком (contain): кадр из
  // такой съёмки нельзя обрезать до полосы, как фото, — от него ничего не
  // останется. Горизонтальное ведёт себя как фото (cover).
  const [portrait, setPortrait] = useState(false);
  // Клик по играющему видео — пауза и нативные контролы (плей, перемотка,
  // громкость, полный экран). Дальше кликами рулит уже сам плеер: свой
  // обработчик отключаем, иначе тап по кнопке плеера дошёл бы и до нас и сразу
  // ставил бы обратно на паузу. Контролы держим до ухода из крупного слота.
  const [controls, setControls] = useState(false);
  // Браузер вправе отклонить автостарт (экономия трафика, режим энергосбережения,
  // настройки сайта). Раньше отказ молча глотался и слот оставался пустым; теперь
  // на постере появляется значок play, и первый тап запускает ролик руками.
  const [needsTap, setNeedsTap] = useState(false);
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (active) el.play().then(() => setNeedsTap(false), () => setNeedsTap(true));
    else { el.pause(); el.currentTime = 0; setControls(false); }
  }, [active]);

  if (item.type === 'video') {
    return (
      <>
      <video
        ref={videoRef}
        src={item.src}
        poster={item.poster}
        muted
        loop
        playsInline
        preload="metadata"
        controls={controls}
        onClick={active && !controls ? e => {
          e.stopPropagation();
          const el = videoRef.current;
          if (!el) return;
          // Пока ролик не запущен, тап — это «играть», а не «пауза».
          if (needsTap) { el.play().then(() => setNeedsTap(false), () => {}); return; }
          el.pause();
          setControls(true);
        } : undefined}
        onLoadedMetadata={e => {
          // Уровень ставим один раз, при загрузке метаданных, а не при каждом
          // входе в крупный слот: иначе выбранное зрителем сбрасывалось бы на
          // наше при возврате к ролику. На iOS свойство игнорируется —
          // громкостью там рулит только сам аппарат.
          e.currentTarget.volume = START_VOLUME;
          const landscape = e.currentTarget.videoWidth > e.currentTarget.videoHeight;
          setPortrait(!landscape);
          onRatio?.(landscape);
        }}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: portrait ? 'contain' : 'cover',
          objectPosition: portrait ? 'center' : objectPosition,
          cursor: active && !controls ? 'pointer' : 'default',
        }}
      />
      {active && needsTap && !controls && <PlayBadge size={44} />}
      </>
    );
  }

  return (
    <Image
      src={item.src}
      alt=""
      fill
      sizes={sizes}
      priority={priority}
      style={{ objectFit: 'cover', objectPosition }}
      onLoad={e => onRatio?.(e.currentTarget.naturalWidth > e.currentTarget.naturalHeight)}
    />
  );
};
