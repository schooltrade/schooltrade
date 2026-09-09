import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Trash2, MessageCircle, Search, Bookmark, Share2, SlidersHorizontal, PackageOpen, CalendarDays, Gavel, Store, ArrowUpDown } from "lucide-react";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { PremiumBadge } from "@/components/PremiumBadge";
import { AnimatedUsername } from "@/components/AnimatedUsername";
import { playSound } from "@/lib/sounds";

interface Post {
  id: string;
  owner_code: string;
  owner_name: string;
  description: string;
  price: string;
  photo_url: string;
  photo_path: string;
  created_at: string;
  posting_mode?: string;
  original_price?: string;
  current_bid_price?: number;
  auction_active?: boolean;
  max_bid_limit?: number;
}

interface Comment {
  id: string;
  post_id: string;
  user_code: string;
  user_name: string;
  content: string;
  created_at: string;
}

interface PostsListProps {
  userCode: string;
  userName: string;
  isAdmin: boolean;
}

const PostsList = ({ userCode, userName, isAdmin }: PostsListProps) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [loading, setLoading] = useState(true);
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [bidAmounts, setBidAmounts] = useState<Record<string, string>>({});
  // Premium features state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<"newest" | "price_asc" | "price_desc" | "auction">("newest");
  const [bookmarked, setBookmarked] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("bookmarked-posts") || "[]")); } catch { return new Set(); }
  });
  const [showSearch, setShowSearch] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPosts();
    fetchComments();

    // Set up realtime subscriptions
    const postsChannel = supabase
      .channel("posts-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "posts" },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    const commentsChannel = supabase
      .channel("comments-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments" },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(commentsChannel);
    };
  }, []);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPosts((data || []) as Post[]);
    } catch (error: any) {
      console.error("Fetch posts error:", error);
      toast({
        title: "שגיאה בטעינת המודעות",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Group comments by post_id
      const commentsByPost: Record<string, Comment[]> = {};
      (data || []).forEach((comment) => {
        if (!commentsByPost[comment.post_id]) {
          commentsByPost[comment.post_id] = [];
        }
        commentsByPost[comment.post_id].push(comment as Comment);
      });

      setComments(commentsByPost);
    } catch (error: any) {
      console.error("Fetch comments error:", error);
    }
  };

  const handlePlaceBid = async (postId: string, post: Post) => {
    const bidAmount = parseFloat(bidAmounts[postId] || "0");
    
    if (!bidAmount || bidAmount <= 0) {
      toast({
        title: "הכנס סכום תקין",
        variant: "destructive",
      });
      return;
    }

    const currentBid = post.current_bid_price || 0;
    const maxLimit = post.max_bid_limit || 200;
    
    if (currentBid + bidAmount > maxLimit) {
      toast({
        title: "הצעת מחיר גבוהה מדי",
        description: `ניתן להעלות עד ${maxLimit}₪`,
        variant: "destructive",
      });
      return;
    }

    try {
      // Insert bid
      const { error: bidError } = await supabase
        .from("bids")
        .insert({
          post_id: postId,
          bid_amount: bidAmount,
        });

      if (bidError) throw bidError;

      // Update post price
      const newBidPrice = currentBid + bidAmount;
      const { error: updateError } = await supabase
        .from("posts")
        .update({
          current_bid_price: newBidPrice,
        })
        .eq("id", postId);

      if (updateError) throw updateError;

      setBidAmounts((prev) => ({ ...prev, [postId]: "" }));
      toast({ title: "ההצעה נוספה בהצלחה!" });
    } catch (error: any) {
      console.error("Bid error:", error);
      toast({
        title: "שגיאה בהוספת הצעה",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeletePost = async (post: Post) => {
    if (post.auction_active && post.owner_code === userCode) {
      toast({
        title: "לא ניתן למחוק",
        description: "לא ניתן למחוק מודעה פעילה בסחירת פלומביט",
        variant: "destructive",
      });
      return;
    }
    
    if (!confirm("האם אתה בטוח שברצונך למחוק מודעה זו?")) return;

    try {
      // Delete storage object
      if (post.photo_path) {
        await supabase.storage.from("schooltrade-photos").remove([post.photo_path]);
      }

      // Delete post
      const { error } = await supabase.from("posts").delete().eq("id", post.id);

      if (error) throw error;

      toast({ title: "המודעה נמחקה בהצלחה" });
    } catch (error: any) {
      console.error("Delete post error:", error);
      toast({
        title: "שגיאה במחיקת המודעה",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!userCode || !userName) {
      toast({
        title: "יש להתחבר כדי להגיב",
        variant: "destructive",
      });
      return;
    }

    const commentText = commentTexts[postId]?.trim();
    if (!commentText) return;

    try {
      const { error } = await supabase
        .from("comments")
        .insert({
          post_id: postId,
          user_code: userCode,
          user_name: userName,
          content: commentText,
        });

      if (error) throw error;

      setCommentTexts((prev) => ({ ...prev, [postId]: "" }));
      toast({ title: "התגובה נוספה בהצלחה" });
    } catch (error: any) {
      console.error("Add comment error:", error);
      toast({
        title: "שגיאה בהוספת תגובה",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק תגובה זו?")) return;

    try {
      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;

      toast({ title: "התגובה נמחקה בהצלחה" });
    } catch (error: any) {
      console.error("Delete comment error:", error);
      toast({
        title: "שגיאה במחיקת התגובה",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const canDeleteComment = (comment: Comment) =>
    isAdmin || comment.user_code === userCode;

  const canDelete = (post: Post) => isAdmin || post.owner_code === userCode;

  const toggleBookmark = (postId: string) => {
    playSound("click");
    setBookmarked(prev => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      localStorage.setItem("bookmarked-posts", JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const handleShare = (post: Post) => {
    playSound("click");
    const text = `${post.owner_name}: ${post.description} - ${post.price}`;
    if (navigator.share) {
      navigator.share({ title: "Schooltrade", text, url: window.location.href });
    } else {
      navigator.clipboard.writeText(text);
      toast({ title: "הועתק ללוח!" });
    }
  };

  const filteredPosts = useMemo(() => {
    let result = [...posts];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.description.toLowerCase().includes(q) ||
        p.owner_name.toLowerCase().includes(q) ||
        p.price.toLowerCase().includes(q)
      );
    }
    if (sortMode === "price_asc") {
      result.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    } else if (sortMode === "price_desc") {
      result.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
    } else if (sortMode === "auction") {
      result = result.filter(p => p.posting_mode === "auction");
    }
    return result;
  }, [posts, searchQuery, sortMode]);

  if (loading) {
    return (
      <div className="mx-auto flex min-h-72 max-w-5xl flex-col items-center justify-center rounded-2xl border border-border/70 bg-card/45 text-center shadow-2xl backdrop-blur-xl" dir="rtl">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary/20 border-b-primary"></div>
        <p className="mt-4 text-sm text-muted-foreground">טוען מודעות...</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="mx-auto flex min-h-80 max-w-5xl flex-col items-center justify-center rounded-2xl border border-border/70 bg-card/45 px-6 text-center shadow-2xl backdrop-blur-xl" dir="rtl">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary shadow-glow">
          <PackageOpen className="h-7 w-7" strokeWidth={1.5} aria-hidden="true" />
        </div>
        <h2 className="mt-5 text-2xl font-semibold text-foreground">אין עדיין מודעות במערכת</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">המודעה הראשונה שתפורסם תופיע כאן עם התמונה, המחיר וכל הפעולות הזמינות.</p>
      </div>
    );
  }

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6" dir="rtl" aria-labelledby="listings-title">
      <div className="flex flex-col gap-5 border-b border-border/60 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary shadow-glow">
            <Store className="h-6 w-6" strokeWidth={1.6} aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold text-primary">לוח המודעות</p>
            <h2 id="listings-title" className="mt-1 text-2xl font-semibold text-foreground sm:text-3xl">המודעות שלי</h2>
            <p className="mt-1 text-sm text-muted-foreground">כל המוצרים, השיחות והפעולות במקום אחד.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/45 px-4 py-2 text-sm text-muted-foreground backdrop-blur-xl">
          <span className="h-2 w-2 rounded-full bg-primary shadow-glow" />
          <span>{filteredPosts.length} מודעות</span>
        </div>
      </div>

      {/* Premium Feature Bar: Search, Sort, Filter */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-card/45 p-2 shadow-soft backdrop-blur-xl" dir="rtl">
        <Button
          variant="ghost" size="sm"
          onClick={() => { setShowSearch(v => !v); playSound("click"); }}
          className={`h-10 rounded-lg gap-1.5 ${showSearch ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
        >
          <Search className="w-4 h-4" /> חיפוש
        </Button>
        <Button
          variant="ghost" size="sm"
          onClick={() => { setShowFilters(v => !v); playSound("click"); }}
          className={`h-10 rounded-lg gap-1.5 ${showFilters ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
        >
          <SlidersHorizontal className="w-4 h-4" /> מיון וסינון
        </Button>
        <div className="mr-auto hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
          <ArrowUpDown className="h-3.5 w-3.5" aria-hidden="true" />
          {sortMode === "newest" ? "חדש ביותר" : sortMode === "price_asc" ? "מחיר עולה" : sortMode === "price_desc" ? "מחיר יורד" : "מכירה פומבית"}
        </div>
      </div>

      {showSearch && (
        <div className="relative animate-fade-in-scale">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="חפש מודעות..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="h-12 rounded-xl border-border/80 bg-card/45 pr-10 shadow-inner focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15"
            dir="rtl"
            autoFocus
          />
        </div>
      )}

      {showFilters && (
        <div className="flex flex-wrap gap-2 animate-fade-in-scale">
          {([
            { key: "newest", label: "🕐 חדש ביותר" },
            { key: "price_asc", label: "💰 מחיר עולה" },
            { key: "price_desc", label: "💰 מחיר יורד" },
            { key: "auction", label: "🔨 מכירה פומבית" },
          ] as const).map(opt => (
            <Button
              key={opt.key}
              size="sm"
              variant={sortMode === opt.key ? "default" : "outline"}
              onClick={() => { setSortMode(opt.key); playSound("click"); }}
              className="rounded-lg transition-all duration-200"
            >
              {opt.label}
            </Button>
          ))}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {filteredPosts.map((post) => (
        <div
          key={post.id}
          className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card/45 shadow-soft backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-glow"
          style={{ animation: "fadeSlideIn 0.3s ease-out" }}
        >
          {/* Image */}
          <div className="relative aspect-[4/3] overflow-hidden bg-muted">
            <img src={post.photo_url} alt={post.description} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-card/90 to-transparent" aria-hidden="true" />
            {post.posting_mode === "auction" && (
              <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full border border-primary/25 bg-card/80 px-2.5 py-1 text-xs font-medium text-primary shadow-soft backdrop-blur-md">
                <Gavel className="h-3.5 w-3.5" aria-hidden="true" /> סחירת פלומביט
              </span>
            )}
          </div>

          {/* Content */}
          <div className="space-y-4 p-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <AnimatedUsername userCode={post.owner_code}>
                    <p className="text-base font-semibold text-foreground">{post.owner_name}</p>
                  </AnimatedUsername>
                  <PremiumBadge userCode={post.owner_code} />
                  <VerifiedBadge userCode={post.owner_code} />
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                  {new Date(post.created_at).toLocaleDateString("he-IL")}
                </p>
              </div>
              <div className="shrink-0 text-left">
                {post.posting_mode === "auction" ? (
                  <div>
                    <div className="text-xl font-bold text-primary">
                      {parseFloat(post.original_price || post.price) + (post.current_bid_price || 0)}₪
                    </div>
                    {post.current_bid_price! > 0 && (
                      <div className="text-xs text-muted-foreground">
                        מחיר התחלה: {post.original_price}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xl font-bold text-primary">{post.price}</div>
                )}
              </div>
            </div>

            {/* Premium Feature: Bookmark & Share */}
            <div className="flex justify-end gap-1 border-t border-border/60 pt-3">
              <Button
                variant="ghost" size="sm"
                onClick={() => toggleBookmark(post.id)}
                className={`rounded-lg gap-1 transition-all duration-200 ${bookmarked.has(post.id) ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
              >
                <Bookmark className={`w-4 h-4 ${bookmarked.has(post.id) ? "fill-primary" : ""}`} />
                {bookmarked.has(post.id) ? "נשמר" : "שמור"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleShare(post)} className="rounded-lg gap-1 text-muted-foreground">
                <Share2 className="w-4 h-4" /> שתף
              </Button>
            </div>

            {/* Description */}
            <p className="min-h-12 text-sm leading-6 text-foreground">{post.description}</p>

            {/* Comments */}
            {comments[post.id] && comments[post.id].length > 0 && (
              <div className="space-y-2 border-t border-border/60 pt-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <MessageCircle className="w-4 h-4" />
                  <span>תגובות ({comments[post.id].length})</span>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {comments[post.id].map((comment) => (
                    <div key={comment.id} className="rounded-lg border border-border/40 bg-background/35 p-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-1">
                            <AnimatedUsername userCode={comment.user_code}>
                              <p className="font-semibold">{comment.user_name}</p>
                            </AnimatedUsername>
                            <PremiumBadge userCode={comment.user_code} />
                            <VerifiedBadge userCode={comment.user_code} />
                          </div>
                          <p className="text-muted-foreground">{comment.content}</p>
                        </div>
                        {canDeleteComment(comment) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleDeleteComment(comment.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Auction Bidding */}
            {post.posting_mode === "auction" && post.auction_active && userCode && (
              <div className="border-t pt-4 space-y-2">
                <Label className="text-sm font-semibold">הצע מחיר (בעילום שם)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={bidAmounts[post.id] || ""}
                    onChange={(e) =>
                      setBidAmounts((prev) => ({ ...prev, [post.id]: e.target.value }))
                    }
                    placeholder="סכום להוספה..."
                    min="1"
                    max={post.max_bid_limit! - (post.current_bid_price || 0)}
                    className="h-11 rounded-xl bg-background/45"
                  />
                  <Button
                    size="sm" className="h-11 rounded-xl"
                    onClick={() => handlePlaceBid(post.id, post)}
                    disabled={!bidAmounts[post.id]}
                  >
                    הצע
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  מקסימום: {post.max_bid_limit}₪ | נותרו: {post.max_bid_limit! - (post.current_bid_price || 0)}₪
                </p>
              </div>
            )}

            {/* Add Comment */}
            {userCode ? (
              <div className="flex gap-2 border-t border-border/60 pt-4">
                <Input
                  value={commentTexts[post.id] || ""}
                  onChange={(e) =>
                    setCommentTexts((prev) => ({ ...prev, [post.id]: e.target.value }))
                  }
                  placeholder="הוסף תגובה..."
                  className="h-11 min-w-0 rounded-xl bg-background/45"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleAddComment(post.id);
                    }
                  }}
                />
                <Button
                  size="sm" className="h-11 rounded-xl px-4"
                  onClick={() => handleAddComment(post.id)}
                  disabled={!commentTexts[post.id]?.trim()}
                >
                  שלח
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-2">
                התחבר כדי להגיב
              </p>
            )}

            {/* Delete Button */}
            {canDelete(post) && (
              <Button
                variant="destructive"
                size="sm"
                className="h-11 w-full rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20"
                onClick={() => handleDeletePost(post)}
              >
                <Trash2 className="w-4 h-4 ml-2" />
                מחק מודעה
              </Button>
            )}
          </div>
        </div>
      ))}
      </div>
    </section>
  );
};

export default PostsList;
