# Project rules

- Parse content-filter results through `src/lib/moderationResult.ts`; failed requests, invalid responses and backend rejections must not authorize publication. The pure decision module keeps this security boundary directly testable.
- Route all registered users to the existing PrivateChats implementation, including the legacy LimitedChatTab entry point; keep UI access/history rules in chatAccess, which is not a substitute for server authorization.
- Keep messenger presentation in MessengerPanels and backend interaction in the existing PrivateChats; merge message history and realtime events by ID through messengerState to prevent duplicate timeline entries.