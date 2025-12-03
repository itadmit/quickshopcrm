# מסמך הסבר: שינוי מבני - החלפת Collections ב-Categories

## סקירה כללית

בוצע שינוי מבני מקיף במערכת להסרת מושג ה-"Collections" (אוספים) והחלפתו ב-"Categories" (קטגוריות) בלבד. השינוי נוגע לכל שכבות המערכת: מסד הנתונים, API routes, קומפוננטות פרונט-אנד ואדמין.

## רקע והקשר

### המצב הקודם

המערכת תמכה בשני מושגים דומים:
- **Collections** - אוספים של מוצרים (תמיכה ב-automatic rules)
- **Categories** - קטגוריות של מוצרים (מבנה פשוט יותר)

הקיום של שני מושגים דומים יצר:
- בלבול בקוד ובממשק המשתמש
- כפילות בפונקציונליות
- קושי בתחזוקה

### המצב החדש

המערכת תומכת כעת רק ב-**Categories** (קטגוריות):
- מבנה פשוט וברור
- תמיכה מלאה בכל הפונקציות הנדרשות
- קוד נקי ונוח לתחזוקה

## מבנה מסד הנתונים

### מודלים שהוסרו (עדיין קיימים ב-schema.prisma אך לא בשימוש)

```prisma
model Collection {
  id             String              @id @default(cuid())
  shopId         String
  name           String
  slug           String
  description    String?
  image          String?
  type           CollectionType      @default(MANUAL)  // MANUAL או AUTOMATIC
  isPublished    Boolean             @default(true)
  rules          Json?               // כללי אוטומטומציה
  seoTitle       String?
  seoDescription String?
  createdAt      DateTime            @default(now())
  updatedAt      DateTime            @updatedAt
  shop           Shop                @relation(fields: [shopId], references: [id], onDelete: Cascade)
  products       ProductCollection[]
}

model ProductCollection {
  id           String     @id @default(cuid())
  productId    String
  collectionId String
  position     Int        @default(0)
  collection   Collection @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  product      Product    @relation(fields: [productId], references: [id], onDelete: Cascade)
  @@unique([productId, collectionId])
  @@map("product_collections")
}
```

### מודלים שנשארו בשימוש

```prisma
model Category {
  id             String           @id @default(cuid())
  shopId         String
  name           String
  slug           String
  description    String?
  image          String?
  isPublished   Boolean          @default(true)
  seoTitle      String?
  seoDescription String?
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt
  shop           Shop             @relation(fields: [shopId], references: [id], onDelete: Cascade)
  products       ProductCategory[]
}

model ProductCategory {
  id         String   @id @default(cuid())
  productId  String
  categoryId String
  position   Int      @default(0)
  category   Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  product    Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  @@unique([productId, categoryId])
  @@map("product_categories")
}
```

### הבדלים עיקריים

1. **Automatic Rules**: Collections תמכו ב-automatic rules (כללי אוטומציה), Categories לא תומכות בזה
2. **Type Field**: Collections היו יכולים להיות MANUAL או AUTOMATIC, Categories תמיד MANUAL
3. **Rules JSON**: Collections תמכו ב-JSON rules, Categories לא

## שינויים בקבצים

### 1. API Routes

#### קבצים שעודכנו:

**`app/api/products/route.ts`**
- שינוי `where.collections` ל-`where.categories`
- שינוי `select` מ-`collections` ל-`categories`
- שינוי יצירת `ProductCollection` ל-`ProductCategory`

**`app/api/products/[id]/route.ts`**
- שינוי `include.collections` ל-`include.categories`
- עדכון לוגיקת עדכון קשרים מ-`ProductCollection` ל-`ProductCategory`

**`app/api/storefront/[slug]/products/route.ts`**
- תמיכה ב-`category` parameter במקום `collection`
- שינוי query מ-`collections` ל-`categories`

**`app/api/storefront/[slug]/categories/route.ts`**
- שינוי מ-`prisma.collection` ל-`prisma.category`
- עדכון שדות ה-select להתאים ל-Category model

