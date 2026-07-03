"use client";

import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

// Замер размера контейнера делаем ДО отрисовки (useLayoutEffect), чтобы первый
// же кадр знал isMobile и не мигал десктопной мозаикой. На сервере layout-эффект
// не запускается — падаем на useEffect, чтобы не было предупреждения при SSR.
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

type Side = "left" | "right" | null;

const CLIP_DURATION = 900;

// Каждая плитка: фото из /images/sketch (objectFit:cover, без пустот),
// tint — оттенок primary поверх фото, ov — интенсивность этого оттенка
// (разная по плиткам для вариативности), op — прозрачность самого фото.
// Имя файла определяется НЕ здесь, а в MasonryGrid по номеру контейнера:
//   • мобайл  — номер контейнера = имя файла (1 → 1.jpg);
//   • десктоп — скетчи 0..N-1 перемешиваются и раскладываются случайно.
const SK = "/images/sketch";

// Процедурный шум (SVG feTurbulence) для эффекта «шероховатой бумаги» поверх
// скетчей. Тайлится, накладывается режимом overlay с малой непрозрачностью.
const NOISE_BG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E" +
  "%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E" +
  "%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";
const COLUMNS_DESKTOP = [
  { flex: 20, items: [
    { flex: 2.4, tint: "var(--color-mosaic-3)", ov: 0.30, op: 0.88 },
    { flex: 1.0, tint: "var(--color-mosaic-1)", ov: 0.42, op: 0.82 },
    { flex: 1.6, tint: "var(--color-mosaic-5)", ov: 0.24, op: 0.92 },
  ] },
  { flex: 31, items: [
    { flex: 1.2, tint: "var(--color-mosaic-4)", ov: 0.28, op: 0.90 },
    { flex: 2.8, tint: "var(--color-mosaic-2)", ov: 0.36, op: 0.86 },
  ] },
  { flex: 17, items: [
    { flex: 0.9, tint: "var(--color-mosaic-5)", ov: 0.22, op: 0.92 },
    { flex: 1.8, tint: "var(--color-mosaic-2)", ov: 0.34, op: 0.86 },
    { flex: 1.3, tint: "var(--color-mosaic-1)", ov: 0.40, op: 0.82 },
  ] },
  { flex: 32, items: [
    { flex: 3.2, tint: "var(--color-mosaic-3)", ov: 0.30, op: 0.88 },
    { flex: 0.8, tint: "var(--color-mosaic-4)", ov: 0.40, op: 0.84 },
  ] },
];

const COLUMNS_MOBILE = [
  { flex: 38, items: [
    { flex: 2.2, tint: "var(--color-mosaic-3)", ov: 0.30, op: 0.88 },
    { flex: 1.8, tint: "var(--color-mosaic-1)", ov: 0.40, op: 0.82 },
  ] },
  { flex: 62, items: [
    { flex: 2.0, tint: "var(--color-mosaic-4)", ov: 0.28, op: 0.90 },
    { flex: 0.5, tint: "var(--color-mosaic-5)", ov: 0.24, op: 0.92 },
    { flex: 1.5, tint: "var(--color-mosaic-3)", ov: 0.32, op: 0.86, pos: "30% 50%" },
  ] },
];

