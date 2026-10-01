import { LinkifiedText } from "@/components/LinkifiedText";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";

interface NewsItem {
  id: string;
  author_code: string;
  author_name: string;
  content: string;
  image_url: string | null;
  created_at: string;
}

interface SchoolNewsProps {
  userCode: string;
  userName: string;
}

const ADMIN_CODE = "541285226";

const sanitizeFileName = (name: string): string => {
  const ext = name.split('.').pop() || 'jpg';
  return `${Date.now()}-${crypto.randomUUID()}.${ext}`;
};

export const SchoolNews = ({ userCode, userName }: SchoolNewsProps) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState("");
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string>("");
  const [publishing, setPublishing] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  const isPublisher = userCode === ADMIN_CODE;

  useEffect(() => {
    fetchNews();

    // Subscribe to realtime for notifications
    const channel = supabase
      .channel('school-news-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'school_news' },
        (payload) => {
          const newItem = payload.new as NewsItem;
          setNews((prev) => [newItem, ...prev]);
          // Show browser notification if not the author
          if (newItem.author_code !== userCode && Notification.permission === 'granted') {
            new Notification('📰 חדשות בית הספר', {
              body: 'יש הודעה חדשה בחדשות בית הספר',
              icon: `${import.meta.env.BASE_URL}favicon.png`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userCode]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((err) => {
        console.error('SW registration failed:', err);
      });
    }
  }, []);

  // Cleanup camera + preview URL on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) cameraStream.getTracks().forEach((t) => t.stop());
      if (newImagePreview) URL.revokeObjectURL(newImagePreview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchNews = async () => {
    try {
      const { data, error } = await supabase
        .from("school_news")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNews((data as NewsItem[]) || []);
    } catch (error) {
      console.error("Error fetching news:", error);
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לטעון את החדשות",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "שגיאה", description: "אנא בחר קובץ תמונה", variant: "destructive" });
      return;
    }
    setNewImageFile(file);
    if (newImagePreview) URL.revokeObjectURL(newImagePreview);
    const url = URL.createObjectURL(file);
    setNewImagePreview(url);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      setCameraStream(stream);
      setCameraActive(true);
      // Attach stream after render
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 50);
    } catch (err) {
      console.error("Camera error:", err);
      toast({ title: "שגיאה במצלמה", description: "לא ניתן לגשת למצלמה", variant: "destructive" });
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" });
      setNewImageFile(file);
      if (newImagePreview) URL.revokeObjectURL(newImagePreview);
      setNewImagePreview(URL.createObjectURL(blob));
      stopCamera();
    }, "image/jpeg", 0.9);
  };

  const publishNews = async () => {
    if (!isPublisher) {
      toast({ title: "שגיאה", description: "אין לך הרשאה לפרסם חדשות", variant: "destructive" });
      return;
    }
    if (!newContent.trim()) {
      toast({ title: "שגיאה", description: "יש להזין תוכן לחדשות", variant: "destructive" });
      return;
    }
    setPublishing(true);
    try {
      let imageUrl: string | null = null;
      if (newImageFile) {
        const fileName = `news/${sanitizeFileName(newImageFile.name)}`;
        const { error: uploadError } = await supabase.storage
          .from("schooltrade-photos")
          .upload(fileName, newImageFile, { contentType: newImageFile.type, cacheControl: "3600" });
        if (uploadError) {
          console.error("Upload error:", uploadError);
          toast({ title: "שגיאה בהעלאת תמונה", description: uploadError.message, variant: "destructive" });
        } else {
          const { data: urlData } = supabase.storage.from("schooltrade-photos").getPublicUrl(fileName);
          imageUrl = urlData.publicUrl;
        }
      }
      const { error } = await supabase
        .from("school_news")
        .insert({ author_code: userCode, author_name: userName, content: newContent.trim(), image_url: imageUrl });
      if (error) throw error;
      toast({ title: "פורסם בהצלחה!", description: "החדשות פורסמו לכל המשתמשים" });
      setNewContent("");
      setNewImageFile(null);
      setNewImagePreview("");
      // Don't refetch - realtime will add it
    } catch (error: any) {
      console.error("Error publishing news:", error);
      const msg = error?.message?.includes("row-level security")
        ? "אין לך הרשאה לפרסם חדשות"
        : "לא הצלחנו לפרסם את החדשות";
      toast({ title: "שגיאה", description: msg, variant: "destructive" });
    } finally {
      setPublishing(false);
    }
  };

  const deleteNews = async (id: string) => {
    try {
      const { error } = await supabase.from("school_news").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "נמחק בהצלחה", description: "החדשות נמחקו" });
      setNews((prev) => prev.filter((n) => n.id !== id));
    } catch (error) {
      console.error("Error deleting news:", error);
      toast({ title: "שגיאה", description: "לא הצלחנו למחוק את החדשות", variant: "destructive" });
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: he });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6" dir="rtl">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">📰 חדשות של רמות ויצמן</h2>
        <p className="text-muted-foreground">כל העדכונים והחדשות מבית הספר</p>
      </div>

      {/* Publisher Panel - only for admin code */}
      {isPublisher ? (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader className="pb-2">
            <p className="font-medium">📝 פרסום חדשות חדשות</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="כתוב את תוכן החדשות כאן..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              {!cameraActive && (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    🖼️ {newImageFile ? "החלף תמונה" : "מהגלריה"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={startCamera}
                  >
                    📷 צלם תמונה
                  </Button>
                </div>
              )}

              {cameraActive && (
                <div className="space-y-2">
                  <div className="relative rounded-lg overflow-hidden bg-black">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-64 object-cover"
                    />
                    <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      מצלמה פעילה
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" onClick={capturePhoto} className="flex-1">
                      📸 צלם
                    </Button>
                    <Button type="button" variant="outline" onClick={stopCamera}>
                      ביטול
                    </Button>
                  </div>
                </div>
              )}

              {newImagePreview && !cameraActive && (
                <div className="relative rounded-lg overflow-hidden">
                  <img src={newImagePreview} alt="תצוגה מקדימה" className="w-full h-40 object-cover rounded-lg" />
                  <button
                    onClick={() => { setNewImageFile(null); if (newImagePreview) URL.revokeObjectURL(newImagePreview); setNewImagePreview(""); }}
                    className="absolute top-2 left-2 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                  >✕</button>
                </div>
              )}
            </div>
            <Button onClick={publishNews} disabled={publishing || !newContent.trim()} className="w-full">
              {publishing ? "מפרסם..." : "פרסם חדשות"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-muted">
          <CardContent className="py-6 text-center text-muted-foreground">
            <p>📖 רק מנהלים יכולים לפרסם חדשות</p>
          </CardContent>
        </Card>
      )}

      {/* News Feed */}
      <ScrollArea className="h-[600px] pr-4">
        <div className="space-y-4">
          {news.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p className="text-4xl mb-4">📭</p>
                <p>אין חדשות עדיין</p>
              </CardContent>
            </Card>
          ) : (
            news.map((item) => (
              <Card key={item.id} className="animate-fade-in overflow-hidden">
                {item.image_url && (
                  <div className="w-full h-48 overflow-hidden">
                    <img
                      src={item.image_url}
                      alt="News"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <CardContent className="py-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.author_name}</span>
                      <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                        מפרסם רשמי
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(item.created_at)}
                    </span>
                  </div>
                  <p className="text-lg leading-relaxed whitespace-pre-wrap">
                    <LinkifiedText text={item.content} />
                  </p>
                  {isPublisher && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteNews(item.id)}
                    >
                      🗑️ מחק
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
