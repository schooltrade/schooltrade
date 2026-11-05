# Schooltrade major update

- [x] Audit existing identity, permissions, games, messaging, bot and moderation; confirm live core policy exposures.
- [x] Document approved implementation plan.
- [ ] Agree safe legacy-account recovery (blocked: described verification is account-code possession, not independent proof after exposure).
- [ ] Protect account/school credentials and migrate authorization without losing data (blocked: trusted delivery/approval for rotated legacy credentials).
- [ ] Move Crypto progress and validated high-precision rewards to Cloud; migrate local saves idempotently with administrator approval of legacy balances.
- [ ] Correct actual Club ×2 rewards across eligible normal games.
- [ ] Remove membership/message/conversation quotas from chats and bot while retaining abuse protection (in progress: shared chat entry and free navigation; server identity still depends on secure account migration).
- [ ] Redesign existing chats; add private photos and group conversations.
- [ ] Implement real voice calling and identify required TURN configuration.
- [x] Fix content-filter response handling so backend blocks, network errors and malformed results do not authorize publication; six regression tests.
- [ ] Repair multilingual server-side moderation across user-generated content and enforce it on authoritative writes.
- [ ] Add private own-account-code navigation view.
- [ ] Perform ownership/security audits, end-to-end tests and final report.