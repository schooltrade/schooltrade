import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface BlockedUserMessageProps {
  userName: string;
}

const BlockedUserMessage = ({ userName }: BlockedUserMessageProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-destructive/5 via-background to-destructive/5 flex items-center justify-center p-4">
      <div className="max-w-3xl w-full">
        <Alert variant="destructive" className="shadow-2xl border-2">
          <AlertCircle className="h-6 w-6" />
          <AlertTitle className="text-2xl font-bold mb-4 text-right">
            חשבונך נחסם באופן זמני
          </AlertTitle>
          <AlertDescription className="space-y-4 text-right leading-relaxed text-base">
            <p className="font-semibold text-lg">
              {userName ? `${userName} היקר/ה,` : "משתמש/ת יקר/ה,"}
            </p>
            
            <p>
              אנו מצטערים להודיע לך כי חשבונך באתר Schooltrade נחסם באופן זמני. החסימה נכנסה לתוקף לאחר שזוהו פעולות שאינן עומדות בתנאי השימוש של הפלטפורמה שלנו.
            </p>

            <div className="bg-background/50 p-4 rounded-lg border border-destructive/20">
              <p className="font-semibold mb-2 text-destructive">סיבות החסימה:</p>
              <ul className="list-disc list-inside space-y-2 mr-4">
                <li>
                  <strong>אי מתן שם מלא:</strong> במהלך תהליך ההרשמה, לא סיפקת את שמך המלא (שם פרטי ושם משפחה) כנדרש. פרט זה חיוני לצורך אימות זהות ושמירה על סביבה בטוחה ואמינה עבור כלל המשתמשים.
                </li>
                <li>
                  <strong>התחזות למנהל והטעיית משתמשים:</strong> זוהה כי ניסית להתחזות למנהל האתר ולהטעות משתמשים אחרים. התנהגות זו מהווה הפרה חמורה של כללי הקהילה ופוגעת באמון ובביטחון של כלל המשתמשים באתר.
                </li>
              </ul>
            </div>

            <p className="font-semibold text-lg text-destructive">
              משך החסימה: שבוע אחד (7 ימים)
            </p>

            <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/30">
              <p className="font-semibold mb-2">⚠️ אזהרה חשובה:</p>
              <ul className="space-y-2">
                <li>
                  • אם תנסה/י להתחבר או להירשם שוב עם אותו חשבון במהלך תקופת החסימה, הודעה זו תופיע שוב, ותקופת החסימה תוארך באופן אוטומטי לשבועיים מלאים (14 ימים).
                </li>
                <li>
                  • במידה ותנסה/י להירשם שוב מאותו המכשיר שנחסם, האתר יזהה את המכשיר וימנע רישום חדש, כאילו מדובר באותו החשבון הישן.
                </li>
                <li>
                  • לא תוכל/י לגשת לפלטפורמה או לבצע כל פעולה עד לפתרון הבעיה.
                </li>
              </ul>
            </div>

            <div className="bg-primary/10 p-4 rounded-lg border border-primary/30">
              <p className="font-semibold mb-2">📞 יצירת קשר לפתרון החסימה:</p>
              <p>
                על מנת לפתור את החסימה ולחזור לפעילות תקינה באתר, נדרש ממך ליצור קשר עם בעל האתר. אנא פנה/י באמצעות:
              </p>
              <p className="text-xl font-bold text-primary mt-2 text-center" dir="ltr">
                +972 50 290 2283
              </p>
              <p className="mt-2 text-sm">
                נציג האתר ישמח לסייע לך ולבדוק את האפשרות להסרת החסימה, בכפוף לתיקון הפרטים הנדרשים ולקבלת הבטחה שההתנהגות המפרה לא תחזור על עצמה.
              </p>
            </div>

            <p className="text-sm text-muted-foreground mt-6">
              אנו מעריכים את הבנתך ושיתוף הפעולה שלך. קהילת Schooltrade בנויה על אמון, כבוד הדדי ושקיפות. אנו פועלים למען שמירה על סביבה בטוחה ונעימה לכלל המשתמשים. תודה על סבלנותך.
            </p>

            <p className="text-center font-semibold text-lg mt-4">
              בברכה,<br />
              צוות Schooltrade
            </p>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
};

export default BlockedUserMessage;
