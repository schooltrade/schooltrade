import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, LockKeyhole, ShieldCheck } from "lucide-react";
import schoolAccessCard from "@/assets/school-access-card.png";

interface School {
  name: string;
  code: string;
}

const SCHOOLS: School[] = [
  { name: "רמות וויצמן", code: "367927369" },
];

interface SchoolCodeGateProps {
  onVerified: () => void;
}

export const SchoolCodeGate = ({ onVerified }: SchoolCodeGateProps) => {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [shaking, setShaking] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();

    if (!/^\d{9}$/.test(trimmed)) {
      setError("הקוד חייב להכיל בדיוק 9 ספרות");
      triggerShake();
      return;
    }

    const found = SCHOOLS.find(s => s.code === trimmed);
    if (!found) {
      setError("קוד בית הספר שגוי. נסה שוב.");
      triggerShake();
      return;
    }

    setError("");
    sessionStorage.setItem("schoolVerified", "true");
    sessionStorage.setItem("schoolCode", trimmed);
    onVerified();
  };

  const triggerShake = () => {
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  };

  return (
    <div className="fixed inset-0 z-50 min-h-[100svh] overflow-y-auto bg-background text-foreground" dir="rtl">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-32 top-1/3 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute right-0 top-0 h-px w-1/2 bg-gradient-to-l from-primary/50 to-transparent" />
        <div className="absolute -right-16 top-0 h-72 w-72 rotate-12 border-l border-primary/10" />
        <div className="absolute -right-8 top-0 h-80 w-80 rotate-12 border-l border-accent/10" />
      </div>

      <div className="relative mx-auto flex min-h-[100svh] w-full max-w-[1600px] flex-col px-5 pb-8 pt-6 sm:px-8 lg:px-12 lg:pb-10 lg:pt-8">
        <div className="flex items-center justify-end gap-2.5 self-start" dir="ltr">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-card/80 shadow-glow">
            <span className="text-sm font-bold text-primary">S</span>
          </div>
          <span className="text-lg font-medium text-foreground sm:text-xl">Schooltrade</span>
        </div>

        <div className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)] lg:gap-14 lg:py-10" dir="ltr">
          <section className="order-2 flex min-w-0 flex-col items-center lg:order-1 lg:items-start" dir="rtl" aria-labelledby="school-gate-intro">
            <div className="relative flex h-48 w-full items-center justify-center sm:h-64 lg:h-[420px]">
              <div className="absolute bottom-4 h-8 w-2/3 max-w-sm rounded-full bg-primary/20 blur-2xl" aria-hidden="true" />
              <img
                src={schoolAccessCard}
                alt="כרטיס כניסה לבית הספר עם כובע בוגר"
                width={1024}
                height={1024}
                className="relative h-full w-full object-contain drop-shadow-2xl motion-safe:animate-float-slow"
              />
            </div>

            <div className="mt-2 max-w-lg text-center lg:mt-0 lg:text-right">
              <h1 id="school-gate-intro" className="text-3xl font-medium leading-tight sm:text-4xl">
                <span className="ml-3 inline-block h-8 w-px align-middle bg-accent" aria-hidden="true" />
                כניסה לבית הספר
              </h1>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">
                הזן את קוד בית הספר שלך כדי להתחיל
                <br className="hidden sm:block" />
                קבל את הקוד מהנהלת בית הספר
              </p>
            </div>
          </section>

          <section className="order-1 mx-auto w-full max-w-md lg:order-2" dir="rtl" aria-labelledby="school-gate-title">
            <div className={`relative overflow-hidden rounded-2xl border border-border/80 bg-card/70 px-5 py-7 shadow-2xl backdrop-blur-xl transition-transform sm:px-8 sm:py-9 lg:min-h-[510px] lg:px-9 lg:py-10 ${shaking ? "animate-[shake_0.5s_ease-in-out]" : ""}`}>
              <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" aria-hidden="true" />

              <div className="flex flex-col items-center text-center">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-accent/30 bg-accent/5 text-accent shadow-glow sm:h-16 sm:w-16">
                  <ShieldCheck className="h-7 w-7" strokeWidth={1.4} aria-hidden="true" />
                </div>
                <h2 id="school-gate-title" className="text-2xl font-medium sm:text-3xl">כניסה</h2>
                <p className="mt-2 text-sm text-muted-foreground sm:text-base">הזן את קוד בית הספר שלך</p>
              </div>

              <form onSubmit={handleSubmit} className="mt-7 space-y-5 sm:mt-8">
                <div className="space-y-2.5">
                  <Label htmlFor="schoolCode" className="block text-sm font-medium text-foreground">
                    קוד בית ספר (9 ספרות)
                  </Label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <Input
                      id="schoolCode"
                      type="text"
                      inputMode="numeric"
                      value={code}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, "").slice(0, 9);
                        setCode(v);
                        if (error) setError("");
                      }}
                      placeholder="הזן קוד בן 9 ספרות"
                      maxLength={9}
                      className="h-12 rounded-xl border-border/80 bg-background/70 px-11 text-center text-base font-medium tracking-widest shadow-inner placeholder:tracking-normal focus-visible:border-primary focus-visible:ring-primary/40 sm:h-14"
                    />
                  </div>
                </div>

                <div className="min-h-5" aria-live="polite">
                  {error && (
                    <p className="text-center text-sm text-destructive animate-[fadeSlideIn_0.2s_ease-out]">
                      {error}
                    </p>
                  )}
                </div>

                <Button type="submit" className="h-12 w-full rounded-xl bg-gradient-to-l from-primary to-accent text-base shadow-glow sm:h-14" disabled={code.length !== 9}>
                  אמת קוד בית ספר
                  <ArrowLeft className="mr-auto h-4 w-4" aria-hidden="true" />
                </Button>
              </form>

              <p className="mt-7 text-center text-xs text-muted-foreground sm:mt-9">
                קבל את הקוד מהנהלת בית הספר
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
