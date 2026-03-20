import { useEffect, useMemo, useState } from "react";

// Deterministic pseudo-random based on seed (no Math.random in render)
function seededRandom(seed: number): number {
  let s = seed;
  s = s ^ 61 ^ (s >> 16);
  s = (s + (s << 3)) & 0xffffffff;
  s = (s ^ (s >> 4)) & 0xffffffff;
  s = (s * 0x27d4eb2d) & 0xffffffff;
  s = (s ^ (s >> 15)) & 0xffffffff;
  return (s >>> 0) / 0xffffffff;
}

const SKY_KEYFRAMES = `
@keyframes cloudDrift1 {
  0%   { transform: translateX(-220px); }
  100% { transform: translateX(110vw); }
}
@keyframes cloudDrift2 {
  0%   { transform: translateX(-280px); }
  100% { transform: translateX(110vw); }
}
@keyframes cloudDrift3 {
  0%   { transform: translateX(-180px); }
  100% { transform: translateX(110vw); }
}
@keyframes starPulse {
  0%, 100% { opacity: 0.15; }
  50%       { opacity: 0.65; }
}
@keyframes birdFly1 {
  0%   { transform: translateX(-60px); }
  100% { transform: translateX(calc(100vw + 80px)); }
}
@keyframes birdFly2 {
  0%   { transform: translateX(-80px); }
  100% { transform: translateX(calc(100vw + 80px)); }
}
@keyframes birdFly3 {
  0%   { transform: translateX(-50px); }
  100% { transform: translateX(calc(100vw + 80px)); }
}
@keyframes wingFlap {
  0%, 100% { transform: scaleY(1) rotate(0deg); }
  50%       { transform: scaleY(-0.6) rotate(4deg); }
}
@keyframes sunGlow {
  0%, 100% { box-shadow: 0 0 40px 18px rgba(255,210,80,0.28), 0 0 90px 40px rgba(255,200,50,0.13), 0 0 160px 80px rgba(255,180,0,0.06); }
  50%       { box-shadow: 0 0 50px 22px rgba(255,210,80,0.34), 0 0 110px 55px rgba(255,200,50,0.16), 0 0 200px 100px rgba(255,180,0,0.08); }
}
@keyframes coronaPulse {
  0%, 100% { opacity: 0.13; transform: scale(1); }
  50%       { opacity: 0.20; transform: scale(1.06); }
}
@keyframes coronaMidPulse {
  0%, 100% { opacity: 0.22; transform: scale(1); }
  50%       { opacity: 0.32; transform: scale(1.04); }
}
@keyframes sunRaysRotate {
  0%   { transform: translate(-50%, -50%) rotate(0deg); }
  100% { transform: translate(-50%, -50%) rotate(360deg); }
}
@keyframes moonGlow {
  0%, 100% { box-shadow: 0 0 28px 10px rgba(210,228,255,0.22), 0 0 70px 30px rgba(180,210,255,0.10); }
  50%       { box-shadow: 0 0 36px 14px rgba(210,228,255,0.30), 0 0 90px 40px rgba(180,210,255,0.14); }
}
`;

const CLOUDS = [
  {
    id: "cloud-1",
    top: "10%",
    drift: "cloudDrift1",
    dur: "90s",
    delay: "0s",
    opacity: 0.5,
    scale: 1,
  },
  {
    id: "cloud-2",
    top: "20%",
    drift: "cloudDrift2",
    dur: "120s",
    delay: "-35s",
    opacity: 0.42,
    scale: 0.75,
  },
  {
    id: "cloud-3",
    top: "30%",
    drift: "cloudDrift3",
    dur: "75s",
    delay: "-60s",
    opacity: 0.38,
    scale: 0.6,
  },
];

