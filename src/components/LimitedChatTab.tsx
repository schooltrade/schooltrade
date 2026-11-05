import { PrivateChats } from "./PrivateChats";

interface LimitedChatTabProps {
  userCode: string;
  userName: string;
}

export const LimitedChatTab = (props: LimitedChatTabProps) => <PrivateChats {...props} />;
