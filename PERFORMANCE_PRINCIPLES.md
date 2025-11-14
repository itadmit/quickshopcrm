# עקרונות ביצועים ואופטימיזציה - QuickShop CRM

## 🎯 פילוסופיה מרכזית

**"הכל בשרת, מינימום JavaScript, אפס קריאות מיותרות"**

מערכת זו בנויה על העיקרון של **Server-Side Rendering (SSR)** מקסימלי עם מינימום overhead בצד הלקוח.

---

## 📐 עקרונות אדריכלות

### 1. Server Components כברירת מחדל

**✅ DO:**
```typescript
// app/shop/[slug]/products/[id]/page.tsx
export default async function ProductPage({ params }) {
  // טען הכל בשרת במקביל
  const [shop, product, reviews] = await Promise.all([
    prisma.shop.findUnique(...),
    prisma.product.findUnique(...),
    prisma.review.findMany(...)
  ])
  
  // העבר ל-Client Component רק אם צריך
  return <ProductPageClient product={product} shop={shop} />
}
```

**❌ DON'T:**
```typescript
// ❌ לא לטעון דאטה בClient Component
"use client"
export default function ProductPage() {
  const [product, setProduct] = useState(null)
  
  useEffect(() => {
    fetch('/api/products/123').then(...) // ❌ קריאה מיותרת!
  }, [])
}
```

---

### 2. Cookies > localStorage > API calls

**סדר העדפה:**

1. **Server cookies** - הכי מהיר, זמין בשרת
2. **localStorage** - רק אם חייבים client-side
3. **API calls** - רק כשאין ברירה

**✅ DO:**
```typescript
// app/shop/[slug]/layout.tsx (Server Component)
import { cookies } from 'next/headers'

export default async function Layout() {
  const cookieStore = cookies()
  const customerId = cookieStore.get(`customer_${slug}`)?.value
  
  // טען cart ישירות בשרת
  const cart = await prisma.cart.findUnique({
    where: { id: customerId }
  })
  
  return <Provider initialCart={cart} />
}
```

**❌ DON'T:**
```typescript
// ❌ לא לטעון מ-localStorage בClient
"use client"
useEffect(() => {
  const id = localStorage.getItem('customerId')
  fetch(`/api/cart?id=${id}`) // ❌ קריאה מיותרת!
}, [])
```

---

### 3. React Query: enabled: false + initialData

**✅ DO:**
```typescript
// components/StorefrontDataProvider.tsx
const { data: shop = initialShop } = useQuery({
  queryKey: ['shop', slug],
  queryFn: async () => fetch(`/api/shop/${slug}`).then(r => r.json()),
  initialData: initialShop, // דאטה מהשרת
  enabled: false, // ❌ לא לטעון בלקוח!
})
```

