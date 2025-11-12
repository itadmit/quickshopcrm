# ⚡ התחלה מהירה - מערכת תורים

## 📦 מה צריך?

1. **Redis** - מסד נתונים מהיר לתורים
2. **5 דקות של הזמן שלך**

---

## 🚀 התקנה מהירה (3 שלבים)

### שלב 1: התקן Redis

#### macOS:
```bash
brew install redis
npm run redis:start
npm run redis:check  # צריך להדפיס PONG
```

#### Docker (כל מערכת):
```bash
docker run -d -p 6379:6379 --name redis redis:alpine
```

#### Ubuntu/Debian:
```bash
sudo apt-get install redis-server
sudo systemctl start redis
```

### שלב 2: הגדר .env

צור `.env.local` (אם אין):
```env
REDIS_HOST=localhost
REDIS_PORT=6379
```

### שלב 3: הרץ בדיקה

```bash
# טרמינל 1
npm run dev

# טרמינל 2 (בחלון חדש)
npm run queue:test
```

אם הכל עבד - תראה:
```
🧪 Testing Automation Queue System
✅ Queued immediate job: 1
✅ Queued delayed job: 2
✅ All tests queued successfully!
```

---

## 💡 פקודות שימושיות

```bash
# בדיקת מצב התור
npm run queue:stats

# הרצת worker נפרד
npm run worker

# בדיקת Redis
npm run redis:check

# ניקוי התור
npm run queue:clean

# עצירת Redis
npm run redis:stop
```

---

## 🎯 איך זה עובד?

```
עגלה נטושה
   ↓
המתן 10 דקות ← Redis שומר "תזכורת"
   ↓
שלח מייל      ← Redis מעיר את המערכת
   ↓
המתן 24 שעות  ← שוב Redis
   ↓
בדוק תנאי     ← Redis מעיר
   ↓
צור קופון
```

**הקסם**: השרת לא "תפוס" במתנות! 🎩✨

---

## 🆘 בעיות נפוצות

### Redis לא מתחבר?
```bash
# בדוק אם Redis רץ
redis-cli ping

# אם לא - הפעל
brew services start redis
# או
npm run redis:start
```

### אין לי Redis ואני רק בודק?
הוסף ל-`.env.local`:
```env
SKIP_QUEUE=true
```
**(לא מומלץ ל-production!)**

---

## 📚 מסמכים נוספים

- `HOW_QUEUE_WORKS_SIMPLE.md` - הסבר מפורט איך זה עובד
- `AUTOMATION_QUEUE_SETUP.md` - התקנה מתקדמת
- `AUTOMATION_QUEUE_EXAMPLE.md` - דוגמאות קוד

---

## ✅ זה הכל!

עכשיו גש ל: `http://localhost:3001/automations/new`

לחץ על "טען טמפלט לדוגמא" ותראה את המערכת בפעולה! 🎉

