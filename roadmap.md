# Schooltrade major update

- [x] Audit existing identity, permissions, games, messaging, bot and moderation; confirm live core policy exposures.
- [x] Document approved implementation plan.
- [ ] Agree safe legacy-account recovery (blocked: described verification is account-code possession, not independent proof after exposure).
- [ ] Protect account/school credentials and migrate authorization without losing data (blocked: trusted delivery/approval for rotated legacy credentials).
- [ ] Move Crypto progress and validated high-precision rewards to Cloud; migrate local saves idempotently with administrator approval of legacy balances.
- [ ] Correct actual Club ×2 rewards across eligible normal games.
- [x] Remove frontend Club gates and monthly chat/message quotas; share the existing chat across all entry points, retain old conversations, expose free bot navigation (nine tests passed; public preview loads without runtime errors).
- [ ] Secure messaging/bot server authorization and abuse protection; verify two-user sending (blocked: no secure legacy-account binding or managed auth users; frontend access is not server authorization).
- [ ] Redesign existing chats; add private photos and group conversations.
- [ ] Implement real voice calling and identify required TURN configuration.
- [x] Fix content-filter response handling so backend blocks, network errors and malformed results do not authorize publication; six regression tests.
- [ ] Repair multilingual server-side moderation across user-generated content and enforce it on authoritative writes.
- [ ] Add private own-account-code navigation view.
- [ ] Perform ownership/security audits, end-to-end tests and final report.

## Remaining dependencies
- Legacy account binding must use trusted recovery/delivery, not previously exposed code possession; preserve the internal-code login experience without requiring Google or school email.
- Authenticated Crypto saves/rewards, private photos/groups, authoritative moderation and code recovery depend on that binding. They are not implemented or verified.
- Reliable cross-network voice calling also needs a TURN service and two-device verification.