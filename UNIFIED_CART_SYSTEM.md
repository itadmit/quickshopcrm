# 🎯 מערכת עגלה אחידה ומרכזית

## ✅ המערכת המרכזית היחידה

**`hooks/useAddToCart`** - זה הכל! פשוט, יציב ונכון.

### שימוש פשוט:

```tsx
import { useAddToCart } from '@/hooks/useAddToCart'

const { addToCart, isAddingToCart } = useAddToCart({
  slug: 'mariastore',
  customerId: customerId,
  autoOpenCart: true, // האם העגלה נפתחת אוטומטית
  onSuccess: () => {
    // Callback אחרי הוספה מוצלחת
    console.log('נוסף לעגלה!')
  }
})

// הוספה לעגלה - פשוט וקל!
await addToCart({
  productId: 'xxx',
  variantId: 'yyy', // אופציונלי - רק אם יש variant
  quantity: 1,
  productName: 'שם המוצר',
  productData: { // אופציונלי - לבדיקת מלאי
    availability: 'IN_STOCK',
    inventoryQty: 10,
    variants: [
      { id: 'yyy', inventoryQty: 5 }
    ]
  }
})
```

## מה המערכת עושה אוטומטית:

✅ **בדיקת מלאי** - אם יש `productData`, בודקת מלאי לפני הוספה  
✅ **הוספה לעגלה** - דרך `useCart` hook המרכזי  
✅ **טיפול בשגיאות** - מציגה הודעות שגיאה אוטומטית  
✅ **עדכון UI** - מעדכנת את העגלה אוטומטית  
✅ **Toast/עגלה** - מציגה טוסט או פותחת עגלה לפי ההגדרות  

## איפה משתמשים:

### ✅ עמוד מוצר (`app/shop/[slug]/products/[id]/page.tsx`)
```tsx
const { addToCart } = useAddToCart({ slug, customerId, autoOpenCart, onSuccess })
await addToCart({ productId, variantId, quantity, productName, productData })
```

### ✅ דפים (`app/shop/[slug]/pages/[id]/page.tsx`)
```tsx
const { addToCart } = useAddToCart({ slug, customerId })
await addToCart({ productId, quantity, productName })
```

### ✅ קטגוריות (`app/shop/[slug]/categories/[id]/page.tsx`)
```tsx
const { addToCart } = useAddToCart({ slug, customerId })
await addToCart({ productId, variantId, quantity, productName })
```

### ✅ כל מקום אחר!
פשוט קוראים ל-`useAddToCart` ומשתמשים בו.

## 🚫 מה לא לעשות:

❌ **לא ליצור `handleAddToCart` מקומי** - תמיד להשתמש ב-`useAddToCart`  
❌ **לא לשלוח fetch ישיר** - תמיד דרך `useAddToCart`  
❌ **לא לבדוק מלאי ידנית** - תמיד להעביר `productData`  

## ✅ מה כן לעשות:

✅ **תמיד להשתמש ב-`useAddToCart`** - זה המערכת המרכזית  
✅ **להעביר `productData`** - לבדיקת מלאי אוטומטית  
✅ **להעביר `variantId`** - אם יש variant נבחר  
✅ **להשתמש ב-`isAddingToCart`** - ל-loading state  

## 🎯 יתרונות:

1. **פשוט** - שורה אחת להוספה לעגלה
2. **יציב** - כל הלוגיקה במקום אחד
3. **נכון** - בודק מלאי, מטפל בשגיאות, מעדכן UI
4. **אחיד** - אותו קוד בכל מקום
5. **קל לתחזוקה** - שינוי אחד משפיע על הכל

---

**תאריך יצירה:** נובמבר 2025  
**גרסה:** 3.0 (Unified System)

