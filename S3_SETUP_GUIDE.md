# מדריך הגדרת AWS S3 להעלאת קבצים

## שלב 1: יצירת S3 Bucket

1. היכנס ל-AWS Console ולך ל-S3
2. לחץ על **"Create bucket"**
3. מלא את הפרטים:
   - **Bucket name**: `quickshop-storage` (או שם אחר, חייב להיות ייחודי גלובלית)
   - **AWS Region**: בחר את האזור הקרוב אליך (למשל `us-east-1` או `eu-central-1`)
   - **Object Ownership**: השאר את ברירת המחדל
   - **Block Public Access**: אם אתה רוצה שהקבצים יהיו נגישים ציבורית, בטל את הסימון. אחרת, השאר מסומן.
4. לחץ **"Create bucket"**

## שלב 2: יצירת IAM User עם הרשאות

1. היכנס ל-IAM Console
2. לחץ על **"Users"** בתפריט השמאלי
3. לחץ על **"Create user"**
4. מלא:
   - **User name**: `quickshop-s3-user` (או שם אחר)
   - לחץ **"Next"**
5. ב-**"Set permissions"**:
   - בחר **"Attach policies directly"**
   - חפש `AmazonS3FullAccess` או צור policy מותאם אישית:
   
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "s3:PutObject",
           "s3:GetObject",
           "s3:DeleteObject",
           "s3:ListBucket"
         ],
         "Resource": [
           "arn:aws:s3:::YOUR_BUCKET_NAME/*",
           "arn:aws:s3:::YOUR_BUCKET_NAME"
         ]
       }
     ]
   }
   ```
   (החלף `YOUR_BUCKET_NAME` בשם ה-bucket שיצרת)
6. לחץ **"Next"** ואז **"Create user"**

## שלב 3: יצירת Access Keys

1. לחץ על המשתמש שיצרת
2. לחץ על הטאב **"Security credentials"**
3. גלול למטה ל-**"Access keys"**
4. לחץ על **"Create access key"**
5. בחר **"Application running outside AWS"**
6. לחץ **"Next"** ואז **"Create access key"**
7. **חשוב!** העתק את:
   - **Access key ID**
   - **Secret access key** (תראה רק פעם אחת!)

## שלב 4: הגדרת משתני סביבה

הוסף לקובץ `.env` שלך:

```env
# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=quickshop-storage
AWS_ACCESS_KEY_ID=YOUR_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=YOUR_SECRET_ACCESS_KEY
```

החלף:
- `AWS_REGION` - האזור שבו יצרת את ה-bucket
- `AWS_S3_BUCKET_NAME` - שם ה-bucket שיצרת
- `AWS_ACCESS_KEY_ID` - ה-Access Key ID שקיבלת
- `AWS_SECRET_ACCESS_KEY` - ה-Secret Access Key שקיבלת

## שלב 5: הגדרת Bucket Policy (אופציונלי - אם רוצים גישה ציבורית)

אם אתה רוצה שהקבצים יהיו נגישים ציבורית (למשל תמונות מוצרים):

1. לך ל-S3 Console
2. בחר את ה-bucket שלך
3. לחץ על הטאב **"Permissions"**
4. גלול למטה ל-**"Bucket policy"**
5. לחץ **"Edit"** והדבק:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/*"
    }
  ]
}
```

(החלף `YOUR_BUCKET_NAME` בשם ה-bucket שלך)

6. לחץ **"Save changes"**

**אזהרה**: זה יאפשר גישה ציבורית לכל הקבצים ב-bucket. אם אתה רוצה פרטיות, דלג על שלב זה.

## שלב 6: בדיקה

לאחר שהגדרת את כל המשתנים:

1. הפעל מחדש את שרת הפיתוח (`npm run dev`)
2. נסה להעלות קובץ (למשל favicon או לוגו)
3. בדוק ב-S3 Console שהקובץ הועלה בהצלחה

## הערות חשובות

- **אבטחה**: לעולם אל תפרסם את ה-Access Keys שלך ב-GitHub או במקומות ציבוריים
- **עלויות**: S3 גובה תשלום לפי שימוש. בדוק את המחירים ב-AWS
- **גיבוי**: הקבצים נשמרים ב-S3, אבל כדאי לשקול גיבוי נוסף
- **Fallback**: אם S3 לא מוגדר, המערכת תשתמש בשמירה מקומית

## פתרון בעיות

### שגיאה: "Access Denied"
- ודא שה-IAM user יש לו את ההרשאות הנכונות
- ודא שה-bucket policy מאפשר את הפעולות הנדרשות

### שגיאה: "Bucket not found"
- ודא ש-`AWS_S3_BUCKET_NAME` תואם בדיוק לשם ה-bucket
- ודא שה-`AWS_REGION` נכון

### שגיאה: "Invalid credentials"
- ודא שה-Access Keys נכונים
- ודא שאין רווחים מיותרים ב-`.env`

