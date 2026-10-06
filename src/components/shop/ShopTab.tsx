import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ChevronDown, Check, Sparkles } from "lucide-react";
import { SkinArt } from "./SkinArt";
import { TIERS, tierMeta, formatKeif, type SkinRow } from "@/lib/skins";
import { playSound } from "@/lib/sounds";

interface Props { userCode: string; userName: string }
type Sub = "catalog" | "mine" | "users" | "offers";
interface Mine { user_skin_id: string; skin_id: number; equipped: boolean; on_sale: boolean; balance: number }
interface Offer { offer_id: string; skin_id: number; seller_name: string; price: number; comment: string; created_at: string; is_mine: boolean }
interface ShopUser { user_id: string; user_name: string; skin_count: number; equipped_skin_id: number | null }

const errMsg = (e: any) => (e?.message || "הפעולה נכשלה").replace(/^.*?:\s/, "");

const tierRing = (tier: number) =>
  tier >= 9 ? "border-primary/60 shadow-glow" : tier >= 6 ? "border-accent/50 shadow-md" : tier >= 3 ? "border-primary/25" : "border-border/60";

const SkinCard = ({ skin, children, owned }: { skin: SkinRow; children?: React.ReactNode; owned?: boolean }) => {
  const t = tierMeta(skin.tier);
  return (
    <div className={`group relative flex min-w-0 flex-col items-center rounded-2xl border bg-card/60 p-3 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-card/80 ${owned ? "border-primary ring-2 ring-primary/40" : tierRing(skin.tier)}`}>
      {owned && (
        <span className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
          <Check className="h-3 w-3" /> בבעלותך
        </span>
      )}
      <div className="flex h-24 w-full items-center justify-center transition-transform duration-500 group-hover:scale-105">
        <SkinArt skinId={skin.id} tier={skin.tier} size={84} />
      </div>
      <div className="mt-2 w-full min-w-0 text-center">
        <p className="truncate text-sm font-semibold">{skin.name}</p>
        <p className="text-[11px] font-medium" style={{ color: `hsl(${t.hue} 80% 65%)` }}>{t.name}</p>
      </div>
      {children}
    </div>
  );
};