function MasonryGrid({ isMobile }: { isMobile: boolean }) {
  const columns = isMobile ? COLUMNS_MOBILE : COLUMNS_DESKTOP;
  const total = columns.reduce((s, c) => s + c.items.length, 0);

  // Десктоп: скетчи 0..total-1 перемешиваются один раз после монтирования
  // (чтобы не ловить рассинхрон гидрации) и раскладываются по контейнерам в
  // случайном порядке. До готовности перестановки — исходный порядок 0..N-1.
  const [shuffle, setShuffle] = useState<number[] | null>(null);
  useEffect(() => {
    if (isMobile) { setShuffle(null); return; }
    const arr = Array.from({ length: total }, (_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    setShuffle(arr);
  }, [isMobile, total]);

  let n = 0; // сквозной порядковый номер плитки (1..total)
  return (
    <div style={{
      position: "absolute", inset: 0,
      overflow: "hidden",
      display: "flex",
      gap: "8px",
      pointerEvents: "none",
    }}>
      {columns.map((col, ci) => (
        <div key={ci} style={{
          flex: col.flex,
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}>
          {col.items.map((item, ii) => {
            const num = ++n;
            // Мобайл: номер контейнера = имя файла (1 → 1.jpg).
            // Десктоп: случайный скетч из перемешанного набора 0..total-1.
            const src = isMobile
              ? `${SK}/${num}.jpg`
              : `${SK}/${(shuffle ?? [])[num - 1] ?? (num - 1)}.jpg`;
            return (
              <div key={ii} style={{
                flex: item.flex,
                position: "relative",
                overflow: "hidden",
                borderRadius: "2px",
                backgroundColor: item.tint,
              }}>
                {/* Фото заполняет плитку целиком (cover), без пустого места */}
                <img
                  src={src}
                  alt=""
                  style={{
                    position: "absolute", inset: 0,
                    width: "100%", height: "100%",
                    maxWidth: "none", maxHeight: "none",
                    objectFit: "cover",
                    objectPosition: (item as { pos?: string }).pos ?? "50% 50%",
                    opacity: item.op,
                  }}
                />
                {/* Оттенок primary поверх фото — разной интенсивности */}
                <div style={{
                  position: "absolute", inset: 0,
                  backgroundColor: item.tint,
                  opacity: item.ov,
                }} />
                {/* Зернистость «шероховатой бумаги» */}
                <div style={{
                  position: "absolute", inset: 0,
                  backgroundImage: `url("${NOISE_BG}")`,
                  backgroundSize: "140px 140px",
                  mixBlendMode: "overlay",
                  opacity: 0.5,
                  pointerEvents: "none",
                }} />
                {/* Порядковый номер плитки — правый верхний угол */}
                <span className="t-caption" style={{
                  position: "absolute", top: "6px", right: "8px",
                  letterSpacing: "0.08em",
                  color: "var(--color-overlay-42)",
                  textShadow: "0 1px 4px var(--color-shadow)",
                }}>{String(num).padStart(2, "0")}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

const gap_MOBILE  = 56;
const gap_DESKTOP = 150;
const CHEV_L_HALF = 22;
const CHEV_R_HALF = 22;

function ChevronSketch({ active, mirror }: { active: boolean; mirror?: boolean }) {
  // «старое золото» (светлый, более яркий тон) — виден на обеих половинах экрана 1
  const base = "var(--color-gold-light)";
  const c  = active ? `color-mix(in srgb, ${base} 26%, transparent)` : base;
  const c2 = active ? `color-mix(in srgb, ${base} 10%, transparent)` : `color-mix(in srgb, ${base} 72%, transparent)`;
  const c3 = active ? `color-mix(in srgb, ${base} 5%, transparent)`  : `color-mix(in srgb, ${base} 45%, transparent)`;
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" style={{ display: "block", overflow: "visible", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.40))" }}>
      <g transform={mirror ? "scale(-1,1) translate(-44,0)" : undefined}>
        <polyline points="30,8 14,22 30,36" stroke={c} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "stroke 0.4s" }} />
        <line x1="10" y1="16" x2="10" y2="28" stroke={c2} strokeWidth="2.2" strokeLinecap="round" style={{ transition: "stroke 0.4s" }} />
        <line x1="6"  y1="19" x2="6"  y2="25" stroke={c3} strokeWidth="1.6" strokeLinecap="round" style={{ transition: "stroke 0.4s" }} />
        <line x1="31" y1="22" x2="42" y2="22" stroke={c3} strokeWidth="1.4" strokeDasharray="3 2.5" style={{ transition: "stroke 0.4s" }} />
      </g>
    </svg>
  );
}


const DiagonalBlock = forwardRef<HTMLDivElement>((_, ref) => {
  const t = useTranslations("main");

  const plashkaRef  = useRef<HTMLDivElement>(null);
  const sectionRef  = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  // Объединяем внешний (проброшенный) ref и локальный, чтобы измерять контейнер.
  const setSectionRef = (el: HTMLDivElement | null) => {
    sectionRef.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
  };

  const [angle,      setAngle]      = useState(28);
  const [length,     setLength]     = useState(0);
  const [windowW,    setWindowW]    = useState(0);
  const [windowH,    setWindowH]    = useState(0);
  const [plashkaW,   setPlashkaW]   = useState(0);
  const [activeSide, setActiveSide] = useState<Side>(null);
  const [expanded,   setExpanded]   = useState(false);
  const [rotated,    setRotated]    = useState(false);

  const [leftZ,  setLeftZ]  = useState(1);
  const [rightZ, setRightZ] = useState(1);

  const activeSideRef  = useRef<Side>(null);
  const leftZTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rightZTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setCurrent = (s: Side) => {
    const prev = activeSideRef.current;
    activeSideRef.current = s;
    setActiveSide(s);

    if (s === "left") {
      if (leftZTimer.current)  clearTimeout(leftZTimer.current);
      if (rightZTimer.current) clearTimeout(rightZTimer.current);
      setLeftZ(10);
      setRightZ(0);
    } else if (s === "right") {
      if (leftZTimer.current)  clearTimeout(leftZTimer.current);
      if (rightZTimer.current) clearTimeout(rightZTimer.current);
      setRightZ(10);
      setLeftZ(0);
    } else {
      if (prev === "left") {
        setLeftZ(10);
        setRightZ(0);
        if (leftZTimer.current) clearTimeout(leftZTimer.current);
        leftZTimer.current = setTimeout(() => {
          setLeftZ(1);
          setRightZ(1);
        }, CLIP_DURATION);
      } else if (prev === "right") {
        setRightZ(10);
        setLeftZ(0);
        if (rightZTimer.current) clearTimeout(rightZTimer.current);
        rightZTimer.current = setTimeout(() => {
          setRightZ(1);
          setLeftZ(1);
        }, CLIP_DURATION);
      }
    }
  };

  useIsoLayoutEffect(() => {
    // Берём РЕАЛЬНЫЙ размер контейнера (clientWidth/Height), а не window.inner*:
    // на мобильных 100vh (h-screen) может отличаться от innerHeight, из-за чего
    // диагональ фото не совпадала с диагональю клипа и появлялись пустые углы.
    const update = () => {
      const el = sectionRef.current;
      const w = el ? el.clientWidth : window.innerWidth;
      const h = el ? el.clientHeight : window.innerHeight;
      setWindowW(w);
      setWindowH(h);
      setAngle(Math.atan2(h, w) * (180 / Math.PI));
      setLength((4 / 5) * Math.sqrt(w * w + h * h));
    };
    update();
    const el = sectionRef.current;
    const ro = el ? new ResizeObserver(update) : undefined;
    if (el && ro) ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      ro?.disconnect();
    };
  }, []);

  useEffect(() => {
    const t1 = setTimeout(() => setExpanded(true), 120);
    const t2 = setTimeout(() => setRotated(true), 780);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    if (!plashkaRef.current) return;
    const ro = new ResizeObserver(() => {
      if (plashkaRef.current) setPlashkaW(plashkaRef.current.offsetWidth);
    });
    ro.observe(plashkaRef.current);
    return () => ro.disconnect();
  }, []);

  const isMobile = windowW > 0 && windowW < 1023;

  // Угол наклона фото в закрытом состоянии — диагональ фото ложится на диагональ экрана.
  const closedRot = 45 - angle;

  // Запас на поворот ОДИНАКОВЫЙ по осям, поэтому коробка сохраняет пропорцию фото
  // (~0.71) и objectFit:cover показывает фото целиком, без обрезки и без лишнего зума.
  // Минимум ≈1.0 (точное покрытие экрана); чуть больше — слабина под подстройку кадра.
  const COVER_MARGIN = 1.12;
  // Точная подстройка кадра (доля размера коробки). 0 = фото по центру.
  const SHIFT_X = 0.04; // + вправо (бутылка на диагонали)
  const SHIFT_Y = 0; // + вниз
  // Подгонка скетча под линии решётки на фото (само фото НЕ трогаем). Скетч
  // нарисован в другом масштабе/кадре, поэтому у него свои сдвиг и масштаб —
  // так линии полок продолжают линии фото через диагональ. Значения подобраны
  // наложением скетча на фото для мобильного кадра ~402×874.
  const SK_SHIFT_X = 0.17;   // доля коробки, + вправо
  const SK_SHIFT_Y = 0.16;   // доля коробки, + вниз
  const SK_SCALE   = 1.1;

  // Размер коробки <img> (в px), при котором повёрнутый на closedRot прямоугольник
  // полностью покрывает экран при scale(1). Запас на поворот — в размере коробки,
  // а не в scale(), поэтому нет лишнего увеличения.
  const coverBox = (() => {
    if (!windowW || !windowH) return { w: 0, h: 0 };
    const r = Math.abs(closedRot) * Math.PI / 180;
    const cos = Math.abs(Math.cos(r));
    const sin = Math.abs(Math.sin(r));
    return {
      w: (windowW * cos + windowH * sin) * COVER_MARGIN,
      h: (windowW * sin + windowH * cos) * COVER_MARGIN,
    };
  })();
  const gap = isMobile ? gap_MOBILE : gap_DESKTOP;

  const handleLeft = () => {
    if (activeSideRef.current !== null) setCurrent(null);
    else setCurrent("left");
  };

  const handleRight = () => {
    if (activeSideRef.current !== null) setCurrent(null);
    else setCurrent("right");
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    if (absDx < 50 && absDy < 50) return;
    if (activeSideRef.current !== null) { setCurrent(null); return; }
    if (absDx >= absDy) {
      dx > 0 ? setCurrent("left") : setCurrent("right");
    } else {
      dy < 0 ? setCurrent("left") : setCurrent("right");
    }
  };

  const rad   = rotated ? -angle * (Math.PI / 180) : 0;
  const distL = (plashkaW / 2) + gap + CHEV_L_HALF;
  const distR = (plashkaW / 2) + gap + CHEV_R_HALF;
  const lx = -distL * Math.cos(rad);
  const ly = -distL * Math.sin(rad);
  const rx =  distR * Math.cos(rad);
  const ry =  distR * Math.sin(rad);

  const leftClip  = activeSide === "left"
    ? "polygon(0 0, 100% 0, 100% 100%, 0 100%)"
    : "polygon(0 0, 100% 0, 0 100%, 0 100%)";

  const rightClip = activeSide === "right"
    ? "polygon(0 0, 100% 0, 100% 100%, 0 100%)"
    : "polygon(100% 0, 100% 0, 100% 100%, 0 100%)";

  const barTransform = [
    "translate(-50%, -50%)",
    `rotate(${rotated ? -angle : 0}deg)`,
    `scaleX(${expanded ? 1 : 0})`,
  ].join(" ");

  // Полная диагональ экрана (угол в угол) — длина непрерывной линии-разделителя.
  const fullDiag = Math.sqrt(windowW * windowW + windowH * windowH);

  return (
    <>
      <style>{`
        @keyframes sketch-pulse {
          0%,100% { opacity:.52; transform:translateX(0); }
          50%      { opacity:1;   transform:translateX(-10px); }
        }
        @keyframes modern-pulse {
          0%,100% { opacity:.52; transform:translateX(0); }
          50%      { opacity:1;   transform:translateX(10px); }
        }
        .chev-sketch { animation: sketch-pulse 2.6s ease-in-out infinite; }
        .chev-modern { animation: modern-pulse 2.6s ease-in-out infinite; animation-delay:1.3s; }
        .chev-active { animation:none !important; opacity:.15 !important; transform:none !important; }
      `}</style>

      <div ref={setSectionRef} id="homeSection" className="relative w-screen h-screen overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >

        {/* ── Верхний треугольник (тёмный) ── */}
        <div className="absolute inset-0 bg-primary" style={{
          clipPath: leftClip,
          transition: "clip-path 0.85s cubic-bezier(0.77,0,0.18,1)",
          zIndex: leftZ,
        }}>
          {/* Пока размер не измерен (windowW === 0) — не рисуем ничего, иначе
              на первом кадре мелькнёт десктопная мозаика до переключения на скетч. */}
          {windowW === 0 ? null : isMobile ? (
            // Мобайл: вместо мозаики — скетч того же винного шкафа, что на фото
            // снизу. Тот же диагональный transform (coverBox / closedRot / SHIFT),
            // что и у фото, поэтому линии решётки скетча продолжают линии фото
            // через диагональ (у vineCrop и main/1.jpg почти равные пропорции ~0.71).
            <div style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              pointerEvents: "none",
              // Фон = чисто-белый скетч-бумаги: пустые углы после поворота
              // скетча сливаются с его белым #fff и не читаются как пустота.
              background: "var(--color-sketch-paper)",
            }}>
              <img
                src={`${SK}/vineCrop.jpg`}
                alt=""
                style={{
                  flexShrink: 0,
                  maxWidth: "none",
                  maxHeight: "none",
                  width: activeSide === "left" ? `${windowW}px` : `${coverBox.w}px`,
                  height: activeSide === "left" ? `${windowH}px` : `${coverBox.h}px`,
                  objectFit: "cover",
                  objectPosition: "50% 50%",
                  transformOrigin: "center center",
                  transform: activeSide === "left"
                    ? "rotate(0deg)"
                    : `rotate(${closedRot}deg) translate(${SK_SHIFT_X * 100}%, ${SK_SHIFT_Y * 100}%) scale(${SK_SCALE})`,
                  transition:
                    "transform 0.85s cubic-bezier(0.77,0,0.18,1), width 0.85s cubic-bezier(0.77,0,0.18,1), height 0.85s cubic-bezier(0.77,0,0.18,1)",
                }}
              />
              {/* Зернистость «шероховатой бумаги». На десктопе плитки цветные и
                  работает overlay; здесь фон белый, а overlay поверх белого не
                  виден — поэтому multiply (тёмные крапинки шума на бумаге). */}
              <div style={{
                position: "absolute", inset: 0,
                backgroundImage: `url("${NOISE_BG}")`,
                backgroundSize: "140px 140px",
                mixBlendMode: "multiply",
                opacity: 0.3,
                pointerEvents: "none",
              }} />
            </div>
          ) : (
            <MasonryGrid isMobile={false} />
          )}
          <div className="absolute inset-0 flex items-start justify-start pointer-events-none">
            <div className="mt-12 ml-12 t-label" style={{
              // На мобиле верхний треугольник — светлый скетч, поэтому берём
              // приглушённый тёмный токен; на десктопе фон тёмный — светлый overlay.
              color: isMobile ? "var(--color-text-muted)" : "var(--color-overlay-10)",
              letterSpacing: "0.3em",
            }}>Progetto</div>
          </div>
        </div>

        {/* ── Нижний треугольник (светлый, граничит с экраном 2) ── */}
        <div className="absolute inset-0 bg-primary-bg" style={{
          clipPath: rightClip,
          transition: "clip-path 0.85s cubic-bezier(0.77,0,0.18,1)",
          zIndex: rightZ,
        }}>
          {isMobile && (
            <div style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              pointerEvents: "none",
            }}>
              <img
                src="/images/main/1.jpg"
                alt=""
                style={{
                  flexShrink: 0,
                  // important: перебиваем Tailwind preflight (img{max-width:100%}),
                  // иначе коробка ужимается до ширины контейнера и не закрывает поворот.
                  maxWidth: "none",
                  maxHeight: "none",
                  width: activeSide === "right" ? `${windowW}px` : `${coverBox.w}px`,
                  height: activeSide === "right" ? `${windowH}px` : `${coverBox.h}px`,
                  objectFit: "cover",
                  objectPosition: "50% 50%",
                  transformOrigin: "center center",
                  transform: activeSide === "right"
                    ? "rotate(0deg)"
                    : `rotate(${closedRot}deg) translate(${SHIFT_X * 100}%, ${SHIFT_Y * 100}%)`,
                  transition:
                    "transform 0.85s cubic-bezier(0.77,0,0.18,1), width 0.85s cubic-bezier(0.77,0,0.18,1), height 0.85s cubic-bezier(0.77,0,0.18,1)",
                }}
              />
            </div>
          )}
        </div>

        {/* ── Якорь ── */}
        <div style={{
          position: "absolute",
          left: "50%", top: "50%",
          zIndex: 30,
          pointerEvents: "none",
        }}>
          {/* ── Непрерывная диагональ (сплошная линия, угол в угол) ──
               При открытии контейнера (activeSide) растворяется: opacity→0 + blur. */}
          <div style={{
            position: "absolute", left: 0, top: 0,
            transform: barTransform,
            transformOrigin: "center center",
            transition: (rotated
              ? "transform 1.1s cubic-bezier(0.76,0,0.24,1)"
              : "transform 0.65s cubic-bezier(0.76,0,0.24,1)")
              + ", opacity 0.55s ease, filter 0.55s ease",
            width: `${fullDiag}px`,
            height: "4px",
            background: "var(--color-primary)",
            opacity: activeSide ? 0 : 1,
            filter: activeSide ? "blur(4px)" : "blur(0px)",
          }} />
          {/* ── Бар ── */}
          <div style={{
            transform: barTransform,
            transformOrigin: "center center",
            transition: rotated
              ? "transform 1.1s cubic-bezier(0.76,0,0.24,1)"
              : "transform 0.65s cubic-bezier(0.76,0,0.24,1)",
            width: `${length}px`,
            display: "flex",
            alignItems: "center",
            pointerEvents: "none",
          }}>

            {/* Левая сторона */}
            <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
              <div style={{ flex: 1 }} />
              <div style={{ width: "32px", flexShrink: 0 }} />
              <div className={`chev-sketch${activeSide === "left" ? " chev-active" : ""}`} style={{ flexShrink: 0 }}>
                <ChevronSketch active={activeSide === "left"} />
              </div>
              <div style={{ width: `${gap}px`, flexShrink: 0 }} />
            </div>

            {/* Плашка.
                Бар повёрнут на -angle. Здесь компенсируем его поворот на +angle,
                чтобы плашка всегда была горизонтальна — и в закрытом состоянии,
                и при раскрытии любого контейнера. Наклона под бутылку больше нет. */}
            <div style={{
              flexShrink: 0,
              // Плашка всегда горизонтальна (компенсируем поворот бара на -angle),
              // и при раскрытии контейнеров тоже не наклоняется — ни на десктопе,
              // ни на мобиле.
              transform: rotated ? `rotate(${angle}deg)` : undefined,
              transition: "transform 1.1s cubic-bezier(0.76,0,0.24,1)",
            }}>
              <div ref={plashkaRef} style={{
                width: isMobile ? "66.6667vw" : "25vw",
                boxSizing: "border-box",
                display: "flex", flexDirection: "column", alignItems: "center", gap: "5px",
                padding: isMobile ? "10px 24px" : "26px 40px",
                background: "var(--color-plashka-bg)",
                backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)",
                borderTop: "1px solid var(--color-overlay-22)",
                borderBottom: "1px solid var(--color-overlay-08)",
                borderLeft: "1px solid var(--color-overlay-12)",
                borderRight: "1px solid var(--color-overlay-06)",
                pointerEvents: "none",
              }}>
                <div style={{ width: "18px", height: "1px", background: "var(--color-overlay-30)" }} />
                <span className="t-title uppercase" style={{
                  fontWeight: 300,
                  letterSpacing: isMobile ? "0.22em" : "0.42em",
                  color: "var(--color-text-inverse)",
                  textShadow: "0 1px 16px var(--color-shadow)",
                  whiteSpace: "nowrap",
                }}>{t("title")}</span>
                <span className="t-subtitle" style={{
                  fontWeight: 300,
                  letterSpacing: "0.18em",
                  color: "var(--color-overlay-42)",
                  whiteSpace: "nowrap",
                }}>{t("region")}</span>
                <div style={{ width: "18px", height: "1px", background: "var(--color-overlay-16)" }} />
              </div>
            </div>

            {/* Правая сторона */}
            <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
              <div style={{ width: `${gap}px`, flexShrink: 0 }} />
              <div className={`chev-modern${activeSide === "right" ? " chev-active" : ""}`} style={{ flexShrink: 0 }}>
                <ChevronSketch active={activeSide === "right"} mirror />
              </div>
              <div style={{ width: "32px", flexShrink: 0 }} />
              <div style={{ flex: 1 }} />
            </div>
          </div>

          {/* Hit-area шевронов */}
          {plashkaW > 0 && (
            <>
              <div onClick={handleLeft} style={{
                position: "absolute",
                left: `${lx}px`, top: `${ly}px`,
                transform: "translate(-50%, -50%)",
                width: "88px", height: "88px",
                cursor: "pointer",
                pointerEvents: "auto",
                zIndex: 2,
              }} />
              <div onClick={handleRight} style={{
                position: "absolute",
                left: `${rx}px`, top: `${ry}px`,
                transform: "translate(-50%, -50%)",
                width: "88px", height: "88px",
                cursor: "pointer",
                pointerEvents: "auto",
                zIndex: 1,
              }} />
            </>
          )}
        </div>

      </div>
    </>
  );
});

export default DiagonalBlock;
