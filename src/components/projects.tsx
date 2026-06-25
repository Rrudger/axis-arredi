'use client';

import { forwardRef, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

const TOTAL = 5;

const Projects = forwardRef<HTMLDivElement>((_, ref) => {
  const t = useTranslations('projects');
  const [current, setCurrent] = useState(0);
  const [imgSlots, setImgSlots] = useState([0, 1, 2, 3]); // imgSlots[slot] = item; slot 0 = large
  const [largeHovered, setLargeHovered] = useState(false);
  const [isLandscape, setIsLandscape] = useState<Record<number, boolean>>({});
  const [mobileActive, setMobileActive] = useState(0);
  const [mobileDir, setMobileDir] = useState<'left' | 'right'>('left');
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const swapBlocked = useRef(false);
  const expandBlocked = useRef(false);

  useEffect(() => { setMobileActive(0); }, [current]);

  const prev = () => setCurrent(i => (i - 1 + TOTAL) % TOTAL);
  const next = () => setCurrent(i => (i + 1) % TOTAL);

  const mobileNextPhoto = () => { setMobileDir('left');  setMobileActive(i => (i + 1) % 4); };
  const mobilePrevPhoto = () => { setMobileDir('right'); setMobileActive(i => (i - 1 + 4) % 4); };
  const handleMobileThumb = (item: number) => {
    if (item === mobileActive) return;
    setMobileDir(item > mobileActive ? 'left' : 'right');
    setMobileActive(item);
  };

  const swapWithLarge = (item: number) => {
    if (swapBlocked.current) return;
    swapBlocked.current = true;
    expandBlocked.current = true;
    setTimeout(() => { swapBlocked.current = false; }, 1500);
    setLargeHovered(false);
    setImgSlots(prev => {
      const slot = prev.indexOf(item);
      if (slot === 0) return prev;
      const next = [...prev];
      [next[0], next[slot]] = [next[slot], next[0]];
      return next;
    });
  };

  const SLIDE_PHOTOS: (string[] | null)[] = [
    [
      '/images/projects/kitchen/cpopped.jpg',
      '/images/projects/kitchen/DSC01202.jpg',
      '/images/projects/kitchen/IMG_20260518_123141.jpg',
      '/images/projects/kitchen/IMG_20260520_155012.jpg',
    ],
    null, null, null, null,
  ];

  const IMG_SLOT_POS = [
    { left: '0%',                 top: '0%',                     width: 'calc(80% - 2px)',    height: '100%'                   },
    { left: 'calc(80% + 2px)',    top: '0%',                     width: 'calc(20% - 2px)',    height: 'calc(33.333% - 2.667px)' },
    { left: 'calc(80% + 2px)',    top: 'calc(33.333% + 1.333px)', width: 'calc(20% - 2px)',   height: 'calc(33.333% - 2.667px)' },
    { left: 'calc(80% + 2px)',    top: 'calc(66.666% + 2.667px)', width: 'calc(20% - 2px)',   height: 'calc(33.334% - 2.667px)' },
  ];
  const IMG_COLORS = ['var(--color-mosaic-6)', 'var(--color-mosaic-4)', 'var(--color-mosaic-2)', 'var(--color-mosaic-7)'];

  const slides = [
    { label: t('project1.label'), title: t('project1.title'), body: t('project1.description') },
    { label: t('project2.label'), title: t('project2.title'), body: t('project2.description') },
    { label: t('project3.label'), title: t('project3.title'), body: t('project3.description') },
    { label: t('project4.label'), title: t('project4.title'), body: t('project4.description') },
    { label: t('project5.label'), title: t('project5.title'), body: t('project5.description') },
  ];

  const slide = slides[current];
  const num = String(current + 1).padStart(2, '0');

  return (
    <div
      ref={ref}
      id="projects"
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
        .s3-btn {
          letter-spacing: 0.22em;
          color: var(--color-primary);
          background: transparent;
          border: 1px solid var(--color-primary);
          padding: 13px 28px;
          cursor: pointer;
          transition: background 0.3s, color 0.3s, border-color 0.3s;
          display: block;
          width: 50%;
        }
        .s3-btn:hover {
          background: var(--color-primary);
          color: var(--color-primary-bg);
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

        /* wide (≥1700px) */
        .s3-layout   { }
        .s3-img-zone { flex: 0 0 60%; }
        .s3-panel    { flex: 1; padding: 80px 0 44px 0; }
        .s3-body     { line-height: 2.0; }

        /* desktop (1023px – 1699px) */
        @media (max-width: 1699px) {
          .s3-layout   { }
          .s3-img-zone { flex: 0 0 50%; }
          .s3-panel    { padding: 80px 44px 44px 0; }
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
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            height: '16px', display: 'flex', alignItems: 'center',
          }}>
            <div style={{ flex: 1, height: '1.5px', background: 'var(--color-accent1)', opacity: 0.6 }} />
            <svg width="14" height="14" viewBox="0 0 14 14" style={{ flexShrink: 0, margin: '0 10px', display: 'block' }}>
              <polygon points="7,1 13,7 7,13 1,7"
                fill="none" stroke="var(--color-accent1)" strokeWidth="1.5" opacity="0.85"/>
            </svg>
            <div style={{ flex: 1, height: '1.5px', background: 'var(--color-accent1)', opacity: 0.6 }} />
          </div>
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: '0.5px', background: 'var(--color-accent1)', opacity: 0.25,
          }} />

          <div key={`s3-panel-${current}`} className="s3-slide-in">
            <div className="s3-title t-display" style={{
              color: 'var(--color-primary)',
              marginBottom: '40px',
              whiteSpace: 'pre',
            }}>
              {slide.title}
            </div>

            <div style={{
              width: '32px', height: '0.5px',
              background: 'var(--color-accent1)',
              marginBottom: '20px',
            }} />

            <div className="s3-body t-body" style={{
              display: 'flex', flexDirection: 'column', gap: '16px',
            }}>
              {slide.body.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '40px' }}>
            <button onClick={prev} className="s3-arrow" style={{
              width: '42px', height: '42px',
              border: '0.5px solid color-mix(in srgb, var(--color-primary) 25%, transparent)',
              background: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="13" height="11" viewBox="0 0 13 11" fill="none">
                <path d="M13 5.5H2M6 1L1.5 5.5 6 10" stroke="var(--color-primary)" strokeWidth="0.75" opacity="0.6"/>
              </svg>
            </button>
            <button onClick={next} className="s3-arrow" style={{
              width: '42px', height: '42px',
              border: '0.5px solid color-mix(in srgb, var(--color-primary) 45%, transparent)',
              background: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="13" height="11" viewBox="0 0 13 11" fill="none">
                <path d="M0 5.5h11M7 1l4.5 4.5L7 10" stroke="var(--color-primary)" strokeWidth="0.75"/>
              </svg>
            </button>
          </div>

          <button
            className="s3-btn t-label"
            style={{ marginTop: '24px' }}
            onClick={() => document.getElementById('contactsSection')?.scrollIntoView({ behavior: 'smooth' })}
          >
            {t('slides.cta')}
          </button>

          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ height: '0.5px', background: 'var(--color-accent1)', opacity: 0.35 }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
              <span className="s3-count t-label" style={{
                color: 'var(--color-primary-light)',
                letterSpacing: '0.1em',
              }}>
                {num} <span style={{ opacity: 0.35 }}>/</span> 05
              </span>
            </div>
          </div>
        </div>

        {/* Image zone — RIGHT */}
        <div className="s3-img-zone" style={{ position: 'relative', overflow: 'hidden', background: 'var(--color-white)' }}>

          {/* Animated photo items */}
          {[0, 1, 2, 3].map(item => {
            const slot = imgSlots.indexOf(item);
            const isLarge = slot === 0;
            const pos = isLarge && largeHovered
              ? { left: '0%', top: '0%', width: '100%', height: '100%' }
              : IMG_SLOT_POS[slot];

            return (
              <div
                key={item}
                style={{
                  position: 'absolute',
                  left: pos.left, top: pos.top, width: pos.width, height: pos.height,
                  background: IMG_COLORS[item],
                  transition: 'left 0.55s cubic-bezier(0.4,0,0.2,1), top 0.55s cubic-bezier(0.4,0,0.2,1), width 0.55s cubic-bezier(0.4,0,0.2,1), height 0.55s cubic-bezier(0.4,0,0.2,1)',
                  zIndex: isLarge ? (largeHovered ? 10 : 2) : 1,
                  cursor: isLarge ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden',
                  boxSizing: 'border-box',
                }}
                onMouseEnter={isLarge ? () => { if (!expandBlocked.current && isLandscape[item]) setLargeHovered(true); } : () => swapWithLarge(item)}
                onMouseLeave={isLarge ? () => setLargeHovered(false) : undefined}
                onClick={!isLarge ? () => swapWithLarge(item) : undefined}
                onTransitionEnd={isLarge ? () => { expandBlocked.current = false; } : undefined}
              >
                {SLIDE_PHOTOS[current] ? (
                  <Image
                    src={SLIDE_PHOTOS[current]![item]}
                    alt=""
                    fill
                    sizes="60vw"
                    style={{ objectFit: 'cover', objectPosition: 'left center' }}
                    priority={item === 0}
                    onLoad={e => {
                      const img = e.currentTarget as HTMLImageElement;
                      setIsLandscape(prev => ({ ...prev, [item]: img.naturalWidth > img.naturalHeight }));
                    }}
                  />
                ) : (
                  <span style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: isLarge ? '64px' : '22px',
                    color: 'rgba(255,255,255,0.2)',
                    userSelect: 'none',
                    transition: 'font-size 0.55s cubic-bezier(0.4,0,0.2,1)',
                    pointerEvents: 'none',
                  }}>{item}</span>
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

          {/* Caption — bottom-right (mirrored from bottom-left in Projects) */}
          <div key={`s3-cap-${current}`} className="s3-slide-in" style={{
            position: 'absolute', bottom: '40px', right: '48px',
            display: 'flex', alignItems: 'center', gap: '16px', zIndex: 20,
          }}>
            <span className="t-caption uppercase" style={{
              letterSpacing: '0.22em',
              color: 'var(--color-primary-border)',
              opacity: 0.7,
            }}>{slide.label}</span>
            <div style={{ width: '28px', height: '0.5px', background: 'var(--color-accent1)' }} />
          </div>

        </div>


      </div>

      {/* ── Mobile layout ── */}
      <div className="desktop:hidden w-full h-full flex flex-col overflow-hidden">

        {/* Large photo */}
        <div
          style={{ position: 'relative', flexShrink: 0, height: '38vh', overflow: 'hidden', background: 'var(--color-primary-dark)' }}
          onTouchStart={e => setTouchStart(e.touches[0].clientX)}
          onTouchEnd={e => {
            if (touchStart === null) return;
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
            {SLIDE_PHOTOS[current] ? (
              <Image src={SLIDE_PHOTOS[current]![mobileActive]} alt="" fill sizes="100vw"
                style={{ objectFit: 'cover' }} priority />
            ) : (
              <div style={{ width: '100%', height: '100%', background: IMG_COLORS[mobileActive],
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="t-hero" style={{
                  color: 'rgba(255,255,255,0.2)', userSelect: 'none' }}>{mobileActive}</span>
              </div>
            )}
          </div>
        </div>

        {/* Thumbnail strip */}
        <div style={{ flexShrink: 0, display: 'flex', gap: '4px', padding: '10px 16px 0' }}>
          {[0, 1, 2, 3].map(item => (
            <button key={item} onClick={() => handleMobileThumb(item)} style={{
              flex: 1, height: '54px', position: 'relative', overflow: 'hidden',
              padding: 0, background: 'transparent', cursor: 'pointer', outline: 'none',
              border: `1.5px solid ${item === mobileActive ? 'var(--color-accent1)' : 'color-mix(in srgb, var(--color-primary-border) 50%, transparent)'}`,
            }}>
              {SLIDE_PHOTOS[current] ? (
                <Image src={SLIDE_PHOTOS[current]![item]} alt="" fill sizes="25vw" style={{ objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', background: IMG_COLORS[item] }} />
              )}
            </button>
          ))}
        </div>

        {/* Label + counter */}
        <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', padding: '10px 16px 0' }}>
          <span className="t-caption uppercase" style={{
            letterSpacing: '0.22em', color: 'var(--color-primary-border)' }}>
            {slide.label}
          </span>
          <span className="t-label" style={{
            color: 'var(--color-primary-light)', letterSpacing: '0.1em' }}>
            {num} <span style={{ opacity: 0.35 }}>/</span> 05
          </span>
        </div>

        {/* Diamond separator */}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', padding: '10px 16px 0' }}>
          <div style={{ flex: 1, height: '0.75px', background: 'var(--color-accent1)', opacity: 0.55 }} />
          <svg width="14" height="14" viewBox="0 0 14 14" style={{ flexShrink: 0, margin: '0 10px', display: 'block' }}>
            <polygon points="7,1 13,7 7,13 1,7" fill="none" stroke="var(--color-accent1)" strokeWidth="1.5" opacity="0.85"/>
          </svg>
          <div style={{ flex: 1, height: '0.75px', background: 'var(--color-accent1)', opacity: 0.55 }} />
        </div>

        {/* Text */}
        <div key={`m-txt-${current}`} className="s3-slide-in" style={{
          flex: 1, padding: '14px 16px 0', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', gap: '10px',
        }}>
          <div className="t-display" style={{ color: 'var(--color-primary)', whiteSpace: 'pre' }}>
            {slide.title}
          </div>
          <div style={{ width: '28px', height: '0.5px', background: 'var(--color-accent1)', flexShrink: 0 }} />
          <div className="t-body" style={{ overflow: 'hidden' }}>
            {slide.body.split('\n\n')[0]}
          </div>
        </div>

        {/* Nav dots + CTA */}
        <div style={{ flexShrink: 0, padding: '20px 16px 14px' }}>
          <div style={{ height: '0.5px', background: 'var(--color-accent1)', opacity: 0.35, marginBottom: '14px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {Array.from({ length: TOTAL }, (_, i) => (
                <span key={i} onClick={() => setCurrent(i)} className="s3-dot" style={{
                  display: 'inline-block', height: '0.5px', cursor: 'pointer',
                  backgroundColor: i === current ? 'var(--color-primary)' : 'var(--color-primary-border)',
                  width: i === current ? '22px' : '12px',
                }} />
              ))}
            </div>
            <button
              onClick={() => document.getElementById('contactsSection')?.scrollIntoView({ behavior: 'smooth' })}
              className="t-label"
              style={{ letterSpacing: '0.22em', color: 'var(--color-primary)',
                background: 'transparent', border: '1px solid var(--color-primary)',
                padding: '11px 20px', cursor: 'pointer' }}
            >
              {t('slides.cta')}
            </button>
          </div>
        </div>

      </div>

    </div>
  );
});

Projects.displayName = 'Projects';
export default Projects;
