import { formatKeifExact } from "@/lib/skins";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { playSound } from "@/lib/sounds";

interface KeifConverterProps {
  userCode: string;
  userName: string;
}

interface KeifBalance {
  id: string;
  user_code: string;
  user_name: string;
  total_keif: number;
  converted_math: number;
  converted_hebrew: number;
  converted_english: number;
  converted_crypto: number;
}

const SOURCE_GAMES = [
  { key: "math", label: "🧮 משחק מתמטי", storageKey: "mathGameState", field: "converted_math" },
  { key: "hebrew", label: "📚 משחק עברית", storageKey: "hebrewGameState", field: "converted_hebrew" },
  { key: "english", label: "🇬🇧 משחק אנגלית", storageKey: "englishGameState", field: "converted_english" },
  { key: "crypto", label: "💰 קריפטו-גיים", storageKey: "crypto-game-state", field: "converted_crypto" },
  { key: "arcade", label: "🎮 משחקי ארקייד", storageKey: "__arcade__", field: "converted_arcade" },
];

const getCryptoTotalValue = (parsed: any): number => {
  let cash = parsed.balance || 0;
  let portfolioValue = 0;

  const holdings = parsed.holdings || {};
  const cryptos = parsed.cryptos || [];

  Object.entries(holdings).forEach(([id, holdingsList]: [string, any]) => {
    const crypto = cryptos.find((c: any) => c.id === id);
    if (!crypto) return;
    const currentPercentage = crypto.change24h || 0;
    (holdingsList as any[]).forEach((holding: any) => {
      const percentageDiff = currentPercentage - (holding.buyPercentage || 0);
      const profitLoss = (holding.investedAmount || 0) * (percentageDiff / 100);
      const holdingValue = (holding.investedAmount || 0) + profitLoss;
      portfolioValue += Math.max(0, holdingValue);
    });
  });

  return Math.floor(cash + portfolioValue);
};

const getGameBalance = (storageKey: string): number => {
  try {
    if (storageKey === "__arcade__") {
      // sum arcade bests
      const keys = ["flappy","runner","idle","snake","puzzle2048"];
      return keys.reduce((sum, k) => sum + (parseInt(localStorage.getItem(`arcade-best-${k}`) || "0", 10) || 0), 0);
    }
    const raw = localStorage.getItem(storageKey);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    if (storageKey === "crypto-game-state") {
      return getCryptoTotalValue(parsed);
    }
    return Math.floor(parsed.totalPoints || 0);
  } catch {
    return 0;
  }
};

