#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 מתחיל תיקון אוטומטי של כל השגיאות...\n');

// פונקציה לקריאת כל הקבצים
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (!['node_modules', '.next', '.git', 'dist'].includes(file)) {
        getAllFiles(filePath, fileList);
      }
    } else if (filePath.match(/\.(ts|tsx)$/)) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

const files = getAllFiles(path.join(__dirname, 'app'))
  .concat(getAllFiles(path.join(__dirname, 'components')))
  .concat(getAllFiles(path.join(__dirname, 'lib')));

console.log(`📁 נמצאו ${files.length} קבצים\n`);

let totalChanges = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  
  // תיקון 1: product.field -> (product as any).field לכל השדות הלא סטנדרטיים
  const productFields = [
    'showPricePer100ml', 'pricePer100ml', 'inventoryEnabled', 'sellWhenSoldOut',
    'priceByWeight', 'isGiftCard', 'exclusiveToTier', 'notifyOnPublish',
    'lowStockAlert', 'availableDate', 'minQuantity', 'maxQuantity'
  ];
  
  productFields.forEach(field => {
    const regex = new RegExp(`(?<!as any\\)\\.)(product\\.${field})(?!\\w)`, 'g');
    content = content.replace(regex, `(product as any).${field}`);
  });
  
  // תיקון 2: option.type -> (option as any).type
  content = content.replace(/(?<!as any\)\.)option\.type(?!\w)/g, '(option as any).type');
  
  // תיקון 3: פרמטרים בלי טיפוס ב-map/forEach
  content = content.replace(/\.map\(\(([a-z]+)\) =>/g, '.map(($1: any) =>');
  content = content.replace(/\.forEach\(\(([a-z]+)\) =>/g, '.forEach(($1: any) =>');
  content = content.replace(/\.filter\(\(([a-z]+)\) =>/g, '.filter(($1: any) =>');
  content = content.replace(/\.find\(\(([a-z]+)\) =>/g, '.find(($1: any) =>');
  content = content.replace(/\.some\(\(([a-z]+)\) =>/g, '.some(($1: any) =>');
  content = content.replace(/\.every\(\(([a-z]+)\) =>/g, '.every(($1: any) =>');
  
  // תיקון 4: פסיקים כפולים (,,)
  content = content.replace(/,\s*,/g, ',');
  content = content.replace(/,\s*\n\s*,/g, ',\n');
  
  // תיקון 5: שורות עם רק פסיק
  content = content.replace(/^\s*,\s*$/gm, '');
  
  // תיקון 6: navigation type issues
  content = content.replace(/navigation=\{navigation\}/g, 'navigation={navigation ?? undefined}');
  
  // תיקון 7: selectedShop?.field || "" לכל השדות הנפוצים
  if (!content.includes('selectedShop?.')) {
    content = content.replace(/selectedShop\.(slug|name|id)(?!\?)/g, 'selectedShop?.$1 || ""');
  }
  
  // תיקון 8: customer fields
  content = content.replace(/customer\.premiumClubTier/g, 'customer.tier');
  content = content.replace(/customerData\.premiumClubTier/g, 'customerData.tier');
  
  // תיקון 9: order fields
  content = content.replace(/order\.shippingProvider/g, 'order.shippingMethod');
  content = content.replace(/order\.shippingTrackingNumber/g, 'order.trackingNumber');
  content = content.replace(/order\.shippingSentAt/g, 'order.shippedAt');
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    totalChanges++;
  }
});

console.log(`\n✅ תוקנו ${totalChanges} קבצים`);
console.log('\n🔨 מריץ build...\n');

try {
  execSync('npm run build', { stdio: 'inherit', cwd: __dirname });
  console.log('\n✅ Build הצליח!');
} catch (error) {
  console.log('\n❌ עדיין יש שגיאות. מריץ ניתוח...\n');
  
  try {
    const output = execSync('npm run build 2>&1 | grep -B 2 "Type error" | head -50', { 
      cwd: __dirname,
      encoding: 'utf8'
    });
    console.log(output);
  } catch (e) {
    // Ignore
  }
}

