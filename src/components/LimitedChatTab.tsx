import { LinkifiedText } from "@/components/LinkifiedText";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Send, Volume2 } from "lucide-react";
import { AnimatedUsername } from "./AnimatedUsername";
import { PremiumBadge } from "./PremiumBadge";

interface Chat {
  id: string;
  user1_code: string;
  user2_code: string;
  user1_name: string;
  user2_name: string;
  last_message_at: string;
  created_at: string;
  is_active: boolean;
}

interface Message {
  id: string;
  sender_code: string;
  sender_name: string;
  content: string;
  created_at: string;
}

interface LimitedChatTabProps {
  userCode: string;
  userName: string;
}

const MAX_MESSAGES_PER_SIDE = 5;

// Notification sound
const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.error("Audio notification error:", error);
  }
};

export const LimitedChatTab = ({ userCode, userName }: LimitedChatTabProps) => {
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [myMessageCount, setMyMessageCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentMonth = new Date().toISOString().slice(0, 7);

  // Load sound preference
  useEffect(() => {
    const soundPref = localStorage.getItem(`chat-sound-${userCode}`);
    if (soundPref !== null) {
      setSoundEnabled(soundPref === 'true');
    }
  }, [userCode]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Find the user's limited chat (where they were invited by a club member)
  const loadLimitedChat = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("private_chats")
        .select("*")
        .eq("is_active", true)
        .or(`user1_code.eq.${userCode},user2_code.eq.${userCode}`)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading chat:", error);
        return;
      }

      // Find the most recent active chat for this user
      const currentMonthChats = (data || []).filter((c: Chat) => {
        const chatMonth = c.created_at.slice(0, 7);
        return chatMonth === currentMonth;
      });

      if (currentMonthChats.length > 0) {
        setChat(currentMonthChats[0]);
      }
    } catch (e) {
      console.error("Error in loadLimitedChat:", e);
    } finally {
      setLoading(false);
    }
  }, [userCode, currentMonth]);

  useEffect(() => {
    loadLimitedChat();
  }, [loadLimitedChat]);

  useEffect(() => {
    if (chat) {
      loadMessages(chat.id);
      loadMessageCount(chat.id);
    }
  }, [chat]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!chat) return;

    const channel = supabase
      .channel(`limited-chat-messages-${chat.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "private_messages",
          filter: `chat_id=eq.${chat.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          // Only add if not already in messages (avoid duplicates)
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) {
              return prev;
            }
            // Play sound and show notification for messages from others
            if (newMsg.sender_code !== userCode) {
              if (soundEnabled) {
                playNotificationSound();
              }
              toast({
                title: `📱 הודעה חדשה מ-${newMsg.sender_name}`,
                description: newMsg.content.substring(0, 50),
              });
            }
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chat, userCode, soundEnabled, toast]);

  const loadMessages = async (chatId: string) => {
    try {
      const { data, error } = await supabase
        .from("private_messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error loading messages:", error);
        return;
      }

      setMessages(data || []);
    } catch (e) {
      console.error("Error in loadMessages:", e);
    }
  };

  const loadMessageCount = async (chatId: string) => {
    try {
      const { data, error } = await supabase
        .from("private_chat_limits")
        .select("message_count")
        .eq("chat_id", chatId)
        .eq("user_code", userCode)
        .eq("month_year", currentMonth)
        .maybeSingle();

      if (error) {
        console.error("Error loading message count:", error);
        return;
      }

      setMyMessageCount(data?.message_count || 0);
    } catch (e) {
      console.error("Error in loadMessageCount:", e);
    }
  };

  const sendMessage = async () => {
    if (!chat || !newMessage.trim()) return;

    if (myMessageCount >= MAX_MESSAGES_PER_SIDE) {
      toast({
        title: "הגעת למגבלת ההודעות לחודש זה",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error: messageError } = await supabase
        .from("private_messages")
        .insert({
          chat_id: chat.id,
          sender_code: userCode,
          sender_name: userName,
          content: newMessage.trim(),
          month_year: currentMonth,
        });

      if (messageError) {
        console.error("Error sending message:", messageError);
        toast({ title: "שגיאה בשליחת הודעה", variant: "destructive" });
        return;
      }

      // Update message count
      const { data: existingLimit } = await supabase
        .from("private_chat_limits")
        .select("id, message_count")
        .eq("chat_id", chat.id)
        .eq("user_code", userCode)
        .eq("month_year", currentMonth)
        .maybeSingle();

      if (existingLimit) {
        await supabase
          .from("private_chat_limits")
          .update({ message_count: existingLimit.message_count + 1 })
          .eq("id", existingLimit.id);
      } else {
        await supabase
          .from("private_chat_limits")
          .insert({
            chat_id: chat.id,
            user_code: userCode,
            month_year: currentMonth,
            message_count: 1,
          });
      }

      await supabase
        .from("private_chats")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", chat.id);

      setNewMessage("");
      setMyMessageCount(prev => prev + 1);
    } catch (e) {
      console.error("Error in sendMessage:", e);
      toast({ title: "שגיאה בשליחת הודעה", variant: "destructive" });
    }
  };

  const getOtherUserName = (c: Chat) => {
    return c.user1_code === userCode ? c.user2_name : c.user1_name;
  };

  const getOtherUserCode = (c: Chat) => {
    return c.user1_code === userCode ? c.user2_code : c.user1_code;
  };

  const toggleSound = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    localStorage.setItem(`chat-sound-${userCode}`, String(newValue));
  };

  const isMessageLimitReached = myMessageCount >= MAX_MESSAGES_PER_SIDE;

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <MessageCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground animate-pulse" />
        <p className="text-muted-foreground">טוען צ'אט...</p>
      </Card>
    );
  }

  if (!chat) {
    return (
      <Card className="p-8 text-center">
        <MessageCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-xl font-bold mb-2">אין צ'אטים פעילים</h3>
        <p className="text-muted-foreground text-sm">
          כאשר חבר מועדון יזמין אותך לצ'אט, הוא יופיע כאן.
        </p>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto" dir="rtl">
      <Card className="p-4 flex flex-col h-[500px]">
        {/* Header */}
        <div className="border-b pb-3 mb-3 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold">
                <AnimatedUsername userCode={getOtherUserCode(chat)}>
                  {getOtherUserName(chat)}
                </AnimatedUsername>
              </h3>
              <PremiumBadge userCode={getOtherUserCode(chat)} />
            </div>
            <p className="text-sm text-muted-foreground">
              הודעות שלי: {myMessageCount}/{MAX_MESSAGES_PER_SIDE}
            </p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleSound}
            title={soundEnabled ? "כבה צלילים" : "הפעל צלילים"}
          >
            <Volume2 className={`w-4 h-4 ${soundEnabled ? "text-green-500" : "text-muted-foreground"}`} />
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 mb-3">
          <div className="space-y-3 p-2">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <p className="text-sm">אין הודעות עדיין</p>
                <p className="text-xs">שלח הודעה כדי להתחיל</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-lg max-w-[80%] ${
                    msg.sender_code === userCode
                      ? "bg-[#00C853] text-white mr-auto"
                      : "bg-muted ml-auto"
                  }`}
                >
                  <div className="text-xs opacity-70 mb-1 flex items-center gap-1">
                    <AnimatedUsername userCode={msg.sender_code}>
                      {msg.sender_name}
                    </AnimatedUsername>
                    <PremiumBadge userCode={msg.sender_code} />
                  </div>
                  <p className="break-words"><LinkifiedText text={msg.content} /></p>
                  <div className="text-xs opacity-50 mt-1 flex items-center gap-1">
                    {new Date(msg.created_at).toLocaleTimeString('he-IL', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                    {msg.sender_code === userCode && (
                      <span className="text-blue-300">✓✓</span>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        {isMessageLimitReached ? (
          <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-center text-sm font-medium">
            הגעת למגבלת ההודעות לחודש זה.
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              placeholder="כתוב הודעה..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            />
            <Button onClick={sendMessage}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Info */}
        <div className="mt-3 text-center text-xs text-muted-foreground">
          זהו צ'אט מוגבל - ניתן לשוחח רק עם המשתמש שהזמין אותך
        </div>
      </Card>
    </div>
  );
};
