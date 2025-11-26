// רישום כל התוספים הזמינים במערכת

import { PluginDefinition } from './types'

// רשימת כל התוספים המובנים
export const builtInPlugins: PluginDefinition[] = [
  // Core Plugins
  {
    slug: 'bundle-products',
    name: 'מוצר באנדל',
    description: 'מוצר שמורכב מכמה מוצרים - מוריד מהמלאי של כל מוצר',
    type: 'CORE',
    category: 'INVENTORY',
    version: '1.0.0',
    isBuiltIn: true,
    isFree: true, // חינמי
    defaultConfig: {},
    metadata: {
      menuItem: {
        icon: 'Boxes',
        labelKey: 'sidebar.bundles', // שימוש ב-i18n
        href: '/bundles',
        permission: 'products',
        section: 'productItems', // איפה להוסיף בתפריט
      },
    },
  },
  {
    slug: 'cash-on-delivery',
    name: 'תשלום במזומן',
    description: 'הוספת אפשרות תשלום במזומן בצ\'ק אאוט',
    type: 'CORE',
    category: 'PAYMENT',
    version: '1.0.0',
    isBuiltIn: true,
    isFree: true, // חינמי
    defaultConfig: {
      enabled: true,
      label: 'תשלום במזומן',
      description: 'תשלום במזומן בעת המשלוח',
    },
  },
  {
    slug: 'saturday-shutdown',
    name: 'האתר מכובה בשבת',
    description: 'כיבוי אוטומטי של האתר בשבת',
    type: 'CORE',
    category: 'OPERATIONS',
    version: '1.0.0',
    isBuiltIn: true,
    isFree: true, // חינמי
    defaultConfig: {
      enabled: true,
      message: 'האתר סגור בשבת. נשמח לראותכם מחר!',
    },
  },
  {
    slug: 'shop-the-look',
    name: 'Shop the Look',
    description: 'סימון פריטים על תמונה וקישור לכל סימון',
    type: 'CORE',
    category: 'MARKETING',
    version: '1.0.0',
    isBuiltIn: true,
    isFree: false, // בתשלום - מחיר יוגדר על ידי סופר אדמין
    price: 29.90, // מחיר ברירת מחדל (ניתן לערוך)
    defaultConfig: {},
  },
  {
    slug: 'reviews',
    name: 'ביקורות מתקדמות',
    description: 'מערכת ביקורות מתקדמת עם תמיכה בתמונות ווידאו, בדומה ל-Yotpo. כולל אימות רכישה, תגובות, Q&A ועוד',
    type: 'CORE',
    category: 'MARKETING',
    version: '1.0.0',
    isBuiltIn: true,
    isFree: true, // חינמי
    defaultConfig: {
      requireApproval: true, // דורש אישור מנהל
      allowAnonymous: false, // האם לאפשר ביקורות אנונימיות
      allowVideos: true, // האם לאפשר העלאת וידאו
      allowImages: true, // האם לאפשר העלאת תמונות
      maxImages: 5, // מקסימום תמונות לביקורת
      maxVideos: 1, // מקסימום וידאו לביקורת
      verifyPurchase: true, // האם לאמת רכישה
      enableReplies: false, // האם לאפשר תגובות (לעתיד)
      enableQnA: false, // האם לאפשר שאלות ותשובות (לעתיד)
    },
    metadata: {
      menuItem: {
        icon: 'Star',
        labelKey: 'sidebar.reviews',
        href: '/reviews',
        permission: 'products',
        section: 'marketing',
      },
      screenshots: [],
      documentation: 'מערכת ביקורות מתקדמת עם תמיכה בתמונות ווידאו',
    },
  },
  
  // Script Plugins
  {
    slug: 'google-analytics',
    name: 'Google Analytics',
    description: 'מעקב אנליטיקס של גוגל',
    type: 'SCRIPT',
    category: 'ANALYTICS',
    version: '1.0.0',
    isBuiltIn: true,
    isFree: true, // חינמי
    injectLocation: 'HEAD',
    scriptContent: `
      (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
      (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
      m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
      })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');
      
      ga('create', '{{TRACKING_ID}}', 'auto');
      ga('send', 'pageview');
    `,
    defaultConfig: {
      trackingId: '',
    },
  },
  {
    slug: 'whatsapp-floating',
    name: 'אייקון וואטסאפ צף',
    description: 'הוספת אייקון וואטסאפ צף לעמוד',
    type: 'SCRIPT',
    category: 'COMMUNICATION',
    version: '1.0.0',
    isBuiltIn: true,
    isFree: true, // חינמי
    injectLocation: 'BODY_END',
    scriptContent: `
      (function() {
        const phone = '{{PHONE_NUMBER}}';
        const message = '{{DEFAULT_MESSAGE}}';
        const position = '{{POSITION}}' || 'bottom-right';
        
        const button = document.createElement('a');
        button.href = \`https://wa.me/\${phone}?text=\${encodeURIComponent(message)}\`;
        button.target = '_blank';
        button.className = 'whatsapp-float';
        button.innerHTML = '💬';
        button.style.cssText = \`
          position: fixed;
          \${position.includes('right') ? 'right' : 'left'}: 20px;
          bottom: 20px;
          width: 60px;
          height: 60px;
          background: #25D366;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 30px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          z-index: 9999;
          text-decoration: none;
          transition: transform 0.2s;
        \`;
        
        button.addEventListener('mouseenter', () => {
          button.style.transform = 'scale(1.1)';
        });
        button.addEventListener('mouseleave', () => {
          button.style.transform = 'scale(1)';
        });
        
        document.body.appendChild(button);
      })();
    `,
    defaultConfig: {
      phoneNumber: '',
      defaultMessage: 'שלום, אני מעוניין במוצר',
      position: 'bottom-right',
    },
  },
  {
    slug: 'premium-club',
    name: 'חברי מועדון פרימיום',
    description: 'מערכת רמות מתקדמת עם הנחות, הטבות ופיצ\'רים נוספים לפי רמות (כסף, זהב, פלטינה)',
    type: 'CORE',
    category: 'MARKETING',
    version: '1.0.0',
    isBuiltIn: true,
    isFree: true,
    defaultConfig: {
      enabled: true,
      tiers: [
        {
          slug: 'silver',
          name: 'כסף',
          color: '#C0C0C0',
          priority: 1,
          minSpent: 500,
          minOrders: 3,
          discount: {
            type: 'PERCENTAGE',
            value: 5,
          },
          benefits: {
            freeShipping: false,
            earlyAccess: false,
            exclusiveProducts: false,
            birthdayGift: true,
            pointsMultiplier: 1.2,
          },
        },
        {
          slug: 'gold',
          name: 'זהב',
          color: '#FFD700',
          priority: 2,
          minSpent: 2000,
          minOrders: 10,
          discount: {
            type: 'PERCENTAGE',
            value: 10,
          },
          benefits: {
            freeShipping: true,
            earlyAccess: true,
            exclusiveProducts: false,
            birthdayGift: true,
            pointsMultiplier: 1.5,
          },
        },
        {
          slug: 'platinum',
          name: 'פלטינה',
          color: '#E5E4E2',
          priority: 3,
          minSpent: 5000,
          minOrders: 25,
          discount: {
            type: 'PERCENTAGE',
            value: 15,
          },
          benefits: {
            freeShipping: true,
            earlyAccess: true,
            exclusiveProducts: true,
            birthdayGift: true,
            pointsMultiplier: 2,
          },
        },
      ],
      benefits: {
        freeShippingThreshold: 200,
        birthdayDiscount: {
          enabled: true,
          value: 20,
          type: 'PERCENTAGE',
        },
        earlyAccessToSales: true,
        exclusiveProductsAccess: true,
        vipSupport: true,
        monthlyGift: true,
      },
      notifications: {
        tierUpgradeEmail: true,
        tierUpgradeSMS: false,
      },
    },
    metadata: {
      menuItem: {
        icon: 'Crown',
        labelKey: 'sidebar.premiumClub',
        href: '/premium-club',
        permission: 'customers',
        section: 'marketing',
      },
    },
  },
]

// פונקציה לקבלת תוסף לפי slug
export function getPluginBySlug(slug: string): PluginDefinition | undefined {
  return builtInPlugins.find(p => p.slug === slug)
}

// פונקציה לקבלת כל התוספים
export function getAllPlugins(): PluginDefinition[] {
  return builtInPlugins
}

// פונקציה לקבלת תוספים לפי קטגוריה
export function getPluginsByCategory(category: string): PluginDefinition[] {
  return builtInPlugins.filter(p => p.category === category)
}

// פונקציה לקבלת תוספים לפי סוג
export function getPluginsByType(type: 'CORE' | 'SCRIPT'): PluginDefinition[] {
  return builtInPlugins.filter(p => p.type === type)
}

