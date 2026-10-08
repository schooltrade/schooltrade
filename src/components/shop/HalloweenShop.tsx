import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { SkinArt } from "./SkinArt";
import { HalloweenScene } from "./HalloweenScene";
import { formatKeif, type SkinRow } from "@/lib/skins";
import {
  HW_COLLECTIONS, FX_LABEL, hwRarity, hwCollectionOf, hwFx, hwLore, hwSound, isSecret,
  getRevealed, markRevealed, getCelebrated, markCelebrated, type HwCollection,
} from "@/lib/halloween";

interface MineLite { user_skin_id: string; skin_id: number; equipped: boolean }
interface Props {
  skins: SkinRow[];
  mine: MineLite[];
  hwOpen: boolean;
  hwDaysLeft: number | null;
  busy: string | null;
  onBuy: (s: SkinRow) => Promise<unknown>;
  onEquip: (m: MineLite) => Promise<unknown>;
}

const Atmosphere = () => (
  <div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden rounded-3xl" aria-hidden="true">
    <div className="hw-drift absolute -left-1/4 top-1/3 h-1/3 w-[150%] rounded-full blur-3xl" style={{ background: "radial-gradient(ellipse, hsl(275 70% 40% / 0.12), transparent 70%)" }} />
    <div className="hw-drift absolute -right-1/4 bottom-0 h-1/4 w-[150%] rounded-full blur-3xl" style={{ background: "radial-gradient(ellipse, hsl(28 95% 50% / 0.10), transparent 70%)", animationDelay: "-4s" }} />
    {Array.from({ length: 10 }).map((_, i) => (
      <span key={i} className="hw-twinkle absolute rounded-full" style={{ left: `${(i * 41) % 100}%`, top: `${(i * 67) % 100}%`, width: 3, height: 3, background: i % 2 ? "hsl(28 95% 60%)" : "hsl(275 80% 70%)", animationDuration: `${3 + (i % 4)}s`, animationDelay: `${-i}s` }} />
    ))}
  </div>
);

