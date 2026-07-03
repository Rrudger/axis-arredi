'use client';

import { type CSSProperties } from 'react';

/* Decorative divider: a fleuron — a central dot from which symmetric S-scroll
   curls sweep out to each side, then taper into a thin rule with end dots.
   The hand-drawn curl echoes the Italianno script slogan. The right half is
   built once and mirrored for the left.

   color — stroke/fill цвет (по умолчанию основной текст). Передай
   `var(--color-accent1)` для золотого варианта. */
export default function Flourish({
  w,
  curlW = w,
  color = 'var(--color-primary)',
  className,
  style,
}: {
  w: number;
  /* Ширина, задающая геометрию центрального завитка. По умолчанию равна `w`
     (завиток масштабируется со всей виньеткой). Задай меньше `w`, чтобы завиток
     остался компактным, а во всю ширину растянулись только боковые линии. */
  curlW?: number;
  color?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const amp = curlW >= 40 ? 6 : 5;    // curl vertical reach
  const h = amp * 2 + 4;
  const cx = w / 2;
  const cy = h / 2;
  const a = curlW * 0.06;             // first control offset
  const x1 = cx + curlW * 0.14;       // crest of the up-hump
  const x2 = cx + curlW * 0.24;       // end of the S, where the rule begins
  const xEnd = w - 2;                 // rule stops short of the edge dot
  const stroke = color;
  // Right-half scroll: hump up between cx→x1, hump down between x1→x2 (an S).
  const curl =
    `M ${cx} ${cy} ` +
    `C ${cx + a} ${cy - amp}, ${x1} ${cy - amp}, ${x1} ${cy} ` +
    `C ${x1} ${cy + amp}, ${x2} ${cy + amp}, ${x2} ${cy}`;
  const half = (
    <>
      <path d={curl} fill="none" stroke={stroke} strokeWidth="1" strokeLinecap="round" />
      <line x1={x2} y1={cy} x2={xEnd} y2={cy} stroke={stroke} strokeWidth="1" />
      <circle cx={w - 1} cy={cy} r="1.1" fill={stroke} />
    </>
  );
  return (
    <svg
      className={className}
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ display: 'block', overflow: 'visible', flexShrink: 0, ...style }}
      aria-hidden
    >
      {half}
      <g transform={`matrix(-1 0 0 1 ${w} 0)`}>{half}</g>
      <circle cx={cx} cy={cy} r="1.5" fill={stroke} />
    </svg>
  );
}
