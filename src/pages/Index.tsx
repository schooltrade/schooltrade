import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useTemporaryLogo } from "@/hooks/useTemporaryLogo";
import RegistrationForm from "@/components/RegistrationForm";
import { SchoolCodeGate } from "@/components/SchoolCodeGate";
import LoginForm from "@/components/LoginForm";
import PostsList from "@/components/PostsList";
import CreatePost from "@/components/CreatePost";
import AdminPanel from "@/components/AdminPanel";
import { SecurityPanel } from "@/components/SecurityPanel";
import { useHalloween } from "@/contexts/HalloweenContext";
import { HalloweenDecorations } from "@/components/halloween/HalloweenDecorations";
import { HalloweenTabs } from "@/components/halloween/HalloweenTabs";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import BlockedUserMessage from "@/components/BlockedUserMessage";
import { PremiumBadge } from "@/components/PremiumBadge";
import { AnimatedUsername } from "@/components/AnimatedUsername";
import { useChristmas } from "@/contexts/ChristmasContext";
import { ChristmasDecorations } from "@/components/christmas/ChristmasDecorations";
import { ChristmasCountdown } from "@/components/christmas/ChristmasCountdown";
import { ChristmasTabs } from "@/components/christmas/ChristmasTabs";
import { PremiumClubTab } from "@/components/PremiumClubTab";
import { LimitedChatTab } from "@/components/LimitedChatTab";
import { Badge } from "@/components/ui/badge";
import { GamesHub } from "@/components/games/GamesHub";
import { KeifTab } from "@/components/keif/KeifTab";
import { SchoolNews } from "@/components/games/SchoolNews";
import { BooksTab } from "@/components/books/BooksTab";
import { DailyStreak } from "@/components/DailyStreak";
import { BookOpen, Check, ShieldCheck } from "lucide-react";

import { playSound } from "@/lib/sounds";

const PREMIUM_USERS = ["161221063", "752025692", "426671703"];

type ViewType = "login" | "register" | "posts" | "create" | "admin" | "security" | "halloween" | "christmas" | "premiumClub" | "limitedChat" | "games" | "keif" | "schoolNews" | "books";

