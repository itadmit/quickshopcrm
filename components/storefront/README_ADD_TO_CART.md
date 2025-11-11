# מערכת הוספה לעגלה מאוחדת

## סקירה כללית

יצרנו מערכת מרכזית ואחידה להוספת מוצרים לעגלה, הכוללת:
- **Hook מרכזי** (`useAddToCart`) - מטפל בלוגיקה של הוספה לעגלה
- **קומפוננטת כפתור** (`AddToCartButton`) - כפתור אחיד לכל האפליקציה
- **מודל הוספה מהירה** (`QuickAddModal`) - לבחירת variants (גדלים, צבעים, וכו')

## קבצים

### 1. `hooks/useAddToCart.ts`
Hook מרכזי עם לוגים מפורטים המטפל בהוספה לעגלה.

**שימוש:**
```typescript
const { addToCart, isAddingToCart } = useAddToCart({
  slug: 'mariastore',
  customerId: '123',
  onSuccess: () => console.log('הוסף בהצלחה!')
})

// הוספה
await addToCart({
  productId: 'abc',
  variantId: 'xyz', // אופציונלי
  quantity: 2,
  productName: 'תיק ספורט ניייק'
})
```

### 2. `components/storefront/AddToCartButton.tsx`
כפתור אחיד לכל המקומות באפליקציה.

**מצבי שימוש:**

#### א. הוספה רגילה (ללא variants)
```typescript
<AddToCartButton
  slug="mariastore"
  productId="abc"
  productName="תיק ספורט"
  customerId={customerId}
  onSuccess={handleCartUpdate}
/>
```

#### ב. עם מודל הוספה מהירה (לעמודים עם מוצרים רבים)
```typescript
<AddToCartButton
  slug="mariastore"
  productId="abc"
  productName="תיק ספורט"
  useQuickAddModal={true}
  product={fullProductObject} // כולל variants
  customerId={customerId}
  onSuccess={handleCartUpdate}
/>
```

### 3. `components/storefront/QuickAddModal.tsx`
מודל יפה ומתקדם לבחירת variants.

**תכונות:**
- ✅ בחירת גדלים, צבעים ואפשרויות אחרות
- ✅ הצגת מלאי בזמן אמת
- ✅ חסימת אפשרויות לא זמינות
- ✅ בחירת כמות
- ✅ תצוגה מקדימה של תמונה
- ✅ לינק למוצר המלא

**שימוש ישיר (במקרים מיוחדים):**
```typescript
<QuickAddModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  product={productWithVariants}
  slug="mariastore"
  customerId={customerId}
  onSuccess={handleSuccess}
/>
```

## היכן משמש?

### 1. עמוד מוצר (`/shop/[slug]/products/[id]`)
- הוספה ישירה עם בחירת variant בעמוד

### 2. דפים סטטיים - טמפלט "הבחירות של" (`/shop/[slug]/pages/[id]`)
- ✅ **תצוגת LIST** - כפתור "הוספה מהירה" עם מודל
- ✅ **תצוגת GRID** - כפתור "הוספה מהירה" עם מודל

### 3. עמוד קטגוריה (`/shop/[slug]/categories/[id]`)
- ✅ **ProductCard** - כפתור "הוספה מהירה" מופיע בהובר עם מודל

### 4. עמוד קולקציה, חיפוש, וכל מקום עם `ProductCard`
- הכפתור מופיע אוטומטית בהובר

## שינויים ב-API

עדכנו את ה-routes הבאים לכלול variants:

### 1. `/api/storefront/[slug]/pages/[id]/route.ts`
```typescript
// עכשיו כולל variants
select: {
  variants: {
    select: {
      id: true,
      name: true,
      price: true,
      comparePrice: true,
      inventoryQty: true,
      sku: true,
      options: true,
    },
  },
}
```

### 2. `/api/storefront/[slug]/products/route.ts`
```typescript
// עכשיו כולל variants
// משמש לקטגוריות, חיפוש, וכו'
```

## לוגים

כל המערכת כוללת לוגים מפורטים עם אמוג'ים:
- 🛒 - התחלת פעולה
- 📤 - שליחת בקשה
- 📥 - קבלת תשובה
- ✅ - הצלחה
- ❌ - שגיאה
- 🔄 - רענון
- 💾 - שמירה

**לפתיחת קונסול הדפדפן:** F12

## יתרונות

1. **קוד אחיד** - שינוי אחד מתעדכן בכל המקומות
2. **לוגים מפורטים** - קל לאבחן בעיות
3. **UX משופר** - מודל יפה עם כל האפשרויות
4. **תמיכה ב-variants** - גדלים, צבעים, אפשרויות
5. **responsive** - עובד מצוין במובייל
6. **עדכון מונה אוטומטי** - העגלה מתעדכנת אוטומטית

## דוגמאות נוספות

### בעתיד - בילדר
```typescript
<AddToCartButton
  slug={slug}
  productId={element.productId}
  productName={element.productName}
  useQuickAddModal={true}
  product={element.product}
  size="lg"
  className="custom-style"
/>
```

### עם סגנון מותאם אישית
```typescript
<AddToCartButton
  slug={slug}
  productId={product.id}
  productName={product.name}
  variant="outline"
  size="sm"
  showIcon={false}
  className="bg-purple-600 hover:bg-purple-700"
/>
```

## טיפים

1. **תמיד העבר `onSuccess`** לרענון מונה העגלה
2. **השתמש ב-`useQuickAddModal`** כשיש מוצרים רבים בעמוד
3. **הלוגים עוזרים** - תמיד בדוק את הקונסול אם משהו לא עובד
4. **המודל חכם** - הוא אוטומטית מזהה אם יש variants ומחייב בחירה

---

**נוצר:** נובמבר 2025
**גרסה:** 1.0

