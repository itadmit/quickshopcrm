# מדריך שימוש - Custom Fields (שדות מותאמים אישית)

## 📋 מהם Custom Fields?

Custom Fields מאפשרים לך להוסיף שדות נוספים למוצרים שלך, מעבר לשדות הסטנדרטיים.  
לדוגמה: מרכיבים, הוראות כביסה, מדינת ייצור, וכו'.

---

## 🚀 התחלה מהירה

### שלב 1: יצירת שדה חדש

1. היכנס ל-**הגדרות → שדות מותאמים** (`/settings/custom-fields`)
2. לחץ על **"שדה חדש"**
3. מלא את הפרטים:
   - **שם השדה**: התווית שתוצג (לדוגמה: "מרכיבים")
   - **מזהה ייחודי**: מזהה באנגלית (לדוגמה: `ingredients`)
   - **סוג שדה**: בחר את הסוג המתאים (טקסט, תאריך, צבע וכו')
   - **תחום**: גלובלי (כל המוצרים) או קטגוריה (מוצרים ספציפיים)
   - **הצג בחנות**: סמן אם תרצה שהשדה יופיע בדף המוצר
4. לחץ **"שמור"**

### שלב 2: מילוי ערכים במוצרים

1. פתח עריכת מוצר (`/products/[slug]/edit`)
2. גלול למטה - תראה קארד **"שדות מותאמים אישית"**
3. מלא את הערכים הרלוונטיים
4. שמור את המוצר

---

## 🎨 סוגי שדות נתמכים

| סוג | תיאור | דוגמה |
|-----|--------|-------|
| **טקסט** | שדה טקסט רגיל | "כותנה 100%" |
| **טקסט עשיר** | שדה טקסט רב שורות | תיאור ארוך |
| **תאריך** | בורר תאריך | תאריך ייצור |
| **צבע** | בורר צבע | #FF5733 |
| **תיבת סימון** | כן/לא | "מתאים לצמחונים" |
| **מספר** | מספר | משקל, גובה |
| **קישור** | URL | קישור למדריך |
| **קובץ** | נתיב לקובץ | מדריך הרכבה PDF |

---

## 🎯 תכונות מתקדמות

### Namespaces (מרחבי שמות)

מאפשר לארגן שדות לקבוצות:
- `custom` - שדות כלליים (ברירת מחדל)
- `product` - שדות ספציפיים למוצר
- `shipping` - שדות משלוח
- `care` - הוראות טיפול

**דוגמה:**
- `custom.ingredients` → מרכיבים
- `care.washing_instructions` → הוראות כביסה
- `shipping.origin_country` → מדינת מקור

### תחום (Scope)

**גלובלי (GLOBAL)**:
- השדה יופיע בכל המוצרים

**קטגוריה (CATEGORY)**:
- השדה יופיע רק במוצרים מקטגוריות ספציפיות
- לדוגמה: "גודל טבעת" רק בקטגוריית "תכשיטים"

### שדה חובה

סמן "שדה חובה" כדי לדרוש מילוי של השדה בכל מוצר.

---

## 📡 API Endpoints

### Custom Field Definitions

```bash
# קבלת כל ההגדרות
GET /api/custom-fields?shopId={shopId}&namespace={namespace}&scope={scope}

# יצירת הגדרה חדשה
POST /api/custom-fields
Body: {
  shopId, namespace, key, label, type, description,
  required, scope, categoryIds, showInStorefront
}

# עדכון הגדרה
PUT /api/custom-fields/[id]
Body: { label, description, required, scope, categoryIds, showInStorefront }

# מחיקת הגדרה
DELETE /api/custom-fields/[id]
```

### Custom Field Values (ערכים במוצרים)

```bash
# קבלת כל הערכים של מוצר
GET /api/products/[id]/custom-fields

# הגדרת ערך בודד
POST /api/products/[id]/custom-fields
Body: { definitionId, value }

# עדכון קבוצתי של ערכים
PUT /api/products/[id]/custom-fields
Body: [{ definitionId, value }, ...]
```

---

## 🧩 שילוב ב-Components

### שימוש ב-CustomFieldsCard Component

```tsx
import { CustomFieldsCard } from "@/components/products/CustomFieldsCard"

// במצב עריכה (עם productId)
<CustomFieldsCard
  productId={product.id}
  shopId={shop.id}
/>

// במצב יצירה חדשה
<CustomFieldsCard
  shopId={shop.id}
  categoryIds={selectedCategories}
  values={initialValues}
  onChange={(values) => {
    // Handle value changes
    setCustomFieldValues(values)
  }}
/>
```

---

## 💡 דוגמאות שימוש

### דוגמה 1: חנות בגדים

```
שדה: "חומר"
סוג: טקסט
תחום: קטגוריה (בגדים)
הצג בחנות: ✓

שדה: "הוראות כביסה"
סוג: טקסט עשיר
תחום: קטגוריה (בגדים)
הצג בחנות: ✓

שדה: "עמיד למים"
סוג: תיבת סימון
תחום: גלובלי
הצג בחנות: ✓
```

### דוגמה 2: חנות תכשיטים

```
שדה: "גודל טבעת"
סוג: מספר
תחום: קטגוריה (טבעות)
הצג בחנות: ✓

שדה: "קרט"
סוג: מספר
תחום: קטגוריה (תכשיטים)
הצג בחנות: ✓

שדה: "תעודת אמינות"
סוג: קובץ
תחום: קטגוריה (תכשיטים יקרים)
הצג בחנות: ✓
```

### דוגמה 3: חנות מזון

```
שדה: "מרכיבים"
סוג: טקסט עשיר
namespace: custom
הצג בחנות: ✓

שדה: "תאריך תפוגה"
סוג: תאריך
namespace: product
הצג בחנות: ✓

שדה: "כשר"
סוג: תיבת סימון
namespace: custom
הצג בחנות: ✓

שדה: "מדינת ייצור"
סוג: טקסט
namespace: shipping
הצג בחנות: ✓
```

---

## 🔒 עקרונות ביצועים

הפיצ'ר בנוי לפי העקרונות ב-`PERFORMANCE_PRINCIPLES.md`:

1. **Server Components** - טעינת הגדרות בשרת
2. **Promise.all** - טעינה מקבילית של definitions + values
3. **No Cache Headers** - הדפדפן מחליט
4. **Conditional Rendering** - הקארד מוצג רק אם יש שדות

---

## ⚠️ הערות חשובות

1. **מזהה ייחודי**: לא ניתן לשנות את ה-`key` אחרי יצירת השדה
2. **מחיקת שדה**: מוחקת גם את כל הערכים במוצרים
3. **שדה חובה**: לא נאכף ברמת ה-API (רק UI validation)
4. **Namespace**: רק אותיות אנגליות קטנות, מספרים וקו תחתון

---

## 🚧 תכונות עתידיות

- [ ] Validation rules (מינימום/מקסימום, regex)
- [ ] Default values
- [ ] Conditional display (תלות בשדות אחרים)
- [ ] Bulk edit (עריכה קבוצתית של ערכים)
- [ ] Import/Export של הגדרות
- [ ] Product Add-ons (תוספות בתשלום)

---

**עודכן:** 14 בנובמבר 2025  
**גרסה:** 1.0

