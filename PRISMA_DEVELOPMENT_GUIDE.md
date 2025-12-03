# 🛠️ מדריך עבודה עם Prisma בסביבת פיתוח

## 📋 תוכן עניינים
1. [הגדרת סביבת פיתוח](#הגדרת-סביבת-פיתוח)
2. [עבודה יומיומית עם Prisma](#עבודה-יומיומית-עם-prisma)
3. [יצירת שינויים ב-Schema](#יצירת-שינויים-ב-schema)
4. [Deploy לפרודקשן](#deploy-לפרודקשן)
5. [טיפים וטריקים](#טיפים-וטריקים)

---

## 🔧 הגדרת סביבת פיתוח

### 1. יצירת קובץ `.env.local` (לא נדחף ל-Git)

```bash
# קובץ .env.local - רק למקומי
DATABASE_URL="postgresql://user:password@localhost:5432/quickshop_dev"
```

**⚠️ חשוב:**
- `.env.local` לא נדחף ל-Git (כבר ב-`.gitignore`)
- השתמש ב-DB מקומי או DB נפרד לפיתוח
- **אל תשתמש ב-DB של הפרודקשן לפיתוח!**

### 2. התקנת Prisma Client

```bash
npm run db:generate
# או
npx prisma generate
```

---

## 💻 עבודה יומיומית עם Prisma

### 🚀 הפעלת שרת פיתוח

```bash
# זה כבר מריץ prisma generate אוטומטית (postinstall)
npm run dev
```

**מה קורה:**
- `postinstall` מריץ `prisma generate` אוטומטית
- Prisma Client מתעדכן עם ה-schema הנוכחי
- השרת עולה על `http://localhost:3000`

### 📝 יצירת שינויים ב-Schema

#### שלב 1: ערוך את `prisma/schema.prisma`

```prisma
model Product {
  id        String   @id @default(cuid())
  name      String
  price     Float
  // הוסף שדה חדש
  newField  String?  // ? = אופציונלי
}
```

#### שלב 2: צור Migration

```bash
# זה יוצר migration חדש ויריץ אותו על ה-DB המקומי
npm run db:migrate

# או עם שם מותאם אישית
npx prisma migrate dev --name add_new_field_to_product
```

**מה קורה:**
- Prisma יוצר קובץ migration חדש ב-`prisma/migrations/`
- מריץ את ה-migration על ה-DB המקומי
- מייצר Prisma Client מחדש

#### שלב 3: בדוק את השינויים

```bash
# פתח Prisma Studio לראות את ה-DB
npm run db:studio
```

---

## 🚢 Deploy לפרודקשן

### שלב 1: ודא שהכל עובד מקומית

```bash
# בדוק שה-migrations עובדות
npm run db:migrate

# בדוק שה-build עובד
npm run build
```

### שלב 2: דחוף ל-Git

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: הוספת שדה חדש ל-Product"
git push
```

### שלב 3: Vercel יריץ את ה-Migrations אוטומטית

**Vercel עושה את זה אוטומטית:**
- בזמן ה-build, Vercel מריץ `prisma generate` (מה-`postinstall`)
- **אבל** צריך להריץ migrations ידנית על ה-DB של הפרודקשן

### שלב 4: הרצת Migrations על הפרודקשן

#### אפשרות A: דרך Vercel CLI (מומלץ)

```bash
# התקן Vercel CLI אם אין לך
npm i -g vercel

# התחבר ל-Vercel
vercel login

# הרץ migrations על הפרודקשן
vercel env pull .env.production
npx prisma migrate deploy --schema=./prisma/schema.prisma
```

#### אפשרות B: דרך Neon Dashboard (אם אתה משתמש ב-Neon)

1. לך ל-Neon Dashboard
2. פתח את ה-DB שלך
3. לך ל-SQL Editor
4. העתק את תוכן ה-migration החדש מ-`prisma/migrations/[migration-name]/migration.sql`
5. הרץ את ה-SQL

#### אפשרות C: דרך Script אוטומטי (הכי נוח!)

צור קובץ `scripts/deploy-migrations.ts`:

```typescript
// scripts/deploy-migrations.ts
import { execSync } from 'child_process'

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL לא מוגדר!')
  process.exit(1)
}

console.log('🚀 מריץ migrations על הפרודקשן...')
execSync(`DATABASE_URL="${DATABASE_URL}" npx prisma migrate deploy`, {
  stdio: 'inherit',
})
console.log('✅ Migrations הורצו בהצלחה!')
```

ואז:

```bash
# הגדר את DATABASE_URL של הפרודקשן
export DATABASE_URL="postgresql://neondb_owner:password@ep-red-mountain-aghu585l-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require"

# הרץ את ה-script
ts-node scripts/deploy-migrations.ts
```

---

## 📚 פקודות שימושיות

### Prisma Client

```bash
# ייצור Prisma Client מחדש (אחרי שינוי schema)
npm run db:generate

# או
npx prisma generate
```

### Migrations

```bash
# צור migration חדש ורץ אותו (פיתוח)
npm run db:migrate

# הרץ migrations קיימות (פרודקשן)
npm run db:migrate:deploy

# בדוק סטטוס migrations
npm run db:status

# איפוס DB (מסוכן! מוחק הכל)
npm run db:reset
```

### DB Push (לפיתוח מהיר)

```bash
# דחוף שינויים ל-DB בלי ליצור migration (רק לפיתוח!)
npm run db:push

# ⚠️ אזהרה: זה לא יוצר migration file!
# השתמש רק לפיתוח מקומי, לא לפרודקשן
```

### Prisma Studio (GUI ל-DB)

```bash
# פתח GUI לראות ולערוך את ה-DB
npm run db:studio
```

---

## 🎯 Workflow מומלץ

### יום-יומי (פיתוח):

```bash
# 1. התחל יום עבודה
git pull

# 2. ודא ש-Prisma Client מעודכן
npm run db:generate

# 3. הפעל שרת פיתוח
npm run dev
```

### כשאתה עושה שינוי ב-Schema:

```bash
# 1. ערוך prisma/schema.prisma

# 2. צור migration
npm run db:migrate

# 3. בדוק ב-Prisma Studio
npm run db:studio

# 4. בדוק שהכל עובד
npm run build

# 5. דחוף ל-Git
git add prisma/
git commit -m "feat: שינוי ב-schema"
git push
```

### לפני Deploy לפרודקשן:

```bash
# 1. ודא שהכל עובד מקומית
npm run build

# 2. דחוף ל-Git
git push

# 3. אחרי שה-build ב-Vercel מסתיים, הרץ migrations על הפרודקשן
# (ראה "Deploy לפרודקשן" למעלה)
```

---

## ⚠️ טיפים חשובים

### 1. **אל תשתמש ב-DB של הפרודקשן לפיתוח!**
   - זה יכול לגרום לבעיות
   - השתמש ב-DB מקומי או DB נפרד

### 2. **תמיד צור Migrations, לא רק `db push`**
   - `db push` לא יוצר migration file
   - Migrations חשובות ל-tracking שינויים

### 3. **בדוק Migrations לפני Deploy**
   ```bash
   # בדוק מה יקרה
   npm run db:status
   ```

### 4. **שמור על Schema מסונכרן**
   - תמיד `git pull` לפני שינויים
   - ודא שה-schema שלך מעודכן

### 5. **השתמש ב-Prisma Studio לבדיקות**
   ```bash
   npm run db:studio
   ```

---

## 🆘 פתרון בעיות

### Prisma Client לא מעודכן

```bash
# פתרון: ייצור מחדש
npm run db:generate
```

### Migration נכשל

```bash
# בדוק את ה-migration
cat prisma/migrations/[migration-name]/migration.sql

# אם צריך, תקן ידנית או מחק את ה-migration
rm -rf prisma/migrations/[migration-name]
npm run db:migrate
```

### DB לא מסונכרן

```bash
# בדוק סטטוס
npm run db:status

# אם צריך, רץ migrations ידנית
npm run db:migrate:deploy
```

---

## 📖 משאבים נוספים

- [Prisma Docs](https://www.prisma.io/docs)
- [Prisma Migrate Guide](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Vercel + Prisma Guide](https://vercel.com/guides/using-prisma-with-vercel)

