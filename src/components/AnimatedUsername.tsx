import { ReactNode } from "react";

interface AnimatedUsernameProps {
  userCode: string;
  children: ReactNode;
}

const ANIMATED_CODES = ["161221063", "752025692", "426671703" , "670194978"];

export const AnimatedUsername = ({ userCode, children }: AnimatedUsernameProps) => {
  const shouldAnimate = ANIMATED_CODES.includes(userCode);

  if (!shouldAnimate) {
    return <>{children}</>;
  }

  return (
    <span className="animated-premium-username">
      {children}
    </span>
  );
};
