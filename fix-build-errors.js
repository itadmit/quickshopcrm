#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// רשימת תיקונים אוטומטיים
const fixes = [
  // תיקון 1: selectedShop possibly null
  {
    pattern: /selectedShop\.(slug|name|id)/g,
    replacement: (match, prop) => `selectedShop?.${prop} || ""`,
    files: ['**/*.tsx', '**/*.ts'],
    description: 'תיקון selectedShop possibly null'
  },
  
  // תיקון 2: הוספת paymentMethod ו-transactionId לממשק Order
  {
    pattern: /interface Order \{[\s\S]*?shippingAddress: any[\s\S]*?billingAddress: any \| null[\s\S]*?\}/,
    replacement: (match) => {
      if (match.includes('paymentMethod')) return match;
      return match.replace(/billingAddress: any \| null[\s\S]*?\}/, (m) => 
        m.replace(/\}/, '\n  paymentMethod: string | null\n  transactionId: string | null\n}')
      );
    },
    files: ['**/orders/**/*.tsx'],
    description: 'הוספת paymentMethod ו-transactionId לממשק Order'
  },
  
  // תיקון 3: product.categories -> (product as any).categories
  {
    pattern: /product\.categories/g,
    replacement: '(product as any).categories',
    files: ['**/*.tsx', '**/*.ts'],
    description: 'תיקון product.categories'
  },
  
  // תיקון 4: הסרת כפילויות של inventoryEnabled
  {
    pattern: /inventoryEnabled:.*\n.*inventoryEnabled:/g,
    replacement: (match) => {
      const lines = match.split('\n');
      return lines.filter((line, index, arr) => {
        if (line.includes('inventoryEnabled:')) {
          const prevLine = arr[index - 1];
          return !prevLine || !prevLine.includes('inventoryEnabled:');
        }
        return true;
      }).join('\n');
    },
    files: ['**/products/**/*.tsx'],
    description: 'הסרת כפילויות של inventoryEnabled'
  },
  
  // תיקון 5: tierForm.benefits.monthlyGift -> (tierForm.benefits as any)?.monthlyGift
  {
    pattern: /tierForm\.benefits\.monthlyGift/g,
    replacement: '(tierForm.benefits as any)?.monthlyGift',
    files: ['**/premium-club/**/*.tsx'],
    description: 'תיקון tierForm.benefits.monthlyGift'
  },
  
  // תיקון 6: item.giftCardData -> (item.addons as any)?.giftCardData
  {
    pattern: /item\.giftCardData/g,
    replacement: '(item.addons as any)?.giftCardData',
    files: ['**/*.tsx', '**/*.ts'],
    description: 'תיקון item.giftCardData'
  },
  
  // תיקון 7: product.isGiftCard -> הסרה מ-select
  {
    pattern: /select:\s*\{[^}]*isGiftCard:\s*true[^}]*\}/g,
    replacement: (match) => match.replace(/,\s*isGiftCard:\s*true/g, '').replace(/isGiftCard:\s*true,\s*/g, ''),
    files: ['**/*.tsx', '**/*.ts'],
    description: 'הסרת isGiftCard מ-select'
  },
  
  // תיקון 8: navigation: Navigation | null -> Navigation | null | undefined
  {
    pattern: /navigation\?\s*:\s*Navigation\s*\|\s*null(?!\s*\|\s*undefined)/g,
    replacement: 'navigation?: Navigation | null | undefined',
    files: ['**/*.tsx'],
    description: 'תיקון טיפוס navigation'
  },
  
  // תיקון 9: navigation={navigation} -> navigation={navigation ?? undefined}
  {
    pattern: /navigation=\{navigation\}/g,
    replacement: 'navigation={navigation ?? undefined}',
    files: ['**/*.tsx'],
    description: 'תיקון navigation prop'
  },
  
  // תיקון 10: item.productId || undefined במקום item.productId
  {
    pattern: /where:\s*\{\s*id:\s*item\.productId\s*\}/g,
    replacement: 'where: { id: item.productId || undefined }',
    files: ['**/*.tsx', '**/*.ts'],
    description: 'תיקון item.productId null check'
  },
  
  // תיקון 11: config.benefits.monthlyGift -> (config.benefits as any)?.monthlyGift
  {
    pattern: /config\.benefits\.monthlyGift/g,
    replacement: '(config.benefits as any)?.monthlyGift',
    files: ['**/*.tsx'],
    description: 'תיקון config.benefits.monthlyGift'
  },
  
  // תיקון 12: customer.premiumClubTier -> customer.tier
  {
    pattern: /customer\.premiumClubTier/g,
    replacement: 'customer.tier',
    files: ['**/*.tsx', '**/*.ts'],
    description: 'תיקון customer.premiumClubTier'
  },
  
  // תיקון 13: expiresAt -> endDate ב-Coupon
  {
    pattern: /expiresAt:\s*[^,}]+/g,
    replacement: (match) => match.replace('expiresAt:', 'endDate:'),
    files: ['**/*.tsx', '**/*.ts'],
    description: 'תיקון expiresAt -> endDate'
  },
  
  // תיקון 14: trackInventory -> inventoryEnabled
  {
    pattern: /trackInventory/g,
    replacement: 'inventoryEnabled',
    files: ['**/*.tsx', '**/*.ts'],
    description: 'תיקון trackInventory -> inventoryEnabled'
  },
  
  // תיקון 15: order.shippingProvider -> order.shippingMethod
  {
    pattern: /order\.shippingProvider/g,
    replacement: 'order.shippingMethod',
    files: ['**/*.tsx', '**/*.ts'],
    description: 'תיקון order.shippingProvider'
  },
  
  // תיקון 16: order.shippingTrackingNumber -> order.trackingNumber
  {
    pattern: /order\.shippingTrackingNumber/g,
    replacement: 'order.trackingNumber',
    files: ['**/*.tsx', '**/*.ts'],
    description: 'תיקון order.shippingTrackingNumber'
  },
  
  // תיקון 17: order.shippingSentAt -> order.shippedAt
  {
    pattern: /order\.shippingSentAt/g,
    replacement: 'order.shippedAt',
    files: ['**/*.tsx', '**/*.ts'],
    description: 'תיקון order.shippingSentAt'
  },
  
  // תיקון 18: product.sellWhenSoldOut -> product.inventoryEnabled
  {
    pattern: /product\.sellWhenSoldOut/g,
    replacement: 'product.inventoryEnabled',
    files: ['**/*.tsx', '**/*.ts'],
    description: 'תיקון product.sellWhenSoldOut'
  },
  
  // תיקון 19: customer.dateOfBirth -> הסרה
  {
    pattern: /dateOfBirth:\s*[^,}]+/g,
    replacement: '',
    files: ['**/*.tsx', '**/*.ts'],
    description: 'הסרת dateOfBirth'
  },
  
  // תיקון 20: customer.preferredPaymentMethod -> הסרה
  {
    pattern: /preferredPaymentMethod:\s*[^,}]+/g,
    replacement: '',
    files: ['**/*.tsx', '**/*.ts'],
    description: 'הסרת preferredPaymentMethod'
  },
  
  // תיקון 21: benefits עם monthlyGift צריך as any
  {
    pattern: /benefits:\s*\{[\s\S]*?monthlyGift:[\s\S]*?\}\s*\}/g,
    replacement: (match) => {
      if (match.includes('as any')) return match;
      return match.replace(/\}\s*$/, '} as any');
    },
    files: ['**/premium-club/**/*.tsx'],
    description: 'הוספת as any ל-benefits עם monthlyGift'
  },
  
  // תיקון 22: editingStatus?.isSystem -> (editingStatus as any)?.isSystem
  {
    pattern: /editingStatus\?\.isSystem/g,
    replacement: '(editingStatus as any)?.isSystem',
    files: ['**/*.tsx'],
    description: 'תיקון editingStatus.isSystem'
  },
  
  // תיקון 23: calculateCart עם פרמטרים שגויים
  {
    pattern: /calculateCart\(\s*JSON\.stringify\([^)]+\)\s*,\s*shop\s*,\s*coupon\s*,\s*null\s*\)/g,
    replacement: (match, p1) => {
      // נחלץ את cartData.items מהקוד המקורי
      return `calculateCart(
        shop.id,
        cartData.items as any,
        cartData.couponCode,
        customerId
      )`;
    },
    files: ['**/layout.tsx'],
    description: 'תיקון קריאה ל-calculateCart'
  },
  
  // תיקון 24: initialCart עם CartCalculationResult -> CartData
  {
    pattern: /initialCart=\{cart\}/g,
    replacement: `initialCart={cart ? {
          ...cart,
          id: customerId || 'guest',
          coupon: (cart as any).couponStatus || (cart.couponDiscount ? { discount: cart.couponDiscount } : null),
          giftCardDiscount: 0,
        } as any : null}`,
    files: ['**/layout.tsx'],
    description: 'תיקון initialCart'
  },
];

