import React from 'react';
import { Metadata } from 'next';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingFooter } from '@/components/landing/LandingFooter';

export const metadata: Metadata = {
  title: 'תנאי שימוש | Quick Shop',
  description: 'תנאי השימוש בפלטפורמת קוויק שופ - הסכם מחייב בין המשתמש לבין החברה.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-900" dir="rtl">
      <LandingHeader />
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-8 text-gray-900">תנאי שימוש</h1>
        
        <div className="prose prose-emerald max-w-none text-gray-600">
          <p className="text-lg leading-relaxed mb-6">
            עודכן לאחרונה: {new Date().toLocaleDateString('he-IL')}
          </p>

          <p className="mb-6">
            ברוכים הבאים ל-Quick Shop ("האתר", "הפלטפורמה", "המערכת"). השימוש באתר ובשירותים המוצעים בו כפוף לתנאי השימוש המפורטים להלן. 
            אנא קרא תנאים אלה בעיון, שכן השימוש באתר מעיד על הסכמתך להם.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">1. הגדרות</h2>
          <p className="mb-4">
            "החברה" – מפעילת האתר והשירותים.<br />
            "משתמש" – כל אדם או תאגיד העושה שימוש באתר, לרבות בעלי חנויות ולקוחותיהם.<br />
            "חנות" – אתר מסחר אלקטרוני או קטלוג המוקם באמצעות הפלטפורמה.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">2. תנאי הסף לשימוש בשירות</h2>
          <ul className="list-disc list-inside space-y-2 mb-4 mr-4">
            <li>הנך כשיר משפטית להתקשר בהסכם זה (מעל גיל 18).</li>
            <li>הנך בעל כרטיס אשראי תקף או אמצעי תשלום אחר המקובל על החברה.</li>
            <li>הנך מצהיר כי כל הפרטים שמסרת בעת ההרשמה הם נכונים ומדויקים.</li>
            <li>השימוש בשירות ייעשה למטרות חוקיות בלבד.</li>
          </ul>

          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">3. מהות השירות</h2>
          <p className="mb-4">
            Quick Shop היא פלטפורמת SaaS (תוכנה כשירות) המאפשרת למשתמשים להקים ולנהל חנויות אינטרנטיות באופן עצמאי. 
            החברה מספקת את התשתית הטכנולוגית, האחסון והכלים לניהול, אך אינה צד לעסקאות שבין בעל החנות ללקוחותיו.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">4. תשלומים ומנויים</h2>
          <p className="mb-4">
            השירות ניתן כנגד תשלום דמי מנוי חודשיים או שנתיים, בהתאם למסלול שנבחר.
            <br />
            החברה שומרת לעצמה את הזכות לעדכן את מחירי השירות מעת לעת, תוך מסירת הודעה מוקדמת למשתמשים.
            <br />
            <strong>ביטול מנוי:</strong> ניתן לבטל את המנוי בכל עת דרך ממשק הניהול או בפנייה לשירות הלקוחות. החיוב ייפסק החל ממחזור החיוב הבא. לא יינתן החזר כספי יחסי עבור חלקי חודש שלא נוצלו.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">5. אחריות המשתמש (בעל החנות)</h2>
          <p className="mb-4">
            בעל החנות אחראי באופן בלעדי ל:
          </p>
          <ul className="list-disc list-inside space-y-2 mb-4 mr-4">
            <li>כל התכנים המועלים לחנות (טקסט, תמונות, מחירים).</li>
            <li>אספקת המוצרים ללקוחות ושירות הלקוחות מול רוכשי הקצה.</li>
            <li>עמידה בכל דין רלוונטי לגבי מכירת מוצרים (חוק הגנת הצרכן, נגישות, מיסים ועוד).</li>
            <li>הבטחה כי המוצרים הנמכרים אינם מפרים זכויות יוצרים, סימני מסחר או כל דין אחר.</li>
          </ul>

          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">6. תכנים אסורים</h2>
          <p className="mb-4">
            חל איסור מוחלט להשתמש בפלטפורמה למכירה או הצגה של: סמים בלתי חוקיים, נשק, הימורים, פורנוגרפיה, תכני שטנה, או כל מוצר/שירות שאינו חוקי במדינת ישראל. החברה שומרת לעצמה את הזכות לחסום כל חנות שתפר הוראה זו באופן מיידי וללא החזר כספי.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">7. קניין רוחני</h2>
          <p className="mb-4">
            <strong>של החברה:</strong> כל זכויות הקניין הרוחני בפלטפורמה, בקוד המקור, בעיצוב הממשק, בלוגו ובשם המסחרי שייכות לחברה בלבד.
            <br />
            <strong>של המשתמש:</strong> המשתמש שומר על זכויותיו בתכנים שהעלה לחנות שלו (תמונות מוצרים, טקסטים). המשתמש מעניק לחברה רישיון שימוש בתכנים אלו לצורך הפעלת השירות והצגתם.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">8. הגבלת אחריות</h2>
          <p className="mb-4">
            השירות ניתן כמות שהוא (AS IS). החברה לא תהיה אחראית לכל נזק, ישיר או עקיף, שייגרם למשתמש או לצד שלישי כתוצאה משימוש או חוסר יכולת להשתמש בשירות, לרבות אובדן הכנסות, אובדן נתונים או תקלות טכניות.
            החברה אינה מתחייבת שהשירות יפעל ללא הפרעות או תקלות (Downtime), אם כי אנו עושים מאמצים רבים להבטיח זמינות גבוהה (99.9%).
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">9. סמכות שיפוט</h2>
          <p className="mb-4">
            על תנאי שימוש אלו יחולו דיני מדינת ישראל בלבד. סמכות השיפוט הבלעדית בכל עניין ומחלוקת הנוגעת לשירות ולתנאים אלו מוקנית לבתי המשפט המוסמכים בעיר תל אביב-יפו.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">10. יצירת קשר</h2>
          <p className="mb-4">
            לכל שאלה או בירור בנוגע לתנאי השימוש, ניתן לפנות אלינו:
            <br />
            דוא"ל: info@quick-shop.co.il
            <br />
            וואטסאפ: דרך כפתור התמיכה באתר.
          </p>
        </div>
      </div>
      <LandingFooter />
    </div>
  );
}
