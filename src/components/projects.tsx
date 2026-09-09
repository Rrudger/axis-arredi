'use client';

import { forwardRef, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import CtaButton from '@/components/ui/cta-button';
import Flourish from '@/components/ui/flourish';

const TOTAL = 4;
const TOTAL_STR = String(TOTAL).padStart(2, '0');

// Стартовая громкость видео. Звук выключен, пока его не включат нативными
// контролами, — и включиться он должен вполголоса, а не в упор: съёмка
// цеховая, там инструмент. Дальше уровень в руках зрителя.
const START_VOLUME = 0.4;

// «Rubio Monocoat» в любом описании — ссылка на официальный сайт бренда в Италии.
// Разбиваем строку по имени бренда и подменяем совпадения на <a>.
const RUBIO_URL = 'https://www.rubiomonocoat.it/';
const linkRubio = (text: string) =>
  text.split(/(Rubio Monocoat)/g).map((part, i) =>
    part === 'Rubio Monocoat' ? (
      <a
        key={i}
        className="s3-link"
        href={RUBIO_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
      >
        {part}
      </a>
    ) : (
      part
    ),
  );

type MediaItem = { src: string; type: 'image' | 'video'; poster?: string };

// Один слой карусели — фото или видео, одинаково растянутые на слот.
// Видео проигрывается, только пока оно в крупном слоте (active): muted + loop +
// playsInline обязательны, иначе браузер не разрешит автостарт без клика. Пока
// оно в миниатюре, грузится только метаданные, а сам поток не качается.
// Постер (первый кадр, снятый на сборке) виден сразу и до того, как метаданные
// дойдут: Chrome на Android без него держит элемент чёрным, пока
// воспроизведение реально не начнётся. Уходя из крупного, перематываем на
// начало, чтобы при следующем показе видео начиналось сначала.
const MediaLayer = ({ item, active, sizes, priority, objectPosition = 'left center', onRatio }: {
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

// Метка «это видео» на миниатюре: треугольник в тонком золотом круге.
const PlayBadge = ({ size }: { size: number }) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24" fill="none"
    style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 2 }}
  >
    <circle cx="12" cy="12" r="11" fill="var(--color-overlay-88)" stroke="var(--color-accent1)" strokeWidth="1" />
    <path d="M10 8.5l6 3.5-6 3.5V8.5z" fill="var(--color-accent1)" />
  </svg>
);

const Projects = forwardRef<HTMLDivElement>((_, ref) => {
  const t = useTranslations('projects');
  const [current, setCurrent] = useState(0);

  // Медиа проектов подтягиваются из папок public/images/projects/* на рантайме
  // через API — порядок и состав меняются вслед за файлами, без правок кода.
  // media[slide] — отсортированный список фото и видео (файл «0…» первый).
  const [media, setMedia] = useState<MediaItem[][]>([]);
  useEffect(() => {
    let alive = true;
    fetch('/api/project-photos')
      .then(r => r.json())
      .then((d: { media: MediaItem[][] }) => { if (alive) setMedia(d.media ?? []); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  const [offset, setOffset] = useState(0); // индекс верхнего медиа видимого окна в curMedia
  const [largeHovered, setLargeHovered] = useState(false);
  const [isLandscape, setIsLandscape] = useState<Record<number, boolean>>({});
  const [mobileActive, setMobileActive] = useState(0);
  const [mobileDir, setMobileDir] = useState<'left' | 'right'>('left');
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const advanceBlocked = useRef(false);
  const expandBlocked = useRef(false);

  // Верхняя виньетка-флёрон тянется во всю ширину текстовой панели. Меряем
  // ширину контейнера, чтобы SVG рисовался 1:1 (чёткие штрихи на любом брейке).
  const headRuleRef = useRef<HTMLDivElement | null>(null);
  const [headRuleW, setHeadRuleW] = useState(0);
  // Мобильный текст описания: рендерим абзацы; если не влезают, в правом нижнем
  // углу — квадратная кнопка «…». Клик по ней раскрывает панель вверх (растёт на
  // величину переполнения overflowPx, перекрывая низ фото). expandedRef нужен,
  // чтобы мерить переполнение только в свёрнутом виде.
  const textRef = useRef<HTMLDivElement | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [overflowPx, setOverflowPx] = useState(0);
  // Смещение кнопки «…» от низа: остаток высоты области по модулю строки —
  // чтобы кнопка села ровно на последнюю полную строку (центр в центр строки).
  const [bottomInset, setBottomInset] = useState(0);
  // Высота строки описания — от неё считается размер кнопки «…» (см. ниже).
  // Кегль t-body-compact меняется по брейкам, поэтому меряем, а не хардкодим.
  const [lineH, setLineH] = useState(28);
  const [expanded, setExpanded] = useState(false);
  const expandedRef = useRef(false);
  useEffect(() => { expandedRef.current = expanded; }, [expanded]);

  // Стрелки — квадрат со стороной, равной высоте CTA-кнопки. Высота кнопки
  // зависит от line-height Cinzel + паддингов/бордера, поэтому меряем её на
  // рантайме, а не хардкодим.
  const ctaRef = useRef<HTMLButtonElement | null>(null);
  const [arrowSize, setArrowSize] = useState(42);
  useEffect(() => {
    const el = ctaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setArrowSize(el.offsetHeight));
    ro.observe(el);
    setArrowSize(el.offsetHeight);
    return () => ro.disconnect();
  }, []);

  useEffect(() => { setMobileActive(0); setOffset(0); setExpanded(false); }, [current]);

  // Переполнение текста описания: показывать ли «…» и на сколько px растить
  // панель при раскрытии. Мерим только в свёрнутом виде; пересчёт при ресайзе и
  // смене проекта.
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    const check = () => {
      if (expandedRef.current) return;
      const over = el.scrollHeight - el.clientHeight;
      setTruncated(over > 1);
      setOverflowPx(over > 1 ? over : 0);
      const lh = parseFloat(getComputedStyle(el).lineHeight) || 28;
      setLineH(lh);
      // Низ последней полностью видимой строки. Простым остатком высоты по
      // модулю строки не обойтись: между абзацами есть зазор (marginTop), и
      // строки второго абзаца сдвинуты с общей сетки. Поэтому идём по абзацам
      // и берём самый нижний край строки, который ещё влезает.
      let lastLineBottom = 0;
      for (const para of Array.from(el.children) as HTMLElement[]) {
        if (!('para' in para.dataset)) continue;
        const lines = Math.round(para.offsetHeight / lh);
        for (let n = 1; n <= lines; n++) {
          const bottom = para.offsetTop + n * lh;
          if (bottom <= el.clientHeight + 0.5) lastLineBottom = bottom;
        }
      }
      setBottomInset(el.clientHeight - lastLineBottom);
    };
    const ro = new ResizeObserver(check);
    ro.observe(el);
    check();
    return () => ro.disconnect();
  }, [current]);

  useEffect(() => {
    const targets: [HTMLDivElement | null, (w: number) => void][] = [
      [headRuleRef.current, setHeadRuleW],
    ];
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const t = targets.find(([el]) => el === entry.target);
        if (t) t[1](entry.contentRect.width);
      }
    });
    for (const [el] of targets) if (el) ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const prev = () => setCurrent(i => (i - 1 + TOTAL) % TOTAL);
  const next = () => setCurrent(i => (i + 1) % TOTAL);

  // Мобильная навигация листает по кругу по всем медиа: индекс 0..n‑1 с
  // заворотом, поэтому каждый шаг реально сдвигает ленту (нет краёв, где она
  // упирается). mobSwiped гасит ложный тап по превью после свайпа.
  const mobSwiped = useRef(false);
  const mobileGo = (dir: 1 | -1) => {
    const n = curMedia.length;
    if (n === 0) return;
    setMobileDir(dir === 1 ? 'left' : 'right');
    setMobileActive(i => (i + dir + n) % n);
  };
  const mobileNextPhoto = () => mobileGo(1);
  const mobilePrevPhoto = () => mobileGo(-1);
  // Активная миниатюра всегда на 2‑й позиции (слот 1). Тап левее (слот 0)
  // листает назад, правее (слоты 2..) — вперёд; всегда на одно фото.
  const mobileThumbTap = (slot: number) => {
    if (slot === 1) return;
    mobileGo(slot < 1 ? -1 : 1);
  };

  // Наведение на миниатюру (позиция p = 1..3): она уходит в крупное, а окно
  // миниатюр прокручивается на p (обычно на 1 — верхняя), подгружая следующие
  // кадры снизу. Так наведениями доступен весь список папки, а не только 4.
  const advance = (p: number) => {
    const n = curMedia.length;
    if (n <= 1 || advanceBlocked.current) return;
    advanceBlocked.current = true;
    expandBlocked.current = true;
    setTimeout(() => { advanceBlocked.current = false; }, 650);
    setLargeHovered(false);
    setOffset(o => (o + p) % n);
  };

  const IMG_SLOT_POS = [
    { left: '0%',                 top: '0%',                     width: 'calc(80% - 2px)',    height: '100%'                   },
    { left: 'calc(80% + 2px)',    top: '0%',                     width: 'calc(20% - 2px)',    height: 'calc(33.333% - 2.667px)' },
    { left: 'calc(80% + 2px)',    top: 'calc(33.333% + 1.333px)', width: 'calc(20% - 2px)',   height: 'calc(33.333% - 2.667px)' },
    { left: 'calc(80% + 2px)',    top: 'calc(66.666% + 2.667px)', width: 'calc(20% - 2px)',   height: 'calc(33.334% - 2.667px)' },
  ];
  const IMG_COLORS = ['var(--color-mosaic-6)', 'var(--color-mosaic-4)', 'var(--color-mosaic-2)', 'var(--color-mosaic-7)'];
  const FULL_POS = { left: '0%', top: '0%', width: '100%', height: '100%' };
  // Припаркованные (ещё невидимые) фото стоят чуть ниже нижней миниатюры и
  // клипаются overflow:hidden — при прокрутке выезжают снизу в колонку.
  const PARKED_POS = { left: 'calc(80% + 2px)', top: 'calc(100% + 8px)', width: 'calc(20% - 2px)', height: 'calc(33.334% - 2.667px)' };

  const slides = [
    { title: t('project1.title'), body: t('project1.description') },
    { title: t('project2.title'), body: t('project2.description') },
    { title: t('project3.title'), body: t('project3.description') },
    { title: t('project4.title'), body: t('project4.description') },
  ];

  const slide = slides[current];
  const num = String(current + 1).padStart(2, '0');
  const curMedia = media[current] ?? [];

  // Мобильный пояс превью: окно из 4 миниатюр (активная — на 2‑й позиции),
  // листается по кругу.
  const M_GAP = 4, M_VISIBLE = 4;

  return (
    <div
      ref={ref}
      id="portfolioSection"
      className="s3-wrap h-screen bg-primary-bg"
    >
      <style>{`
        @keyframes s3-fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .s3-slide-in { animation: s3-fade-in 0.45s ease forwards; }
        .s3-arrow { transition: border-color 0.2s !important; }
        .s3-arrow:hover { border-color: rgba(232,168,56,0.55) !important; }
        /* CTA — общий элемент .cta-button; здесь только раскладка/ширина */
        .s3-btn {
          display: block;
          width: 50%;
          padding-left: 0; padding-right: 0;
          text-align: center;
          flex-shrink: 0;
        }
        /* Текстовый блок — единственный, кто сжимается, если описание длиннее
           панели: min-height:0 снимает авто-минимум флекс-элемента, и лишнее
           уходит в скролл самого текста. Кнопка, точки и стрелки при этом
           остаются на своих местах (flex-shrink:0), а не выдавливаются за
           нижний край, где их режет overflow:hidden контейнера. */
        .s3-panel-content { min-height: 0; display: flex; flex-direction: column; }
        .s3-dot { transition: width 0.3s, background-color 0.3s; }
        /* Ссылка внутри описания проекта — цвет текста + золотое подчёркивание */
        .s3-link {
          color: inherit;
          text-decoration: underline;
          text-decoration-thickness: 0.5px;
          text-decoration-color: var(--color-accent1);
          text-underline-offset: 3px;
          transition: color 0.2s;
        }
        .s3-link:hover { color: var(--color-accent1); }

        /* desktop container padding (mobile = 0) */
        @media (min-width: 1023px) {
          .s3-wrap { padding: 80px 232px 80px 130px; display: flex; align-items: center; justify-content: center; }
        }

        /* mobile photo slide animations */
        @keyframes s3-m-in-left {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
        @keyframes s3-m-in-right {
          from { transform: translateX(-100%); }
          to   { transform: translateX(0); }
        }
        .s3-m-in-left  { animation: s3-m-in-left  0.35s ease forwards; }
        .s3-m-in-right { animation: s3-m-in-right 0.35s ease forwards; }

        /* лёгкая пульсация кнопки «…» (mobile), чтобы подсказать, что она кликабельна */
        @keyframes s3-more-pulse {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.05); }
        }
        .s3-more-pulse { animation: s3-more-pulse 1.8s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .s3-more-pulse { animation: none; }
        }

        /* wide (≥1700px) */
        .s3-layout   { }
        .s3-img-zone { flex: 0 0 70%; }
        /* min-width:0 — панель держит ровно свою долю (30%), не раздувается длинным
           заголовком; иначе неразрывный t-display ломает соотношение и клипует фото */
        .s3-panel    { flex: 1; min-width: 0; padding: 40px 0 0 0; }
        .s3-body     { line-height: 1.85; min-height: 0; overflow-y: auto; }

        /* desktop (1023px – 1699px) */
        @media (max-width: 1699px) {
          .s3-layout   { }
          .s3-img-zone { flex: 0 0 70%; }
          .s3-panel    { padding: 40px 44px 0 0; }
        }
      `}</style>

      {/* Desktop: mirrored slider — text left, image right */}
      <div className="hidden desktop:flex s3-layout gap-20 w-full h-full" style={{ overflow: 'hidden' }}>

        {/* Text panel — LEFT */}
        <div className="s3-panel" style={{
          background: 'var(--color-primary-bg)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          position: 'relative',
        }}>
          <div ref={headRuleRef} style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            height: '16px', display: 'flex', alignItems: 'center',
          }}>
            {headRuleW > 0 && <Flourish w={headRuleW} curlW={56} color="var(--color-accent1)" />}
          </div>
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: '0.5px', background: 'var(--color-accent1)', opacity: 0.25,
          }} />

          <div key={`s3-panel-${current}`} className="s3-slide-in s3-panel-content">
            <div className="s3-title t-display" style={{
              color: 'var(--color-primary)',
              marginBottom: '20px',
              whiteSpace: 'pre-line',
            }}>
              {slide.title}
            </div>

            <div style={{
              width: '32px', height: '0.5px',
              background: 'var(--color-accent1)',
              marginBottom: '20px',
            }} />

            <div className="s3-body t-body-compact" style={{
              display: 'flex', flexDirection: 'column', gap: '16px',
            }}>
              {slide.body.split('\n\n').map((p, i) => <p key={i}>{linkRubio(p)}</p>)}
            </div>
          </div>

          <CtaButton
            ref={ctaRef}
            variant="light"
            className="s3-btn"
            style={{ marginTop: '40px' }}
            onClick={() => document.getElementById('contactsSection')?.scrollIntoView({ behavior: 'smooth' })}
          >
            {t('cta')}
          </CtaButton>

          {/* Нижний блок прижат к низу панели; padding-bottom панели = 0, поэтому
             последняя строка (стрелки + номер) выравнивается с нижним краем фото. */}
          <div style={{ marginTop: 'auto', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {Array.from({ length: TOTAL }, (_, i) => (
                <span key={i} onClick={() => setCurrent(i)} className="s3-dot" style={{
                  display: 'inline-block',
                  height: '0.5px',
                  backgroundColor: i === current ? 'var(--color-primary)' : 'var(--color-primary-border)',
                  width: i === current ? '22px' : '12px',
                  cursor: 'pointer',
                }} />
              ))}
            </div>

            {/* Стрелки и номер проекта — на одной строке, разнесены по краям */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={prev} className="s3-arrow" style={{
                  width: arrowSize, height: arrowSize,
                  border: '0.5px solid color-mix(in srgb, var(--color-primary) 25%, transparent)',
                  background: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="13" height="11" viewBox="0 0 13 11" fill="none">
                    <path d="M13 5.5H2M6 1L1.5 5.5 6 10" stroke="var(--color-primary)" strokeWidth="0.75" opacity="0.6"/>
                  </svg>
                </button>
                <button onClick={next} className="s3-arrow" style={{
                  width: arrowSize, height: arrowSize,
                  border: '0.5px solid color-mix(in srgb, var(--color-primary) 45%, transparent)',
                  background: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="13" height="11" viewBox="0 0 13 11" fill="none">
                    <path d="M0 5.5h11M7 1l4.5 4.5L7 10" stroke="var(--color-primary)" strokeWidth="0.75"/>
                  </svg>
                </button>
              </div>
              <span className="s3-count t-label" style={{
                color: 'var(--color-primary-light)',
                letterSpacing: '0.1em',
              }}>
                {num} <span style={{ opacity: 0.35 }}>/</span> {TOTAL_STR}
              </span>
            </div>
          </div>
        </div>

        {/* Image zone — RIGHT */}
        <div className="s3-img-zone" style={{ position: 'relative', overflow: 'hidden', background: 'var(--color-white)' }}>

          {/* Все медиа проекта — постоянные слои; позиция считается из offset.
             p: 0 — крупное, 1‑3 — миниатюры, ≥4 — припарковано снизу (не видно). */}
          {curMedia.map((item, photoIdx) => {
            const n = curMedia.length;
            const p = (photoIdx - offset + n) % n;
            const isLarge = p === 0;
            const isThumb = p >= 1 && p <= 3;
            const parked = p >= 4;
            const pos = isLarge ? (largeHovered ? FULL_POS : IMG_SLOT_POS[0])
              : isThumb ? IMG_SLOT_POS[p]
              : PARKED_POS;
            // Медиа грузим только у видимых, у следующего входящего (p===4)
            // и у только что ушедшего крупного (p===n‑1) — остальные пустые.
            const showMedia = p <= 4 || p === n - 1;

            return (
              <div
                key={photoIdx}
                style={{
                  position: 'absolute',
                  left: pos.left, top: pos.top, width: pos.width, height: pos.height,
                  background: IMG_COLORS[photoIdx % IMG_COLORS.length],
                  opacity: parked ? 0 : 1,
                  transition: 'left 0.55s cubic-bezier(0.4,0,0.2,1), top 0.55s cubic-bezier(0.4,0,0.2,1), width 0.55s cubic-bezier(0.4,0,0.2,1), height 0.55s cubic-bezier(0.4,0,0.2,1), opacity 0.55s ease',
                  zIndex: isLarge ? (largeHovered ? 10 : 3) : parked ? 0 : 1,
                  cursor: isThumb ? 'pointer' : 'default',
                  pointerEvents: parked ? 'none' : 'auto',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden',
                  boxSizing: 'border-box',
                }}
                onMouseEnter={isLarge ? () => { if (!expandBlocked.current && isLandscape[photoIdx]) setLargeHovered(true); } : isThumb ? () => advance(p) : undefined}
                onMouseLeave={isLarge ? () => setLargeHovered(false) : undefined}
                onClick={isThumb ? () => advance(p) : undefined}
                onTransitionEnd={isLarge ? () => { expandBlocked.current = false; } : undefined}
              >
                {showMedia && (
                  <>
                    <MediaLayer
                      item={item}
                      active={isLarge}
                      sizes="60vw"
                      priority={photoIdx === 0 && item.type === 'image'}
                      onRatio={landscape => setIsLandscape(prev => ({ ...prev, [photoIdx]: landscape }))}
                    />
                    {item.type === 'video' && isThumb && <PlayBadge size={22} />}
                  </>
                )}
              </div>
            );
          })}

          {/* Gold separator on LEFT edge of image zone */}
          <div style={{
            position: 'absolute',
            top: '48px', bottom: '48px', left: 0,
            width: '0.5px',
            background: 'var(--color-accent1)',
            opacity: 0.4, zIndex: 20,
          }} />

        </div>


      </div>

      {/* ── Mobile layout ── */}
      <div className="desktop:hidden w-full h-full" style={{ position: 'relative', overflow: 'hidden' }}>

        {/* ── Верхняя половина: фото + пояс миниатюр (фиксирована сверху) ── */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%',
          display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Large photo — занимает верх половины минус пояс миниатюр.
             В раскрытом виде клик по фото сворачивает панель. */}
          <div
            style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden', background: 'var(--color-primary-dark)', cursor: expanded ? 'pointer' : 'default' }}
            onClick={expanded ? () => setExpanded(false) : undefined}
            onTouchStart={e => { if (expanded) return; setTouchStart(e.touches[0].clientX); }}
            onTouchEnd={e => {
              if (expanded || touchStart === null) return;
              const dx = touchStart - e.changedTouches[0].clientX;
              if (Math.abs(dx) > 40) dx > 0 ? mobileNextPhoto() : mobilePrevPhoto();
              setTouchStart(null);
            }}
          >
            <div
              key={`m-ph-${current}-${mobileActive}`}
              className={mobileDir === 'left' ? 's3-m-in-left' : 's3-m-in-right'}
              style={{ position: 'absolute', inset: 0 }}
            >
              {curMedia[mobileActive] ? (
                <MediaLayer item={curMedia[mobileActive]} active sizes="100vw"
                  objectPosition="center" priority={curMedia[mobileActive].type === 'image'} />
              ) : (
                <div style={{ width: '100%', height: '100%', background: IMG_COLORS[mobileActive % IMG_COLORS.length],
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="t-hero" style={{
                    color: 'rgba(255,255,255,0.2)', userSelect: 'none' }}>{mobileActive}</span>
                </div>
              )}
            </div>
          </div>

          {/* Thumbnail strip — окно из 4 превью, активное на 2‑й позиции;
             свайп/тап листают по кругу со сдвигом. */}
          <div style={{ flexShrink: 0, padding: '10px 16px 0' }}>
            <div
              style={{ overflow: 'hidden', display: 'flex', gap: `${M_GAP}px` }}
              onTouchStart={e => { mobSwiped.current = false; setTouchStart(e.touches[0].clientX); }}
              onTouchEnd={e => {
                if (touchStart === null) return;
                const dx = touchStart - e.changedTouches[0].clientX;
                if (Math.abs(dx) > 40) { mobSwiped.current = true; dx > 0 ? mobileNextPhoto() : mobilePrevPhoto(); }
                setTouchStart(null);
              }}
            >
              {curMedia.length > 0 && Array.from({ length: Math.min(M_VISIBLE, curMedia.length) }, (_, slot) => {
                const idx = (mobileActive - 1 + slot + curMedia.length) % curMedia.length;
                const active = idx === mobileActive;
                return (
                  <button
                    key={slot}
                    onClick={() => { if (mobSwiped.current) { mobSwiped.current = false; return; } mobileThumbTap(slot); }}
                    style={{
                      flex: 1, height: '54px', position: 'relative', overflow: 'hidden',
                      padding: 0, background: 'transparent', cursor: 'pointer', outline: 'none',
                      boxSizing: 'border-box',
                      border: active
                        ? '3px solid var(--color-accent1)'
                        : '1.5px solid color-mix(in srgb, var(--color-primary-border) 50%, transparent)',
                    }}
                  >
                    <MediaLayer item={curMedia[idx]} active={false} sizes="25vw" objectPosition="center" />
                    {curMedia[idx].type === 'video' && <PlayBadge size={18} />}
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* ── Нижняя панель: текст + стрелки + точки. В раскрытом виде растёт
           вверх на overflowPx, перекрывая низ фото (фото остаётся на месте). ── */}
        <div key={`m-txt-${current}`} className="s3-slide-in" style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 2,
          height: expanded ? `calc(50% + ${overflowPx + 4}px)` : '50%',
          maxHeight: '94%',
          background: 'var(--color-primary-bg)',
          padding: '28px 16px 84px', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', gap: '10px',
          transition: 'height 0.4s cubic-bezier(0.4,0,0.2,1)',
        }}>
          <div className="t-display" style={{ color: 'var(--color-primary)', whiteSpace: 'pre-line', flexShrink: 0 }}>
            {slide.title}
          </div>
          <div style={{ width: '25vw', height: '1px', background: 'var(--color-accent1)', flexShrink: 0 }} />

          {/* Полный текст описания абзацами. В свёрнутом виде лишнее отсекается,
             в правом нижнем углу — квадратная кнопка «…» (раскрыть). В раскрытом
             виде клик по тексту сворачивает обратно. */}
          <div
            ref={textRef}
            className="t-body-compact"
            onClick={expanded ? () => setExpanded(false) : undefined}
            style={{ flex: 1, minHeight: 0, overflow: expanded ? 'auto' : 'hidden', position: 'relative', whiteSpace: 'pre-line', cursor: expanded ? 'pointer' : 'default' }}
          >
            {/* Абзацы — отдельными <p>: зазор между ними задаётся явно (0.8
               строки вместо целой пустой строки при pre-line, т.е. −20%). */}
            {slide.body.split('\n\n').map((p, i) => (
              <p key={i} data-para style={{ marginTop: i ? '1.4em' : 0 }}>{linkRubio(p)}</p>
            ))}
            {!expanded && truncated && (
              <>
                {/* заглушка прячет обрезанную нижнюю строку — текст кончается на полной */}
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: bottomInset,
                  background: 'var(--color-primary-bg)', pointerEvents: 'none' }} />
                <button
                  onClick={e => { e.stopPropagation(); setExpanded(true); }}
                  aria-label="Раскрыть текст"
                  className="s3-more-pulse"
                  style={{
                    // Размер — от строки текста: высота на 2px меньше строки,
                    // ширина в той же пропорции 1.3:1. Сидит ровно в последней
                    // полной строке (bottom: bottomInset + 1px — те 2px поровну
                    // сверху и снизу), поэтому строка под ней не разъезжается.
                    // Прижата к правому краю текстовой области: её край и есть
                    // отступ панели от края экрана (padding-right 16px), поэтому
                    // собственного отступа у кнопки почти нет. Оставшиеся 2px —
                    // запас под пульсацию (.s3-more-pulse, scale 1.05): на пике
                    // кнопка вылезает вширь на ~0.8px в каждую сторону, а панель
                    // и текстовая область обе overflow: hidden, и без запаса
                    // срезало бы правый бордер.
                    position: 'absolute', right: '2px', bottom: bottomInset + 1,
                    width: (lineH - 2) * 1.3, height: lineH - 2, boxSizing: 'border-box',
                    border: '1.5px solid var(--color-accent1)',
                    background: 'var(--color-primary-bg)',
                    color: 'var(--color-text-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', padding: 0, lineHeight: 1,
                  }}
                >…</button>
              </>
            )}
          </div>

          {/* Стрелки листания проектов — как на 2‑м экране, но с золотым бордером.
             Отступ сверху минимальный (к 10px общего gap панели): всё, что здесь
             не занято, достаётся тексту — в свёрнутом виде влезает больше строк. */}
          <div style={{ display: 'flex', gap: '14px', alignSelf: 'flex-start', flexShrink: 0, marginTop: '6px' }}>
            <button
              onClick={prev}
              aria-label="Previous"
              style={{
                width: '41.6px', height: '41.6px',
                border: '1px solid var(--color-accent1)',
                background: 'transparent', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="17.6" height="14.4" viewBox="0 0 13 11" fill="none">
                <path d="M13 5.5H2M6 1L1.5 5.5 6 10" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button
              onClick={next}
              aria-label="Next"
              style={{
                width: '41.6px', height: '41.6px',
                border: '1px solid var(--color-accent1)',
                background: 'transparent', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="17.6" height="14.4" viewBox="0 0 13 11" fill="none">
                <path d="M0 5.5h11M7 1l4.5 4.5L7 10" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* Nav dots — переключение проектов */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0, marginTop: '4px' }}>
            {Array.from({ length: TOTAL }, (_, i) => (
              <span key={i} onClick={() => setCurrent(i)} className="s3-dot" style={{
                display: 'inline-block', height: '0.5px', cursor: 'pointer',
                backgroundColor: i === current ? 'var(--color-primary)' : 'var(--color-primary-border)',
                width: i === current ? '22px' : '12px',
              }} />
            ))}
          </div>
        </div>

      </div>

    </div>
  );
});

Projects.displayName = 'Projects';
export default Projects;