**למה?**
- `initialData` - הדאטה כבר נטען בשרת
- `enabled: false` - מונע fetch מיותר בצד הלקוח
- `refetch()` - רק כשמשהו משתנה (הוספה לעגלה וכו')

**❌ DON'T:**
```typescript
// ❌ לא עם staleTime/gcTime
const { data } = useQuery({
  queryKey: ['shop'],
  staleTime: 5 * 60 * 1000, // ❌ cache מלאכותי
  refetchOnWindowFocus: true, // ❌ קריאות מיותרות
})
```

---

### 4. אין Cache מלאכותי

**✅ DO:**
```typescript
// app/api/products/route.ts
export async function GET() {
  const products = await prisma.product.findMany()
  return NextResponse.json(products) // ✅ פשוט
}
```

**❌ DON'T:**
```typescript
// ❌ אין Cache-Control headers
return NextResponse.json(products, {
  headers: {
    'Cache-Control': 'public, s-maxage=600' // ❌
  }
})

// ❌ אין revalidate
export const revalidate = 300 // ❌
```

**למה?**
- הדפדפן/CDN יטפלו בcache אם צריך
- cache מלאכותי = בעיות עם fresh data
- פשוט = מהיר יותר

---

### 5. Context Providers - רק למה שצריך

**✅ DO:**
```typescript
// app/layout.tsx
<QueryProvider>
  <AuthProvider>
    <ConditionalShopProvider> {/* רק לדפי אדמין */}
      {children}
    </ConditionalShopProvider>
  </AuthProvider>
</QueryProvider>
```

**ConditionalShopProvider:**
```typescript
"use client"
export function ConditionalShopProvider({ children }) {
  const pathname = usePathname()
  
  // רק בדפי אדמין!
  if (pathname?.startsWith('/shop/') || pathname === '/login') {
    return <>{children}</>
  }
  
  return <ShopProvider>{children}</ShopProvider>
}
```

**למה?**
- ShopProvider שולח `/api/shops` - לא רלוונטי לסטורפרונט
- כל Provider = overhead + re-renders
- Conditional = רק איפה שצריך

---

### 6. טעינה מקבילית (Promise.all)

**✅ DO:**
```typescript
const [shop, navigation, isAdmin, cart] = await Promise.all([
  prisma.shop.findUnique(...),
  prisma.navigation.findFirst(...),
  checkAdmin(),
  loadCart()
])
```

**❌ DON'T:**
```typescript
// ❌ לא בזה אחרי זה
const shop = await prisma.shop.findUnique(...)
const navigation = await prisma.navigation.findFirst(...) // ⏱️ מחכה
const cart = await loadCart(...) // ⏱️ מחכה
```

---

## 🏗️ מבנה מומלץ

### Storefront Pages

```
app/shop/[slug]/
├── layout.tsx          # Server Component - טוען הכל
│   ├── cookies         # קריאת customerId
│   ├── Promise.all     # shop, navigation, cart, isAdmin
│   └── <Provider initialData={...} />
│
└── products/[id]/
    └── page.tsx        # Server Component
        ├── Promise.all # product, reviews, related
        └── <ClientPage data={...} />
```

### Client Components

```typescript
// ProductPageClient.tsx
"use client"

export function ProductPageClient({ 
  product,      // מהשרת
  shop,         // מהשרת
  reviews       // מהשרת
}) {
  // רק אינטראקציות: הוספה לעגלה, לייקים וכו'
  const { refetchCart } = useStorefrontData()
  
  const addToCart = async () => {
    await fetch('/api/cart', { method: 'POST', ... })
    refetchCart() // ✅ רק עכשיו
  }
}
```

---

## 🚫 דברים לא לעשות

### 1. ❌ useEffect לטעינת דאטה

```typescript
// ❌ זה נורא
useEffect(() => {
  fetch('/api/products').then(...)
}, [])

// ✅ במקום זה - Server Component
const products = await prisma.product.findMany()
```

### 2. ❌ קריאות API כפולות

```typescript
// ❌ זה קורה אם יש 2 components שקוראים אותו דבר
function Header() {
  const { data } = useQuery(['shop'], ...)
}
function Footer() {
  const { data } = useQuery(['shop'], ...) // ❌ כפול!
}

// ✅ פתרון: Context Provider
<ShopProvider initialShop={shop}>
  <Header />
  <Footer />
</ShopProvider>
```

### 3. ❌ localStorage לכל דבר

```typescript
// ❌ לא
localStorage.setItem('cart', JSON.stringify(cart))

// ✅ Cookies - זמינים גם בשרת
document.cookie = `cart=${id}; path=/; max-age=31536000`
```

### 4. ❌ Client Component בלי סיבה

```typescript
// ❌ אם אין onClick/useState - לא צריך "use client"
"use client"
export function ProductList({ products }) {
  return products.map(p => <ProductCard key={p.id} product={p} />)
}

// ✅ זה Server Component
export function ProductList({ products }) {
  return products.map(p => <ProductCard key={p.id} product={p} />)
}
```

---

## 📊 מדדי הצלחה

### לפני האופטימיזציה:
```
Network Requests (דף מוצר):
- /api/shops: 2 calls ❌
- /api/storefront/info: 4 calls ❌
- /api/storefront/navigation: 4 calls ❌
- /api/storefront/cart: 3 calls ❌
- /api/storefront/check-admin: 4 calls ❌
סה"כ: ~17 API calls
```

### אחרי האופטימיזציה:
```
Network Requests (דף מוצר):
- /api/auth/session: 1-2 calls ✅
- /api/storefront/tracking-pixels: 1 call ✅
סה"כ: ~2-3 API calls (הפחתה של 85%!)
```

---

## 🎓 חוקים לזכור

1. **Server First** - תמיד התחל עם Server Component
2. **Cookies > localStorage** - customerId, preferences בcookies
3. **Promise.all** - כל הדאטה במקביל
4. **initialData + enabled:false** - React Query לא טוען מחדש
5. **No Cache Headers** - תן לדפדפן להחליט
6. **Conditional Providers** - רק איפה שצריך
7. **One Source of Truth** - Context מקבל דאטה מהשרת
8. **Refetch רק כשצריך** - אחרי mutations בלבד

---

## 🔄 תהליך פיתוח נכון

### כשמוסיפים פיצ'ר חדש:

1. **תכנן בשרת**
   ```typescript
   // page.tsx (Server Component)
   const data = await loadDataFromDB()
   return <ClientComponent data={data} />
   ```

2. **Cookies לזיהוי**
   ```typescript
   const userId = cookies().get('user_id')
   ```

3. **Context לשיתוף**
   ```typescript
   <DataProvider initialData={data}>
     {children}
   </DataProvider>
   ```

4. **Client רק לאינטראקציות**
   ```typescript
   "use client"
   const handleClick = () => {
     mutate()
     refetch() // רק אחרי שינוי
   }
   ```

---

## ✅ Checklist לפני Deploy

- [ ] אין `useEffect` שטוען דאטה
- [ ] אין `Cache-Control` headers מיותרים
- [ ] אין `revalidate` בpages (אלא אם באמת צריך)
- [ ] Providers רק איפה שצריך
- [ ] React Query עם `enabled: false` + `initialData`
- [ ] Cookies ל-customerId (לא localStorage)
- [ ] Server Components לדאטה
- [ ] Client Components רק לאינטראקציות

---

## 🚀 תוצאה

**מהיר כמו RSVP:**
- טעינה ראשונית: instant (הכל בשרת)
- ניווט בין דפים: מהיר (אפס API calls מיותרים)
- אינטראקציות: חלק (refetch רק מה שצריך)
- Scale: מצוין (פחות עומס על שרת)

---

**עודכן:** 14 בנובמבר 2025  
**גרסה:** 2.0 (לאחר אופטימיזציה מלאה)