**`app/api/storefront/[slug]/categories/[id]/route.ts`**
- שינוי מ-`prisma.collection` ל-`prisma.category`
- הסרת המרה ל-"category format" (כי זה כבר category)

**`app/api/categories/route.ts`**
- הוספת POST method ליצירת קטגוריות חדשות

**`app/api/products/[id]/automatic-categories/route.ts`** (הוחלף מ-automatic-collections)
- מחזיר רשימה ריקה (קטגוריות לא תומכות ב-automatic rules)

#### קבצים שהוסרו/שונו:

- `app/api/products/[id]/automatic-collections/route.ts` → הוחלף ב-`automatic-categories/route.ts`

### 2. Frontend Components

#### קבצים שעודכנו:

**`app/shop/[slug]/categories/[id]/page.tsx`**
- שינוי query parameter מ-`collection` ל-`category`
- עדכון `AdminBar` pageType ל-"category"

**`app/shop/[slug]/products/[id]/page.tsx`**
- שינוי `include.collections` ל-`include.categories`
- עדכון `productCategoryIds` להשתמש ב-`product.categories`

**`app/shop/[slug]/ShopPageClient.tsx`**
- עדכון `NavigationItem` interface להסיר `collectionId` ו-`collectionSlug`
- הוספת `categoryId` ו-`categorySlug`

**`components/storefront/AdminBar.tsx`**
- שינוי `pageType` מ-"collection" ל-"category"
- הסרת `collectionId` prop, הוספת `categoryId`

**`components/storefront/MegaMenu.tsx`**
- עדכון `NavigationItem` interface
- הסרת לוגיקה לטיפול ב-collections

**`components/storefront/StorefrontHeader.tsx`**
- עדכון `NavigationItem` interface
- הסרת לוגיקה לטיפול ב-collections

**`components/storefront/NotFoundPage.tsx`**
- הסרת `collection` type מ-`NotFoundPageProps`

### 3. Admin Components

#### קבצים שעודכנו:

**`app/products/page.tsx`**
- שינוי `collectionFilter` ל-`categoryFilter`
- שינוי `collections` state ל-`categories`
- עדכון `fetchCollections` ל-`fetchCategories`
- עדכון כל ה-references מ-`collections` ל-`categories`
- עדכון תצוגת קטגוריות בטבלה

**`app/products/[slug]/edit/page.tsx`**
- שינוי `data.collections` ל-`data.categories`
- עדכון mapping מ-`collectionId` ל-`categoryId`

**`components/products/CategoriesCard.tsx`**
- שינוי `automaticCollections` ל-`automaticCategories`
- עדכון API calls מ-`/api/collections` ל-`/api/categories`
- עדכון `fetchAutomaticCategories` להשתמש ב-`/api/products/${productId}/automatic-categories`

**`components/navigation/NavigationItemEditor.tsx`**
- הסרת `collectionId` ו-`collectionSlug` מ-`NavigationItem` interface
- הסרת `collectionSearchQueries`, `collectionSearchResults`, `loadingCollections`
- הסרת `SelectItem` עבור "COLLECTION" type
- הסרת כל הלוגיקה הקשורה ל-collections

**`app/navigation/page.tsx`**
- עדכון `NavigationItem` interface
- הסרת states ו-functions הקשורים ל-collections
- עדכון `updateItem` logic להסיר תמיכה ב-COLLECTION type

**`components/Sidebar.tsx`**
- שינוי href מ-`/collections` ל-`/categories`
- שינוי permission מ-`collections` ל-`categories`
- עדכון permissions object

### 4. Library Files

#### קבצים שעודכנו:

**`lib/navigation-server.ts`**
- הסרת `collectionId` ו-`collectionSlug` מ-`NavigationItem` interface
- הסרת `type: "collection"` מ-`NavigationItem` type
- הסרת כל הלוגיקה לטיפול ב-collections ב-`transformChildren` ו-`transformItem`

