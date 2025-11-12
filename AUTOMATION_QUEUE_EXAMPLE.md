# דוגמאות שימוש - מערכת תורים לאוטומציות

## 🎯 התחלה מהירה

### 1. התקן Redis (פעם אחת)

```bash
# macOS
brew install redis
brew services start redis

# או Docker
docker run -d -p 6379:6379 redis:alpine
```

### 2. הוסף ל-.env.local

```env
REDIS_HOST=localhost
REDIS_PORT=6379
SKIP_QUEUE=false
```

### 3. הרץ את השרת

```bash
npm run dev
```

---

## 📝 דוגמאות קוד

### דוגמה 1: שליחת אוטומציה מיידית

```typescript
import { queueAutomation } from "@/lib/automation-queue"

// בתוך API route או server action
export async function POST(req: Request) {
  const { shopId, customerEmail } = await req.json()
  
  // שלח אוטומציה מיידית
  await queueAutomation(shopId, "cart.abandoned", {
    customer: {
      email: customerEmail,
      name: "יוסי כהן"
    },
    cart: {
      checkoutUrl: "https://myshop.com/checkout/123"
    }
  })
  
  return Response.json({ success: true })
}
```

### דוגמה 2: אוטומציה מתוזמנת (10 דקות)

```typescript
// המתן 10 דקות לפני הרצה
await queueAutomation(
  shopId, 
  "order.reminder",
  { orderId: "123" },
  600 // 600 שניות = 10 דקות
)
```

### דוגמה 3: Flow מלא של עגלה נטושה

```typescript
import { queueAutomation } from "@/lib/automation-queue"

async function handleAbandonedCart(shopId: string, cartData: any) {
  // 1. שלח מייל ראשון מיד
  await queueAutomation(shopId, "cart.abandoned.first_email", cartData)
  
  // 2. המתן שעה ושלח תזכורת
  await queueAutomation(
    shopId, 
    "cart.abandoned.reminder", 
    cartData,
    3600 // שעה
  )
  
  // 3. אחרי 24 שעות - צור קופון ושלח
  await queueAutomation(
    shopId,
    "cart.abandoned.final_offer",
    cartData,
    86400 // יום
  )
}
```

---

## 🖥️ ניהול התור

### בדיקת סטטיסטיקות

```bash
npm run queue:stats

# תוצאה:
# {
#   "waiting": 5,
#   "active": 2,
#   "completed": 145,
#   "failed": 3,
#   "delayed": 8,
#   "total": 163
# }
```

### ניקוי התור

```bash
npm run queue:clean
```

### API לניהול

```typescript
// קבלת כל ה-jobs שממתינים
const response = await fetch('/api/automations/queue?status=waiting')
const data = await response.json()
console.log(data.jobs)

// ביטול job ספציפי
await fetch('/api/automations/queue?jobId=123', { method: 'DELETE' })
```

---

## 🔄 הרצת Worker נפרד

למערכת גדולה, מומלץ להריץ worker נפרד:

```bash
# Terminal 1: השרת הראשי
npm run dev

# Terminal 2: Worker לאוטומציות
npm run worker
```

היתרונות:
- השרת לא עמוס
- ניתן להריץ מספר workers
- ניתן להפעיל/לכבות בנפרד

---

## 🧪 מצב Development ללא Redis

אם אין לך Redis, פשוט הגדר:

```env
SKIP_QUEUE=true
```

**הערה**: במצב זה המערכת משתמשת ב-setTimeout הישן, אבל זה רק ל-development!

---

## 🎨 דוגמה מלאה: עגלה נטושה עם תנאים

```typescript
import { queueAutomation } from "@/lib/automation-queue"
import { prisma } from "@/lib/prisma"

export async function handleCartAbandoned(cartId: string) {
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: { customer: true, shop: true }
  })
  
  if (!cart) return
  
  const eventPayload = {
    cartId: cart.id,
    customer: {
      id: cart.customerId,
      email: cart.customer?.email,
      name: cart.customer?.firstName
    },
    cart: {
      items: cart.items,
      total: calculateTotal(cart.items),
      checkoutUrl: `${cart.shop.domain}/checkout/${cart.id}`
    },
    shop: {
      id: cart.shopId,
      name: cart.shop.name
    }
  }
  
  // Queue 1: מייל מיידי
  await queueAutomation(
    cart.shopId,
    "cart.abandoned",
    eventPayload
  )
  
  console.log(`✅ Queued abandoned cart automation for cart ${cartId}`)
}
```

---

## 📊 Monitoring ב-Production

### Bull Board (UI חזותי)

התקן:
```bash
npm install @bull-board/express @bull-board/api
```

צור route:
```typescript
// app/api/admin/bull-board/route.ts
import { createBullBoard } from "@bull-board/api"
import { BullAdapter } from "@bull-board/api/bullAdapter"
import { ExpressAdapter } from "@bull-board/express"
import { automationQueue } from "@/lib/automation-queue"

const serverAdapter = new ExpressAdapter()
createBullBoard({
  queues: [new BullAdapter(automationQueue)],
  serverAdapter: serverAdapter.setBasePath("/api/admin/bull-board"),
})

export const GET = serverAdapter.getRouter()
```

גש ל: `http://localhost:3000/api/admin/bull-board`

תראה:
- כל ה-jobs הפעילים
- היסטוריה
- אפשרות לבטל/לנסות מחדש
- גרפים וסטטיסטיקות

---

## 🚨 טיפים חשובים

### 1. גיבוי ב-Production
```typescript
// ודא ש-Redis מגובה
// השתמש ב-Redis Cloud עם automatic backups
```

### 2. Rate Limiting
```typescript
await queueAutomation(shopId, eventType, payload, 0, {
  limiter: {
    max: 10, // מקסימום 10 jobs
    duration: 60000 // לדקה
  }
})
```

### 3. Priority
```typescript
await automationQueue.add(data, {
  priority: 1, // גבוה יותר = עדיפות גבוהה יותר
})
```

---

## ✅ Checklist לפני Production

- [ ] Redis מותקן (cloud או server)
- [ ] `SKIP_QUEUE=false` ב-production
- [ ] Worker נפרד רץ (PM2/Docker)
- [ ] Bull Board מותקן לניהול
- [ ] גיבויים ל-Redis מוגדרים
- [ ] Monitoring (Datadog/NewRelic)
- [ ] Alerts על failed jobs

---

## 🆘 Troubleshooting

### Redis לא מתחבר?
```bash
redis-cli ping
# אם לא עובד:
brew services restart redis
```

### Jobs לא מתבצעים?
בדוק:
1. Worker רץ: `npm run worker`
2. Redis פעיל: `redis-cli ping`
3. Logs: בדוק console.log ב-worker

### לנקות הכל:
```bash
redis-cli FLUSHALL
npm run queue:clean
```

---

**זהו! עכשיו יש לך מערכת תורים מקצועית 🚀**