// Sun ray path data: 12 rays with string keys
const SUN_RAYS = Array.from({ length: 12 }, (_, i) => {
  const angle = (i * 30 * Math.PI) / 180;
  const innerR = 38;
  const outerR = 72;
  const x1 = 100 + Math.cos(angle) * innerR;
  const y1 = 100 + Math.sin(angle) * innerR;
  const x2 = 100 + Math.cos(angle) * outerR;
  const y2 = 100 + Math.sin(angle) * outerR;
  return {
    id: `ray-${i}`,
    d: `M${x1.toFixed(1)},${y1.toFixed(1)} L${x2.toFixed(1)},${y2.toFixed(1)}`,
  };
});

export default function SkyBackground() {
  // Bug fix: use MutationObserver to detect dark class changes reliably
  const [isDark, setIsDark] = useState(
    document.documentElement.classList.contains("dark"),
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  const stars = useMemo(
    () =>
      Array.from({ length: 35 }, (_, i) => ({
        id: `star-${i}`,
        left: `${seededRandom(i * 7 + 1) * 100}%`,
        top: `${seededRandom(i * 7 + 2) * 65}%`,
        size: 1.5 + seededRandom(i * 7 + 3) * 1.5,
        delay: `${seededRandom(i * 7 + 4) * 5}s`,
        duration: `${2 + seededRandom(i * 7 + 5) * 3}s`,
      })),
    [],
  );

  const birds = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const flyDuration = 30 + seededRandom(i * 13 + 3) * 25;
        return {
          id: `bird-${i}`,
          top: `${5 + seededRandom(i * 13 + 1) * 70}%`,
          scale: 0.55 + seededRandom(i * 13 + 2) * 0.85,
          flyAnim: `birdFly${(i % 3) + 1}`,
          flyDuration: `${flyDuration}s`,
          flyDelay: `-${seededRandom(i * 13 + 7) * flyDuration}s`,
          flapDuration: `${0.5 + seededRandom(i * 13 + 5) * 0.7}s`,
          flapDelay: `${seededRandom(i * 13 + 6) * 0.6}s`,
        };
      }),
    [],
  );

  return (
    <>
      <style>{SKY_KEYFRAMES}</style>

      {/* Light sky gradient */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          background:
            "linear-gradient(to bottom, #bdd8f4 0%, #daeef9 55%, #f0f8ff 100%)",
          opacity: isDark ? 0 : 1,
          transition: "opacity 2.2s ease",
        }}
      />

      {/* Dark sky gradient */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          background:
            "linear-gradient(to bottom, #050c1a 0%, #0d1f3c 50%, #1a2a4a 100%)",
          opacity: isDark ? 1 : 0,
          transition: "opacity 2.2s ease",
        }}
      />

      {/* ===== ULTRA-REALISTIC SUN ===== */}

      {/* Outermost atmospheric haze */}
      <div
        style={{
          position: "fixed",
          top: "calc(8% - 121px)",
          right: "calc(15% - 121px)",
          width: 300,
          height: 300,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,200,80,0.09) 0%, rgba(255,180,50,0.04) 50%, transparent 75%)",
          opacity: isDark ? 0 : 1,
          transition: "opacity 2.2s ease",
          zIndex: 1,
          pointerEvents: "none",
        }}
      />

      {/* Outer corona */}
      <div
        style={{
          position: "fixed",
          top: "calc(8% - 51px)",
          right: "calc(15% - 51px)",
          width: 160,
          height: 160,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,210,80,0.18) 0%, rgba(255,190,50,0.08) 55%, transparent 75%)",
          animation: "coronaPulse 5s ease-in-out infinite",
          opacity: isDark ? 0 : 0.15,
          transition: "opacity 2.2s ease",
          zIndex: 1,
          pointerEvents: "none",
        }}
      />

      {/* Mid corona / bloom */}
      <div
        style={{
          position: "fixed",
          top: "calc(8% - 21px)",
          right: "calc(15% - 21px)",
          width: 100,
          height: 100,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,225,100,0.35) 0%, rgba(255,200,60,0.15) 55%, transparent 75%)",
          animation: "coronaMidPulse 4s ease-in-out infinite",
          opacity: isDark ? 0 : 1,
          transition: "opacity 2.2s ease",
          zIndex: 1,
          pointerEvents: "none",
        }}
      />

      {/* SVG sun rays */}
      <div
        style={{
          position: "fixed",
          top: "calc(8% + 29px - 100px)",
          right: "calc(15% + 29px - 100px)",
          width: 200,
          height: 200,
          opacity: isDark ? 0 : 0.35,
          transition: "opacity 2.2s ease",
          zIndex: 1,
          pointerEvents: "none",
        }}
      >
        <svg
          width="200"
          height="200"
          viewBox="0 0 200 200"
          role="img"
          aria-label="sun rays"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            animation: "sunRaysRotate 60s linear infinite",
            transformOrigin: "center center",
            transform: "translate(-50%, -50%)",
          }}
        >
          {SUN_RAYS.map((ray) => (
            <path
              key={ray.id}
              d={ray.d}
              stroke="rgba(255,200,60,0.9)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          ))}
        </svg>
      </div>

      {/* Sun core */}
      <div
        style={{
          position: "fixed",
          top: "8%",
          right: "15%",
          width: 58,
          height: 58,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 40% 38%, #fff8d0 0%, #ffd426 45%, #ffb300 75%, #ff9500 100%)",
          boxShadow:
            "0 0 0 2px rgba(255,230,100,0.6), 0 0 16px 6px rgba(255,210,80,0.55), 0 0 40px 18px rgba(255,210,80,0.28), 0 0 90px 40px rgba(255,200,50,0.13), 0 0 160px 80px rgba(255,180,0,0.06)",
          animation: "sunGlow 4s ease-in-out infinite",
          opacity: isDark ? 0 : 1,
          transition: "opacity 2.2s ease",
          zIndex: 2,
          pointerEvents: "none",
        }}
      />

      {/* ===== END SUN ===== */}

      {/* Moon */}
      <div
        style={{
          position: "fixed",
          top: "8%",
          right: "15%",
          width: 50,
          height: 50,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 38% 40%, #e8efff 0%, #c8d8f0 70%, #a8bcd8 100%)",
          boxShadow:
            "inset -8px -4px 0 0 rgba(100,130,180,0.35), 0 0 28px 10px rgba(210,228,255,0.22), 0 0 70px 30px rgba(180,210,255,0.10)",
          animation: "moonGlow 5s ease-in-out infinite",
          opacity: isDark ? 1 : 0,
          transition: "opacity 2.2s ease",
          zIndex: 1,
          pointerEvents: "none",
        }}
      />

      {/* Clouds */}
      {CLOUDS.map((c) => (
        <div
          key={c.id}
          style={{
            position: "fixed",
            top: c.top,
            left: 0,
            zIndex: 1,
            pointerEvents: "none",
            opacity: isDark ? 0 : c.opacity,
            transition: "opacity 2.2s ease",
            animation: `${c.drift} ${c.dur} linear ${c.delay} infinite`,
            transform: `scale(${c.scale})`,
            transformOrigin: "left center",
          }}
        >
          <CloudShape />
        </div>
      ))}

      {/* Stars */}
      {stars.map((s) => (
        <div
          key={s.id}
          style={{
            position: "fixed",
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            borderRadius: "50%",
            background: "#e8f0ff",
            opacity: isDark ? undefined : 0,
            animation: isDark
              ? `starPulse ${s.duration} ${s.delay} ease-in-out infinite`
              : "none",
            transition: "opacity 2.2s ease",
            zIndex: 1,
            pointerEvents: "none",
          }}
        />
      ))}

      {/* Birds — 14 birds distributed across the full screen width */}
      {birds.map((b) => (
        <div
          key={b.id}
          style={{
            position: "fixed",
            top: b.top,
            left: 0,
            zIndex: 1,
            pointerEvents: "none",
            opacity: isDark ? 0 : 1,
            transition: "opacity 2.2s ease",
            animation: `${b.flyAnim} ${b.flyDuration} linear ${b.flyDelay} infinite`,
          }}
        >
          <BirdShape
            scale={b.scale}
            flapDuration={b.flapDuration}
            flapDelay={b.flapDelay}
          />
        </div>
      ))}

      {/* Tree silhouette — dark mode only */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          right: "5%",
          zIndex: 1,
          pointerEvents: "none",
          opacity: isDark ? 1 : 0,
          transition: "opacity 2.2s ease",
        }}
      >
        <TreeSilhouette />
      </div>
    </>
  );
}

