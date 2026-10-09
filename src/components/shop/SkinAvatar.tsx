import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SkinArt } from "./SkinArt";

// Shows the user's equipped skin (from the database) as a small avatar.
export const SkinAvatar = ({ userCode, size = 28, refreshKey = 0 }: { userCode: string; size?: number; refreshKey?: number }) => {
  const [skin, setSkin] = useState<{ id: number; tier: number } | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: id } = await supabase.rpc("shop_equipped_skin", { _user_code: userCode });
      if (!alive) return;
      if (!id) return setSkin(null);
      const { data } = await supabase.from("skins").select("id,tier").eq("id", id).maybeSingle();
      if (alive) setSkin(data ?? null);
    })();
    const h = () => setTimeout(() => alive && supabase.rpc("shop_equipped_skin", { _user_code: userCode }).then(async ({ data: id }) => {
      if (!id) return setSkin(null);
      const { data } = await supabase.from("skins").select("id,tier").eq("id", id).maybeSingle();
      if (alive) setSkin(data ?? null);
    }), 0);
    window.addEventListener("skin-equipped", h);
    return () => { alive = false; window.removeEventListener("skin-equipped", h); };
  }, [userCode, refreshKey]);
  if (!skin) return null;
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/60 ${skin.id > 100 ? "hw-equipped" : ""}`} style={{ width: size + 6, height: size + 6, ["--hw" as any]: "28 95% 55%" }}>
      <SkinArt skinId={skin.id} tier={skin.tier} size={size} />
    </span>
  );
};
