import { supabase } from "@/integrations/supabase/client";
import { resolveModerationResult } from "./moderationResult";

// Input sanitization
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>{}[\]]/g, '') // Remove dangerous characters
    .normalize('NFC') // Normalize Unicode
    .substring(0, 10000); // Max length
}

// HTML escaping to prevent XSS
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

// Content filtering via edge function
export async function filterContent(
  content: string,
  contentType: 'post' | 'comment' | 'chat' | 'name',
  userCode: string
): Promise<{ allowed: boolean; processedContent?: string; message?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('content-filter', {
      body: { content, contentType, userCode }
    });

    return await resolveModerationResult(data, error);
  } catch {
    return resolveModerationResult(null, new Error("moderation unavailable"));
  }
}

// Rate limiting check
export async function checkRateLimit(
  identifier: string,
  actionType: string,
  maxRequests: number = 60,
  windowMinutes: number = 1
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      _identifier: identifier,
      _action_type: actionType,
      _max_requests: maxRequests,
      _window_minutes: windowMinutes
    });

    if (error) {
      console.error('Rate limit check error:', error);
      return true; // Allow on error
    }

    return data === true;
  } catch (error) {
    console.error('Rate limit exception:', error);
    return true; // Allow on error
  }
}

// Security event logging
export async function logSecurityEvent(
  eventType: string,
  severity: 'info' | 'warning' | 'critical',
  userCode?: string,
  details?: Record<string, any>
): Promise<void> {
  try {
    await supabase.from('security_logs').insert({
      event_type: eventType,
      severity,
      user_code: userCode,
      ip_address: 'client', // Client-side can't get real IP
      user_agent: navigator.userAgent,
      details
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

// Check if user has specific role
export async function hasRole(userCode: string, role: 'admin' | 'moderator' | 'user'): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('has_role', {
      _user_code: userCode,
      _role: role
    });

    if (error) {
      console.error('Role check error:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Role check exception:', error);
    return false;
  }
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate code format (9 digits)
export function isValidCode(code: string): boolean {
  return /^\d{9}$/.test(code);
}

// Strong password validation
export function isStrongPassword(password: string): {
  valid: boolean;
  message?: string;
} {
  if (password.length < 8) {
    return { valid: false, message: 'הסיסמה חייבת להכיל לפחות 8 תווים' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'הסיסמה חייבת להכיל אות גדולה' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'הסיסמה חייבת להכיל אות קטנה' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'הסיסמה חייבת להכיל מספר' };
  }
  return { valid: true };
}