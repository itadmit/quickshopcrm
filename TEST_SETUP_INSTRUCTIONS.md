# הוראות הגדרת טסטים

## בעיה: הרשאות מסד נתונים

הטסטים מנסים להתחבר למסד הנתונים אבל נתקלים בבעיית הרשאות:
```
User `quickshop_user` was denied access on the database `quickshop_db.public`
```

## פתרונות אפשריים:

### פתרון 1: הגדרת מסד נתונים נפרד לטסטים (מומלץ)

1. צור מסד נתונים חדש לטסטים:
```sql
CREATE DATABASE quickshop_test;
```

2. צור משתמש עם הרשאות מלאות:
```sql
CREATE USER test_user WITH PASSWORD 'test_password';
GRANT ALL PRIVILEGES ON DATABASE quickshop_test TO test_user;
```

3. עדכן את `.env` או צור `.env.test`:
```env
DATABASE_URL="postgresql://test_user:test_password@localhost:5432/quickshop_test?schema=public"
```

4. הרץ migrations:
```bash
npx prisma migrate deploy
# או
npx prisma db push
```

### פתרון 2: שימוש במסד הנתונים הקיים

אם אתה רוצה להשתמש במסד הנתונים הקיים:

1. ודא שהמשתמש `quickshop_user` יש לו הרשאות:
```sql
GRANT ALL PRIVILEGES ON DATABASE quickshop_db TO quickshop_user;
GRANT ALL PRIVILEGES ON SCHEMA public TO quickshop_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO quickshop_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO quickshop_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO quickshop_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO quickshop_user;
```

2. ודא שה-`DATABASE_URL` נכון ב-`.env`

### פתרון 3: שימוש ב-SQLite לטסטים (מהיר יותר)

אם אתה רוצה טסטים מהירים יותר ללא צורך ב-PostgreSQL:

1. התקן SQLite:
```bash
npm install --save-dev better-sqlite3
```

2. עדכן את `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

3. עדכן את `.env.test`:
```env
DATABASE_URL="file:./test.db"
```

**הערה**: פתרון זה דורש שינויים ב-schema וייתכן שלא יתאים לכל המקרים.

## הרצת הטסטים

לאחר הגדרת מסד הנתונים:

```bash
npm test
```

## בדיקת חיבור למסד נתונים

לבדוק שהחיבור עובד:

```bash
npx prisma db pull
```

אם זה עובד, הטסטים אמורים לעבוד גם כן.

## הערות חשובות

1. **מומלץ מאוד** להשתמש במסד נתונים נפרד לטסטים כדי לא לפגוע בנתוני הפיתוח
2. הטסטים מנקים את הנתונים לפני כל הרצה, אז לא צריך לדאוג לנתונים ישנים
3. אם אתה משתמש במסד הנתונים הקיים, ודא שיש לך גיבוי לפני הרצת הטסטים