export const KeifConverter = ({ userCode, userName }: KeifConverterProps) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [keifBalance, setKeifBalance] = useState<KeifBalance | null>(null);
  const [converting, setConverting] = useState(false);
  const [displayKeif, setDisplayKeif] = useState(0);
  const [exactKeif, setExactKeif] = useState("0");
  const [animating, setAnimating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadKeifBalance();
  }, [userCode]);

  const loadKeifBalance = async () => {
    const { data } = await supabase
      .from("keif_balances")
      .select("*, total_keif_text:total_keif::text")
      .eq("user_code", userCode)
      .maybeSingle();
    setKeifBalance(data as KeifBalance | null);
    setDisplayKeif(Number(data?.total_keif) || 0);
    setExactKeif(String((data as any)?.total_keif_text ?? "0").split(".")[0]);
  };

  const getConvertibleAmount = (key: string): number => {
    const game = SOURCE_GAMES.find(g => g.key === key);
    if (!game) return 0;
    const current = getGameBalance(game.storageKey);
    const alreadyConverted = keifBalance ? (keifBalance as any)[game.field] || 0 : 0;
    return Math.max(0, current - alreadyConverted);
  };

  const totalConvertible = Array.from(selected).reduce((acc, key) => acc + getConvertibleAmount(key), 0);

  const toggleGame = (key: string) => {
    playSound("click");
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAll = () => {
    playSound("click");
    setSelected(new Set(SOURCE_GAMES.map(g => g.key)));
  };

  const handleConvert = async () => {
    if (selected.size === 0 || totalConvertible === 0) {
      toast({ title: "אין מה להמיר", description: "בחר משחק עם יתרה חדשה", variant: "destructive" });
      return;
    }

    setConverting(true);
    playSound("convert");

    const newConverted: Record<string, number> = {};
    for (const key of Array.from(selected)) {
      const game = SOURCE_GAMES.find(g => g.key === key)!;
      const current = getGameBalance(game.storageKey);
      newConverted[game.field] = current;
    }

    try {
      // Exact addition happens on the server (high-precision numbers, no upper limit)
      const { data: totalText, error } = await supabase.rpc("keif_convert", {
        _user_code: userCode,
        _user_name: userName,
        _amount: String(Math.max(0, Math.floor(totalConvertible))),
        _converted: newConverted,
      } as any);
      if (error) throw error;
      const newTotal = Number(totalText) || 0;

      // Animate counter
      setAnimating(true);
      const start = displayKeif;
      const end = newTotal;
      const duration = 1500;
      const startTime = Date.now();
      const tick = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayKeif(Math.floor(start + (end - start) * eased));
        if (progress < 1) requestAnimationFrame(tick);
        else {
          setAnimating(false);
          playSound("success");
        }
      };
      requestAnimationFrame(tick);

      await loadKeifBalance();
      toast({ title: `✨ הומר בהצלחה! +${totalConvertible.toLocaleString()} קיף` });
    } catch (e: any) {
      toast({ title: "שגיאה", description: e.message, variant: "destructive" });
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto" dir="rtl">
      {/* Balance Card */}
      <Card className="bg-gradient-to-br from-primary/10 via-accent/5 to-primary/5 border-primary/30 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
        <CardContent className="pt-6 pb-6 text-center">
          <div className="text-6xl mb-2">🪙</div>
          <div className={`text-5xl font-bold text-primary transition-all duration-300 ${animating ? "scale-110" : "scale-100"}`}
            style={{ textShadow: animating ? "0 0 30px hsl(var(--primary) / 0.6)" : "none" }}>
            {animating ? displayKeif.toLocaleString() : formatKeifExact(exactKeif)}
          </div>
          <div className="text-muted-foreground text-lg mt-1">קיף</div>
        </CardContent>
      </Card>

      {/* Game Selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">בחר מקורות להמרה</h3>
          <Button variant="ghost" size="sm" onClick={selectAll}>בחר הכל</Button>
        </div>
        {SOURCE_GAMES.map(game => {
          const current = getGameBalance(game.storageKey);
          const alreadyConverted = keifBalance ? (keifBalance as any)[game.field] || 0 : 0;
          const convertible = Math.max(0, current - alreadyConverted);
          const isSelected = selected.has(game.key);

          return (
            <button
              key={game.key}
              onClick={() => toggleGame(game.key)}
              className={`w-full text-right p-4 rounded-xl border-2 transition-all duration-300 ${
                isSelected
                  ? "border-primary bg-primary/10 shadow-[0_0_15px_hsl(var(--primary)/0.2)]"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{game.label}</div>
                  <div className="text-sm text-muted-foreground">
                    סה"כ: {current.toLocaleString()} | כבר הומר: {alreadyConverted.toLocaleString()}
                  </div>
                </div>
                <div className="text-left">
                  <div className={`text-lg font-bold ${convertible > 0 ? "text-primary" : "text-muted-foreground"}`}>
                    +{convertible.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">קיף חדש</div>
                </div>
              </div>
              {isSelected && (
                <div className="mt-2 h-0.5 bg-gradient-to-l from-primary to-accent rounded-full animate-[scaleX_0.3s_ease-out]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Convert Button */}
      <div className="space-y-2">
        <div className="text-center text-muted-foreground text-sm">
          {selected.size > 0 ? `סה"כ להמרה: ${totalConvertible.toLocaleString()} קיף` : "בחר משחקים למעלה"}
        </div>
        <Button
          className="w-full h-14 text-lg font-bold relative overflow-hidden"
          onClick={handleConvert}
          disabled={converting || selected.size === 0 || totalConvertible === 0}
        >
          <span className="relative z-10">{converting ? "ממיר..." : "🪙 המר"}</span>
          {!converting && (
            <span className="absolute inset-0 bg-gradient-to-r from-primary to-accent opacity-0 hover:opacity-20 transition-opacity duration-300" />
          )}
        </Button>
      </div>
    </div>
  );
};
