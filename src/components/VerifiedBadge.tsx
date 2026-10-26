import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Check } from "lucide-react";

interface VerifiedBadgeProps {
  userCode: string;
}

// Add user codes here to grant verified status
const VERIFIED_CODES = ["426671703", "628199816", "546739002"];

export const VerifiedBadge = ({ userCode }: VerifiedBadgeProps) => {
  const isVerified = VERIFIED_CODES.includes(userCode);

  if (!isVerified) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center justify-center ml-1">
            <span className="relative inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#1DA1F2]">
              <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
            </span>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>חשבון מאומת</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
