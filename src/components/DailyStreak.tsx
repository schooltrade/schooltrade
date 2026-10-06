import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  userCode: string;
}

type FlameState = "active" | "warning" | "freezing" | "frozen" | "reset";

interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_visit_date: string;
  days_missed: number;
  server_date: string;
}

// Sound effects via Web Audio
const playStreakSound = (type: "checkin" | "warn" | "freeze" | "reset" | "tick") => {
  try {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    const beep = (f: number, dur: number, delay = 0, type: OscillatorType = "sine", g = 0.08) => {
      const o = ctx.createOscillator();
      const gain = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f, now + delay);
      o.connect(gain).connect(ctx.destination);
      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(g, now + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur);
      o.start(now + delay);
      o.stop(now + delay + dur + 0.05);
    };
    switch (type) {
      case "checkin":
        beep(660, 0.12, 0, "sine", 0.1);
        beep(880, 0.14, 0.08, "sine", 0.1);
        beep(1320, 0.2, 0.18, "triangle", 0.08);
        break;
      case "warn":
        beep(440, 0.18, 0, "sawtooth", 0.06);
        beep(330, 0.22, 0.18, "sawtooth", 0.05);
        break;
      case "freeze":
        beep(1200, 0.25, 0, "sine", 0.05);
        beep(900, 0.3, 0.1, "sine", 0.05);
        break;
      case "reset":
        beep(220, 0.4, 0, "triangle", 0.08);
        beep(180, 0.5, 0.2, "triangle", 0.06);
        break;
      case "tick":
        beep(2000, 0.02, 0, "square", 0.02);
        break;
    }
    setTimeout(() => ctx.close(), 1500);
  } catch {}
};

