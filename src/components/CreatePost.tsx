import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Camera, Upload, ImagePlus, Tag, FileText, Sparkles, SwitchCamera, X } from "lucide-react";

interface CreatePostProps {
  userCode: string;
  userName: string;
  onSuccess: () => void;
}

const CreatePost = ({ userCode, userName, onSuccess }: CreatePostProps) => {
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [postingMode, setPostingMode] = useState<"regular" | "auction">("regular");
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraFallbackRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const { toast } = useToast();

  const attachStream = (mediaStream: MediaStream) => {
    setStream(mediaStream);
    setCameraActive(true);
    // Defer to next tick so the <video> element exists in DOM
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => {});
      }
    }, 50);
  };

  const startCamera = (mode: "environment" | "user" = facingMode) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      // Fallback to native capture input
      cameraFallbackRef.current?.click();
      return;
    }
    setFacingMode(mode);
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: mode }, audio: false })
      .then(attachStream)
      .catch((error) => {
        console.error("Camera error:", error);
        // Try without facingMode constraint
        navigator.mediaDevices
          .getUserMedia({ video: true, audio: false })
          .then(attachStream)
          .catch((err2) => {
            console.error("Camera fallback error:", err2);
            toast({
              title: "שגיאה בפתיחת המצלמה",
              description: "פותח מצלמת מערכת במקום",
              variant: "destructive",
            });
            cameraFallbackRef.current?.click();
          });
      });
  };

  const switchCamera = () => {
    const next = facingMode === "environment" ? "user" : "environment";
    if (stream) stream.getTracks().forEach((t) => t.stop());
    setStream(null);
    startCamera(next);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              setPhotoBlob(blob);
              setPhoto(URL.createObjectURL(blob));
            }
            stopCamera();
          },
          "image/jpeg",
          0.85
        );
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "שגיאה",
        description: "אנא בחר קובץ תמונה",
        variant: "destructive",
      });
      return;
    }

    setPhotoBlob(file);
    setPhoto(URL.createObjectURL(file));
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim() || !price.trim()) {
      toast({
        title: "שגיאה",
        description: "אנא מלא את כל השדות",
        variant: "destructive",
      });
      return;
    }

    if (!photo || !photoBlob) {
      toast({
        title: "שגיאה",
        description: "אנא הוסף תמונה",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      const postId = crypto.randomUUID();
      const ext = photoBlob.type === "image/png" ? "png" : "jpg";
      const fileName = `posts/${postId}.${ext}`;
      const contentType = photoBlob.type || "image/jpeg";

      setUploadProgress(30);

      // Upload raw blob/file directly to storage (avoids preview fetch proxy issues)
      const { error: uploadError } = await supabase.storage
        .from("schooltrade-photos")
        .upload(fileName, photoBlob, {
          contentType,
          upsert: false,
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        throw new Error(uploadError.message || "שגיאה בהעלאת התמונה לאחסון");
      }

      setUploadProgress(60);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("schooltrade-photos")
        .getPublicUrl(fileName);

      setUploadProgress(80);

      // Create post
      const { error: postError } = await supabase.from("posts").insert({
        id: postId,
        owner_code: userCode,
        owner_name: userName,
        description: description.trim(),
        price: price.trim(),
        photo_path: fileName,
        photo_url: urlData.publicUrl,
        posting_mode: postingMode,
        original_price: postingMode === "auction" ? price.trim() : null,
        current_bid_price: postingMode === "auction" ? 0 : 0,
        auction_active: postingMode === "auction",
      });

      if (postError) throw postError;

      setUploadProgress(100);

      toast({
        title: "המודעה פורסמה בהצלחה!",
        description: "המודעה שלך זמינה כעת",
      });

      setDescription("");
      setPrice("");
      if (photo?.startsWith("blob:")) URL.revokeObjectURL(photo);
      setPhoto(null);
      setPhotoBlob(null);
      setPostingMode("regular");
      onSuccess();
    } catch (error: any) {
      console.error("Post creation error:", error);
      toast({
        title: "שגיאה בפרסום המודעה",
        description: error.message || "אירעה שגיאה",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  };

  return (
    <section className="mx-auto w-full max-w-5xl" dir="rtl" aria-labelledby="create-listing-title">
      <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/45 shadow-2xl backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-x-16 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" aria-hidden="true" />
        <div className="relative border-b border-border/60 px-5 py-6 sm:px-8 sm:py-8">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary shadow-glow">
              <ImagePlus className="h-6 w-6" strokeWidth={1.6} aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold text-primary">מודעה חדשה</p>
              <h2 id="create-listing-title" className="mt-1 text-2xl font-semibold text-foreground sm:text-3xl">פרסם מוצר ב־Schooltrade</h2>
              <p className="mt-1 text-sm text-muted-foreground">תמונה טובה, תיאור ברור ומחיר — וזה מוכן לפרסום.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="relative grid gap-0 lg:grid-cols-[1.05fr_0.95fr]" dir="rtl">
          <div className="space-y-7 border-b border-border/60 p-5 sm:p-8 lg:border-b-0 lg:border-l">
          {/* Posting Mode */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Tag className="h-4 w-4 text-primary" aria-hidden="true" />
              <Label>סוג המודעה</Label>
            </div>
            <RadioGroup value={postingMode} onValueChange={(value) => setPostingMode(value as "regular" | "auction")} className="grid grid-cols-2 gap-2 rounded-xl border border-border/60 bg-background/45 p-1.5">
              <div className={`flex min-h-12 items-center gap-2 rounded-lg border px-3 transition-all ${postingMode === "regular" ? "border-primary/35 bg-primary/10 text-foreground shadow-glow" : "border-transparent text-muted-foreground"}`}>
                <RadioGroupItem value="regular" id="regular" />
                <Label htmlFor="regular" className="cursor-pointer text-sm font-medium">מודעה רגילה</Label>
              </div>
              <div className={`flex min-h-12 items-center gap-2 rounded-lg border px-3 transition-all ${postingMode === "auction" ? "border-primary/35 bg-primary/10 text-foreground shadow-glow" : "border-transparent text-muted-foreground"}`}>
                <RadioGroupItem value="auction" id="auction" />
                <Label htmlFor="auction" className="cursor-pointer text-sm font-medium">סחירת פלומביט</Label>
              </div>
            </RadioGroup>
            {postingMode === "auction" && (
              <p className="rounded-lg border border-primary/15 bg-primary/5 p-3 text-sm leading-6 text-muted-foreground animate-fade-in-scale">
                במצב סחירת פלומביט, משתמשים אחרים יכולים בעילום שם להעלות את מחיר המוצר עד לסכום של 200₪. המחיר יתעדכן בזמן אמת, והמודעה לא ניתנת לעריכה במהלך המכירה.
              </p>
            )}
          </div>

          {/* Photo Capture */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Camera className="h-4 w-4 text-primary" aria-hidden="true" />
              <Label>תמונת המוצר</Label>
            </div>
            
            {!cameraActive && !photo && (
              <>
                <div className="grid grid-cols-2 gap-3 rounded-2xl border border-dashed border-border/80 bg-background/30 p-3 sm:p-4">
                  <Button
                    type="button"
                    onClick={() => startCamera()}
                    variant="outline"
                    className="h-32 flex-col rounded-xl border-border/70 bg-card/50 hover:border-primary/40 hover:bg-primary/5 sm:h-40"
                  >
                    <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-105">
                      <Camera className="h-5 w-5" />
                    </span>
                    <span className="text-sm font-medium">צלם תמונה</span>
                  </Button>
                  <Button
                    type="button"
                    onClick={triggerFileInput}
                    variant="outline"
                    className="h-32 flex-col rounded-xl border-border/70 bg-card/50 hover:border-primary/40 hover:bg-primary/5 sm:h-40"
                  >
                    <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-accent/10 text-accent">
                      <Upload className="h-5 w-5" />
                    </span>
                    <span className="text-sm font-medium">בחר מהגלריה</span>
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <input
                  ref={cameraFallbackRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </>
            )}

            {cameraActive && (
              <div className="space-y-3 animate-fade-in-scale">
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border/70 bg-background">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute right-3 top-3 rounded-full border border-destructive/30 bg-destructive/90 px-2.5 py-1 text-xs text-destructive-foreground shadow-soft animate-pulse">
                    ● מצלמה פעילה
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="button" onClick={capturePhoto} className="h-11 flex-1 rounded-xl">
                    <Camera className="ml-2 h-4 w-4" /> צלם
                  </Button>
                  <Button type="button" onClick={switchCamera} variant="outline" size="icon" className="h-11 w-11 rounded-xl" aria-label="החלף מצלמה">
                    <SwitchCamera className="h-4 w-4" />
                  </Button>
                  <Button type="button" onClick={stopCamera} variant="outline" size="icon" className="h-11 w-11 rounded-xl" aria-label="סגור מצלמה">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {photo && !cameraActive && (
              <div className="space-y-3 animate-fade-in-scale">
                <div className="aspect-[4/3] overflow-hidden rounded-xl border border-border/70 bg-background shadow-soft">
                  <img src={photo} alt="תצוגה מקדימה של המוצר" className="h-full w-full object-cover" />
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    if (photo?.startsWith("blob:")) URL.revokeObjectURL(photo);
                    setPhoto(null);
                    setPhotoBlob(null);
                  }}
                  variant="outline"
                  className="h-11 w-full rounded-xl"
                >
                  בחר תמונה אחרת
                </Button>
              </div>
            )}
          </div>
          </div>

          <div className="flex flex-col p-5 sm:p-8">
            <div className="mb-7 flex items-center gap-2 text-sm font-medium text-foreground">
              <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
              פרטי המודעה
            </div>

          {/* Description */}
          <div className="space-y-2.5">
            <Label htmlFor="description">תיאור המוצר</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="תאר את המוצר שלך..."
              rows={6}
              disabled={loading}
              className="min-h-36 resize-none rounded-xl border-border/80 bg-background/55 px-4 py-3 leading-6 shadow-inner placeholder:text-muted-foreground/60 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15"
            />
          </div>

          {/* Price */}
          <div className="mt-6 space-y-2.5">
            <Label htmlFor="price">מחיר</Label>
            <Input
              id="price"
              type="text"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="למשל: 100 ₪"
              disabled={loading}
              className="h-14 rounded-xl border-border/80 bg-background/55 px-4 text-base shadow-inner placeholder:text-muted-foreground/60 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15"
            />
          </div>

          {uploadProgress !== null && (
            <div className="mt-6 space-y-2 rounded-xl border border-border/60 bg-background/35 p-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground"><span>מעלה תמונה...</span><span className="tabular-nums">{uploadProgress}%</span></div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full gradient-primary transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <Button type="submit" className="mt-auto h-14 w-full rounded-xl bg-gradient-to-l from-primary to-accent text-base font-semibold shadow-glow lg:mt-8" disabled={loading}>
            {!loading && <Sparkles className="ml-2 h-4 w-4" aria-hidden="true" />}
            {loading ? "מפרסם..." : "פרסם מודעה"}
          </Button>
          </div>
        </form>
      </div>
    </section>
  );
};

export default CreatePost;
