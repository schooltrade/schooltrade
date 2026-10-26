import { Badge } from "@/components/ui/badge";

interface PremiumBadgeProps {
  userCode: string;
}

const PREMIUM_BADGE_CODES = ["161221063", "752025692"];

export const PremiumBadge = ({ userCode }: PremiumBadgeProps) => {
  const showBadge = PREMIUM_BADGE_CODES.includes(userCode);

  if (!showBadge) return null;

  return (
    <Badge 
      className="mr-1.5 bg-[#00C853] text-white border-none text-[10px] px-2 py-0.5 font-bold shadow-md"
      style={{ backgroundColor: '#00C853' }}
    >
      חבר מועדון
    </Badge>
  );
};
