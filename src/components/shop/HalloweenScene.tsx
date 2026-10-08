import { memo } from "react";
import { hwFx, hwRarity, hwCollectionOf, type HwFx } from "@/lib/halloween";

const Bat = ({ hue }: { hue: string }) => (
  <svg viewBox="0 0 40 16" width="100%" height="100%" aria-hidden="true">
    <path d="M20 9 C17 4 12 3 6 4 C9 6 9 9 5 10 C9 10 12 12 14 14 C16 11 18 11 20 13 C22 11 24 11 26 14 C28 12 31 10 35 10 C31 9 31 6 34 4 C28 3 23 4 20 9 Z" fill={`hsl(${hue} / 0.18)`} stroke="hsl(240 30% 4%)" strokeWidth="0.6" style={{ fill: "hsl(240 30% 4%)" }} />
  </svg>
);

// Animated environment rendered behind a Halloween skin in the large preview.
// Element count scales with rarity rank; transform/opacity animations only.
export const HalloweenScene = memo(({ skinId, tier }: { skinId: number; tier: number }) => {
  const fx: HwFx = hwFx(skinId);
  const r = hwRarity(skinId, tier);
  const col = hwCollectionOf(skinId);
  const hue = col?.hue ?? r.hue;
  const n = 3 + r.rank * 2;
  const seed = (i: number) => ((i * 37 + skinId * 13) % 100) / 100;

  return (
    <div className="hw-scene pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0" style={{ background: `radial-gradient(120% 80% at 50% 0%, hsl(${hue} / 0.28), transparent 60%), radial-gradient(90% 60% at 50% 110%, hsl(${r.hue} / 0.22), transparent 70%), linear-gradient(180deg, hsl(250 35% 7%), hsl(240 30% 4%))` }} />
      {(fx === "bats" || fx === "fog" || fx === "ghost" || r.rank >= 4) && (
        <div className="absolute right-[12%] top-[8%] h-[18%] aspect-square rounded-full" style={{ background: "radial-gradient(circle at 40% 40%, hsl(45 60% 92%), hsl(40 40% 70%) 60%, transparent 72%)", boxShadow: "0 0 40px hsl(45 80% 80% / 0.35)" }} />
      )}
      {/* distant silhouette skyline */}
      <svg className="absolute inset-x-0 bottom-0 h-[30%] w-full" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 30 V22 L6 20 L8 14 L10 20 L18 19 L20 10 L22 6 L24 10 L26 19 L40 21 L44 16 L48 21 L62 20 L66 12 L68 8 L70 12 L72 20 L84 22 L90 17 L94 22 L100 21 V30 Z" fill="hsl(240 35% 3%)" />
      </svg>
      <div className="hw-drift absolute inset-x-[-20%] bottom-[-4%] h-[34%] rounded-full blur-2xl" style={{ background: `radial-gradient(ellipse, hsl(${hue} / ${fx === "fog" ? 0.45 : 0.22}), transparent 70%)` }} />

      {fx === "bats" && Array.from({ length: Math.ceil(n / 2) }).map((_, i) => (
        <span key={i} className="hw-bat absolute h-[5%] w-[12%]" style={{ right: "-14%", top: `${10 + seed(i) * 45}%`, animationDuration: `${7 + seed(i + 3) * 5}s`, animationDelay: `${-i * 1.7}s` }}><Bat hue={hue} /></span>
      ))}
      {(fx === "flame" || fx === "spark" || r.rank >= 5) && Array.from({ length: n }).map((_, i) => (
        <span key={i} className="hw-ember absolute rounded-full" style={{ left: `${10 + seed(i) * 80}%`, bottom: "8%", width: 3 + (i % 3), height: 3 + (i % 3), background: `hsl(${fx === "spark" ? "190 95% 70%" : "30 100% 60%"})`, boxShadow: `0 0 8px hsl(${fx === "spark" ? "190 95% 70%" : "20 100% 55%"})`, ["--dx" as any]: `${(seed(i + 7) - 0.5) * 40}px`, animationDuration: `${2.4 + seed(i + 1) * 2.5}s`, animationDelay: `${-seed(i + 2) * 4}s` }} />
      ))}
      {(fx === "ghost" || fx === "smoke" || fx === "fog") && Array.from({ length: Math.ceil(n / 2) }).map((_, i) => (
        <span key={i} className="hw-wisp absolute rounded-full blur-xl" style={{ left: `${seed(i) * 80}%`, top: `${20 + seed(i + 4) * 55}%`, width: "28%", height: "18%", background: fx === "smoke" ? "hsl(260 15% 30% / 0.6)" : `hsl(${hue} / 0.35)`, animationDuration: `${4 + seed(i + 5) * 4}s`, animationDelay: `${-i * 1.1}s` }} />
      ))}
      {(fx === "star" || fx === "magic" || r.rank >= 3) && Array.from({ length: n + 2 }).map((_, i) => (
        <span key={i} className="hw-twinkle absolute rounded-full" style={{ left: `${seed(i + 9) * 95}%`, top: `${seed(i + 11) * 60}%`, width: 2 + (i % 2), height: 2 + (i % 2), background: fx === "magic" ? `hsl(${hue})` : "hsl(45 80% 90%)", boxShadow: `0 0 6px hsl(${fx === "magic" ? hue : "45 80% 90%"})`, animationDuration: `${1.6 + seed(i) * 2.4}s`, animationDelay: `${-seed(i + 1) * 3}s` }} />
      ))}
      {fx === "web" && (
        <>
          <svg className="absolute left-0 top-0 h-[40%] w-[40%] opacity-50" viewBox="0 0 50 50" aria-hidden="true">
            {[0, 15, 30, 45, 60, 75, 90].map((a) => <line key={a} x1="0" y1="0" x2={50 * Math.cos((a * Math.PI) / 180)} y2={50 * Math.sin((a * Math.PI) / 180)} stroke="hsl(0 0% 85%)" strokeWidth="0.4" />)}
            {[12, 24, 36, 48].map((rr) => <path key={rr} d={`M${rr} 0 Q${rr * 0.75} ${rr * 0.75} 0 ${rr}`} fill="none" stroke="hsl(0 0% 85%)" strokeWidth="0.4" />)}
          </svg>
          <span className="hw-spider absolute left-[22%] top-0 flex flex-col items-center">
            <span className="h-[18cqh] w-px bg-foreground/40" />
            <span className="h-3 w-3 rounded-full bg-background shadow-[0_0_8px_hsl(0_80%_50%/0.6)]" />
          </span>
        </>
      )}
      <div className="absolute inset-0" style={{ background: "radial-gradient(100% 100% at 50% 50%, transparent 55%, hsl(240 40% 2% / 0.8))" }} />
    </div>
  );
});
HalloweenScene.displayName = "HalloweenScene";
