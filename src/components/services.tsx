'use client'

import { forwardRef, useEffect, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import CtaButton from '@/components/ui/cta-button';
import Flourish from '@/components/ui/flourish';

/* ── Donut geometry (viewBox 0 0 400 400) ── */
const CX = 200, CY = 200;
const INNER = 122, OUTER = 172;
const MID = (INNER + OUTER) / 2;
const GAP = 4; // degrees between segments

const polar = (angleDeg: number, r: number) => ({
  x: CX + r * Math.sin((angleDeg * Math.PI) / 180),
  y: CY - r * Math.cos((angleDeg * Math.PI) / 180),
});
const s = (p: { x: number; y: number }) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`;

function arcPath(a0: number, a1: number) {
  const laf = a1 - a0 > 180 ? 1 : 0;
  return [
    `M ${s(polar(a0, OUTER))}`,
    `A ${OUTER} ${OUTER} 0 ${laf} 1 ${s(polar(a1, OUTER))}`,
    `L ${s(polar(a1, INNER))}`,
    `A ${INNER} ${INNER} 0 ${laf} 0 ${s(polar(a0, INNER))}`,
    'Z',
  ].join(' ');
}

// Segment i is centred on the diagonal (45,135,225,315) and tied to a corner card.
const SEGMENTS = [0, 1, 2, 3].map(i => {
  const start = i * 90 + GAP / 2;
  const end = (i + 1) * 90 - GAP / 2;
  const center = i * 90 + 45;
  return {
    i,
    path: arcPath(start, end),
    numPos: polar(center, MID),
    tick0: polar(center, OUTER),
    tick1: polar(center, OUTER + 16),
    cls: ['svc2-tr', 'svc2-br', 'svc2-bl', 'svc2-tl'][i], // NE, SE, SW, NW
  };
});

const ProjectsAlt = forwardRef<HTMLDivElement>((_, ref) => {
  const t = useTranslations('services');
  // First service is selected on load; click pins a service, hover previews it.
  const [selected, setSelected] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const active = hover ?? selected;
  const [mobileActive, setMobileActive] = useState(0);
  const [mobTouchX, setMobTouchX] = useState<number | null>(null);

  /* Available service photos, discovered at runtime from the folder via the API
     route — keyed "{slide}_{n}". svcPhoto() returns a src or null (empty slot).
     Slide is 1‑based; n is 1 (desktop centre / mobile top) or 2 (mobile bottom). */
  const [photos, setPhotos] = useState<Record<string, string>>({});
  useEffect(() => {
    let alive = true;
    fetch('/api/service-photos')
      .then(r => r.json())
      .then((d: { photos: Record<string, string> }) => { if (alive) setPhotos(d.photos ?? {}); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  const svcPhoto = (slide: number, n: number) => photos[`${slide}_${n}`] ?? null;
  const mobPrev = () => setMobileActive(i => (i - 1 + 4) % 4);
  const mobNext = () => setMobileActive(i => (i + 1) % 4);

  /* Desktop centre circle uses slot _2, except service 2 (parquet) → _1. */
  const centerPhoto = svcPhoto(active + 1, active === 1 ? 1 : 2);

  const cards = [0, 1, 2, 3].map(i => {
    const body: string = t(`slides.slide${i + 1}.body`);
    const parts = body.split('\n\n');
    return {
      num: String(i + 1).padStart(2, '0'),
      label: t(`slides.slide${i + 1}.label`),
      title: t(`slides.slide${i + 1}.title`).replace(/\n/g, ' '),
      short: parts[0],
      paras: parts,
    };
  });

  return (
    <div
      id="projectsSection"
      ref={ref}
      className="svc2-section h-screen bg-primary-bg"
    >
      <style>{`
        @keyframes svc2-fade-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .svc2-fade { animation: svc2-fade-in 0.6s ease forwards; }

        /* Mobile active circle — double-line frame (primary line + gold hairline
           with a gap) plus a very subtle breathing glow. Decorative rings are
           repeated in both keyframes so only the outer glow animates. */
        @keyframes svc2-mob-glow {
          0%, 100% {
            box-shadow:
              inset 0 0 0 5px var(--color-primary-bg),
              inset 0 0 0 6.5px color-mix(in srgb, var(--color-accent1) 45%, transparent),
              0 0 0 1px color-mix(in srgb, var(--color-accent1) 38%, transparent),
              inset 0 0 55px -24px color-mix(in srgb, var(--color-primary) 40%, transparent),
              0 0 30px 0 color-mix(in srgb, var(--color-primary) 13%, transparent);
          }
          50% {
            box-shadow:
              inset 0 0 0 5px var(--color-primary-bg),
              inset 0 0 0 6.5px color-mix(in srgb, var(--color-accent1) 52%, transparent),
              0 0 0 1px color-mix(in srgb, var(--color-accent1) 46%, transparent),
              inset 0 0 55px -24px color-mix(in srgb, var(--color-primary) 40%, transparent),
              0 0 40px 3px color-mix(in srgb, var(--color-primary) 18%, transparent);
          }
        }
        .svc2-mobcircle { animation: svc2-mob-glow 5s ease-in-out infinite; }

        /* Decorative dashed ring outside the active circle, slow rotation */
        @keyframes svc2-mob-ring-spin {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to   { transform: translate(-50%, -50%) rotate(360deg); }
        }
        .svc2-mobring { animation: svc2-mob-ring-spin 160s linear infinite; }

        @media (prefers-reduced-motion: reduce) {
          .svc2-mobcircle { animation: none; }
          .svc2-mobring { animation: none; }
        }

        .svc2-section {
          display: flex; align-items: center; justify-content: center;
          position: relative;
          padding: 80px 232px 80px 130px;
        }

        .svc2-diagram {
          position: relative;
          display: grid;
          grid-template-columns: 1fr 1fr;
          grid-template-rows: 1fr 1fr;
        }

        /* Card shell — fixed width, never changes, grid never recalculates */
        .svc2-card {
          position: relative; z-index: 3;
          width: var(--svc2-card-w);
          cursor: pointer;
        }
        .svc2-card.is-active { z-index: 6; }

        .svc2-tl { grid-column: 1; grid-row: 1; justify-self: end;   align-self: start; }
        .svc2-tr { grid-column: 2; grid-row: 1; justify-self: start; align-self: start; }
        /* Bottom row: both cards stretch to the row height (auto-sized to the
           taller one) and their content flows from the top, so the headings line
           up while the heading→text gap stays the same as the other cards. */
        .svc2-bl { grid-column: 1; grid-row: 2; justify-self: end;   align-self: stretch; }
        .svc2-br { grid-column: 2; grid-row: 2; justify-self: start; align-self: stretch; }

        /* Text/head alignment by side */
        .svc2-tl, .svc2-bl { text-align: right; }
        .svc2-tr, .svc2-br { text-align: left; }
        .svc2-tl .svc2-head, .svc2-bl .svc2-head { flex-direction: row-reverse; }
        .svc2-tl .svc2-rule, .svc2-bl .svc2-rule { margin-left: auto; }

        /* Collapsed state — in normal flow, gives the card shell its height */
        .svc2-static { padding: 22px 24px; transition: opacity 0.2s ease; }
        .svc2-card.is-active .svc2-static { opacity: 0; }

        /* Expanded panel — position:absolute, invisible to layout */
        .svc2-panel {
          position: absolute;
          box-sizing: border-box;
          width: var(--svc2-card-w-open);
          padding: 22px 24px;
          background: var(--color-primary-bg);
          border: 0.5px solid rgba(232,168,56,0.5);
          box-shadow: 0 18px 50px -28px var(--color-shadow);
          pointer-events: none; z-index: 6;
          transition: clip-path 0.55s cubic-bezier(0.4,0,0.2,1);
        }
        /* Left cards: inner edge = right. Panel grows leftward, reveals right→left */
        .svc2-tl .svc2-panel, .svc2-bl .svc2-panel {
          right: 0; clip-path: inset(0 0 0 100%);
        }
        /* Right cards: inner edge = left. Panel grows rightward, reveals left→right */
        .svc2-tr .svc2-panel, .svc2-br .svc2-panel {
          left: 0; clip-path: inset(0 100% 0 0);
        }
        .svc2-tl .svc2-panel, .svc2-tr .svc2-panel { top: 0; }
        .svc2-bl .svc2-panel, .svc2-br .svc2-panel { bottom: 0; }
        .svc2-card.is-active .svc2-panel {
          clip-path: inset(0 0 0 0); pointer-events: auto;
        }

        .svc2-head { display: flex; align-items: baseline; gap: 12px; margin-bottom: 12px; }
        .svc2-num {
          letter-spacing: 0.05em; color: var(--color-accent1);
        }
        .svc2-label {
          letter-spacing: 0.22em; text-transform: uppercase;
          color: var(--color-primary-light);
        }
        .svc2-title {
          color: var(--color-primary); line-height: 1.25;
          letter-spacing: 0.03em; margin-bottom: 14px;
        }
        .svc2-rule { display: block; margin-bottom: 14px; }
        .svc2-body > p + p { margin-top: 12px; }

        /* Centre donut + photo */
        .svc2-center {
          position: absolute; left: 50%; top: 50%;
          transform: translate(-50%, -50%);
          width: var(--svc2-circle); height: var(--svc2-circle);
          z-index: 2;
        }
        .svc2-photo {
          position: absolute; left: 50%; top: 50%;
          transform: translate(-50%, -50%);
          width: 56%; height: 56%;
          border-radius: 50%; overflow: hidden;
          background:
            radial-gradient(circle at 32% 28%, var(--color-mosaic-7) 0%, var(--color-primary) 38%, var(--color-primary-dark) 78%, var(--color-primary-darker) 100%);
          box-shadow: inset 0 0 50px -18px var(--color-black), 0 24px 70px -34px var(--color-shadow);
          display: flex; align-items: center; justify-content: center;
        }
        .svc2-arc {
          cursor: pointer;
          transition: fill 0.4s ease, stroke 0.4s ease, opacity 0.4s ease;
        }
        .svc2-arcnum { font-family: var(--font-sans); transition: fill 0.4s ease; pointer-events: none; }

        /* CTA — общий элемент .cta-button; здесь только раскладка/ширина
           (= диаметр внутреннего фото-круга). В потоке колонки, равные
           flex-спейсеры сверху/снизу центрируют его в зазоре. */
        .svc2-cta {
          flex-shrink: 0;
          width: 302px; /* wide: 540 * 0.56 */
          padding-left: 0; padding-right: 0;
          text-align: center;
        }
        @media (max-width: 1699px) {
          .svc2-cta { width: 252px; } /* desktop: 450 * 0.56 */
        }

        /* Screen title — in flow within the column; an equal flex spacer
           above/below centres it in the gap between the screen top and circle. */
        .svc2-eyebrow {
          flex-shrink: 0;
          display: flex; flex-direction: column; align-items: center; gap: 14px;
        }
        .svc2-eyebrow-text {
          letter-spacing: 0.24em; text-transform: uppercase;
          color: var(--color-primary);
        }

        /* Equal spacers distribute the empty space around title / circle / CTA */
        .svc2-spacer { flex: 1 1 0; }

        /* wide (≥1700px) */
        .svc2-diagram {
          flex-shrink: 0;
          width: 100%; max-width: 1180px; height: 600px;
          column-gap: 600px; row-gap: 80px;
          --svc2-circle: 540px; --svc2-card-w: 260px; --svc2-card-w-open: 460px;
        }

        /* desktop (1023px – 1699px) */
        @media (max-width: 1699px) {
          .svc2-diagram {
            max-width: 980px; height: 540px;
            column-gap: 500px; row-gap: 60px;
            --svc2-circle: 450px; --svc2-card-w: 200px; --svc2-card-w-open: 360px;
          }
        }

        /* mobile: square block, same bg as screen 3 */
        @media (max-width: 1022px) {
          .svc2-section { padding: 0; }
        }
      `}</style>

      {/* ── Desktop + wide: segmented donut diagram ── */}
      <div className="hidden desktop:flex svc2-fade" style={{ flexDirection: 'column', alignItems: 'center', width: '100%', height: '100%' }}>

        <div className="svc2-spacer" />

        <div className="svc2-eyebrow">
          <span className="svc2-eyebrow-text t-hero">{t('svcTitle')}</span>
        </div>

        <div className="svc2-spacer" />

        <div className="svc2-diagram">

          {/* Centre: donut chart with photo hole */}
          <div className="svc2-center">
            <div className="svc2-photo">
              {centerPhoto ? (
                <Image src={centerPhoto} alt="" fill sizes="540px" style={{ objectFit: 'cover' }} />
              ) : (
                <svg width="34" height="34" viewBox="0 0 34 34" style={{ opacity: 0.4 }}>
                  <line x1="17" y1="6" x2="17" y2="28" stroke="var(--color-primary-border)" strokeWidth="0.75" />
                  <line x1="6" y1="17" x2="28" y2="17" stroke="var(--color-primary-border)" strokeWidth="0.75" />
                  <circle cx="17" cy="17" r="9" fill="none" stroke="var(--color-primary-border)" strokeWidth="0.75" />
                </svg>
              )}
            </div>

            <svg viewBox="0 0 400 400" width="100%" height="100%"
              style={{ position: 'absolute', inset: 0 }}>
              {/* faint guide ring */}
              <circle cx={CX} cy={CY} r={OUTER + 8} fill="none"
                stroke="var(--color-accent1)" strokeWidth="0.5" opacity="0.25" />
              {SEGMENTS.map(seg => {
                const on = active === seg.i;
                return (
                  <g key={seg.i}>
                    {/* tick toward card */}
                    <line x1={seg.tick0.x} y1={seg.tick0.y} x2={seg.tick1.x} y2={seg.tick1.y}
                      stroke="var(--color-accent1)" strokeWidth="1"
                      opacity={on ? 0.8 : 0.3} />
                    <path
                      className="svc2-arc"
                      d={seg.path}
                      fill={on ? 'var(--color-accent1)' : 'var(--color-primary)'}
                      fillOpacity={on ? 0.92 : 0.12}
                      stroke={on ? 'var(--color-accent1)' : 'var(--color-primary-border)'}
                      strokeWidth={on ? 1 : 0.5}
                      strokeOpacity={on ? 0.9 : 0.5}
                      onMouseEnter={() => setHover(seg.i)}
                      onMouseLeave={() => setHover(null)}
                      onClick={() => setSelected(seg.i)}
                    />
                    <text
                      className="svc2-arcnum"
                      x={seg.numPos.x} y={seg.numPos.y}
                      textAnchor="middle" dominantBaseline="central"
                      fontSize="20"
                      fill={on ? 'var(--color-primary-bg)' : 'var(--color-primary-light)'}
                    >
                      {String(seg.i + 1).padStart(2, '0')}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Service cards (corner-anchored, tied to segments) */}
          {SEGMENTS.map(seg => {
            const c = cards[seg.i];
            const on = active === seg.i;
            return (
              <div
                key={seg.i}
                className={`svc2-card ${seg.cls}${on ? ' is-active' : ''}`}
                onMouseEnter={() => setHover(seg.i)}
                onMouseLeave={() => setHover(null)}
                onClick={() => setSelected(seg.i)}
              >
                {/* Collapsed — in-flow, gives card its height */}
                <div className="svc2-static">
                  <div className="svc2-head">
                    <span className="svc2-num t-label">{c.num}</span>
                    <span className="svc2-label t-caption">{c.label}</span>
                  </div>
                  <div className="svc2-title t-title">{c.title}</div>
                  <Flourish w={56} color="var(--color-accent1)" className="svc2-rule" />
                  <div className="svc2-body t-body"><p>{c.short}</p></div>
                </div>
                {/* Expanded — absolute, clips open outward, one full block */}
                <div className="svc2-panel">
                  <div className="svc2-head">
                    <span className="svc2-num t-label">{c.num}</span>
                    <span className="svc2-label t-caption">{c.label}</span>
                  </div>
                  <div className="svc2-title t-title">{c.title}</div>
                  <Flourish w={56} color="var(--color-accent1)" className="svc2-rule" />
                  <div className="svc2-body t-body">
                    {c.paras.map((p, i) => <p key={i}>{p}</p>)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="svc2-spacer" />

        {/* CTA button below the circle */}
        <CtaButton
          variant="light"
          className="svc2-cta"
          onClick={() => document.getElementById('contactsSection')?.scrollIntoView({ behavior: 'smooth' })}
        >
          {t('slides.cta')}
        </CtaButton>

        <div className="svc2-spacer" />
      </div>

      {/* ── Mobile: circle carousel ── */}
      <div
        className="desktop:hidden absolute inset-0 flex items-center justify-center overflow-hidden"
        onTouchStart={e => setMobTouchX(e.touches[0].clientX)}
        onTouchEnd={e => {
          if (mobTouchX === null) return;
          const dx = mobTouchX - e.changedTouches[0].clientX;
          if (Math.abs(dx) > 40) dx > 0 ? mobNext() : mobPrev();
          setMobTouchX(null);
        }}
      >

        {/* Top-left ghost (prev card) */}
        <div style={{
          position: 'absolute',
          width: '81vw', height: '81vw', borderRadius: '50%',
          border: '8px solid color-mix(in srgb, var(--color-primary) 30%, transparent)',
          top: '-20vw', left: '-20vw',
          background: 'var(--color-primary-bg)', zIndex: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {svcPhoto(mobileActive + 1, 1) && (
            <Image
              src={svcPhoto(mobileActive + 1, 1)!}
              alt=""
              fill
              sizes="81vw"
              style={{
                objectFit: 'cover',
                objectPosition: 'left top',
                /* Service 1: the circle is offset off-screen top-left, so its
                   top-left corner (where object-position 'left top' pins the
                   image) is hidden. Push the image down-right into the visible
                   arc; the gap this opens stays in the off-screen 20vw corner. */
                transform: mobileActive === 0 ? 'translate(18vw, 18vw)' : undefined,
              }}
            />
          )}
        </div>

        {/* Bottom-right ghost (next card) */}
        <div style={{
          position: 'absolute',
          width: '81vw', height: '81vw', borderRadius: '50%',
          border: '8px solid color-mix(in srgb, var(--color-primary) 30%, transparent)',
          bottom: '-20vw', right: '-20vw',
          background: 'var(--color-primary-bg)', zIndex: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {svcPhoto(mobileActive + 1, 2) && (
            <Image src={svcPhoto(mobileActive + 1, 2)!} alt="" fill sizes="81vw" style={{ objectFit: 'cover' }} />
          )}
        </div>

        {/* Number + Title — top-right, anchored above the circle */}
        <div style={{
          position: 'absolute',
          bottom: 'calc(50% + 45vw + 24px)', right: 'calc(5vw + 8px)',
          width: 'calc(100vw / 3 + 16px)',
          display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
          gap: 'calc(5vw + 8px)',
          zIndex: 3,
        }}>
          <span className="t-hero" style={{
            color: 'var(--color-accent1)',
            lineHeight: 1,
          }}>
            {cards[mobileActive].num}
          </span>
          <span className="t-display" style={{
            textAlign: 'right',
            fontWeight: 700,
            color: 'var(--color-primary)',
            lineHeight: 1.35,
          }}>
            {cards[mobileActive].title}
          </span>
        </div>

        {/* Decorative dashed ring just outside the active circle */}
        <svg
          className="svc2-mobring"
          viewBox="0 0 200 200"
          aria-hidden="true"
          style={{
            position: 'absolute', left: '50%', top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '96vw', height: '96vw',
            zIndex: 2, pointerEvents: 'none',
          }}
        >
          <circle
            cx="100" cy="100" r="98"
            fill="none"
            stroke="var(--color-accent1)"
            strokeWidth="0.5"
            strokeOpacity="0.55"
            strokeDasharray="1.8 4"
            strokeLinecap="round"
          />
        </svg>

        {/* Active circle */}
        <div
          className="svc2-mobcircle"
          style={{
            position: 'relative', zIndex: 2,
            width: '90vw', height: '90vw', borderRadius: '50%',
            border: '8px solid var(--color-primary)',
            background: 'var(--color-primary-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', maxWidth: '62vw', gap: '18px' }}>
            <Flourish w={72} color="var(--color-accent1)" />
            <div className="t-body">
              {cards[mobileActive].paras.map((p, i) => <p key={i} style={{ margin: i > 0 ? '6px 0 0' : 0 }}>{p}</p>)}
            </div>
            <Flourish w={72} color="var(--color-accent1)" />
          </div>
        </div>

        {/* Navigation arrows — left, vertically centred in the gap
            between the circle's bottom edge and the bottom menu bar.
            translateY(50%) pins the row's centre on that midline. */}
        <div style={{
          position: 'absolute',
          bottom: 'calc((50vh - 45vw + 64px) / 2)',
          left: 'calc(5vw + 8px)',
          transform: 'translateY(50%)',
          display: 'flex', gap: '14px',
          zIndex: 3,
        }}>
          <button
            onClick={mobPrev}
            aria-label="Previous"
            style={{
              width: '52px', height: '52px',
              border: '1px solid var(--color-primary)',
              background: 'transparent', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="22" height="18" viewBox="0 0 13 11" fill="none">
              <path d="M13 5.5H2M6 1L1.5 5.5 6 10" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            onClick={mobNext}
            aria-label="Next"
            style={{
              width: '52px', height: '52px',
              border: '1px solid var(--color-primary)',
              background: 'transparent', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="22" height="18" viewBox="0 0 13 11" fill="none">
              <path d="M0 5.5h11M7 1l4.5 4.5L7 10" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

      </div>

    </div>
  );
});

ProjectsAlt.displayName = 'ProjectsAlt';
export default ProjectsAlt;
