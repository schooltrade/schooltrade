import { participantChats } from "@/lib/chatAccess";
import { filterContent } from "@/lib/security";
import { MessengerPanels } from "@/components/MessengerPanels";
import { mergeTimeline } from "@/lib/messengerState";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AnimatedUsername } from "./AnimatedUsername";
import { PremiumBadge } from "./PremiumBadge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const [showUserSelection, setShowUserSelection] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadCounts, setUnreadCounts] = useState<UnreadCount>({});
  const [lastReadTimes, setLastReadTimes] = useState<{ [chatId: string]: string }>({});
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { toast } = useToast();
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [connected, setConnected] = useState(true);
  const activeChatRef = useRef<string | null>(null);
  const messageRequestRef = useRef(0);

  const currentMonth = new Date().toISOString().slice(0, 7);

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


  useEffect(() => {
    loadChats();
  }, [userCode]);

  useEffect(() => {
    if (chats.length > 0) {
      calculateUnreadCounts(chats);
    }
  }, [chats, lastReadTimes, calculateUnreadCounts]);

  useEffect(() => {
    activeChatRef.current = selectedChat?.id || null;
    setMessages([]);
    if (selectedChat) {
      loadMessages(selectedChat.id);
      // Mark as read when selecting a chat
      saveLastReadTime(selectedChat.id);
      setUnreadCounts(prev => ({ ...prev, [selectedChat.id]: 0 }));
    }
  }, [selectedChat]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (chats.length === 0) return;

    const chatIds = chats.map(c => c.id);
    
    const channel = supabase
      .channel(`private-messages-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "private_messages",
        },
        (payload) => {
          const newMsg = payload.new as Message & { chat_id: string };
          
          if (chatIds.includes(newMsg.chat_id)) {
            setChats(prev => prev.map(chat => chat.id === newMsg.chat_id ? { ...chat, last_message_at: newMsg.created_at } : chat).sort((a, b) => (b.last_message_at || b.created_at).localeCompare(a.last_message_at || a.created_at)));
            if (activeChatRef.current === newMsg.chat_id) {
              setMessages(prev => mergeTimeline(prev, [newMsg]));
            }
          }
          // Notifications are only for incoming messages.
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
              setMessages(prev => mergeTimeline(prev, [newMsg]));
              saveLastReadTime(newMsg.chat_id);
            }
          }
        }
      )
      .subscribe(status => setConnected(status === "SUBSCRIBED"));

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chats, selectedChat, userCode, toast, saveLastReadTime, soundEnabled]);

  const loadChats = async () => {
    try {
      const { data, error } = await supabase
        .from("private_chats")
        .select("*")
        .eq("is_active", true)
        .or(`user1_code.eq.${userCode},user2_code.eq.${userCode}`)
        .order("last_message_at", { ascending: false });

      if (error) {
        console.error("Error loading chats:", error);
        toast({ title: "שגיאה בטעינת צ'אטים", variant: "destructive" });
        return;
      }

      setChats(participantChats(data || [], userCode));
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
    const requestId = ++messageRequestRef.current;
    setLoadingMessages(true);
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

      if (activeChatRef.current === chatId && requestId === messageRequestRef.current) {
        setMessages(prev => mergeTimeline(prev, data || []));
      }
    } catch (e) {
      console.error("Error in loadMessages:", e);
    } finally {
      if (requestId === messageRequestRef.current) setLoadingMessages(false);
    }
  };

  const createChatWithUser = async (targetUser: User) => {
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
    if (!selectedChat || !newMessage.trim() || sendingRef.current) return;
    const chatId = selectedChat.id;
    const draft = newMessage;
    sendingRef.current = true;
    setSending(true);
    try {
      const moderation = await filterContent(draft.trim(), "chat", userCode);
      if (!moderation.allowed || !moderation.processedContent) {
        toast({ title: moderation.message || "לא ניתן לשלוח את ההודעה כרגע", variant: "destructive" });
        return;
      }
      const { error: messageError } = await supabase
        .from("private_messages")
        .insert({
          chat_id: chatId,
          sender_code: userCode,
          sender_name: userName,
          content: moderation.processedContent,
          month_year: currentMonth,
        });

      if (messageError) {
        console.error("Error sending message:", messageError);
        toast({ title: "שגיאה בשליחת הודעה", variant: "destructive" });
        return;
      }

      await supabase
        .from("private_chats")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", chatId);

      setNewMessage(current => current === draft ? "" : current);
      if (activeChatRef.current === chatId) loadMessages(chatId);
      loadChats();
    } catch (e) {
      console.error("Error in sendMessage:", e);
      toast({ title: "שגיאה בשליחת הודעה", variant: "destructive" });
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const filteredUsers = availableUsers.filter(user => user.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return <>
    <MessengerPanels
      chats={chats} selectedChat={selectedChat} messages={messages} userCode={userCode}
      unreadCounts={unreadCounts} draft={newMessage} sending={sending} loading={loadingMessages}
      connected={connected} soundEnabled={soundEnabled} onSelect={chat => { activeChatRef.current = chat?.id || null; setSelectedChat(chat); }}
      onNew={() => { setShowUserSelection(true); loadAvailableUsers(); }}
      onDraft={setNewMessage} onSend={sendMessage} onSound={toggleSound}
    />
    <Dialog open={showUserSelection} onOpenChange={setShowUserSelection}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md" dir="rtl">
        <DialogHeader><DialogTitle className="text-right">שיחה חדשה</DialogTitle></DialogHeader>
        <Input aria-label="חיפוש משתמשים" placeholder="חיפוש לפי שם" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        <ScrollArea className="h-[300px]">
          <div className="space-y-2">
            {filteredUsers.length === 0 ? <p className="py-8 text-center text-muted-foreground">לא נמצאו משתמשים</p> : filteredUsers.map(user =>
              <Button key={user.code} variant="ghost" className="h-14 w-full justify-start" onClick={() => createChatWithUser(user)}>
                <AnimatedUsername userCode={user.code}>{user.name}</AnimatedUsername><PremiumBadge userCode={user.code} />
              </Button>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  </>;
};
