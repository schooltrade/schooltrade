# Messenger and Crypto update: partial delivery

## Implemented
- Extended the existing PrivateChats entry point, not a parallel messenger.
- Desktop left-hand conversation sidebar and right-hand conversation area; mobile list-first view and full-screen chat with back navigation.
- Conversation-name search, message search over loaded history, timestamps, unread badges, initials avatars, multiline composer and send/loading states.
- Kept existing message persistence and moderation path. Timeline merging deduplicates history/realtime events by ID and orders messages chronologically; late history responses cannot replace another selected conversation.
- Mobile conversation renders outside transformed app ancestors to maintain viewport coverage.

## Modified components
- `src/components/PrivateChats.tsx`: existing Cloud reads/writes remain; new presentation and safer timeline merging.
- `src/components/MessengerPanels.tsx`: messenger presentation and mobile navigation.
- `src/lib/messengerState.ts` and its tests: pure ordering/deduplication.
- `AGENTS.md` and `roadmap.md`: structure and delivery status.

## Verified
- 11 passing tests: moderation decisions, free messaging access/history and timeline deduplication/order.
- Browser fixture checks at 1280×1800 and 390×844: conversation selection, message search, multiline input, mobile back navigation, no horizontal overflow or runtime exceptions.
- Public entry loads. Latest preview build reports OK.
- Fixture UI checks are not authenticated end-to-end messaging tests and do not prove server authorization or live delivery.

## Database and security findings
- Read-only live checks found 61 existing application accounts and zero Auth accounts. No schema or data changes were made.
- Existing login trusts an account code and frontend session storage; this is not an independently verified account binding.
- Live users, private chats/messages and Keif policies remain permissive. They are not secured by this presentation update.
- New private images, groups, code retrieval and cloud game progress must not use caller-supplied legacy codes as authorization.

## Not implemented
- Persistent conversation deletion/hiding, groups/admin controls, private image uploads and original sticker delivery.
- Protected own-account-code tab.
- Crypto Cloud persistence, approved/idempotent legacy intake and backend-authoritative uncapped exact trades/rewards.
- New unread state persistence across devices, read receipts, online/last-seen status, reconnect catch-up and conversation discovery from another device.
- All real-user messaging/group/image/security/Crypto migration and cross-device tests requested in the brief.

## Required next decision
Describe the previously mentioned additional account-ownership verification method without sharing credentials or codes. Alternatively approve a trusted administrator-managed account recovery process. Existing codes and browser saves must remain intact; unverified legacy Crypto balances still require administrator approval. No Google/school-email requirement or duplicate registration system was introduced.