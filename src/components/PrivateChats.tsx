import { LinkifiedText } from "@/components/LinkifiedText";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Send, Users, Plus, Bell, Volume2 } from "lucide-react";
import { AnimatedUsername } from "./AnimatedUsername";
import { PremiumBadge } from "./PremiumBadge";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Chat {
  id: string;
  user1_code: string;
  user2_code: string;
  user1_name: string;
  user2_name: string;
  last_message_at: string;
  created_at: string;
}

interface Message {
  id: string;
  sender_code: string;
  sender_name: string;
  content: string;
  created_at: string;
}

interface User {
  code: string;
  name: string;
  is_premium: boolean;
}

interface PrivateChatsProps {
  userCode: string;
  userName: string;
}

interface UnreadCount {
  [chatId: string]: number;
}

const PREMIUM_USERS = ["161221063", "752025692", "426671703" , "670194978" ];
const MAX_CHATS_PER_MONTH = 5;
const MAX_MESSAGES_PER_SIDE = 5;

// Notification sound (phone ringing style)
const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create a phone ring-like sound
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

// Show browser notification
const showBrowserNotification = (senderName: string, content: string) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(`יש הודעה חדשה ב-SchoolTrade מאת ${senderName}`, {
      body: content.substring(0, 100),
      icon: '/favicon.png',
      tag: 'schooltrade-message',
    });
  }
};

// Request notification permission
const requestNotificationPermission = async () => {
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission();
  }
};

