# מדריך יישום i18n - QuickShop CRM

## סקירה כללית

המערכת תומכת כעת ב-i18n (בינלאומיות) באמצעות `next-intl`. המערכת תומכת כרגע בעברית (ברירת מחדל) ואנגלית, וניתן להוסיף בקלות שפות נוספות.

## ארכיטקטורה

### עקרונות ביצועים
המימוש שומר על עקרונות הביצועים של המערכת:
- **Server Components** - התרגומים נטענים בשרת
- **Cookies** - שמירת שפה ב-cookies (לא localStorage)
- **Promise.all** - טעינת תרגומים במקביל לדאטה אחר
- **initialData** - העברת תרגומים דרך props, לא fetch

### מבנה קבצים

```
quickshopcrm/
├── i18n.ts                    # תצורת next-intl
├── messages/
│   ├── he.json               # תרגומים עברית
│   └── en.json               # תרגומים אנגלית
├── middleware.ts              # Middleware לניהול שפה
└── next.config.js            # תצורת Next.js עם next-intl
```

## הוספת שפה חדשה

### שלב 1: יצירת קובץ תרגומים

צור קובץ חדש בתיקייה `messages/` עם קוד השפה:

```bash
# לדוגמה: הוספת ערבית
cp messages/en.json messages/ar.json
```

### שלב 2: עדכון i18n.ts

עדכן את `i18n.ts` להוסיף את השפה החדשה:

```typescript
// i18n.ts
import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const locale = cookieStore.get('locale')?.value || 'he'

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default
  }
})
```

### שלב 3: עדכון middleware.ts

עדכן את `middleware.ts` להוסיף את השפה החדשה:

```typescript
// middleware.ts
const intlMiddleware = createMiddleware({
  locales: ['he', 'en', 'ar'], // הוסף את השפה החדשה
  defaultLocale: 'he',
  localePrefix: 'never'
})
```

### שלב 4: תרגום התוכן

ערוך את קובץ התרגומים החדש (`messages/ar.json`) ותרגם את כל המפתחות:

```json
{
  "common": {
    "save": "حفظ",
    "cancel": "إلغاء",
    ...
  },
  "sidebar": {
    "home": "الرئيسية",
    ...
  }
}
```

**חשוב**: ודא שכל המפתחות קיימים בכל השפות!

## שימוש ב-i18n בקוד

### Server Components

```typescript
import { getTranslations } from 'next-intl/server'

export default async function MyPage() {
  const t = await getTranslations()
  
  return <h1>{t('common.save')}</h1>
}
```

### Client Components

```typescript
'use client'
import { useTranslations } from 'next-intl'

export function MyComponent() {
  const t = useTranslations()
  
  return <button>{t('common.save')}</button>
}
```

### תרגומים עם פרמטרים

```typescript
// messages/he.json
{
  "shop": {
    "welcome": "ברוכים הבאים ל-{name}"
  }
}

// בקוד
t('shop.welcome', { name: 'Quick Shop' })
```

## מבנה קבצי התרגומים

הקבצים מאורגנים לפי קטגוריות:

```json
{
  "common": {
    // פעולות נפוצות: שמור, ביטול, מחק וכו'
  },
  "sidebar": {
    // תפריט צד
  },
  "header": {
    // כותרת עליונה
  },
  "product": {
    // מוצרים
  },
  "shop": {
    // חנות
  }
}
```

## שמירת שפה

השפה נשמרת ב-cookie בשם `locale`:

```typescript
// הגדרת שפה
document.cookie = `locale=en; path=/; max-age=31536000`

// קריאת שפה (בשרת)
const cookieStore = await cookies()
const locale = cookieStore.get('locale')?.value || 'he'
```

## הוספת בחירת שפה ב-UI

כדי להוסיף בחירת שפה ב-UI, צור קומפוננטה:

```typescript
'use client'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'

export function LanguageSwitcher() {
  const router = useRouter()
  
  const changeLanguage = (locale: string) => {
    document.cookie = `locale=${locale}; path=/; max-age=31536000`
    router.refresh()
  }
  
  return (
    <select onChange={(e) => changeLanguage(e.target.value)}>
      <option value="he">עברית</option>
      <option value="en">English</option>
    </select>
  )
}
```

## בדיקת תרגומים חסרים

לפני הוספת שפה חדשה, ודא שכל המפתחות קיימים:

```bash
# השוואה בין קבצים
diff <(jq -S 'keys' messages/he.json) <(jq -S 'keys' messages/en.json)
```

## כללים חשובים

1. **תמיד השתמש ב-i18n** - אל תכתוב טקסט קשיח בעברית או אנגלית
2. **שמור על מבנה אחיד** - השתמש באותם מפתחות בכל השפות
3. **תרגום מלא** - ודא שכל הטקסטים מתורגמים
4. **בדיקה** - בדוק את כל העמודים לאחר הוספת שפה חדשה

## דוגמאות

### תרגום פשוט:
```typescript
t('common.save') // "שמור" או "Save"
```

### תרגום עם פרמטרים:
```typescript
t('sidebar.trial.daysRemaining', { count: 5 })
// "נותרו לך 5 ימי נסיון" או "5 trial days remaining"
```

### תרגום בשרת:
```typescript
const t = await getTranslations()
const title = t('shop.notFound')
```

## פתרון בעיות

### התרגום לא מופיע
1. ודא שהמפתח קיים בקובץ התרגומים
2. ודא שהשפה נטענת נכון (בדוק cookies)
3. בדוק את הקונסול לשגיאות

### שגיאת build
1. ודא שכל המפתחות קיימים בכל השפות
2. ודא שהקובץ JSON תקין (בדוק syntax)
3. בדוק את `i18n.ts` ו-`middleware.ts`

## סיכום

המערכת תומכת כעת ב-i18n מלא. כדי להוסיף שפה חדשה:
1. צור קובץ `messages/[locale].json`
2. עדכן את `middleware.ts` להוסיף את השפה
3. תרגם את כל התוכן
4. בדוק שהכל עובד

**תאריך עדכון**: 2025-01-XX
**גרסה**: 1.0

