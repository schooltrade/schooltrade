import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Comprehensive bad word lists (Hebrew + English)
const PROFANITY_WORDS = [
  // English profanity
  'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'damn', 'crap', 'piss', 'dick', 'pussy', 'cock',
  'slut', 'whore', 'nigger', 'nigga', 'retard', 'fag', 'faggot', 'dyke', 'kike', 'spic',
  // Hebrew profanity (transliterated and Hebrew)
  'כוס', 'זין', 'שרמוטה', 'בן זונה', 'חרא', 'לעזאזל', 'זונה', 'מניאק', 'אידיוט',
  'kus', 'zayin', 'sharmuta', 'ben zona', 'hara', 'zona', 'idiot', 'maniac'
];

const HATE_SPEECH = [
  'nazi', 'hitler', 'holocaust denial', 'white supremacy', 'kkk', 'racial slur',
  'terrorist', 'jihad', 'infidel', 'rape', 'kill yourself', 'die', 'death threat',
  // Hebrew hate speech
  'נאצי', 'היטלר', 'טרוריסט', 'תמות', 'אתאבד', 'אלים', 'גזען'
];

const SEXUAL_CONTENT = [
  'porn', 'xxx', 'sex', 'nude', 'naked', 'nsfw', 'hentai', 'erotic', 'orgy',
  'masturbat', 'orgasm', 'penis', 'vagina', 'breast', 'nipple',
  // Hebrew sexual content
  'פורנו', 'מין', 'עירום', 'מאונן', 'אורגזמה'
];

const SPAM_KEYWORDS = [
  'click here', 'buy now', 'limited time', 'act now', 'free money', 'get rich',
  'viagra', 'cialis', 'casino', 'lottery', 'prize', 'winner', 'congratulations',
  'crypto scam', 'investment opportunity', 'work from home',
  // Hebrew spam
  'לחץ כאן', 'קנה עכשיו', 'כסף חינם', 'מבצע', 'פרס', 'זכייה'
];

// Normalize text to catch obfuscated variants
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[áàäâ]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/[^\p{L}\p{N}\s]/gu, '')// Remove special chars
    .replace(/(.)\1{2,}/g, '$1$1') // Reduce repeated chars (aaaa -> aa)
    .trim();
}

// Fuzzy matching for variations
function containsBadWord(text: string, wordList: string[]): { found: boolean; matches: string[] } {
  const normalized = normalizeText(text);
  const matches: string[] = [];

  for (const badWord of wordList) {
    const normalizedBadWord = normalizeText(badWord);
    
    // Direct match
    if (normalized.includes(normalizedBadWord)) {
      matches.push(badWord);
      continue;
    }

    // Check with spaces (e.g., "b a d w o r d")
    const spacedWord = normalizedBadWord.split('').join(' ');
    if (normalized.includes(spacedWord)) {
      matches.push(badWord);
      continue;
    }

    // Check with variations (a->@, e->3, i->1, o->0, s->$)
    const leetSpeak = normalizedBadWord
      .replace(/a/g, '[a@4]')
      .replace(/e/g, '[e3]')
      .replace(/i/g, '[i1!]')
      .replace(/o/g, '[o0]')
      .replace(/s/g, '[s$5]');
    
    const leetRegex = new RegExp(leetSpeak, 'i');
    if (leetRegex.test(normalized)) {
      matches.push(badWord);
    }
  }

  return { found: matches.length > 0, matches };
}

// Calculate severity
function calculateSeverity(text: string): { severity: 'low' | 'medium' | 'high' | 'critical'; reasons: string[] } {
  const reasons: string[] = [];
  let severityLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

  const profanityCheck = containsBadWord(text, PROFANITY_WORDS);
  const hateCheck = containsBadWord(text, HATE_SPEECH);
  const sexualCheck = containsBadWord(text, SEXUAL_CONTENT);
  const spamCheck = containsBadWord(text, SPAM_KEYWORDS);

  if (spamCheck.found) {
    reasons.push(`Spam detected: ${spamCheck.matches.join(', ')}`);
    severityLevel = 'low';
  }

  if (profanityCheck.found) {
    reasons.push(`Profanity detected: ${profanityCheck.matches.join(', ')}`);
    severityLevel = 'medium';
  }

  if (sexualCheck.found) {
    reasons.push(`Sexual content detected: ${sexualCheck.matches.join(', ')}`);
    severityLevel = 'high';
  }

  if (hateCheck.found) {
    reasons.push(`Hate speech/threats detected: ${hateCheck.matches.join(', ')}`);
    severityLevel = 'critical';
  }

  return { severity: severityLevel, reasons };
}

// Censor mild profanity
function censorText(text: string): string {
  let censored = text;
  
  for (const badWord of PROFANITY_WORDS) {
    const regex = new RegExp(`\\b${badWord}\\b`, 'gi');
    censored = censored.replace(regex, '*'.repeat(badWord.length));
  }

  return censored;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, contentType, userCode } = await req.json();

    if (!content || !contentType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Content Filter] Checking ${contentType} from user ${userCode}`);

    const { severity, reasons } = calculateSeverity(content);

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Determine action based on severity
    let action: 'allow' | 'censor' | 'block' = 'allow';
    let processedContent = content;

    if (severity === 'critical' || severity === 'high') {
      action = 'block';
      
      // Log violation
      await supabase.from('content_violations').insert({
        user_code: userCode,
        content_type: contentType,
        original_content: content,
        violation_reason: reasons.join('; '),
        severity,
        ip_address: req.headers.get('x-forwarded-for') || 'unknown'
      });

      // Log security event
      await supabase.from('security_logs').insert({
        event_type: 'content_violation',
        severity: 'critical',
        user_code: userCode,
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown',
        details: {
          content_type: contentType,
          violation_severity: severity,
          reasons
        }
      });

      console.log(`[Content Filter] BLOCKED - Severity: ${severity}, User: ${userCode}`);

      return new Response(
        JSON.stringify({
          allowed: false,
          action: 'block',
          severity,
          reasons,
          message: severity === 'critical' 
            ? 'תוכן זה מפר את מדיניות האתר ונחסם אוטומטית. התנהגות חוזרת תוביל לחסימת חשבון.'
            : 'תוכן זה מכיל חומר לא הולם ולא ניתן לפרסמו.'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (severity === 'medium') {
      action = 'censor';
      processedContent = censorText(content);
      
      console.log(`[Content Filter] CENSORED - Severity: ${severity}, User: ${userCode}`);

      return new Response(
        JSON.stringify({
          allowed: true,
          action: 'censor',
          severity,
          reasons,
          originalContent: content,
          processedContent,
          message: 'התוכן עבר צנזורה אוטומטית'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (severity === 'low' && reasons.length > 0) {
      // Spam - block
      action = 'block';

      await supabase.from('content_violations').insert({
        user_code: userCode,
        content_type: contentType,
        original_content: content,
        violation_reason: reasons.join('; '),
        severity,
        ip_address: req.headers.get('x-forwarded-for') || 'unknown'
      });

      console.log(`[Content Filter] BLOCKED (Spam) - User: ${userCode}`);

      return new Response(
        JSON.stringify({
          allowed: false,
          action: 'block',
          severity,
          reasons,
          message: 'תוכן זה זוהה כספאם ונחסם'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Content is clean
    console.log(`[Content Filter] ALLOWED - User: ${userCode}`);

    return new Response(
      JSON.stringify({
        allowed: true,
        action: 'allow',
        severity: 'low',
        processedContent: content
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[Content Filter] Error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
