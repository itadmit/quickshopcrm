# צעדים להשלמת שילוב Product Add-ons בסטורפרונט

## ✅ מה הושלם עד כה:

1. ✅ Server Component (`page.tsx`) - טוען addons מהשרת
2. ✅ Type Definitions (`types.ts`) - הוספת `ProductAddon` interface
3. ✅ Props passing - העברת `productAddons` ל-`ProductPageClient`
4. ✅ Hooks עודכנו - `useCart` ו-`useAddToCart` תומכים ב-addons
5. ✅ Component נוצר - `ProductAddonsSelector.tsx` מוכן לשימוש

## 🚧 מה צריך להשלים:

### בקובץ `ProductPageClient.tsx`:

#### 1. הוסף state לaddons שנבחרו:

```typescript
// אחרי השורות הקיימות של state (סביב שורה 65):
const [selectedAddons, setSelectedAddons] = useState<Array<{
  addonId: string
  valueId: string | null
  label: string
  price: number
  quantity: number
}>>([])

const [addonsTotal, setAddonsTotal] = useState(0)
```

#### 2. מצא את `handleAddToCart` (סביב שורה 415 ב-hook או במקום שמטפלים בהוספה):

עדכן את הקריאה ל-`addToCart` להכליל את ה-addons:

```typescript
const success = await addToCart({
  productId: product.id,
  variantId: selectedVariant,
  quantity,
  productName: product.name,
  productData: {
    availability: product.availability,
    inventoryQty: product.inventoryQty,
    variants: product.variants?.map(v => ({
      id: v.id,
      inventoryQty: v.inventoryQty
    }))
  },
  addons: selectedAddons.length > 0 ? selectedAddons : undefined, // 👈 הוסף את זה
})
```

#### 3. מצא איפה מרנדרים את כפתור "הוסף לעגלה":

לפני הכפתור (או אחריו, תלוי בעיצוב), הוסף:

```tsx
{/* Product Add-ons */}
{productAddons && productAddons.length > 0 && (
  <div className="mt-6">
    <ProductAddonsSelector
      addons={productAddons}
      onChange={setSelectedAddons}
      onPriceChange={setAddonsTotal}
    />
  </div>
)}
```

#### 4. עדכן את תצוגת המחיר (אופציונלי אבל מומלץ):

מצא איפה מציגים את מחיר המוצר והוסף את addonsTotal:

```tsx
// משהו כמו:
<div className="text-3xl font-bold">
  ₪{(currentPrice * quantity + addonsTotal).toFixed(2)}
  {addonsTotal > 0 && (
    <span className="text-sm text-gray-600 mr-2">
      (כולל ₪{addonsTotal.toFixed(2)} תוספות)
    </span>
  )}
</div>
```

#### 5. Import הקומפוננטה:

בראש הקובץ, הוסף:

```typescript
import { ProductAddonsSelector } from "./components/ProductAddonsSelector"
```

---

## 🔍 איך למצוא את המקומות הנכונים:

### למצוא את handleAddToCart:
```bash
grep -n "handleAddToCart" ProductPageClient.tsx
```

### למצוא איפה מרנדרים "הוסף לעגלה":
```bash
grep -n "הוסף לעגלה" ProductPageClient.tsx
```

### למצוא את תצוגת המחיר:
```bash
grep -n "currentPrice" ProductPageClient.tsx
```

---

## 🎨 דוגמה מלאה לשילוב (תפתח את ProductPageClient ותחפש את הדברים האלה):

הקובץ מורכב מאוד ויש בו layout system מותאם אישית. אבל הרעיון הבסיסי הוא:

1. **State** - מוסיפים state חדש
2. **Render** - מוסיפים את `<ProductAddonsSelector />` במקום הנכון
3. **Submit** - מעבירים את `selectedAddons` ל-`addToCart`

---

## ✅ לאחר השילוב - בדיקה:

1. עבור לדף מוצר בסטורפרונט
2. אמור לראות את התוספות (אם הוגדרו)
3. בחר תוספות
4. הוסף לעגלה
5. בדוק ש-addons מופיעים בעגלה עם המחיר הנכון

---

**הערה חשובה**: הקובץ `ProductPageClient.tsx` משתמש ב-layout system מותאם אישית (`ProductElements`). 
אם יש בעיה למצוא איפה להוסיף את הקומפוננטה, אפשר גם להוסיף אותה בתוך `ProductElements.tsx` 
כאלמנט חדש בלayout.

אבל הדרך הפשוטה ביותר היא למצוא את המקום שמציגים את פרטי המוצר והמחיר ולהוסיף שם.

