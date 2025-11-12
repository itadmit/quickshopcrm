# מדריך התקנה: מערכת תורים לאוטומציות (Bull + Redis)

## 📋 סקירה כללית

המערכת משתמשת ב-**Bull** (תור jobs מבוסס Redis) לניהול מקצועי של delays ו-automations.

### יתרונות:
- ✅ **Persistence**: אם השרת נכבה, ה-jobs נשארים ב-Redis
- ✅ **Retries**: ניסיונות חוזרים אוטומטיים במקרה של כשל
- ✅ **Scaling**: ניתן להריץ מספר workers במקביל
- ✅ **Monitoring**: UI ו-API לניהול התור
- ✅ **Scheduling**: delays מדויקים עם תזמון

---

## 🚀 התקנה

### 1. התקנת Redis

#### macOS:
```bash
brew install redis
brew services start redis
```

#### Ubuntu/Debian:
```bash
sudo apt-get install redis-server
sudo systemctl start redis
```

#### Docker:
```bash
docker run -d -p 6379:6379 redis:alpine
```

#### Windows:
הורד מ: https://redis.io/download
או השתמש ב-WSL

---

### 2. הוספת משתנים ל-.env

הוסף ל-`.env.local`:

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Development Mode (skip Redis, use setTimeout)
# שנה ל-true רק ל-development ללא Redis
SKIP_QUEUE=false
```

---

### 3. בדיקת חיבור ל-Redis

```bash
redis-cli ping
# אמור להחזיר: PONG
```

---

## 🎯 שימוש

### הוספת אוטומציה לתור

```typescript
import { queueAutomation } from "@/lib/automation-queue"

// הרצה מיידית
await queueAutomation(shopId, "cart.abandoned", eventPayload)

// הרצה עם delay (10 דקות)
await queueAutomation(shopId, "order.completed", eventPayload, 600)
```

### מעקב אחרי התור

```bash
# סטטיסטיקות
curl http://localhost:3000/api/automations/queue

# Jobs בסטטוס מסוים
curl "http://localhost:3000/api/automations/queue?status=waiting"
curl "http://localhost:3000/api/automations/queue?status=active"
curl "http://localhost:3000/api/automations/queue?status=failed"

# ביטול job
curl -X DELETE "http://localhost:3000/api/automations/queue?jobId=123"

# ניקוי כל התור
curl -X DELETE "http://localhost:3000/api/automations/queue?clean=true"
```

---

## 🖥️ הרצת Worker נפרד (אופציונלי)

### Development:
```bash
npx ts-node workers/automation-worker.ts
```

### Production עם PM2:
```bash
npm install -g pm2

# הרצת worker
pm2 start workers/automation-worker.ts --name automation-worker

# מעקב
pm2 logs automation-worker
pm2 status

# עצירה
pm2 stop automation-worker
```

---

## 🎨 Bull Board - UI לניהול

התקן:
```bash
npm install @bull-board/express @bull-board/api
```

הוסף route:
```typescript
// app/api/admin/queues/route.ts
import { createBullBoard } from "@bull-board/api"
import { BullAdapter } from "@bull-board/api/bullAdapter"
import { ExpressAdapter } from "@bull-board/express"
import { automationQueue } from "@/lib/automation-queue"

const serverAdapter = new ExpressAdapter()
createBullBoard({
  queues: [new BullAdapter(automationQueue)],
  serverAdapter,
})

export const GET = serverAdapter.getRouter()
```

גש ל: `http://localhost:3000/api/admin/queues`

---

## 🧪 מצב Development ללא Redis

אם אין לך Redis מותקן, הוסף ל-`.env.local`:

```env
SKIP_QUEUE=true
```

במצב זה:
- המערכת משתמשת ב-`setTimeout` (לא מומלץ ל-production)
- ה-delays עובדים אבל לא persistent
- אין retries אוטומטיים

---

## 📊 ניטור ו-Logging

Bull מספק events מובנים:

```typescript
automationQueue.on("completed", (job, result) => {
  console.log(`✅ Job ${job.id} completed`)
})

automationQueue.on("failed", (job, err) => {
  console.error(`❌ Job ${job.id} failed: ${err.message}`)
})

automationQueue.on("stalled", (job) => {
  console.warn(`⚠️  Job ${job.id} stalled`)
})
```

---

## 🔧 טיפים ל-Production

### 1. הגדר Concurrency
```typescript
automationQueue.process("run-automation", 5, async (job) => {
  // מעבד עד 5 jobs במקביל
})
```

### 2. הגדר Rate Limiting
```typescript
automationQueue.add(data, {
  limiter: {
    max: 100, // מקסימום 100 jobs
    duration: 60000, // לדקה
  },
})
```

### 3. Monitoring ב-Production
- השתמש ב-Bull Board להצגה חזותית
- שלב עם Datadog/NewRelic
- הגדר alerts על failed jobs

### 4. Redis ב-Production
- השתמש ב-Redis cluster לזמינות גבוהה
- גיבויים אוטומטיים
- שקול Redis Cloud (Upstash, Redis Labs)

---

## 🌐 Redis Cloud (ללא התקנה מקומית)

### Upstash (חינם):
1. הירשם ב: https://upstash.com
2. צור Redis database
3. העתק את ה-connection string
4. הוסף ל-`.env`:

```env
REDIS_HOST=your-upstash-host.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your-password
```

### Redis Labs:
דומה, חינם עד 30MB

---

## 🐛 Debugging

### בדיקת jobs בתור:
```bash
redis-cli
> KEYS bull:automations:*
> HGETALL bull:automations:1
```

### ניקוי Redis:
```bash
redis-cli FLUSHALL
```

### לוגים:
כל ה-jobs נשמרים אוטומטית ב-`automation_logs` ב-DB

---

## 📚 משאבים נוספים

- [Bull Documentation](https://github.com/OptimalBits/bull)
- [Redis Quick Start](https://redis.io/docs/getting-started/)
- [Bull Board](https://github.com/felixmosh/bull-board)

---

## ✅ Checklist

- [ ] Redis מותקן ופועל
- [ ] משתני סביבה מוגדרים ב-`.env`
- [ ] בדקתי חיבור: `redis-cli ping`
- [ ] הרצתי את השרת ובדקתי logs
- [ ] בדקתי automation עם delay
- [ ] (אופציונלי) הפעלתי worker נפרד
- [ ] (אופציונלי) התקנתי Bull Board

---

**הערה חשובה**: אם אתה רק מפתח ובודק, אתה יכול להשתמש ב-`SKIP_QUEUE=true` בינתיים,
אבל ל-**production חובה Redis**! 🚨

