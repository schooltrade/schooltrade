import { useId } from "react";
import { tierMeta } from "@/lib/skins";

// Procedurally designed vector skins. Each id yields a distinct silhouette,
// palette and set of effects; detail increases with rarity tier.

const star = (cx: number, cy: number, ro: number, ri: number, n = 5) => {
  let d = "";
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? ri : ro;
    const a = (Math.PI / n) * i - Math.PI / 2;
    d += `${i ? "L" : "M"}${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)} `;
  }
  return d + "Z";
};

const SHAPES = [
  "M50 12 L82 24 V50 C82 70 68 82 50 90 C32 82 18 70 18 50 V24 Z",
  "M30 16 H70 L86 40 L50 90 L14 40 Z",
  "M50 14 A36 36 0 1 1 49.9 14 Z",
  "M50 10 L85 30 V70 L50 90 L15 70 V30 Z",
  star(50, 52, 40, 18),
  "M14 76 L18 28 L36 50 L50 18 L64 50 L82 28 L86 76 Z",
  "M14 34 C14 22 30 18 50 26 C70 18 86 22 86 34 C86 60 70 78 50 86 C30 78 14 60 14 34 Z",
  "M50 30 C40 16 18 14 10 26 C20 30 22 40 14 48 C26 50 30 60 24 70 C36 66 44 72 50 84 C56 72 64 66 76 70 C70 60 74 50 86 48 C78 40 80 30 90 26 C82 14 60 16 50 30 Z",
  "M50 8 C60 28 80 36 78 60 C77 78 63 92 50 92 C37 92 23 78 22 60 C21 44 35 38 37 22 C43 31 46 38 50 41 C53 30 51 19 50 8 Z",
  "M50 6 L63 38 L94 50 L63 62 L50 94 L37 62 L6 50 L37 38 Z",
];

export const SkinArt = ({ skinId, tier, size = 96, animated = true }: { skinId: number; tier: number; size?: number; animated?: boolean }) => {
  const uid = useId().replace(/:/g, "");
  const idx = (skinId - 1) % 10;
  const shape = SHAPES[(idx + tier * 3) % 10];
  const inner = SHAPES[(idx + tier * 3 + 5) % 10];
  const base = (tierMeta(tier).hue + idx * 23) % 360;
  const h2 = (base + 40 + tier * 6) % 360;
  const sat = 30 + tier * 6;
  const c1 = `hsl(${base} ${sat}% ${tier < 3 ? 62 : 68}%)`;
  const c2 = `hsl(${h2} ${sat + 6}% ${tier < 3 ? 38 : 30}%)`;
  const c3 = `hsl(${(base + 180) % 360} ${Math.min(sat + 20, 95)}% 75%)`;
  const glow = `hsl(${base} 95% 65%)`;
  const anim = animated && tier >= 8;

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-hidden="true" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={`g${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={c1}>
            {animated && tier === 10 && <animate attributeName="stop-color" values={`${c1};${c3};${c1}`} dur="4s" repeatCount="indefinite" />}
          </stop>
          {tier >= 5 && <stop offset="50%" stopColor={c3} stopOpacity={0.85} />}
          <stop offset="100%" stopColor={c2}>
            {animated && tier === 10 && <animate attributeName="stop-color" values={`${c2};${glow};${c2}`} dur="4s" repeatCount="indefinite" />}
          </stop>
        </linearGradient>
        <radialGradient id={`h${uid}`} cx="0.35" cy="0.25" r="0.6">
          <stop offset="0%" stopColor="hsl(0 0% 100%)" stopOpacity="0.7" />
          <stop offset="100%" stopColor="hsl(0 0% 100%)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`a${uid}`}>
          <stop offset="0%" stopColor={glow} stopOpacity="0.55" />
          <stop offset="100%" stopColor={glow} stopOpacity="0" />
        </radialGradient>
        <clipPath id={`c${uid}`}><path d={shape} /></clipPath>
        {tier >= 5 && (
          <filter id={`f${uid}`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation={1.5 + tier * 0.4} result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        )}
      </defs>

      {tier >= 6 && (
        <circle cx="50" cy="50" r="48" fill={`url(#a${uid})`}>
          {animated && tier >= 9 && <animate attributeName="r" values="44;50;44" dur="3s" repeatCount="indefinite" />}
        </circle>
      )}

      {tier >= 6 && (
        <ellipse cx="50" cy="52" rx="47" ry="14" fill="none" stroke={c3} strokeOpacity="0.5" strokeWidth="1.2" transform={`rotate(${-18 + idx * 4} 50 52)`} />
      )}

      {tier >= 8 && (
        <circle cx="50" cy="50" r="46" fill="none" stroke={glow} strokeOpacity="0.6" strokeWidth="1" strokeDasharray="2 6">
          {anim && <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="14s" repeatCount="indefinite" />}
        </circle>
      )}

      <g filter={tier >= 5 ? `url(#f${uid})` : undefined}>
        <path d={shape} fill={`url(#g${uid})`} stroke={tier >= 4 ? c3 : c2} strokeWidth={tier >= 4 ? 1.6 : 1.2} strokeLinejoin="round" />
      </g>

      <g clipPath={`url(#c${uid})`}>
        {tier >= 4 &&
          Array.from({ length: 6 + tier }).map((_, i) => {
            const a = (Math.PI * 2 * i) / (6 + tier);
            return <line key={i} x1="50" y1="50" x2={50 + 60 * Math.cos(a)} y2={50 + 60 * Math.sin(a)} stroke="hsl(0 0% 100%)" strokeOpacity="0.12" strokeWidth="0.8" />;
          })}
        {tier >= 7 &&
          Array.from({ length: 7 }).map((_, i) => (
            <path key={i} d={star(20 + ((i * 37 + idx * 11) % 60), 22 + ((i * 53 + idx * 7) % 56), 2.4, 0.8, 4)} fill="hsl(0 0% 100%)" opacity="0.8">
              {animated && <animate attributeName="opacity" values="0.2;1;0.2" dur={`${1.6 + i * 0.3}s`} repeatCount="indefinite" />}
            </path>
          ))}
        {tier >= 2 && <ellipse cx="38" cy="30" rx="26" ry="16" fill={`url(#h${uid})`} />}
      </g>

      {tier >= 3 && (
        <path d={inner} transform="translate(50 52) scale(0.36) translate(-50 -50)" fill={tier >= 6 ? "hsl(0 0% 100%)" : c3} fillOpacity={tier >= 6 ? 0.9 : 0.75} stroke={c2} strokeWidth="2.5" />
      )}

      {tier >= 9 &&
        [0, 1, 2].map((i) => (
          <circle key={i} r={1.8 + (tier - 9)} fill={i % 2 ? c3 : glow}>
            {animated && (
              <animateMotion dur={`${4 + i * 1.5}s`} repeatCount="indefinite" begin={`${i * -1.3}s`} path="M50 6 A44 44 0 1 1 49.9 6 Z" />
            )}
          </circle>
        ))}
    </svg>
  );
};

export default SkinArt;