export const HalloweenShop = ({ skins, mine, hwOpen, hwDaysLeft, busy, onBuy, onEquip }: Props) => {
  const [openId, setOpenId] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(getRevealed);
  const [celebrate, setCelebrate] = useState<HwCollection | null>(null);
  const owned = useMemo(() => new Map(mine.map((m) => [m.skin_id, m])), [mine]);
  const first = useRef(true);

  // Owned secrets are always revealed for their owner.
  const isHidden = (id: number) => isSecret(id) && !revealed.has(id) && !owned.has(id);

  const progress = useMemo(() => HW_COLLECTIONS.map((c) => ({ c, have: c.ids.filter((id) => owned.has(id)).length })), [owned]);

  useEffect(() => {
    if (!mine.length) return;
    const done = getCelebrated();
    const fresh = progress.find(({ c, have }) => have === c.ids.length && !done.has(c.key));
    if (fresh) {
      markCelebrated(fresh.c.key);
      // Don't replay a celebration on initial load for collections completed earlier in another session
      if (!first.current) { setCelebrate(fresh.c); hwSound("reveal"); }
    }
    first.current = false;
  }, [progress, mine.length]);

  const open = skins.find((s) => s.id === openId) || null;

  return (
    <div className="relative space-y-4">
      <Atmosphere />
      <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-card/60 p-4 sm:p-5">
        <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-semibold">קולקציית האלווין · מהדורה מוגבלת</p>
            <p className="mt-0.5 text-xs text-muted-foreground">50 סקינים חיים, 6 דרגות נדירות, סקינים סודיים וקולקציות לאיסוף. לחץ על סקין לתצוגה מלאה.</p>
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs ${hwOpen ? "border-primary/40 text-primary" : "border-border text-muted-foreground"}`}>
            {hwOpen ? (hwDaysLeft != null ? `זמין עוד ${hwDaysLeft} ימים · עד 1.1.2027` : "זמין עד 1.1.2027") : "הקולקציה הסתיימה"}
          </span>
        </div>
      </div>

      {/* Collections */}
      <div className="relative -mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
        {progress.map(({ c, have }) => {
          const done = have === c.ids.length;
          return (
            <div key={c.key} className={`min-w-[150px] shrink-0 snap-start rounded-xl border bg-card/60 p-3 backdrop-blur-sm ${done ? "hw-equipped" : "border-border/60"}`} style={{ ["--hw" as any]: c.hue }}>
              <p className="truncate text-xs font-semibold" style={{ color: `hsl(${c.hue})` }}>{c.name}</p>
              <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">{have} / {c.ids.length} נאספו</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(have / c.ids.length) * 100}%`, background: `hsl(${c.hue})` }} />
              </div>
              {done && <p className="mt-1.5 flex items-center gap-1 text-[10px] font-medium"><Sparkles className="h-3 w-3" /> תג: {c.badge}</p>}
            </div>
          );
        })}
      </div>

      <div className="relative grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(170px,1fr))]">
        {skins.map((s) => {
          const r = hwRarity(s.id, s.tier);
          const m = owned.get(s.id);
          const hidden = isHidden(s.id);
          const col = hwCollectionOf(s.id);
          return (
            <div key={s.id} style={{ contentVisibility: "auto", containIntrinsicSize: "0 230px" }}>
              <button type="button" onClick={() => { setOpenId(s.id); hwSound(hidden ? "reveal" : hwFx(s.id)); }}
                className={`group relative flex w-full min-w-0 flex-col items-center overflow-hidden rounded-2xl border bg-card/60 p-3 text-right backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-card/80 active:scale-[0.97] ${m?.equipped ? "hw-equipped" : ""}`}
                style={{ ["--hw" as any]: r.hue, borderColor: `hsl(${r.hue} / ${0.2 + r.rank * 0.08})` }}>
                <span className="absolute inset-x-0 top-0 h-0.5" style={{ background: `linear-gradient(90deg, transparent, hsl(${r.hue}), transparent)` }} />
                {m && (
                  <span className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                    <Check className="h-3 w-3" /> {m.equipped ? "מצויד" : "בבעלותך"}
                  </span>
                )}
                {col && <span className="absolute left-2 top-2 z-10 h-2 w-2 rounded-full" title={col.name} style={{ background: `hsl(${col.hue})`, boxShadow: `0 0 6px hsl(${col.hue})` }} />}
                <div className="flex h-24 w-full items-center justify-center transition-transform duration-500 group-hover:scale-105">
                  {hidden ? (
                    <span className="hw-silhouette relative" style={{ filter: "brightness(0) drop-shadow(0 0 8px hsl(150 90% 55% / .6))" }}>
                      <SkinArt skinId={s.id} tier={s.tier} size={84} animated={false} />
                    </span>
                  ) : <SkinArt skinId={s.id} tier={s.tier} size={84} />}
                </div>
                <div className="mt-2 w-full min-w-0 text-center">
                  <p className="truncate text-sm font-semibold">{hidden ? "???" : s.name}</p>
                  <p className="text-[11px] font-medium" style={{ color: `hsl(${r.hue})` }}>{r.name}</p>
                  <p className="mt-1 text-xs tabular-nums text-muted-foreground">🪙 {formatKeif(s.price)}</p>
                </div>
              </button>
            </div>
          );
        })}
      </div>

      <Preview skin={open} mine={open ? owned.get(open.id) : undefined} hidden={open ? isHidden(open.id) : false}
        ownedSet={owned} hwOpen={hwOpen} busy={busy} onClose={() => setOpenId(null)}
        onReveal={(id) => { markRevealed(id); setRevealed(getRevealed()); }}
        onBuy={onBuy} onEquip={onEquip} />

      <Dialog open={!!celebrate} onOpenChange={(o) => !o && setCelebrate(null)}>
        <DialogContent dir="rtl" className="max-w-sm overflow-hidden border-primary/40 text-center">
          <div className="hw-pop mx-auto mt-2 flex h-20 w-20 items-center justify-center rounded-full hw-equipped" style={{ ["--hw" as any]: celebrate?.hue, background: `radial-gradient(circle, hsl(${celebrate?.hue} / .45), transparent 70%)` }}>
            <Sparkles className="h-9 w-9" style={{ color: `hsl(${celebrate?.hue})` }} />
          </div>
          <DialogTitle className="text-xl">השלמת את {celebrate?.name}!</DialogTitle>
          <DialogDescription>קיבלת את התג "{celebrate?.badge}". ההישג נשמר לתמיד.</DialogDescription>
          <Button onClick={() => setCelebrate(null)} className="mt-2 w-full rounded-xl">מעולה</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Preview = ({ skin, mine, hidden, ownedSet, hwOpen, busy, onClose, onReveal, onBuy, onEquip }: {
  skin: SkinRow | null; mine?: MineLite; hidden: boolean; ownedSet: Map<number, MineLite>; hwOpen: boolean; busy: string | null;
  onClose: () => void; onReveal: (id: number) => void; onBuy: (s: SkinRow) => Promise<unknown>; onEquip: (m: MineLite) => Promise<unknown>;
}) => {
  const [react, setReact] = useState(0);
  const [phase, setPhase] = useState<"idle" | "building" | "shown">("idle");
  useEffect(() => { setPhase("idle"); setReact(0); }, [skin?.id]);
  if (!skin) return null;
  const r = hwRarity(skin.id, skin.tier);
  const col = hwCollectionOf(skin.id);
  const fx = hwFx(skin.id);
  const have = col ? col.ids.filter((id) => ownedSet.has(id)).length : 0;
  const locked = hidden && phase !== "shown";

  const reveal = () => {
    setPhase("building");
    hwSound("reveal");
    setTimeout(() => { onReveal(skin.id); setPhase("shown"); }, 1100);
  };
  const tap = () => { if (locked) return; setReact((k) => k + 1); hwSound(fx); };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir="rtl" className="max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-md gap-0 overflow-y-auto overflow-x-hidden rounded-3xl border p-0" style={{ borderColor: `hsl(${r.hue} / .45)` }}>
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          <HalloweenScene skinId={skin.id} tier={skin.tier} />
          <button type="button" onClick={tap} aria-label="הפעל תגובה" className="absolute inset-0 flex items-center justify-center">
            <span key={`${react}-${phase}`} className={`relative ${phase === "shown" ? "hw-reveal-in" : react ? "hw-react" : ""}`}
              style={locked ? { filter: "brightness(0) drop-shadow(0 0 12px hsl(150 90% 55% / .7))" } : undefined}>
              <SkinArt skinId={skin.id} tier={skin.tier} size={170} animated={!locked} />
              {react > 0 && !locked && <span className="hw-flash pointer-events-none absolute inset-0 rounded-full" style={{ background: `radial-gradient(circle, hsl(${r.hue} / .55), transparent 65%)` }} />}
            </span>
          </button>
          {phase === "building" && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/70 transition-opacity">
              {Array.from({ length: 18 }).map((_, i) => {
                const a = (i / 18) * Math.PI * 2;
                return <span key={i} className="hw-converge absolute h-1.5 w-1.5 rounded-full" style={{ background: "hsl(150 90% 60%)", boxShadow: "0 0 8px hsl(150 90% 60%)", ["--dx" as any]: `${Math.cos(a) * 140}px`, ["--dy" as any]: `${Math.sin(a) * 110}px`, animationDelay: `${(i % 6) * 0.08}s` }} />;
              })}
            </div>
          )}
          <span className="absolute right-3 top-3 rounded-full border bg-background/60 px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur" style={{ color: `hsl(${r.hue})`, borderColor: `hsl(${r.hue} / .5)` }}>{r.name}</span>
          {!locked && <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-background/50 px-2 py-0.5 text-[10px] text-muted-foreground backdrop-blur">הקש על הסקין</span>}
        </div>

        <div className="space-y-3 p-4 sm:p-5">
          <div>
            <DialogTitle className="text-xl">{locked ? "??? סקין סודי" : skin.name}</DialogTitle>
            <DialogDescription className="mt-1 text-sm leading-relaxed">
              {locked ? "משהו זז בתוך הצל. בטוח שאתה רוצה לחשוף מה מסתתר בפנים?" : hwLore(skin.id)}
            </DialogDescription>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl border border-border/60 bg-muted/40 p-2.5"><p className="text-muted-foreground">מחיר</p><p className="mt-0.5 font-semibold tabular-nums">🪙 {formatKeif(skin.price)}</p></div>
            <div className="rounded-xl border border-border/60 bg-muted/40 p-2.5"><p className="text-muted-foreground">אפקט</p><p className="mt-0.5 font-semibold">{locked ? "???" : FX_LABEL[fx]}</p></div>
            <div className="rounded-xl border border-border/60 bg-muted/40 p-2.5"><p className="text-muted-foreground">סטטוס</p><p className="mt-0.5 font-semibold">{mine ? (mine.equipped ? "מצויד" : "בבעלותך") : "לא בבעלותך"}</p></div>
            <div className="rounded-xl border border-border/60 bg-muted/40 p-2.5"><p className="text-muted-foreground">קולקציה</p><p className="mt-0.5 truncate font-semibold">{col ? col.name : "ללא"}</p></div>
          </div>

          {col && (
            <div>
              <div className="flex justify-between text-[11px] text-muted-foreground"><span>התקדמות בקולקציה</span><span className="tabular-nums">{have} / {col.ids.length} נאספו</span></div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${(have / col.ids.length) * 100}%`, background: `hsl(${col.hue})` }} /></div>
            </div>
          )}

          {locked ? (
            <Button className="h-11 w-full rounded-xl" disabled={phase === "building"} onClick={reveal}>
              <Lock className="ml-1 h-4 w-4" /> {phase === "building" ? "חושף..." : "חשוף את הסקין"}
            </Button>
          ) : mine ? (
            <Button className="h-11 w-full rounded-xl" variant={mine.equipped ? "outline" : "default"} disabled={mine.equipped || busy === mine.user_skin_id}
              onClick={() => { onEquip(mine); hwSound(fx); }}>
              {mine.equipped ? "מצויד ✓" : busy === mine.user_skin_id ? "מצייד..." : "צייד כאווטאר"}
            </Button>
          ) : (
            <Button className="h-11 w-full rounded-xl" disabled={!hwOpen || busy === `b${skin.id}`}
              onClick={async () => { await onBuy(skin); }}>
              {!hwOpen ? "לא זמין · הקולקציה הסתיימה" : busy === `b${skin.id}` ? "רוכש..." : `קנה · 🪙 ${formatKeif(skin.price)}`}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HalloweenShop;
