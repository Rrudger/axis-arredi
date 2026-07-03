'use client';

import { forwardRef, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import CtaButton from '@/components/ui/cta-button';
import Flourish from '@/components/ui/flourish';

const TOTAL = 2;
const TOTAL_STR = String(TOTAL).padStart(2, '0');

const Projects = forwardRef<HTMLDivElement>((_, ref) => {
  const t = useTranslations('projects');
  const [current, setCurrent] = useState(0);

  // Фото проектов подтягиваются из папок public/images/projects/* на рантайме
  // через API — порядок и состав меняются вслед за файлами, без правок кода.
  // photos[slide] — отсортированный список src'ов (файл «0…» первый).
  const [photos, setPhotos] = useState<string[][]>([]);
  useEffect(() => {
    let alive = true;
    fetch('/api/project-photos')
      .then(r => r.json())
      .then((d: { photos: string[][] }) => { if (alive) setPhotos(d.photos ?? []); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  const [offset, setOffset] = useState(0); // индекс верхнего фото видимого окна в curPhotos
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
      setBottomInset(el.clientHeight % lh);
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

  // Мобильная навигация листает по кругу по всем фото: индекс 0..n‑1 с
  // заворотом, поэтому каждый шаг реально сдвигает ленту (нет краёв, где она
  // упирается). mobSwiped гасит ложный тап по превью после свайпа.
  const mobSwiped = useRef(false);
  const mobileGo = (dir: 1 | -1) => {
    const n = curPhotos.length;
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
  // фото снизу. Так наведениями доступен весь список папки, а не только 4.
  const advance = (p: number) => {
    const n = curPhotos.length;
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
  ];

  const slide = slides[current];
  const num = String(current + 1).padStart(2, '0');
  const curPhotos = photos[current] ?? [];

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
        }
        .s3-dot { transition: width 0.3s, background-color 0.3s; }

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
        .s3-body     { line-height: 2.0; }

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

          <div key={`s3-panel-${current}`} className="s3-slide-in">
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
              {slide.body.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
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
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
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

          {/* Все фото проекта — постоянные слои; позиция считается из offset.
             p: 0 — крупное, 1‑3 — миниатюры, ≥4 — припарковано снизу (не видно). */}
          {curPhotos.map((src, photoIdx) => {
            const n = curPhotos.length;
            const p = (photoIdx - offset + n) % n;
            const isLarge = p === 0;
            const isThumb = p >= 1 && p <= 3;
            const parked = p >= 4;
            const pos = isLarge ? (largeHovered ? FULL_POS : IMG_SLOT_POS[0])
              : isThumb ? IMG_SLOT_POS[p]
              : PARKED_POS;
            // Картинку грузим только у видимых, у следующего входящего (p===4)
            // и у только что ушедшего крупного (p===n‑1) — остальные пустые.
            const showImg = p <= 4 || p === n - 1;

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
                {showImg && (
                  <Image
                    src={src}
                    alt=""
                    fill
                    sizes="60vw"
                    style={{ objectFit: 'cover', objectPosition: 'left center' }}
                    priority={photoIdx === 0}
                    onLoad={e => {
                      const img = e.currentTarget as HTMLImageElement;
                      setIsLandscape(prev => ({ ...prev, [photoIdx]: img.naturalWidth > img.naturalHeight }));
                    }}
                  />
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
              {curPhotos[mobileActive] ? (
                <Image src={curPhotos[mobileActive]} alt="" fill sizes="100vw"
                  style={{ objectFit: 'cover' }} priority />
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
              {curPhotos.length > 0 && Array.from({ length: Math.min(M_VISIBLE, curPhotos.length) }, (_, slot) => {
                const idx = (mobileActive - 1 + slot + curPhotos.length) % curPhotos.length;
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
                    <Image src={curPhotos[idx]} alt="" fill sizes="25vw" style={{ objectFit: 'cover' }} />
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
            {slide.body}
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
                    position: 'absolute', right: '10px', bottom: bottomInset,
                    width: '36.4px', height: '28px', boxSizing: 'border-box',
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

          {/* Стрелки листания проектов — как на 2‑м экране, но с золотым бордером */}
          <div style={{ display: 'flex', gap: '14px', alignSelf: 'flex-start', flexShrink: 0, marginTop: '20px' }}>
            <button
              onClick={prev}
              aria-label="Previous"
              style={{
                width: '52px', height: '52px',
                border: '1px solid var(--color-accent1)',
                background: 'transparent', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="22" height="18" viewBox="0 0 13 11" fill="none">
                <path d="M13 5.5H2M6 1L1.5 5.5 6 10" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button
              onClick={next}
              aria-label="Next"
              style={{
                width: '52px', height: '52px',
                border: '1px solid var(--color-accent1)',
                background: 'transparent', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="22" height="18" viewBox="0 0 13 11" fill="none">
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