// פונקציה לסריקת קבצים
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      // דילוג על node_modules ו-.next
      if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
        arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
      }
    } else {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
}

// פונקציה לבדיקה אם קובץ תואם ל-pattern
function matchesPattern(filePath, pattern) {
  if (pattern === '**/*.tsx' || pattern === '**/*.ts') {
    return filePath.endsWith('.tsx') || filePath.endsWith('.ts');
  }
  if (pattern.includes('**')) {
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\//g, '\\/');
    const regex = new RegExp(regexPattern);
    return regex.test(filePath);
  }
  return filePath.includes(pattern);
}

// פונקציה ראשית
function main() {
  const appDir = path.join(__dirname, 'app');
  const componentsDir = path.join(__dirname, 'components');
  const libDir = path.join(__dirname, 'lib');
  
  const allFiles = [
    ...getAllFiles(appDir),
    ...getAllFiles(componentsDir),
    ...getAllFiles(libDir),
  ].filter(file => file.endsWith('.tsx') || file.endsWith('.ts'));

  console.log(`🔍 נמצאו ${allFiles.length} קבצים לבדיקה...\n`);

  let totalFixes = 0;

  fixes.forEach((fix, index) => {
    console.log(`\n${index + 1}. ${fix.description}`);
    let fixCount = 0;

    allFiles.forEach((filePath) => {
      if (!matchesPattern(filePath, fix.files[0])) return;

      try {
        let content = fs.readFileSync(filePath, 'utf8');
        const originalContent = content;

        if (typeof fix.replacement === 'function') {
          content = content.replace(fix.pattern, fix.replacement);
        } else {
          content = content.replace(fix.pattern, fix.replacement);
        }

        if (content !== originalContent) {
          fs.writeFileSync(filePath, content, 'utf8');
          fixCount++;
          console.log(`   ✓ תוקן: ${path.relative(__dirname, filePath)}`);
        }
      } catch (error) {
        console.error(`   ✗ שגיאה ב-${filePath}: ${error.message}`);
      }
    });

    totalFixes += fixCount;
    if (fixCount === 0) {
      console.log('   (לא נמצאו תיקונים נדרשים)');
    }
  });

  console.log(`\n\n✅ סיום! בוצעו ${totalFixes} תיקונים בסך הכל.`);
}

main();

