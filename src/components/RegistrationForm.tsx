import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Sparkles, UserRound } from "lucide-react";

interface RegistrationFormProps {
  onSuccess: (code: string, name: string) => void;
}

const RegistrationForm = ({ onSuccess }: RegistrationFormProps) => {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateCode = () => {
    return Math.floor(100000000 + Math.random() * 900000000).toString();
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      toast({ title: "שגיאה", description: "אנא הזן שם", variant: "destructive" });
      return;
    }

    if (trimmedName.length < 2) {
      toast({ title: "שגיאה", description: "השם חייב להכיל לפחות 2 תווים", variant: "destructive" });
      return;
    }

    if (trimmedName.length > 50) {
      toast({ title: "שגיאה", description: "השם ארוך מדי (מקסימום 50 תווים)", variant: "destructive" });
      return;
    }

    setLoading(true);
    let code = generateCode();
    let attempts = 0;
    const maxAttempts = 5;

    try {
      // Try to generate a unique code with retry logic
      while (attempts < maxAttempts) {
        const { data: existing } = await supabase
          .from("users")
          .select("code")
          .eq("code", code)
          .maybeSingle();
        
        if (!existing) break;
        
        code = generateCode();
        attempts++;
      }

      if (attempts >= maxAttempts) {
        throw new Error("לא ניתן ליצור קוד ייחודי. נסה שוב.");
      }

      const { error, data } = await supabase
        .from("users")
        .insert({ code, name: trimmedName, role: "user" })
        .select()
        .single();

      if (error) {
        console.error("Registration insert error:", error);
        if (error.code === "23505") {
          throw new Error("קוד כבר קיים במערכת. נסה שוב.");
        }
        throw new Error("שגיאה ביצירת חשבון. נסה שוב.");
      }

      if (!data) {
        throw new Error("לא ניתן ליצור חשבון. נסה שוב.");
      }

      onSuccess(data.code, data.name);
      toast({
        title: "נרשמת בהצלחה!",
        description: `הקוד שלך: ${data.code}. שמור אותו!`,
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: "שגיאת רישום",
        description: error.message || "אירעה שגיאה בעת הרישום",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleRegister} className="space-y-7" dir="rtl">
      <div className="space-y-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 text-accent shadow-glow">
          <Sparkles className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold text-accent">חשבון חדש</p>
          <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">מתחילים מכאן</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
            הזן את שמך כדי ליצור חשבון Schooltrade
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        <Label htmlFor="name" className="block px-1 text-sm font-medium text-foreground">שם מלא</Label>
        <div className="group relative">
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="הזן שם מלא"
            disabled={loading}
            className="h-14 rounded-xl border-border/80 bg-background/70 px-5 pl-12 text-right text-base shadow-inner placeholder:text-muted-foreground/60 focus-visible:border-accent focus-visible:ring-4 focus-visible:ring-accent/15 sm:h-16"
          />
          <UserRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-accent" strokeWidth={1.6} aria-hidden="true" />
        </div>
      </div>

      <Button type="submit" className="h-14 w-full rounded-xl bg-gradient-to-l from-primary to-accent text-base font-semibold shadow-glow sm:h-16" disabled={loading}>
        <span>{loading ? "רושם..." : "צור חשבון"}</span>
        {!loading && <ArrowLeft className="mr-auto h-5 w-5" aria-hidden="true" />}
      </Button>

      <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-xs leading-5 text-muted-foreground">
        <ShieldCodeIcon />
        <p>לאחר הרישום יופיע קוד אישי בן 9 ספרות. שמור אותו לכניסה הבאה.</p>
      </div>
    </form>
  );
};

const ShieldCodeIcon = () => (
  <KeyRoundIcon />
);

const KeyRoundIcon = () => (
  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary" aria-hidden="true">9</span>
);

export default RegistrationForm;
