import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, KeyRound, ShieldCheck } from "lucide-react";

interface LoginFormProps {
  onSuccess: (code: string, name: string, role: string) => void;
}

const LoginForm = ({ onSuccess }: LoginFormProps) => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedCode = code.trim();
    
    if (!trimmedCode) {
      toast({ title: "שגיאה", description: "אנא הזן קוד", variant: "destructive" });
      return;
    }

    // Validate code format (9 digits)
    if (!/^\d{9}$/.test(trimmedCode)) {
      toast({ 
        title: "שגיאה", 
        description: "הקוד חייב להיות בדיוק 9 ספרות", 
        variant: "destructive" 
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("code", trimmedCode)
        .maybeSingle();

      if (error) {
        console.error("Login query error:", error);
        throw new Error("שגיאה בחיבור לשרת. נסה שוב.");
      }

      if (!data) {
        toast({
          title: "שגיאת התחברות",
          description: "קוד לא נמצא במערכת. בדוק שהקוד נכון או הירשם.",
          variant: "destructive",
        });
        return;
      }

      // Ensure all required fields exist
      if (!data.code || !data.name) {
        toast({
          title: "שגיאה",
          description: "החשבון פגום. פנה לתמיכה.",
          variant: "destructive",
        });
        return;
      }

      onSuccess(data.code, data.name, data.role || "user");
      toast({
        title: "התחברת בהצלחה!",
        description: `ברוך הבא, ${data.name}`,
      });
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: "שגיאת התחברות",
        description: error.message || "אירעה שגיאה בעת ההתחברות",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-7" dir="rtl">
      <div className="space-y-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary shadow-glow">
          <ShieldCheck className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold text-primary">גישה לחשבון</p>
          <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">טוב לראות אותך שוב</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
            הזן את הקוד האישי שקיבלת בעת ההרשמה
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        <Label htmlFor="code" className="block px-1 text-sm font-medium text-foreground">
          קוד אישי (9 ספרות)
        </Label>
        <div className="group relative">
          <Input
            id="code"
            type="text"
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="הזן קוד בן 9 ספרות"
            maxLength={9}
            disabled={loading}
            className="h-14 rounded-xl border-border/80 bg-background/70 px-5 pl-12 text-right text-base tabular-nums shadow-inner placeholder:text-muted-foreground/60 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15 sm:h-16"
          />
          <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" strokeWidth={1.6} aria-hidden="true" />
        </div>
      </div>

      <Button type="submit" className="h-14 w-full rounded-xl bg-gradient-to-l from-primary to-accent text-base font-semibold shadow-glow sm:h-16" disabled={loading}>
        <span>{loading ? "מתחבר..." : "התחבר"}</span>
        {!loading && <ArrowLeft className="mr-auto h-5 w-5" aria-hidden="true" />}
      </Button>
    </form>
  );
};

export default LoginForm;
