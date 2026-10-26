import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface PremiumCodeRedemptionProps {
  userCode: string;
  onPremiumActivated: () => void;
}

const PREMIUM_CODES: Record<string, number> = {
  "259406986": 14,
  "779973275": 7,
  "257313100": 7,
};

export const PremiumCodeRedemption = ({ userCode, onPremiumActivated }: PremiumCodeRedemptionProps) => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleRedeem = async () => {
    if (!code.trim()) return;

    const duration = PREMIUM_CODES[code.trim()];
    if (!duration) {
      toast({ title: "קוד לא תקין", description: "הקוד שהזנת אינו קוד חבר מועדון תקף.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const duration = PREMIUM_CODES[code.trim()];
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + duration);

      const { error: userError } = await supabase
        .from("users")
        .update({ is_premium: true })
        .eq("code", userCode);
      if (userError) throw userError;

      const { error: subError } = await supabase
        .from("subscriptions")
        .insert({
          user_code: userCode,
          expires_at: expiresAt.toISOString(),
          payment_provider: "premium_code",
          transaction_id: code.trim(),
          status: "active",
        });
      if (subError) throw subError;

      toast({
        title: `🌟 חבר מועדון ל-${duration} ימים!`,
        description: `המנוי שלך יפוג בתאריך ${expiresAt.toLocaleDateString("he-IL")}`,
      });

      setCode("");
      onPremiumActivated();
    } catch (err) {
      console.error("Premium code error:", err);
      toast({ title: "שגיאה", description: "לא ניתן להפעיל את הקוד. נסה שוב.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl border-2 border-[#00C853]/30 p-6 space-y-4">
      <h3 className="text-lg font-bold text-center text-[#00C853]">🌟 הפעלת קוד חבר מועדון</h3>
      <p className="text-sm text-muted-foreground text-center">הזן קוד מיוחד כדי לקבל גישה לחבר מועדון</p>
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="הזן קוד חבר מועדון..."
          className="text-left"
          dir="ltr"
        />
        <Button
          onClick={handleRedeem}
          disabled={loading || !code.trim()}
          className="bg-[#00C853] hover:bg-[#00C853]/80 text-white min-w-[80px]"
        >
          {loading ? "..." : "הפעל"}
        </Button>
      </div>
    </div>
  );
};