const Index = () => {
  const [user, setUser] = useState<{ code: string; name: string; role: string } | null>(null);
  const [view, setView] = useState<ViewType>("login");
  const [hasLimitedChat, setHasLimitedChat] = useState(false);
  const [unreadLimitedChat, setUnreadLimitedChat] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [dbPremium, setDbPremium] = useState(false);
  const [schoolVerified, setSchoolVerified] = useState(() => sessionStorage.getItem("schoolVerified") === "true");
  const { isHalloweenActive } = useHalloween();
  const { isChristmasActive, isChristmasBackgroundOnly } = useChristmas();
  const { toast } = useToast();
  const logoImage = useTemporaryLogo();

  useEffect(() => {
    setTimeout(() => {
      setMounted(true);
      playSound("pageLoad");
    }, 100);
  }, []);

  const checkLimitedChat = async (userCode: string) => {
    if (PREMIUM_USERS.includes(userCode)) {
      setHasLimitedChat(false);
      return;
    }
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const { data, error } = await supabase
        .from("private_chats")
        .select("id")
        .eq("is_active", true)
        .or(`user1_code.eq.${userCode},user2_code.eq.${userCode}`)
        .gte("created_at", `${currentMonth}-01`);
      if (!error && data && data.length > 0) {
        setHasLimitedChat(true);
        const lastRead = localStorage.getItem(`limited-chat-read-${userCode}`);
        const lastReadTime = lastRead || new Date(0).toISOString();
        const { count } = await supabase
          .from("private_messages")
          .select("*", { count: "exact", head: true })
          .in("chat_id", data.map(c => c.id))
          .neq("sender_code", userCode)
          .gt("created_at", lastReadTime);
        setUnreadLimitedChat(count || 0);
      } else {
        setHasLimitedChat(false);
      }
    } catch (e) {
      console.error("Error checking limited chat:", e);
    }
  };

  const AUTO_PREMIUM_CODES: Record<string, number | "permanent"> = {
    "259406986": 14,
    "779973275": 7,
    "257313100": 7,
    "541285226": "permanent",
  };

  const checkDbPremium = async (userCode: string) => {
    try {
      // Run expiration check
      await supabase.rpc("expire_old_subscriptions");

      // Auto-activate premium if user code matches
      const autoDuration = AUTO_PREMIUM_CODES[userCode];
      if (autoDuration) {
        const { data: userData } = await supabase.from("users").select("is_premium").eq("code", userCode).single();
        if (!userData?.is_premium) {
          if (autoDuration === "permanent") {
            await supabase.from("users").update({ is_premium: true }).eq("code", userCode);
          } else {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + autoDuration);
            await supabase.from("users").update({ is_premium: true }).eq("code", userCode);
            await supabase.from("subscriptions").insert({
              user_code: userCode,
              expires_at: expiresAt.toISOString(),
              payment_provider: "auto_code",
              transaction_id: userCode,
              status: "active",
            });
          }
        }
      }

      // Check is_premium from DB
      const { data } = await supabase.from("users").select("is_premium").eq("code", userCode).single();
      setDbPremium(data?.is_premium || false);
    } catch (e) {
      console.error("Error checking premium:", e);
    }
  };

  useEffect(() => {
    const savedCode = sessionStorage.getItem("userCode");
    const savedName = sessionStorage.getItem("userName");
    const savedRole = sessionStorage.getItem("userRole");
    if (savedCode && savedName) {
      setUser({ code: savedCode, name: savedName, role: savedRole || "user" });
      setView("posts");
      checkLimitedChat(savedCode);
      checkDbPremium(savedCode);
    }
  }, []);

  const handleRegisterSuccess = (code: string, name: string) => {
    setUser({ code, name, role: "user" });
    sessionStorage.setItem("userCode", code);
    sessionStorage.setItem("userName", name);
    sessionStorage.setItem("userRole", "user");
    setView("posts");
    playSound("success");
    toast({ title: "רישום הצליח!", description: `הקוד שלך: ${code}` });
  };

  const handleLoginSuccess = (code: string, name: string, role: string) => {
    setUser({ code, name, role });
    sessionStorage.setItem("userCode", code);
    sessionStorage.setItem("userName", name);
    sessionStorage.setItem("userRole", role);
    setView("posts");
    playSound("enter");
    checkLimitedChat(code);
    checkDbPremium(code);
  };

  const handleLogout = () => {
    setUser(null);
    sessionStorage.removeItem("userCode");
    sessionStorage.removeItem("userName");
    sessionStorage.removeItem("userRole");
    setView("login");
    toast({ title: "התנתקת בהצלחה" });
  };

  const switchView = (v: ViewType) => {
    playSound("tab");
    setView(v);
  };

  const isAdmin = user?.code === "admin" || user?.code === "michaelrodov" || user?.role === "admin";
  const isPremiumUser = PREMIUM_USERS.includes(user?.code || "") || dbPremium;

  const getBackgroundClass = () => {
    if (isHalloweenActive) return 'bg-gradient-to-br from-orange-950 via-purple-950 to-black';
    if (isChristmasActive || isChristmasBackgroundOnly) return 'bg-gradient-to-br from-red-950 via-green-950 to-blue-950';
    return 'bg-gradient-to-br from-background via-background to-accent/5';
  };

  const NavBtn = ({ v, label, className = "" }: { v: ViewType; label: string; className?: string }) => (
    <Button
      variant={view === v ? "default" : "outline"}
      onClick={() => switchView(v)}
      onMouseEnter={() => playSound("hover")}
      className={`flex-1 min-w-[140px] transition-all duration-300 ${view === v ? "scale-[1.02] shadow-md" : "hover:scale-[1.01]"} ${className}`}
    >
      {label}
    </Button>
  );

  return (
    <div
      dir="rtl"
      className={`min-h-screen transition-all duration-1000 ${getBackgroundClass()} ${mounted ? "opacity-100" : "opacity-0"}`}
      style={{ transition: "opacity 0.5s ease, background 1s ease" }}
    >
      {user && <DailyStreak userCode={user.code} />}
      {isHalloweenActive && <HalloweenDecorations />}
      {(isChristmasActive || isChristmasBackgroundOnly) && <ChristmasDecorations />}
      {isChristmasActive && <ChristmasCountdown />}

      <header
        className={`border-b backdrop-blur-md shadow-soft sticky top-0 z-40 transition-all duration-500 ${
          isHalloweenActive
            ? 'bg-orange-900/50 border-orange-500/30'
            : (isChristmasActive || isChristmasBackgroundOnly)
              ? 'bg-red-900/50 border-red-500/30'
              : 'bg-card/70'
        }`}
      >
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={logoImage}
              alt="Schooltrade"
              className="w-12 h-12 rounded-lg shadow-md transition-transform duration-300 hover:scale-110 hover:rotate-3"
            />
            <h1 className="text-2xl font-bold bg-gradient-to-l from-primary to-accent bg-clip-text text-transparent">
              Schooltrade
            </h1>
          </div>
          {user && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                שלום, <AnimatedUsername userCode={user.code}><strong>{user.name}</strong></AnimatedUsername>
                <PremiumBadge userCode={user.code} />
                <VerifiedBadge userCode={user.code} />
              </span>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="hover:scale-105 transition-transform">
                התנתק
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className={`container mx-auto px-4 py-8 ${isChristmasActive ? 'mt-10' : ''}`}>
        {!user ? (
          !schoolVerified ? (
            <SchoolCodeGate onVerified={() => setSchoolVerified(true)} />
          ) : (
            <div className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-2xl border border-border/70 bg-card/45 shadow-2xl backdrop-blur-xl" style={{ animation: "fadeSlideIn 0.4s ease-out" }}>
              <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                <div className="absolute inset-x-24 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
                <div className="absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
                <div className="absolute -right-24 bottom-0 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
              </div>

              <div className="relative grid min-h-[620px] lg:grid-cols-[0.82fr_1.18fr]" dir="ltr">
                <aside className="relative hidden overflow-hidden border-r border-border/60 bg-background/55 p-10 lg:flex lg:flex-col lg:justify-between" dir="rtl">
                  <div>
                    <div className="mb-12 flex h-14 w-14 items-center justify-center rounded-xl border border-primary/25 bg-gradient-to-br from-primary/20 to-accent/10 text-primary shadow-glow">
                      <BookOpen className="h-7 w-7" strokeWidth={1.5} aria-hidden="true" />
                    </div>
                    <p className="text-sm font-medium text-primary">השלב הבא שלך</p>
                    <h2 className="mt-3 max-w-sm text-4xl font-semibold leading-tight text-foreground">
                      קהילה אחת,<br />כל מה שקורה בבית הספר
                    </h2>
                    <p className="mt-5 max-w-sm text-base leading-7 text-muted-foreground">
                      התחבר למודעות, משחקים, ספרים וחדשות — במקום אחד שנבנה לתלמידים.
                    </p>
                  </div>

                  <div className="space-y-3 border-t border-border/60 pt-7">
                    {["גישה מאובטחת באמצעות קוד אישי", "מותאם לקהילת בית הספר", "הפרטים שלך נשמרים בבטחה"].map((item) => (
                      <div key={item} className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                        {item}
                      </div>
                    ))}
                  </div>
                </aside>

                <section className="flex min-w-0 items-center px-5 py-7 sm:px-9 sm:py-10 lg:px-14" dir="rtl" aria-label={view === "login" ? "התחברות" : "הרשמה"}>
                  <div className="mx-auto w-full max-w-lg">
                    <div className="mb-8 flex items-center justify-between border-b border-border/60" role="tablist" aria-label="בחירת מצב כניסה">
                      <Button
                        type="button"
                        variant="ghost"
                        role="tab"
                        aria-selected={view === "login"}
                        onClick={() => setView("login")}
                        className={`relative h-14 flex-1 rounded-none text-base hover:bg-transparent ${view === "login" ? "text-foreground" : "text-muted-foreground"}`}
                      >
                        התחברות
                        {view === "login" && <span className="absolute inset-x-5 -bottom-px h-0.5 rounded-full bg-primary shadow-glow" />}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        role="tab"
                        aria-selected={view === "register"}
                        onClick={() => setView("register")}
                        className={`relative h-14 flex-1 rounded-none text-base hover:bg-transparent ${view === "register" ? "text-foreground" : "text-muted-foreground"}`}
                      >
                        הרשמה
                        {view === "register" && <span className="absolute inset-x-5 -bottom-px h-0.5 rounded-full bg-accent shadow-glow" />}
                      </Button>
                    </div>

                    <div key={view} className="animate-fade-in-scale">
                      {view === "login" ? (
                        <LoginForm onSuccess={handleLoginSuccess} />
                      ) : (
                        <RegistrationForm onSuccess={handleRegisterSuccess} />
                      )}
                    </div>

                    <div className="mt-7 border-t border-border/60 pt-5 text-center">
                      {view === "login" ? (
                        <Button variant="link" className="h-auto text-sm text-muted-foreground hover:text-primary" onClick={() => setView("register")}>
                          עדיין אין לך חשבון? <span className="mr-1 font-semibold text-primary">הירשם כאן</span>
                        </Button>
                      ) : (
                        <Button variant="link" className="h-auto text-sm text-muted-foreground hover:text-primary" onClick={() => setView("login")}>
                          כבר יש לך חשבון? <span className="mr-1 font-semibold text-primary">התחבר כאן</span>
                        </Button>
                      )}
                    </div>

                    <div className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground/80">
                      <ShieldCheck className="h-4 w-4 text-primary" strokeWidth={1.5} aria-hidden="true" />
                      חיבור מאובטח לקהילת Schooltrade
                    </div>
                  </div>
                </section>
              </div>
            </div>
          )
        ) : (
          <div className="space-y-6">
            {/* Navigation */}
            <div
              className="flex gap-3 flex-wrap"
              style={{ animation: "fadeSlideIn 0.4s ease-out" }}
            >
              <NavBtn v="posts" label="📚 המודעות שלי" />
              <NavBtn v="create" label="➕ פרסם מודעה חדשה" />
              <NavBtn v="games" label="🎮 משחקים" className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30 hover:border-primary/60" />
              <NavBtn v="keif" label="🪙 החלף לקיפים" className="bg-gradient-to-r from-amber-500/10 to-yellow-500/5 border-amber-500/30 hover:border-amber-400/60" />
              <NavBtn v="schoolNews" label="📰 חדשות בית הספר" className="bg-gradient-to-r from-orange-500/10 to-amber-500/5 border-orange-500/30 hover:border-orange-400/60" />
              <NavBtn v="books" label="📚 ספרים" className="bg-gradient-to-r from-amber-700/10 to-yellow-700/5 border-amber-700/30 hover:border-amber-600/60" />
              {isAdmin && (
                <>
                  <NavBtn v="admin" label="🔧 ניהול מערכת" />
                  <NavBtn v="security" label="🛡️ אבטחה" className="bg-blue-500/10 border-blue-500/30" />
                </>
              )}
              {isHalloweenActive && (
                <NavBtn v="halloween" label="🎃 אירוע Halloween" className="bg-orange-500/20 border-orange-500/50" />
              )}
              {isChristmasActive && (
                <NavBtn v="christmas" label="🎄 כריסטמס" className="bg-red-500/20 border-red-500/50" />
              )}
              {isPremiumUser && (
                <NavBtn v="premiumClub" label="🌟 חבר מועדון" className="bg-[#00C853]/10 border-[#00C853]/40" />
              )}
              {!isPremiumUser && hasLimitedChat && (
                <button
                  onClick={() => {
                    switchView("limitedChat");
                    setUnreadLimitedChat(0);
                    localStorage.setItem(`limited-chat-read-${user.code}`, new Date().toISOString());
                  }}
                  onMouseEnter={() => playSound("hover")}
                  className={`flex-1 min-w-[140px] relative px-4 py-2 rounded-md border-2 text-sm font-medium transition-all duration-300 ${
                    view === "limitedChat"
                      ? "bg-primary text-primary-foreground border-primary scale-[1.02] shadow-md"
                      : "bg-card border-blue-500/30 hover:border-blue-400/60 hover:scale-[1.01]"
                  }`}
                >
                  💬 צ'אט פרטי
                  {unreadLimitedChat > 0 && (
                    <Badge variant="destructive" className="absolute -top-2 -right-2 animate-pulse">
                      {unreadLimitedChat}
                    </Badge>
                  )}
                </button>
              )}
            </div>


            <div
              key={view}
              style={{ animation: "fadeSlideIn 0.35s ease-out" }}
            >
              {view === "posts" && <PostsList userCode={user.code} userName={user.name} isAdmin={isAdmin} />}
              {view === "create" && <CreatePost userCode={user.code} userName={user.name} onSuccess={() => switchView("posts")} />}
              {view === "admin" && isAdmin && <AdminPanel currentUserCode={user.code} />}
              {view === "security" && isAdmin && <SecurityPanel />}
              {view === "halloween" && isHalloweenActive && <HalloweenTabs />}
              {view === "christmas" && isChristmasActive && <ChristmasTabs />}
              {view === "games" && <GamesHub userCode={user.code} userName={user.name} />}
              {view === "keif" && <KeifTab userCode={user.code} userName={user.name} />}
              {view === "premiumClub" && isPremiumUser && <PremiumClubTab userCode={user.code} userName={user.name} />}
              {view === "limitedChat" && !isPremiumUser && hasLimitedChat && <LimitedChatTab userCode={user.code} userName={user.name} />}
              {view === "schoolNews" && <SchoolNews userCode={user.code} userName={user.name} />}
              {view === "books" && <BooksTab userCode={user.code} userName={user.name} />}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
