import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Check, Loader2, MessageCircle, PenSquare, Search, Volume2, VolumeX, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LinkifiedText } from '@/components/LinkifiedText';
import { matchesMessage } from '@/lib/messengerState';

export interface MessengerChat {
  id: string; user1_code: string; user2_code: string; user1_name: string; user2_name: string;
  last_message_at: string; created_at: string;
}
export interface MessengerMessage {
  id: string; sender_code: string; sender_name: string; content: string; created_at: string;
}
interface Props {
  chats: MessengerChat[]; selectedChat: MessengerChat | null; messages: MessengerMessage[];
  userCode: string; unreadCounts: Record<string, number>; draft: string; sending: boolean;
  loading: boolean; connected: boolean; soundEnabled: boolean;
  onSelect: (chat: MessengerChat | null) => void; onNew: () => void;
  onDraft: (draft: string) => void; onSend: () => void; onSound: () => void;
}
const dateLabel = (date: string) => new Date(date).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
const timeLabel = (date: string) => new Date(date).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

export function MessengerPanels(props: Props) {
  const [search, setSearch] = useState('');
  const [messageSearch, setMessageSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 767px)').matches);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)');
    const update = () => setMobile(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  const otherName = (chat: MessengerChat) => chat.user1_code === props.userCode ? chat.user2_name : chat.user1_name;
  const chats = props.chats.filter(chat => matchesMessage(otherName(chat), search));
  const messages = props.messages.filter(message => matchesMessage(message.content, messageSearch));
  const totalUnread = Object.values(props.unreadCounts).reduce((sum, count) => sum + count, 0);
  const select = (chat: MessengerChat | null) => { setMessageSearch(''); setSearchOpen(false); props.onSelect(chat); };
  return (
    <section aria-label="צ׳אטים" className="grid h-[min(760px,calc(100dvh-180px))] min-h-[480px] w-full min-w-0 overflow-hidden border-y border-border bg-card md:grid-cols-[310px_minmax(0,1fr)] lg:grid-cols-[350px_minmax(0,1fr)]" dir="ltr">
      <aside dir="rtl" className={`min-h-0 min-w-0 flex-col border-border md:flex md:border-r ${props.selectedChat ? 'hidden' : 'flex'}`}>
        <header className="flex h-20 shrink-0 items-center justify-between gap-2 px-5">
          <div className="flex min-w-0 items-center gap-2"><h2 className="text-xl font-semibold motion-reduce:animate-none">הודעות</h2>{totalUnread > 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{totalUnread}</span>}</div>
          <div className="flex shrink-0 gap-1">
            <Button size="icon" variant="ghost" aria-label={props.soundEnabled ? 'כבה צלילים' : 'הפעל צלילים'} title={props.soundEnabled ? 'כבה צלילים' : 'הפעל צלילים'} onClick={props.onSound}>{props.soundEnabled ? <Volume2 /> : <VolumeX />}</Button>
            <Button size="icon" variant="secondary" aria-label="שיחה חדשה" title="שיחה חדשה" onClick={props.onNew}><PenSquare /></Button>
          </div>
        </header>
        <div className="relative mx-4 mb-4"><Search className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="חיפוש שיחות" placeholder="חיפוש שיחות" className="bg-background pr-10" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {chats.length === 0 && <div className="flex flex-col items-center gap-3 px-5 py-16 text-muted-foreground"><MessageCircle className="h-10 w-10" /><p>{search ? 'לא נמצאו שיחות' : 'אין שיחות עדיין'}</p>{!search && <Button variant="outline" onClick={props.onNew}>שיחה חדשה</Button>}</div>}
          {chats.map(chat => <Button key={chat.id} variant="ghost" onClick={() => select(chat)} aria-label={`פתח שיחה עם ${otherName(chat)}`} aria-pressed={props.selectedChat?.id === chat.id} className={`h-24 w-full justify-start gap-3 rounded-none border-b border-border/50 px-4 text-right hover:bg-secondary ${props.selectedChat?.id === chat.id ? 'bg-secondary' : ''}`}>
            <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-lg font-semibold text-primary">{otherName(chat).slice(0, 1)}</span>
            <span className="flex min-w-0 flex-1 flex-col gap-1"><span className="truncate font-semibold">{otherName(chat)}</span><span className="text-xs font-normal text-muted-foreground">{dateLabel(chat.last_message_at || chat.created_at)}</span></span>
            {(props.unreadCounts[chat.id] || 0) > 0 && <span className="rounded-full bg-primary px-2 py-1 text-xs text-primary-foreground">{props.unreadCounts[chat.id]}</span>}
          </Button>)}
        </div>
      </aside>
      {mobile && props.selectedChat ? createPortal(renderConversation(), document.body) : renderConversation()}
    </section>
  );

  function renderConversation() {
    return <div dir="rtl" className={`min-h-0 min-w-0 flex-col bg-background md:relative md:flex ${props.selectedChat ? 'fixed inset-0 z-50 flex h-[100dvh] md:z-auto md:h-auto' : 'hidden'}`}>
        {props.selectedChat ? <>
          <header className="flex min-h-20 shrink-0 items-center gap-3 border-b border-border bg-card px-4">
            <Button size="icon" variant="ghost" className="md:hidden" aria-label="חזרה לשיחות" onClick={() => select(null)}><ArrowRight /></Button>
            <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-lg font-semibold text-primary">{otherName(props.selectedChat).slice(0, 1)}</span>
            <h3 className="min-w-0 flex-1 truncate font-semibold motion-reduce:animate-none">{otherName(props.selectedChat)}</h3>
            <Button size="icon" variant="ghost" aria-label={searchOpen ? 'סגור חיפוש הודעות' : 'חיפוש בהודעות'} title="חיפוש בהודעות" onClick={() => { setSearchOpen(!searchOpen); setMessageSearch(''); }}>{searchOpen ? <X /> : <Search />}</Button>
          </header>
          {!props.connected && <p role="status" className="border-b border-border bg-muted px-4 py-2 text-center text-xs text-muted-foreground">העדכון החי מתחבר מחדש…</p>}
          {searchOpen && <div className="border-b border-border bg-card p-3"><Input autoFocus aria-label="חיפוש בהודעות" placeholder="חיפוש בהודעות" value={messageSearch} onChange={e => setMessageSearch(e.target.value)} /></div>}
          <div role="log" aria-label="הודעות בשיחה" aria-live="polite" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 md:px-8">
            {props.loading ? <div role="status" className="flex justify-center gap-2 py-8 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />טוען הודעות…</div> : <>
              {messages.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">{messageSearch ? 'לא נמצאו הודעות' : 'אין הודעות עדיין'}</p>}
              {messages.map((message, index) => {
                const mine = message.sender_code === props.userCode;
                const previous = messages[index - 1];
                return <div key={message.id}>
                  {(!previous || dateLabel(previous.created_at) !== dateLabel(message.created_at)) && <div className="my-5 text-center"><span className="rounded-md bg-muted px-3 py-1 text-xs text-muted-foreground">{dateLabel(message.created_at)}</span></div>}
                  <article className={`mb-3 w-fit max-w-[88%] rounded-lg px-4 py-3 md:max-w-[75%] ${mine ? 'mr-auto bg-primary/20 text-foreground' : 'ml-auto border border-border bg-card text-card-foreground'}`}>
                    <p className="whitespace-pre-wrap break-words text-sm leading-7 [overflow-wrap:anywhere]"><LinkifiedText text={message.content} /></p>
                    <div className="mt-1 flex items-center justify-end gap-1.5 text-[11px] text-muted-foreground"><time dateTime={message.created_at}>{timeLabel(message.created_at)}</time>{mine && <span className="flex items-center gap-1" title="ההודעה נשמרה; לא מעיד על קריאה"><Check className="h-3 w-3" />נשלח</span>}</div>
                  </article>
                </div>;
              })}
              <div ref={node => { if (node && !messageSearch) node.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }} />
            </>}
          </div>
          <form className="flex shrink-0 items-end gap-3 border-t border-border bg-card p-3 pb-[max(12px,env(safe-area-inset-bottom))] md:p-4" onSubmit={e => { e.preventDefault(); props.onSend(); }}>
            <Textarea aria-label="הודעה" placeholder="כתיבת הודעה…" rows={2} className="max-h-36 min-h-12 resize-none bg-background" value={props.draft} onChange={e => props.onDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia('(min-width: 768px)').matches) { e.preventDefault(); props.onSend(); } }} />
            <Button type="submit" size="icon" className="shrink-0" aria-label="שלח הודעה" title="שלח הודעה" disabled={props.sending || !props.draft.trim()}>{props.sending ? <Loader2 className="animate-spin" /> : <Send />}</Button>
          </form>
        </> : <div className="flex flex-1 flex-col items-center justify-center gap-4 text-muted-foreground"><MessageCircle className="h-16 w-16 text-primary/60" /><h3 className="text-xl text-foreground">השיחות שלך</h3><p className="text-sm">בחרו שיחה</p></div>}
      </div>;
  }
}