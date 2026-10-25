// Premium/Club member constants and helpers
export const PREMIUM_USERS = ["161221063", "752025692", "426671703"];

export const isPremiumUser = (userCode: string): boolean => 
  PREMIUM_USERS.includes(userCode);

export const PREMIUM_MULTIPLIER = 2;

export const applyPremiumMultiplier = (points: number, userCode: string): number => {
  return isPremiumUser(userCode) ? points * PREMIUM_MULTIPLIER : points;
};
