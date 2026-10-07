import { formatKeifExact } from "@/lib/skins";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LeaderboardEntry {
  id: string;
  user_code: string;
  user_name: string;
  total_keif: string;
}

interface KeifLeaderboardProps {
  userCode: string;
}

export const KeifLeaderboard = ({ userCode }: KeifLeaderboardProps) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchLeaderboard = async () => {
    const { data } = await supabase
      .from("keif_balances")
      .select("id, user_code, user_name, total_keif:total_keif::text")
      .order("total_keif", { ascending: false })
      .limit(50);
    setEntries((data as LeaderboardEntry[]) || []);
    setLoading(false);
  };

  const getRankStyle = (rank: number) => {
    if (rank === 1) return {
      card: "bg-gradient-to-r from-yellow-500/20 via-amber-400/15 to-yellow-500/10 border-yellow-400/60",
      rank: "text-yellow-400 text-2xl",
      glow: "shadow-[0_0_25px_rgba(234,179,8,0.4)]",
      emoji: "🥇",
      nameColor: "text-yellow-400",
    };
    if (rank === 2) return {
      card: "bg-gradient-to-r from-slate-400/20 via-gray-300/15 to-slate-400/10 border-slate-400/60",
      rank: "text-slate-300 text-xl",
      glow: "shadow-[0_0_20px_rgba(148,163,184,0.35)]",
      emoji: "🥈",
      nameColor: "text-slate-300",
    };
    if (rank === 3) return {
      card: "bg-gradient-to-r from-orange-700/20 via-amber-700/15 to-orange-700/10 border-orange-600/60",
      rank: "text-orange-400 text-xl",
      glow: "shadow-[0_0_18px_rgba(194,120,0,0.35)]",
      emoji: "🥉",
      nameColor: "text-orange-400",
    };
    return { card: "bg-card border-border", rank: "text-muted-foreground", glow: "", emoji: `${rank}`, nameColor: "text-foreground" };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <div className="text-5xl mb-4">🏆</div>
        <p>עדיין אין משתמשים בטבלה</p>
        <p className="text-sm mt-2">היה הראשון להמיר קיף!</p>
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-4 max-w-lg mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">🏆 טבלת מובילים</h2>
        <p className="text-muted-foreground text-sm mt-1">מדורגים לפי יתרת קיף</p>
      </div>

      <ScrollArea className="h-[500px] pr-2">
        <div className="space-y-3">
          {entries.map((entry, idx) => {
            const rank = idx + 1;
            const style = getRankStyle(rank);
            const isMe = entry.user_code === userCode;

            return (
              <Card
                key={entry.id}
                className={`border-2 transition-all duration-500 ${style.card} ${style.glow} ${
                  isMe ? "ring-2 ring-primary/60 shadow-[0_0_20px_hsl(var(--primary)/0.3)] animate-pulse" : ""
                }`}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className={`text-xl font-bold ${style.rank} w-8 text-center shrink-0`}>
                        {rank <= 3 ? style.emoji : rank}
                      </span>
                      <div className="min-w-0">
                        <div className={`font-semibold truncate ${style.nameColor}`}>
                          {entry.user_name}
                          {isMe && <span className="text-primary text-xs mr-2">(אתה)</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-left shrink-0">
                      <div className="font-bold text-primary text-lg">
                        {formatKeifExact(entry.total_keif)}
                      </div>
                      <div className="text-xs text-muted-foreground">🪙 קיף</div>
                    </div>
                  </div>
                  {rank === 1 && (
                    <div className="mt-2 h-0.5 bg-gradient-to-l from-yellow-400 via-amber-300 to-yellow-400 rounded-full opacity-60 animate-pulse" />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