export const PrivateChats = ({ userCode, userName }: PrivateChatsProps) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [myMessageCount, setMyMessageCount] = useState(0);
  const [showUserSelection, setShowUserSelection] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadCounts, setUnreadCounts] = useState<UnreadCount>({});
  const [lastReadTimes, setLastReadTimes] = useState<{ [chatId: string]: string }>({});
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [dbPremium, setDbPremium] = useState<boolean | null>(null);
  const isPremiumUser = PREMIUM_USERS.includes(userCode) || dbPremium === true;
  const premiumLoading = dbPremium === null && !PREMIUM_USERS.includes(userCode);
  const currentMonth = new Date().toISOString().slice(0, 7);

  // Sync premium status from DB so that users granted premium via subscription
  // (e.g. code redemption) also get full access — not only the hardcoded list.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from("users")
          .select("is_premium")
          .eq("code", userCode)
          .maybeSingle();
        if (!cancelled) setDbPremium(!!data?.is_premium);
      } catch {
        if (!cancelled) setDbPremium(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userCode]);

  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Load last read times from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`chat-read-times-${userCode}`);
    if (saved) {
      try {
        setLastReadTimes(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading last read times:", e);
      }
    }
    
    const soundPref = localStorage.getItem(`chat-sound-${userCode}`);
    if (soundPref !== null) {
      setSoundEnabled(soundPref === 'true');
    }
  }, [userCode]);

  // Save last read times to localStorage
  const saveLastReadTime = useCallback((chatId: string) => {
    const newTimes = { ...lastReadTimes, [chatId]: new Date().toISOString() };
    setLastReadTimes(newTimes);
    localStorage.setItem(`chat-read-times-${userCode}`, JSON.stringify(newTimes));
  }, [lastReadTimes, userCode]);

  // Toggle sound
  const toggleSound = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    localStorage.setItem(`chat-sound-${userCode}`, String(newValue));
  };

  // Calculate unread messages for each chat
  const calculateUnreadCounts = useCallback(async (chatList: Chat[]) => {
    const counts: UnreadCount = {};
    
    for (const chat of chatList) {
      const lastRead = lastReadTimes[chat.id] || chat.created_at;
      
      try {
        const { count, error } = await supabase
          .from("private_messages")
          .select("*", { count: "exact", head: true })
          .eq("chat_id", chat.id)
          .neq("sender_code", userCode)
          .gt("created_at", lastRead);
        
        if (!error && count) {
          counts[chat.id] = count;
        } else {
          counts[chat.id] = 0;
        }
      } catch (e) {
        console.error("Error calculating unread:", e);
        counts[chat.id] = 0;
      }
    }
    
    setUnreadCounts(counts);
  }, [lastReadTimes, userCode]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isPremiumUser) {
      loadChats();
    }
  }, [userCode, isPremiumUser]);

  useEffect(() => {
    if (chats.length > 0) {
      calculateUnreadCounts(chats);
    }
  }, [chats, lastReadTimes, calculateUnreadCounts]);

  useEffect(() => {
    if (selectedChat) {
      loadMessages(selectedChat.id);
      loadMessageCount(selectedChat.id);
      // Mark as read when selecting a chat
      saveLastReadTime(selectedChat.id);
      setUnreadCounts(prev => ({ ...prev, [selectedChat.id]: 0 }));
    }
  }, [selectedChat]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!isPremiumUser || chats.length === 0) return;

    const chatIds = chats.map(c => c.id);
    
    const channel = supabase
      .channel("private-messages-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "private_messages",
        },
        (payload) => {
          const newMsg = payload.new as Message & { chat_id: string };
          
          // Only notify if message is in one of our chats and not from us
          if (chatIds.includes(newMsg.chat_id) && newMsg.sender_code !== userCode) {
            // Play notification sound
            if (soundEnabled) {
              playNotificationSound();
            }
            
            // Update unread count if not in selected chat
            if (!selectedChat || selectedChat.id !== newMsg.chat_id) {
              setUnreadCounts(prev => ({
                ...prev,
                [newMsg.chat_id]: (prev[newMsg.chat_id] || 0) + 1,
              }));
              
              // Show toast notification (WhatsApp style)
              toast({
                title: `📱 יש הודעה חדשה ב-SchoolTrade`,
                description: `מאת ${newMsg.sender_name}: ${newMsg.content.substring(0, 50)}${newMsg.content.length > 50 ? "..." : ""}`,
              });
              
              // Show browser notification
              showBrowserNotification(newMsg.sender_name, newMsg.content);
            } else {
              // If in selected chat, add message and mark as read
              setMessages(prev => [...prev, newMsg]);
              saveLastReadTime(newMsg.chat_id);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isPremiumUser, chats, selectedChat, userCode, toast, saveLastReadTime, soundEnabled]);

  const loadChats = async () => {
    try {
      const { data, error } = await supabase
        .from("private_chats")
        .select("*")
        .eq("is_active", true)
        .order("last_message_at", { ascending: false });

      if (error) {
        console.error("Error loading chats:", error);
        toast({ title: "שגיאה בטעינת צ'אטים", variant: "destructive" });
        return;
      }

      const userChats = (data || []).filter(
        (chat: Chat) => chat.user1_code === userCode || chat.user2_code === userCode
      );

      const currentMonthChats = userChats.filter((chat: Chat) => {
        const chatMonth = chat.created_at.slice(0, 7);
        return chatMonth === currentMonth;
      });

      setChats(currentMonthChats);
    } catch (e) {
      console.error("Error in loadChats:", e);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("code, name, is_premium")
        .neq("code", userCode)
        .order("name");

      if (error) {
        console.error("Error loading users:", error);
        return;
      }

      // Filter out users we already have chats with
      const existingChatUserCodes = chats.map(chat => 
        chat.user1_code === userCode ? chat.user2_code : chat.user1_code
      );

      const filteredUsers = (data || []).filter(
        (user: User) => !existingChatUserCodes.includes(user.code)
      );

      setAvailableUsers(filteredUsers);
    } catch (e) {
      console.error("Error in loadAvailableUsers:", e);
    }
  };

  const loadMessages = async (chatId: string) => {
    try {
      const { data, error } = await supabase
        .from("private_messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error loading messages:", error);
        toast({ title: "שגיאה בטעינת הודעות", variant: "destructive" });
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

  const createChatWithUser = async (targetUser: User) => {
    if (!isPremiumUser) {
      toast({ title: "אין לך הרשאה ליצור צ'אטים", variant: "destructive" });
      return;
    }

    if (chats.length >= MAX_CHATS_PER_MONTH) {
      toast({ 
        title: `הגעת למקסימום ${MAX_CHATS_PER_MONTH} צ'אטים לחודש`,
        variant: "destructive" 
      });
      return;
    }

    try {
      const { data: newChat, error } = await supabase
        .from("private_chats")
        .insert({
          user1_code: userCode,
          user2_code: targetUser.code,
          user1_name: userName,
          user2_name: targetUser.name,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating chat:", error);
        toast({ title: "שגיאה ביצירת צ'אט", variant: "destructive" });
        return;
      }

      toast({ title: `צ'אט עם ${targetUser.name} נוצר בהצלחה` });
      setShowUserSelection(false);
      setSearchQuery("");
      await loadChats();
      
      if (newChat) {
        setSelectedChat(newChat);
      }
    } catch (e) {
      console.error("Error in createChatWithUser:", e);
      toast({ title: "שגיאה ביצירת צ'אט", variant: "destructive" });
    }
  };

  const sendMessage = async () => {
    if (!selectedChat || !newMessage.trim()) return;

    if (myMessageCount >= MAX_MESSAGES_PER_SIDE) {
      toast({
        title: "הגעת למגבלת ההודעות לחודש זה.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error: messageError } = await supabase
        .from("private_messages")
        .insert({
          chat_id: selectedChat.id,
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

      const { data: existingLimit } = await supabase
        .from("private_chat_limits")
        .select("id, message_count")
        .eq("chat_id", selectedChat.id)
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
            chat_id: selectedChat.id,
            user_code: userCode,
            month_year: currentMonth,
            message_count: 1,
          });
      }

      await supabase
        .from("private_chats")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", selectedChat.id);

      setNewMessage("");
      loadMessages(selectedChat.id);
      setMyMessageCount(prev => prev + 1);
      loadChats();
    } catch (e) {
      console.error("Error in sendMessage:", e);
      toast({ title: "שגיאה בשליחת הודעה", variant: "destructive" });
    }
  };

  const getOtherUserName = (chat: Chat) => {
    return chat.user1_code === userCode ? chat.user2_name : chat.user1_name;
  };

  const getOtherUserCode = (chat: Chat) => {
    return chat.user1_code === userCode ? chat.user2_code : chat.user1_code;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL', { 
      day: 'numeric', 
      month: 'numeric',
      year: '2-digit'
    });
  };

  const filteredUsers = availableUsers.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.code.includes(searchQuery)
  );

  const isMessageLimitReached = myMessageCount >= MAX_MESSAGES_PER_SIDE;
  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  if (!isPremiumUser) {
    if (premiumLoading) {
      return (
        <Card className="p-8 text-center animate-fade-slide-in">
          <MessageCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground animate-pulse" />
          <h3 className="text-xl font-bold mb-2">טוען…</h3>
        </Card>
      );
    }
    return (
      <Card className="p-8 text-center animate-fade-slide-in">
        <MessageCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-xl font-bold mb-2">צ'אטים פרטיים</h3>
        <p className="text-muted-foreground">
          תכונה זו זמינה רק לחברי מועדון
        </p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]" dir="rtl">
      {/* Chats List */}
      <Card className="p-4 space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2">
              <Users className="w-5 h-5" />
              צ'אטים ({chats.length}/{MAX_CHATS_PER_MONTH})
              {totalUnread > 0 && (
                <Badge variant="destructive" className="mr-2 animate-pulse">
                  {totalUnread}
                </Badge>
              )}
            </h3>
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={toggleSound}
                title={soundEnabled ? "כבה צלילים" : "הפעל צלילים"}
              >
                <Volume2 className={`w-4 h-4 ${soundEnabled ? "text-green-500" : "text-muted-foreground"}`} />
              </Button>
              {chats.length < MAX_CHATS_PER_MONTH && (
                <Dialog open={showUserSelection} onOpenChange={(open) => {
                  setShowUserSelection(open);
                  if (open) loadAvailableUsers();
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Plus className="w-4 h-4 ml-1" />
                      חדש
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md" dir="rtl">
                    <DialogHeader>
                      <DialogTitle>בחר משתמש לצ'אט חדש</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="חפש לפי שם..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      <ScrollArea className="h-[300px]">
                        <div className="space-y-2">
                          {filteredUsers.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">
                              לא נמצאו משתמשים
                            </p>
                          ) : (
                            filteredUsers.map((user) => (
                              <Button
                                key={user.code}
                                variant="outline"
                                className="w-full justify-start"
                                onClick={() => createChatWithUser(user)}
                              >
                                <div className="flex items-center gap-2">
                                  <AnimatedUsername userCode={user.code}>
                                    {user.name}
                                  </AnimatedUsername>
                                  <PremiumBadge userCode={user.code} />
                                </div>
                              </Button>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </div>

        <ScrollArea className="h-[480px]">
          <div className="space-y-2">
            {chats.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">אין צ'אטים עדיין</p>
                <p className="text-xs">לחץ על "חדש" כדי להתחיל</p>
              </div>
            ) : (
              chats.map((chat, index) => {
                const unread = unreadCounts[chat.id] || 0;
                const hasUnread = unread > 0;
                
                return (
                  <Button
                    key={chat.id}
                    variant={selectedChat?.id === chat.id ? "default" : "outline"}
                    className={`w-full justify-start flex-col items-start h-auto py-3 relative ${
                      hasUnread ? "border-green-500 bg-green-500/10" : ""
                    }`}
                    onClick={() => setSelectedChat(chat)}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <span className="text-xs bg-primary/20 px-2 py-0.5 rounded">
                        #{index + 1}
                      </span>
                      <AnimatedUsername userCode={getOtherUserCode(chat)}>
                        {getOtherUserName(chat)}
                      </AnimatedUsername>
                      <PremiumBadge userCode={getOtherUserCode(chat)} />
                      
                      {/* Unread Badge */}
                      {hasUnread && (
                        <Badge 
                          variant="destructive" 
                          className="mr-auto animate-pulse flex items-center gap-1"
                        >
                          <Bell className="w-3 h-3" />
                          {unread}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      נוצר: {formatDate(chat.created_at)}
                    </div>
                  </Button>
                );
              })
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Chat Messages */}
      <Card className="md:col-span-2 p-4 flex flex-col">
        {selectedChat ? (
          <>
            <div className="border-b pb-3 mb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-bold">
                  <AnimatedUsername userCode={getOtherUserCode(selectedChat)}>
                    {getOtherUserName(selectedChat)}
                  </AnimatedUsername>
                </h3>
                <PremiumBadge userCode={getOtherUserCode(selectedChat)} />
              </div>
              <p className="text-sm text-muted-foreground">
                הודעות שלי: {myMessageCount}/{MAX_MESSAGES_PER_SIDE}
              </p>
            </div>

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
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col gap-2">
            <MessageCircle className="w-12 h-12 opacity-50" />
            <p>בחר צ'אט כדי להתחיל</p>
          </div>
        )}
      </Card>
    </div>
  );
};
