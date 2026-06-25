"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslations } from "next-intl";

type Side = "left" | "right" | null;

const COOLDOWN = 700;

const gap_MOBILE  = 56;
const gap_DESKTOP = 150;

function ChevronSketch({ active }: { active: boolean }) {
  const c  = active ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.88)";
  const c2 = active ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.42)";
  const c3 = active ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.2)";
  return (
    <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
      <polyline points="26,7 12,19 26,31"
        stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="9" y1="14.5" x2="9" y2="23.5" stroke={c2} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="5.5" y1="16.5" x2="5.5" y2="21.5" stroke={c3} strokeWidth="1" strokeLinecap="round" />
      <line x1="27" y1="19" x2="36" y2="19" stroke={c3} strokeWidth="0.8" strokeDasharray="2.5 2.5" />
    </svg>
  );
}

function ChevronModern({ active }: { active: boolean }) {
  const c  = active ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.92)";
  const c2 = active ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.28)";
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
      <polyline points="10,5 23,17 10,29"
        stroke={c} strokeWidth="1.8" strokeLinecap="square" />
      <polyline points="16,10 24,17 16,24"
        stroke={c2} strokeWidth="1.2" strokeLinecap="square" />
    </svg>
  );
}

/**
 * КНОПКА БЕЗ ABSOLUTE
 * → фиксированный размер
 * → никаких перекрытий
 */
function ChevBtn({
  side,
  active,
  animClass,
  onToggle,
  children,
}: {
  side: "left" | "right";
  active: boolean;
  animClass: string;
  onToggle: (s: "left" | "right") => void;
  children: React.ReactNode;
}) {
  return (
    <div
      onClick={() => onToggle(side)}
      style={{
        width: 88,
        height: 88,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      <div className={`${animClass}${active ? " chev-active" : ""}`}>
        {children}
      </div>
    </div>
  );
}

export default function DiagonalBlock() {
  const t = useTranslations("main");

  const [angle, setAngle] = useState(28);
  const [length, setLength] = useState(0);
  const [windowW, setWindowW] = useState(0);
  const [activeSide, setActiveSide] = useState<Side>(null);
  const [expanded, setExpanded] = useState(false);
  const [rotated, setRotated] = useState(false);

  const isMobile = windowW > 0 && windowW < 1023;
  const gap = isMobile ? gap_MOBILE : gap_DESKTOP;

  const cooldownRef = useRef(false);

  // размеры
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setWindowW(w);
      setAngle(Math.atan2(h, w) * (180 / Math.PI));
      setLength((4 / 5) * Math.sqrt(w * w + h * h));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // intro
  useEffect(() => {
    const t1 = setTimeout(() => setExpanded(true), 120);
    const t2 = setTimeout(() => setRotated(true), 780);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // логика
  const handleToggle = useCallback((side: "left" | "right") => {
    if (cooldownRef.current) return;

    setActiveSide(prev => {
      if (prev !== null) {
        cooldownRef.current = true;
        setTimeout(() => (cooldownRef.current = false), COOLDOWN);
        return null;
      }
      return side;
    });
  }, []);

  // clip
  const leftClip =
  activeSide === "left"
    ? "polygon(0 0, 100% 0, 100% 100%, 0 100%)"
    : "polygon(0 0, 100% 0, 0 100%)"; // ← FIX

  const rightClip =
  activeSide === "right"
    ? "polygon(0 0, 100% 0, 100% 100%, 0 100%)"
    : "polygon(100% 0, 100% 100%, 0 100%)"; // ← FIX

  const barTransform = `
    translate(-50%, -50%)
    rotate(${rotated ? -angle : 0}deg)
    scaleX(${expanded ? 1 : 0})
  `;

  return (
    <>
      <style>{`
        @keyframes sketch-pulse {
          0%,100% { opacity:.45; transform:translateX(0); }
          50% { opacity:1; transform:translateX(-7px); }
        }
        @keyframes modern-pulse {
          0%,100% { opacity:.45; transform:translateX(0); }
          50% { opacity:1; transform:translateX(7px); }
        }
        .chev-sketch { animation: sketch-pulse 2.4s ease-in-out infinite; }
        .chev-modern { animation: modern-pulse 2.4s ease-in-out infinite; animation-delay:1.2s; }
        .chev-active { animation:none !important; opacity:.2 !important; }
      `}</style>

      <div className="relative w-screen h-screen overflow-hidden">

        {/* ТРЕУГОЛЬНИКИ НЕ ПЕРЕХВАТЫВАЮТ КЛИКИ */}
        <div
          className="absolute inset-0"
          style={{
            clipPath: leftClip,
            transition: "clip-path 0.85s cubic-bezier(0.77,0,0.18,1)",
            backgroundColor: "var(--color-mosaic-1)",
            pointerEvents: "none",
          }}
        />

        <div
          className="absolute inset-0"
          style={{
            clipPath: rightClip,
            transition: "clip-path 0.85s cubic-bezier(0.77,0,0.18,1)",
            backgroundColor: "#78350f",
            pointerEvents: "none",
          }}
        />

        {/* ЦЕНТР */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            zIndex: 100,
          }}
        >
          <div
            style={{
              transform: barTransform,
              transformOrigin: "center",
              transition: rotated
                ? "transform 1.1s cubic-bezier(0.76,0,0.24,1)"
                : "transform 0.65s cubic-bezier(0.76,0,0.24,1)",
              width: `${length}px`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: `${gap}px`,
            }}
          >
            <ChevBtn
              side="left"
              active={activeSide === "left"}
              animClass="chev-sketch"
              onToggle={handleToggle}
            >
              <ChevronSketch active={activeSide === "left"} />
            </ChevBtn>

            {/* центральный блок */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "5px",
                padding: isMobile ? "10px 24px" : "14px 40px",
                background: "rgba(255,255,255,0.10)",
                backdropFilter: "blur(18px)",
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              <span
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: isMobile ? "clamp(9px, 3vw, 13px)" : "clamp(9px, 0.85vw, 13px)",
                  letterSpacing: isMobile ? "0.22em" : "0.42em",
                  color: "white",
                  whiteSpace: "nowrap",
                }}
              >
                {t("title")}
              </span>
            </div>

            <ChevBtn
              side="right"
              active={activeSide === "right"}
              animClass="chev-sketch"
              onToggle={handleToggle}
            >
              <ChevronSketch active={activeSide === "right"} />
            </ChevBtn>
          </div>
        </div>
      </div>
    </>
  );
}