**`lib/cart-calculations.ts`**
- עדכון `SPECIFIC_COLLECTIONS` target להשתמש ב-`categories` במקום `collections`
- עדכון `EXCLUDE_COLLECTIONS` target להשתמש ב-`categories` במקום `collections`
- הוספת הערות על תאימות לאחור

### 5. Discounts Pages

#### קבצים שעודכנו:

**`app/discounts/new/page.tsx`**
- הסרת `Collection` interface
- הסרת `collections`, `selectedCollections`, `collectionSearch` states
- הסרת `fetchCollections` function
- הסרת `filteredCollections`
- הסרת `SPECIFIC_COLLECTIONS` ו-`EXCLUDE_COLLECTIONS` options
- הסרת UI לבחירת collections
- עדכון `applicableCollections` ו-`excludedCollections` להשתמש ב-`selectedCategories`

**`app/discounts/[id]/edit/page.tsx`**
- אותם שינויים כמו ב-`new/page.tsx`
- עדכון לוגיקת טעינת נתונים קיימים להשתמש ב-`selectedCategories`

## תאימות לאחור (Backward Compatibility)

### Discounts

בקוד ה-discounts, נשמר תאימות לאחור:
- `SPECIFIC_COLLECTIONS` ו-`EXCLUDE_COLLECTIONS` targets עדיין נתמכים
- כאשר משתמשים ב-targets אלה, המערכת משתמשת ב-`categories` במקום `collections`
- השדות `applicableCollections` ו-`excludedCollections` עדיין קיימים ב-database, אבל ממופים ל-categories

### Navigation

- פריטי navigation קיימים מסוג COLLECTION עדיין יכולים להיות ב-database
- הקוד מטפל בהם כ-categories (אם יש categoryId)

## שינויים ב-URLs ו-Routes

### Routes שעודכנו:

- `/collections` → `/categories` (בסיידבר)
- `/api/collections` → `/api/categories`
- `/api/products/[id]/automatic-collections` → `/api/products/[id]/automatic-categories`

### Routes שנשארו (לתאימות):

- `/app/collections/*` - עדיין קיים אך לא בשימוש פעיל
- `/app/api/collections/*` - עדיין קיים אך לא בשימוש פעיל

## השלכות השינוי

### יתרונות

1. **פשטות**: מבנה אחד במקום שניים
2. **בהירות**: פחות בלבול בקוד ובממשק
3. **תחזוקה**: קל יותר לתחזק קוד אחד
4. **ביצועים**: פחות queries למסד הנתונים

### מגבלות

1. **Automatic Rules**: קטגוריות לא תומכות ב-automatic rules כמו collections
   - פתרון: אם נדרש, ניתן להוסיף תמיכה ב-automatic rules ל-categories בעתיד

2. כרגע, `/api/products/[id]/automatic-categories` מחזיר רשימה ריקה.

2. **מיגרציה**: אם יש נתונים קיימים ב-Collections, צריך לבצע מיגרציה
   - פתרון: ניתן לכתוב script מיגרציה שיעביר נתונים מ-Collections ל-Categories

## שלבים עתידיים (מומלץ)

1. **מיגרציה של נתונים**: כתיבת script להעברת נתונים מ-Collections ל-Categories
2. **הסרת מודלים**: הסרת `Collection` ו-`ProductCollection` מ-schema.prisma
3. **ניקוי קבצים**: מחיקת קבצי `/app/collections` ו-`/app/api/collections` אם לא נדרשים
4. **תמיכה ב-Automatic Rules**: הוספת תמיכה ב-automatic rules ל-Categories אם נדרש

## סיכום

השינוי הגדול שבוצע הוא החלפה מלאה של מושג ה-Collections ב-Categories בכל שכבות המערכת. השינוי שומר על תאימות לאחור במקומות הנדרשים (כמו discounts) ומפשט את המבנה הכללי של המערכת.

הקוד כעת נקי יותר, קל יותר לתחזוקה, ומובן יותר למפתחים חדשים.

---

**תאריך השינוי**: דצמבר 2024  
**גרסה**: 1.0  
**מחבר**: AI Assistant