export const ShopTab = ({ userCode }: Props) => {
  const [sub, setSub] = useState<Sub>("catalog");
  const [skins, setSkins] = useState<SkinRow[]>([]);
  const [mine, setMine] = useState<Mine[]>([]);
  const [balance, setBalance] = useState(0);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [users, setUsers] = useState<ShopUser[]>([]);
  const [openUser, setOpenUser] = useState<string | null>(null);
  const [userSkins, setUserSkins] = useState<Record<string, number[]>>({});
  const [tierFilter, setTierFilter] = useState<number | 0>(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [sellId, setSellId] = useState<string>("");
  const [sellPrice, setSellPrice] = useState("");
  const [sellComment, setSellComment] = useState("");

  const byId = useMemo(() => new Map(skins.map((s) => [s.id, s])), [skins]);
  const ownedIds = useMemo(() => new Set(mine.map((m) => m.skin_id)), [mine]);

  const loadMine = useCallback(async () => {
    const [{ data }, { data: bal }] = await Promise.all([
      supabase.rpc("shop_my_skins", { _user_code: userCode }),
      supabase.rpc("shop_balance", { _user_code: userCode }),
    ]);
    setMine((data as Mine[]) || []);
    setBalance(Number(bal) || 0);
  }, [userCode]);
  const loadOffers = useCallback(async () => {
    const { data } = await supabase.rpc("shop_offers", { _user_code: userCode });
    setOffers((data as Offer[]) || []);
  }, [userCode]);

  useEffect(() => {
    supabase.from("skins").select("id,name,tier,price").order("id").then(({ data }) => setSkins((data as SkinRow[]) || []));
    loadMine();
  }, [loadMine]);
  useEffect(() => {
    if (sub === "offers") loadOffers();
    if (sub === "users") supabase.rpc("shop_users").then(({ data }) => setUsers((data as ShopUser[]) || []));
  }, [sub, loadOffers]);

  const run = async (key: string, fn: () => PromiseLike<{ error: any }>, ok: string) => {
    setBusy(key);
    const { error } = await fn();
    setBusy(null);
    if (error) { playSound("error" as any); toast.error(errMsg(error)); return false; }
    playSound("success" as any);
    toast.success(ok);
    await loadMine();
    return true;
  };

  const equip = async (m: Mine | null) => {
    const ok = await run(m ? m.user_skin_id : "unequip", () => supabase.rpc("shop_equip", { _user_code: userCode, _user_skin_id: m ? m.user_skin_id : (null as any) }), m ? "הסקין הוגדר כאווטאר" : "האווטאר הוסר");
    if (ok) window.dispatchEvent(new Event("skin-equipped"));
  };

  const toggleUser = async (id: string) => {
    if (openUser === id) return setOpenUser(null);
    setOpenUser(id);
    if (!userSkins[id]) {
      const { data } = await supabase.rpc("shop_user_skins", { _user_id: id });
      setUserSkins((p) => ({ ...p, [id]: ((data as { skin_id: number }[]) || []).map((r) => r.skin_id) }));
    }
  };

  const createOffer = async () => {
    const price = Number(sellPrice.replace(/[^\d]/g, ""));
    if (!sellId) return toast.error("בחר סקין למכירה");
    if (!price || price <= 0) return toast.error("הזן מחיר תקין");
    const ok = await run("sell", () => supabase.rpc("shop_create_offer", { _user_code: userCode, _user_skin_id: sellId, _price: price, _comment: sellComment.trim().slice(0, 300) }), "ההצעה פורסמה");
    if (ok) { setSellId(""); setSellPrice(""); setSellComment(""); loadOffers(); }
  };

  const tabs: { k: Sub; l: string }[] = [
    { k: "catalog", l: "קטלוג" }, { k: "mine", l: "הסקינים שלי" }, { k: "users", l: "משתמשים" }, { k: "offers", l: "הצעות" },
  ];
  const visible = tierFilter ? skins.filter((s) => s.tier === tierFilter) : skins;
  const sellable = mine.filter((m) => !m.on_sale);

  return (
    <div dir="rtl" className="min-w-0 space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/50 p-5 backdrop-blur-xl sm:p-7">
        <div className="pointer-events-none absolute inset-x-16 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-medium text-primary"><Sparkles className="h-3.5 w-3.5" /> חנות Schooltrade</p>
            <h2 className="mt-1 text-2xl font-semibold sm:text-3xl">חנות</h2>
            <p className="mt-1 text-sm text-muted-foreground">100 סקינים, 10 דרגות נדירות. הגדר סקין כאווטאר שלך.</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/50 px-4 py-2.5 text-left">
            <p className="text-[11px] text-muted-foreground">היתרה שלך</p>
            <p className="text-lg font-semibold tabular-nums">🪙 {formatKeif(balance)}</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl bg-muted/60 p-1 sm:grid-cols-4">
          {tabs.map((t) => (
            <button key={t.k} onClick={() => { playSound("tab"); setSub(t.k); }}
              className={`min-w-0 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-300 ${sub === t.k ? "bg-background text-foreground shadow-md" : "text-muted-foreground hover:text-foreground"}`}>
              {t.l}
            </button>
          ))}
        </div>
      </div>

      <div key={sub} style={{ animation: "fadeSlideIn 0.3s ease-out" }} className="min-w-0">
        {sub === "catalog" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => setTierFilter(0)} className={`rounded-full border px-3 py-1 text-xs transition-colors ${!tierFilter ? "border-primary bg-primary/15 text-foreground" : "border-border/60 text-muted-foreground hover:text-foreground"}`}>הכל</button>
              {TIERS.map((t) => (
                <button key={t.tier} onClick={() => setTierFilter(t.tier)} className={`rounded-full border px-3 py-1 text-xs transition-colors ${tierFilter === t.tier ? "border-primary bg-primary/15 text-foreground" : "border-border/60 text-muted-foreground hover:text-foreground"}`}>{t.name}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(170px,1fr))]">
              {visible.map((s) => {
                const owned = ownedIds.has(s.id);
                return (
                  <SkinCard key={s.id} skin={s} owned={owned}>
                    <p className="mt-1 text-xs tabular-nums text-muted-foreground">🪙 {formatKeif(s.price)}</p>
                    <Button size="sm" className="mt-2 h-9 w-full rounded-xl" variant={owned ? "outline" : "default"}
                      disabled={owned || busy === `b${s.id}`}
                      onClick={() => run(`b${s.id}`, () => supabase.rpc("shop_buy_catalog", { _user_code: userCode, _skin_id: s.id }), `רכשת את ${s.name}`)}>
                      {owned ? "בבעלותך" : busy === `b${s.id}` ? "רוכש..." : "קנה"}
                    </Button>
                  </SkinCard>
                );
              })}
            </div>
          </div>
        )}

        {sub === "mine" && (
          mine.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">עדיין אין לך סקינים. בקר בקטלוג כדי לרכוש את הראשון.</p>
          ) : (
            <div className="space-y-3">
              {mine.some((m) => m.equipped) && (
                <Button variant="ghost" size="sm" onClick={() => equip(null)} disabled={busy === "unequip"}>הסר אווטאר</Button>
              )}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(170px,1fr))]">
                {mine.map((m) => { const s = byId.get(m.skin_id); if (!s) return null; return (
                  <SkinCard key={m.user_skin_id} skin={s} owned>
                    {m.on_sale && <p className="mt-1 text-[11px] text-accent">מוצע למכירה</p>}
                    <Button size="sm" className="mt-2 h-9 w-full rounded-xl" variant={m.equipped ? "outline" : "default"} disabled={m.equipped || busy === m.user_skin_id} onClick={() => equip(m)}>
                      {m.equipped ? "האווטאר שלך" : "הגדר כאווטאר"}
                    </Button>
                  </SkinCard>
                ); })}
              </div>
            </div>
          )
        )}

        {sub === "users" && (
          <div className="divide-y divide-border/50 overflow-hidden rounded-2xl border border-border/60 bg-card/50">
            {users.map((u) => (
              <div key={u.user_id}>
                <button onClick={() => toggleUser(u.user_id)} className="flex w-full min-w-0 items-center gap-3 px-4 py-3 text-right transition-colors hover:bg-muted/40">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/60">
                    {u.equipped_skin_id && byId.get(u.equipped_skin_id) ? <SkinArt skinId={u.equipped_skin_id} tier={byId.get(u.equipped_skin_id)!.tier} size={28} animated={false} /> : <span className="text-xs text-muted-foreground">{u.user_name.slice(0, 1)}</span>}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{u.user_name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{u.skin_count} סקינים</span>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ${openUser === u.user_id ? "rotate-180" : ""}`} />
                </button>
                {openUser === u.user_id && (
                  <div className="bg-background/40 px-4 pb-4 pt-1" style={{ animation: "fadeSlideIn 0.25s ease-out" }}>
                    {!userSkins[u.user_id] ? <p className="text-xs text-muted-foreground">טוען...</p> :
                      userSkins[u.user_id].length === 0 ? <p className="text-xs text-muted-foreground">אין סקינים</p> : (
                        <div className="flex flex-wrap gap-2">
                          {userSkins[u.user_id].map((id, i) => { const s = byId.get(id); return s ? (
                            <div key={`${id}-${i}`} title={`${s.name} · ${tierMeta(s.tier).name}`} className="flex flex-col items-center rounded-xl border border-border/50 bg-card/60 p-1.5">
                              <SkinArt skinId={s.id} tier={s.tier} size={44} animated={false} />
                              <span className="max-w-[56px] truncate text-[10px] text-muted-foreground">{s.name}</span>
                            </div>
                          ) : null; })}
                        </div>
                      )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {sub === "offers" && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-border/60 bg-card/50 p-4 sm:p-5">
              <h3 className="text-base font-semibold">הצע סקין למכירה</h3>
              {sellable.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">אין לך סקינים זמינים למכירה.</p> : (
                <div className="mt-3 space-y-3">
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {sellable.map((m) => { const s = byId.get(m.skin_id); return s ? (
                      <button key={m.user_skin_id} onClick={() => setSellId(m.user_skin_id)} className={`flex shrink-0 flex-col items-center rounded-xl border p-2 transition-all ${sellId === m.user_skin_id ? "border-primary bg-primary/10" : "border-border/60 hover:border-primary/40"}`}>
                        <SkinArt skinId={s.id} tier={s.tier} size={48} animated={false} />
                        <span className="text-[11px]">{s.name}</span>
                      </button>
                    ) : null; })}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[200px_1fr_auto]">
                    <Input inputMode="numeric" placeholder="מחיר בקיפים" value={sellPrice} onChange={(e) => setSellPrice(e.target.value.replace(/[^\d]/g, "").slice(0, 30))} className="h-11 rounded-xl" />
                    <Textarea placeholder="הערה (לא חובה)" value={sellComment} maxLength={300} onChange={(e) => setSellComment(e.target.value)} className="min-h-11 rounded-xl" rows={1} />
                    <Button onClick={createOffer} disabled={busy === "sell"} className="h-11 rounded-xl">פרסם הצעה</Button>
                  </div>
                </div>
              )}
            </div>
            {offers.length === 0 ? <p className="rounded-2xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">אין הצעות פעילות כרגע.</p> : (
              <div className="grid gap-3 sm:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
                {offers.map((o) => { const s = byId.get(o.skin_id); if (!s) return null; return (
                  <div key={o.offer_id} className={`flex min-w-0 gap-3 rounded-2xl border bg-card/60 p-3 ${tierRing(s.tier)}`}>
                    <div className="flex shrink-0 items-center"><SkinArt skinId={s.id} tier={s.tier} size={64} /></div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{s.name} <span className="text-[11px] font-normal" style={{ color: `hsl(${tierMeta(s.tier).hue} 80% 65%)` }}>· {tierMeta(s.tier).name}</span></p>
                      <p className="truncate text-xs text-muted-foreground">מוכר: {o.seller_name}</p>
                      {o.comment && <p className="mt-1 line-clamp-2 break-words text-xs text-foreground/80">{o.comment}</p>}
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold tabular-nums">🪙 {formatKeif(o.price)}</span>
                        {o.is_mine ? (
                          <Button size="sm" variant="outline" className="h-9 rounded-xl" disabled={busy === o.offer_id}
                            onClick={async () => { if (await run(o.offer_id, () => supabase.rpc("shop_cancel_offer", { _user_code: userCode, _offer_id: o.offer_id }), "ההצעה בוטלה")) loadOffers(); }}>בטל</Button>
                        ) : (
                          <Button size="sm" className="h-9 rounded-xl" disabled={busy === o.offer_id || ownedIds.has(o.skin_id)}
                            onClick={async () => { if (await run(o.offer_id, () => supabase.rpc("shop_buy_offer", { _user_code: userCode, _offer_id: o.offer_id }), `רכשת את ${s.name}`)) loadOffers(); }}>
                            {ownedIds.has(o.skin_id) ? "בבעלותך" : "קנה"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ); })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ShopTab;
