# 🧪 מדריך בדיקת Cron Jobs

## 📋 דרכים לבדוק שה-Cron Jobs עובדים

---

## 1️⃣ בדיקה ב-Vercel Dashboard (הכי קל!)

### שלב 1: לך ל-Vercel Dashboard
1. לך ל-https://vercel.com/dashboard
2. בחר את הפרויקט `quickshopcrm`
3. לך ל-**Settings** → **Cron Jobs**

### שלב 2: בדוק את ה-Cron Jobs
תראה רשימה של כל ה-Cron Jobs:
- ✅ `/api/cron/automations` - כל שעה
- ✅ `/api/cron/abandoned-carts` - כל שעה

**מה לבדוק:**
- ✅ שהם מופיעים ברשימה
- ✅ שהם פעילים (Active)
- ✅ מתי הם רצו בפעם האחרונה (Last Run)
- ✅ מתי הם ירוצו בפעם הבאה (Next Run)

### שלב 3: בדוק את הלוגים
1. לך ל-**Deployments** → בחר את הדפלוי האחרון
2. לחץ על **Functions**
3. חפש את ה-endpoints:
   - `/api/cron/automations`
   - `/api/cron/abandoned-carts`
4. לחץ על כל אחד כדי לראות את הלוגים

**מה לחפש בלוגים:**
- ✅ `🤖 Starting automated automation checks...`
- ✅ `🛒 Starting abandoned cart check...`
- ✅ `✅ Automation check completed`
- ✅ `✅ Identified X abandoned carts`

---

## 2️⃣ בדיקה ידנית עם Script

### שימוש מקומי (פיתוח):

```bash
# הפעל את השרת מקומית
npm run dev

# בחר טרמינל אחר והרץ:
npm run cron:test
```

### שימוש על הפרודקשן:

```bash
# הגדר את ה-URL של הפרודקשן
export APP_URL="https://quickshopcrm.vercel.app"
export CRON_SECRET="0AoQOiavZn45hgUcfdA7GirQdPxDhs7s3MAK7r6w/pI="

# הרץ את הבדיקה
npm run cron:test
```

**תוצאה צפויה:**
```
🧪 בודק Cron Jobs...
📍 URL: https://quickshopcrm.vercel.app

🔍 בודק Automations Cron...
   Path: /api/cron/automations
   ✅ הצליח!
   📊 תגובה: {
     "success": true,
     "timestamp": "2024-12-03T...",
     "automationsChecked": 0,
     "actionsPerformed": []
   }

🔍 בודק Abandoned Carts Cron...
   Path: /api/cron/abandoned-carts
   ✅ הצליח!
   📊 תגובה: {
     "success": true,
     "timestamp": "2024-12-03T...",
     "abandonedCartsIdentified": 0
   }

==================================================
📊 סיכום בדיקות:
==================================================
Automations:        ✅ עובד
Abandoned Carts:    ✅ עובד
==================================================

🎉 כל ה-Cron Jobs עובדים מצוין!
```

---

## 3️⃣ בדיקה ידנית עם curl

### בדיקת Automations:

```bash
curl -X GET "https://quickshopcrm.vercel.app/api/cron/automations" \
  -H "Authorization: Bearer 0AoQOiavZn45hgUcfdA7GirQdPxDhs7s3MAK7r6w/pI="
```

### בדיקת Abandoned Carts:

```bash
curl -X GET "https://quickshopcrm.vercel.app/api/cron/abandoned-carts" \
  -H "Authorization: Bearer 0AoQOiavZn45hgUcfdA7GirQdPxDhs7s3MAK7r6w/pI="
```

**תוצאה צפויה:**
```json
{
  "success": true,
  "timestamp": "2024-12-03T12:00:00.000Z",
  "automationsChecked": 0,
  "actionsPerformed": []
}
```

---

## 4️⃣ בדיקה דרך הדפדפן (רק לפיתוח!)

**⚠️ זה יעבוד רק בסביבת פיתוח!**

בסביבת פיתוח, אם אין `CRON_SECRET`, ה-endpoints יאפשרו גישה בלי authentication.

```bash
# הפעל את השרת
npm run dev

# פתח בדפדפן:
http://localhost:3000/api/cron/automations
http://localhost:3000/api/cron/abandoned-carts
```