// Animated number counter
const useAnimatedNumber = (target: number, duration = 800) => {
  const [val, setVal] = useState(target);
  const prev = useRef(target);
  useEffect(() => {
    const from = prev.current;
    const to = target;
    if (from === to) return;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(from + (to - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else prev.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
};

const LiveClock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const hh = time.getHours().toString().padStart(2, "0");
  const mm = time.getMinutes().toString().padStart(2, "0");
  const ss = time.getSeconds().toString().padStart(2, "0");
  return (
    <div className="flex items-center gap-1 font-mono text-[13px] tracking-wider">
      <span className="text-foreground/90">{hh}</span>
      <span className="text-foreground/40 animate-pulse">:</span>
      <span className="text-foreground/90">{mm}</span>
      <span className="text-foreground/40 animate-pulse">:</span>
      <span className="text-foreground/70 tabular-nums">{ss}</span>
    </div>
  );
};

const FlameIcon = ({ state, size = 22 }: { state: FlameState; size?: number }) => {
  if (state === "frozen" || state === "freezing") {
    return (
      <span
        className="inline-block"
        style={{
          fontSize: size,
          filter: "drop-shadow(0 0 6px rgba(125, 211, 252, 0.9))",
          animation: "ds-icefloat 2.6s ease-in-out infinite",
        }}
      >
        🧊
      </span>
    );
  }
  if (state === "reset") {
    return <span style={{ fontSize: size, opacity: 0.5 }}>💨</span>;
  }
  const color = state === "warning" ? "rgba(251, 146, 60, 0.95)" : "rgba(251, 191, 36, 0.95)";
  return (
    <span
      className="inline-block"
      style={{
        fontSize: size,
        filter: `drop-shadow(0 0 8px ${color}) drop-shadow(0 0 14px ${color})`,
        animation: "ds-flicker 1.6s ease-in-out infinite",
      }}
    >
      🔥
    </span>
  );
};

const Particles = ({ kind }: { kind: "fire" | "ice" | null }) => {
  if (!kind) return null;
  const items = Array.from({ length: 6 });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
      {items.map((_, i) => (
        <span
          key={i}
          className="absolute"
          style={{
            left: `${15 + i * 12}%`,
            bottom: kind === "fire" ? "30%" : "auto",
            top: kind === "ice" ? "10%" : "auto",
            width: 4,
            height: 4,
            borderRadius: "50%",
            background:
              kind === "fire"
                ? "radial-gradient(circle, rgba(255,200,80,1), rgba(255,80,0,0.2))"
                : "radial-gradient(circle, rgba(200,240,255,1), rgba(120,200,255,0.2))",
            animation: `${kind === "fire" ? "ds-firep" : "ds-icep"} ${1.6 + i * 0.2}s ease-in ${i * 0.18}s infinite`,
            opacity: 0,
          }}
        />
      ))}
    </div>
  );
};

export const DailyStreak = ({ userCode }: Props) => {
  const [data, setData] = useState<StreakData | null>(null);
  const [bump, setBump] = useState(false);
  const [dayShift, setDayShift] = useState(false);
  const animated = useAnimatedNumber(data?.current_streak ?? 0);
  const lastNotifiedKey = `ds-notified-${userCode}`;

  const flameState: FlameState = (() => {
    if (!data || data.current_streak <= 0) return "reset";
    const m = data.days_missed;
    if (m <= 0) return "active";
    if (m === 1) return "warning";
    if (m === 2) return "freezing";
    return "frozen";
  })();

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: rows, error } = await supabase.rpc("streak_check_in", { _user_code: userCode });
      if (!alive || error || !rows) return;
      const row = Array.isArray(rows) ? rows[0] : rows;
      if (!row) return;
      const prev = data?.current_streak ?? 0;
      setData(row as StreakData);
      // Notifications (throttle once per day)
      const today = (row as StreakData).server_date;
      // New-day transition animation (visual only, once per day)
      const dayKey = `ds-lastday-${userCode}`;
      const lastDay = localStorage.getItem(dayKey);
      if (lastDay && lastDay !== today) {
        setTimeout(() => setDayShift(true), 400);
        setTimeout(() => setDayShift(false), 2400);
      }
      localStorage.setItem(dayKey, today);
      const lastNotified = localStorage.getItem(lastNotifiedKey);
      const shouldNotify = lastNotified !== today;

      if ((row as StreakData).current_streak > prev) {
        setBump(true);
        setTimeout(() => setBump(false), 700);
        playStreakSound("checkin");
        if (shouldNotify) {
          toast.success(`🔥 רצף יומי: ${(row as StreakData).current_streak} ימים!`, {
            description: "המשך לבקר כל יום כדי לשמור על הלהבה",
          });
          localStorage.setItem(lastNotifiedKey, today);
        }
      } else if ((row as StreakData).days_missed === 1 && shouldNotify) {
        playStreakSound("warn");
        toast.warning("⚠️ הלהבה מתחילה לדעוך", { description: "חזור מחר כדי לשמור על הרצף" });
        localStorage.setItem(lastNotifiedKey, today);
      } else if ((row as StreakData).days_missed === 2 && shouldNotify) {
        playStreakSound("freeze");
        toast.warning("❄️ הלהבה קופאת!", { description: "עוד יום והרצף יתאפס" });
        localStorage.setItem(lastNotifiedKey, today);
      } else if ((row as StreakData).current_streak === 1 && prev > 1) {
        playStreakSound("reset");
        toast.error("💨 הרצף התאפס", { description: "מתחילים מחדש מהיום!" });
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userCode]);

  if (!data) return null;

  const ring =
    flameState === "active"
      ? "shadow-[0_0_20px_rgba(251,191,36,0.45),inset_0_0_12px_rgba(251,146,60,0.25)] border-amber-400/50"
      : flameState === "warning"
      ? "shadow-[0_0_18px_rgba(251,146,60,0.4)] border-orange-400/50"
      : flameState === "freezing"
      ? "shadow-[0_0_18px_rgba(125,211,252,0.45)] border-sky-300/60"
      : flameState === "frozen"
      ? "shadow-[0_0_22px_rgba(96,165,250,0.55)] border-blue-300/70"
      : "border-muted-foreground/30";

  return (
    <>
      <style>{`
        @keyframes ds-flicker {
          0%,100% { transform: translateY(0) scale(1); }
          25% { transform: translateY(-1px) scale(1.05); }
          50% { transform: translateY(0) scale(0.98); }
          75% { transform: translateY(-1.5px) scale(1.04); }
        }
        @keyframes ds-icefloat {
          0%,100% { transform: translateY(0) rotate(-3deg); }
          50% { transform: translateY(-2px) rotate(3deg); }
        }
        @keyframes ds-firep {
          0% { transform: translateY(0) scale(1); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translateY(-26px) scale(0.4); opacity: 0; }
        }
        @keyframes ds-icep {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          20% { opacity: 0.9; }
          100% { transform: translateY(22px) translateX(6px); opacity: 0; }
        }
        @keyframes ds-bump {
          0% { transform: scale(1); }
          40% { transform: scale(1.18); }
          100% { transform: scale(1); }
        }
        @keyframes ds-yesterday {
          0% { opacity: 0.9; transform: scale(1); filter: grayscale(0.7) brightness(0.7); }
          45% { opacity: 0.6; transform: scale(0.6) translateY(2px); filter: grayscale(1) brightness(0.5); }
          100% { opacity: 0; transform: scale(0.3) translateY(4px); }
        }
        @keyframes ds-today {
          0%, 35% { opacity: 0; transform: scale(0.2) translateY(6px); }
          65% { opacity: 1; transform: scale(1.35) translateY(-2px); }
          82% { transform: scale(0.92); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes ds-ring {
          0%, 45% { opacity: 0; transform: scale(0.4); }
          60% { opacity: 0.9; }
          100% { opacity: 0; transform: scale(2.4); }
        }
        @keyframes ds-spark {
          0%, 50% { opacity: 0; transform: rotate(var(--a)) translateY(0) scale(0.4); }
          65% { opacity: 1; }
          100% { opacity: 0; transform: rotate(var(--a)) translateY(-22px) scale(1); }
        }
        @keyframes ds-slideIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      <div
        className="select-none"
        style={{ animation: "ds-slideIn 0.5s cubic-bezier(0.22,1,0.36,1)" }}
        dir="ltr"
      >
        <div
          className={`group flex items-center gap-2.5 px-3 py-1.5 rounded-full border backdrop-blur-xl bg-background/60 transition-all duration-500 ${ring}`}
        >
          {/* Flame */}
          <div
            className="relative flex items-center justify-center w-7 h-7"
            style={bump ? { animation: "ds-bump 0.7s cubic-bezier(0.22,1,0.36,1)" } : undefined}
          >
            <Particles
              kind={flameState === "active" || flameState === "warning" ? "fire" : flameState === "freezing" || flameState === "frozen" ? "ice" : null}
            />
            {dayShift ? (
              <>
                <span className="absolute inset-0 flex items-center justify-center" style={{ animation: "ds-yesterday 2s cubic-bezier(0.22,1,0.36,1) forwards" }}>
                  <FlameIcon state={flameState} size={20} />
                </span>
                <span className="pointer-events-none absolute inset-0 rounded-full border-2 border-amber-300/80" style={{ animation: "ds-ring 2s ease-out forwards" }} />
                {Array.from({ length: 8 }).map((_, i) => (
                  <span key={i} className="pointer-events-none absolute left-1/2 top-1/2 -ml-[2px] -mt-[2px] h-1 w-1 rounded-full bg-amber-300"
                    style={{ ["--a" as any]: `${i * 45}deg`, animation: "ds-spark 2s ease-out forwards" }} />
                ))}
                <span style={{ animation: "ds-today 2s cubic-bezier(0.22,1,0.36,1) forwards" }}>
                  <FlameIcon state={flameState} size={20} />
                </span>
              </>
            ) : (
              <FlameIcon state={flameState} size={20} />
            )}
          </div>

          {/* Streak number */}
          <div className="flex items-baseline gap-1">
            <span
              className={`font-bold text-base tabular-nums bg-clip-text text-transparent transition-all ${
                flameState === "frozen" || flameState === "freezing"
                  ? "bg-gradient-to-b from-sky-200 to-blue-400"
                  : flameState === "warning"
                  ? "bg-gradient-to-b from-orange-300 to-red-500"
                  : "bg-gradient-to-b from-amber-200 to-orange-500"
              }`}
            >
              {animated}
            </span>
          </div>

          {/* Separator */}
          <span className="h-4 w-px bg-foreground/15" />

          {/* Clock */}
          <LiveClock />
        </div>
      </div>
    </>
  );
};

export default DailyStreak;