function TreeSilhouette() {
  return (
    <svg
      width="140"
      height="160"
      viewBox="0 0 140 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="tree silhouette"
    >
      {/* Trunk */}
      <rect x="62" y="118" width="16" height="42" rx="4" fill="#0a1628" />
      {/* Roots spread */}
      <path
        d="M62 150 Q50 158 38 160"
        stroke="#0a1628"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M78 150 Q90 158 102 160"
        stroke="#0a1628"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Lower canopy — widest */}
      <ellipse cx="70" cy="108" rx="52" ry="32" fill="#0b1a30" />
      {/* Mid canopy */}
      <ellipse cx="70" cy="82" rx="42" ry="30" fill="#0c1e38" />
      {/* Upper canopy */}
      <ellipse cx="70" cy="58" rx="30" ry="26" fill="#0d2040" />
      {/* Top crown */}
      <ellipse cx="70" cy="36" rx="18" ry="20" fill="#0e2244" />
      {/* Branch left detail */}
      <path
        d="M36 100 Q28 88 20 82"
        stroke="#0a1628"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M20 82 Q14 78 10 72"
        stroke="#0a1628"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M20 82 Q16 86 12 90"
        stroke="#0a1628"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      {/* Branch right detail */}
      <path
        d="M104 100 Q112 88 120 82"
        stroke="#0a1628"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M120 82 Q126 78 130 72"
        stroke="#0a1628"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M120 82 Q124 86 128 90"
        stroke="#0a1628"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      {/* Mid branch left */}
      <path
        d="M44 72 Q34 62 24 58"
        stroke="#0a1628"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M24 58 Q18 52 14 46"
        stroke="#0a1628"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      {/* Mid branch right */}
      <path
        d="M96 72 Q106 62 116 58"
        stroke="#0a1628"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M116 58 Q122 52 126 46"
        stroke="#0a1628"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function CloudShape() {
  return (
    <div style={{ position: "relative", width: 200, height: 60 }}>
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 30,
          width: 140,
          height: 38,
          background: "rgba(255,255,255,0.88)",
          borderRadius: 30,
          filter: "blur(1px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 22,
          left: 22,
          width: 58,
          height: 44,
          background: "rgba(255,255,255,0.82)",
          borderRadius: "50%",
          filter: "blur(1.5px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 28,
          left: 64,
          width: 72,
          height: 52,
          background: "rgba(255,255,255,0.86)",
          borderRadius: "50%",
          filter: "blur(1.5px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 18,
          left: 128,
          width: 50,
          height: 40,
          background: "rgba(255,255,255,0.80)",
          borderRadius: "50%",
          filter: "blur(1px)",
        }}
      />
    </div>
  );
}

function BirdShape({
  scale,
  flapDuration,
  flapDelay,
}: {
  scale: number;
  flapDuration: string;
  flapDelay: string;
}) {
  return (
    <div
      style={{
        transform: `scale(${scale})`,
        transformOrigin: "center center",
        animation: `wingFlap ${flapDuration} ${flapDelay} ease-in-out infinite`,
      }}
    >
      <svg
        width="32"
        height="16"
        viewBox="0 0 32 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="bird"
      >
        <path
          d="M 16,8 C 12,4 7,2 2,5"
          stroke="rgba(28,48,78,0.5)"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 16,8 C 20,4 25,2 30,5"
          stroke="rgba(28,48,78,0.5)"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="16" cy="8" r="1.2" fill="rgba(28,48,78,0.5)" />
      </svg>
    </div>
  );
}