**⚠️ בפרודקשן זה לא יעבוד** - תקבל `401 Unauthorized` בלי ה-secret.

---

## 5️⃣ בדיקת לוגים ב-Vercel

### דרך 1: דרך Functions Logs

1. Vercel Dashboard → הפרויקט שלך
2. **Deployments** → בחר דפלוי
3. **Functions** → חפש את ה-endpoint
4. לחץ עליו כדי לראות לוגים

### דרך 2: דרך Real-time Logs

1. Vercel Dashboard → הפרויקט שלך
2. **Deployments** → בחר דפלוי
3. לחץ על **View Function Logs**
4. תקבל לוגים בזמן אמת

**מה לחפש:**
- ✅ `🤖 Starting automated automation checks...`
- ✅ `🛒 Starting abandoned cart check...`
- ✅ `✅ Automation check completed`
- ✅ `✅ Identified X abandoned carts`
- ❌ שגיאות (אם יש)

---

## 6️⃣ בדיקת Cron Jobs History

### ב-Vercel Dashboard:

1. **Settings** → **Cron Jobs**
2. לחץ על אחד מה-Cron Jobs
3. תראה:
   - **History** - מתי הם רצו
   - **Status** - האם הצליחו או נכשלו
   - **Duration** - כמה זמן לקח
   - **Logs** - לוגים מפורטים

---

## 🐛 פתרון בעיות

### בעיה: Cron Job לא רץ

**פתרונות:**
1. ✅ ודא שה-`vercel.json` נדחף ל-Git
2. ✅ ודא שה-build ב-Vercel הצליח
3. ✅ בדוק שה-Cron Jobs מופיעים ב-Settings → Cron Jobs
4. ✅ בדוק שה-`CRON_SECRET` מוגדר ב-Vercel

### בעיה: מקבל 401 Unauthorized

**פתרונות:**
1. ✅ ודא שה-`CRON_SECRET` מוגדר ב-Vercel
2. ✅ ודא שאתה משתמש ב-secret הנכון
3. ✅ בדוק שה-header נשלח נכון: `Authorization: Bearer ${CRON_SECRET}`

### בעיה: Cron Job רץ אבל לא עושה כלום

**פתרונות:**
1. ✅ בדוק את הלוגים ב-Vercel
2. ✅ ודא שה-DB מחובר נכון
3. ✅ בדוק שה-endpoints מחזירים `success: true`
4. ✅ בדוק שה-logs מראים שהלוגיקה רצה

---

## 📊 בדיקה אוטומטית

### אפשר להוסיף בדיקה אוטומטית ב-GitHub Actions:

```yaml
# .github/workflows/test-cron.yml
name: Test Cron Jobs

on:
  schedule:
    - cron: '0 * * * *'  # כל שעה
  workflow_dispatch:

jobs:
  test-cron:
    runs-on: ubuntu-latest
    steps:
      - name: Test Automations Cron
        run: |
          curl -X GET ${{ secrets.APP_URL }}/api/cron/automations \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
      
      - name: Test Abandoned Carts Cron
        run: |
          curl -X GET ${{ secrets.APP_URL }}/api/cron/abandoned-carts \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

---

## ✅ Checklist לבדיקה

- [ ] Cron Jobs מופיעים ב-Vercel Dashboard → Settings → Cron Jobs
- [ ] Cron Jobs פעילים (Active)
- [ ] יש Last Run ו-Next Run
- [ ] הלוגים מראים שהלוגיקה רצה
- [ ] בדיקה ידנית עם `npm run cron:test` מצליחה
- [ ] בדיקה עם curl מצליחה
- [ ] אין שגיאות בלוגים

---

## 🎯 סיכום

**הדרך הכי קלה לבדוק:**
1. לך ל-Vercel Dashboard → Settings → Cron Jobs
2. בדוק שהם מופיעים ופעילים
3. בדוק את הלוגים ב-Functions

**לבדיקה מהירה:**
```bash
npm run cron:test
```

**לבדיקה מפורטת:**
- בדוק את הלוגים ב-Vercel
- בדוק את ה-History של כל Cron Job
- הרץ בדיקה ידנית עם curl

