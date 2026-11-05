export interface MessagingAccount {
  code: string;
  isPremium?: boolean;
}

export function canUseMessaging(account: MessagingAccount | null): boolean {
  return Boolean(account?.code.trim());
}

export function participantChats<T extends { user1_code: string; user2_code: string }>(
  chats: T[],
  userCode: string,
): T[] {
  return chats.filter(chat => chat.user1_code === userCode || chat.user2_code === userCode);
}