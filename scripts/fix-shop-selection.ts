#!/usr/bin/env ts-node

/**
 * Script to fix all "select shop" messages and make shop selection automatic
 * This script updates all files to use the first shop automatically if no shop is selected
 */

import * as fs from 'fs';
import * as path from 'path';
// @ts-ignore
import { glob } from 'glob';

const filesToFix = [
  'app/collections/new/page.tsx',
  'app/collections/[slug]/page.tsx',
  'app/discounts/page.tsx',
  'app/discounts/new/page.tsx',
  'app/discounts/[id]/edit/page.tsx',
  'app/coupons/page.tsx',
  'app/coupons/new/page.tsx',
  'app/coupons/[id]/edit/page.tsx',
  'app/popups/page.tsx',
  'app/popups/new/page.tsx',
  'app/popups/[id]/edit/page.tsx',
  'app/pages/page.tsx',
  'app/pages/new/page.tsx',
  'app/pages/[slug]/edit/page.tsx',
  'app/automations/page.tsx',
  'app/automations/new/page.tsx',
  'app/bundles/page.tsx',
  'app/bundles/new/page.tsx',
  'app/bundles/[id]/edit/page.tsx',
  'app/gift-cards/page.tsx',
  'app/gift-cards/new/page.tsx',
  'app/gift-cards/[id]/edit/page.tsx',
  'app/store-credits/page.tsx',
  'app/store-credits/new/page.tsx',
  'app/store-credits/[id]/edit/page.tsx',
  'app/size-charts/page.tsx',
  'app/size-charts/new/page.tsx',
  'app/size-charts/[id]/edit/page.tsx',
  'app/tracking-pixels/page.tsx',
  'app/tracking-pixels/new/page.tsx',
  'app/blog/page.tsx',
  'app/blog/[id]/edit/page.tsx',
  'app/blog/new/page.tsx',
  'app/premium-club/page.tsx',
  'app/traffic-sources/page.tsx',
  'app/abandoned-carts/page.tsx',
  'app/reviews/page.tsx',
  'app/webhooks/page.tsx',
  'app/webhooks/new/page.tsx',
  'app/webhooks/[id]/edit/page.tsx',
  'app/returns/page.tsx',
  'app/returns/[id]/page.tsx',
  'app/waitlist/page.tsx',
  'app/appearance/page.tsx',
  'app/analytics/page.tsx',
  'app/navigation/page.tsx',
  'app/inventory/page.tsx',
  'app/settings/shipping/page.tsx',
  'app/settings/integrations/page.tsx',
  'app/settings/custom-fields/page.tsx',
  'app/settings/product-addons/page.tsx',
];

function fixFile(filePath: string) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`Skipping ${filePath} - file not found`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf-8');
  let modified = false;

  // Fix: const { selectedShop } = useShop() -> const { selectedShop, shops } = useShop()
  if (content.includes('const { selectedShop } = useShop()') && !content.includes('const { selectedShop, shops } = useShop()')) {
    content = content.replace(/const \{ selectedShop \} = useShop\(\)/g, 'const { selectedShop, shops } = useShop()');
    modified = true;
  }

  // Fix: const { selectedShop, loading } = useShop() -> const { selectedShop, shops, loading } = useShop()
  if (content.includes('const { selectedShop, loading') && !content.includes('shops')) {
    content = content.replace(/const \{ selectedShop, loading(.*?) \} = useShop\(\)/g, 'const { selectedShop, shops, loading$1 } = useShop()');
    modified = true;
  }

  // Fix: if (!selectedShop) return -> const shopToUse = selectedShop || shops[0]; if (!shopToUse) return
  if (content.includes('if (!selectedShop) return') && !content.includes('shopToUse')) {
    // Find the function context
    const lines = content.split('\n');
    const newLines: string[] = [];
    let i = 0;
    while (i < lines.length) {
      if (lines[i].trim().match(/if\s*\(!\s*selectedShop\s*\)\s*return/)) {
        // Check if shopToUse is already defined in this scope
        const beforeLines = lines.slice(Math.max(0, i - 20), i).join('\n');
        if (!beforeLines.includes('shopToUse')) {
          newLines.push('    const shopToUse = selectedShop || shops[0]');
        }
        newLines.push(lines[i].replace(/selectedShop/g, 'shopToUse'));
      } else {
        newLines.push(lines[i]);
      }
      i++;
    }
    content = newLines.join('\n');
    modified = true;
  }

  // Fix: "אנא בחר חנות" messages
  if (content.includes('אנא בחר חנות')) {
    content = content.replace(/אנא בחר חנות/g, 'לא נמצאה חנות. אנא צור חנות תחילה.');
    modified = true;
  }

  // Fix: if (!selectedShop) { return (<div>בחר חנות</div>) }
  if (content.includes('if (!selectedShop)') && content.includes('בחר חנות')) {
    content = content.replace(
      /if\s*\(!\s*selectedShop\s*\)\s*\{[\s\S]*?בחר חנות[\s\S]*?\}/g,
      (match) => {
        if (match.includes('shopToUse')) return match;
        return match.replace(/if\s*\(!\s*selectedShop\s*\)/, 'const shopToUse = selectedShop || shops[0];\n  if (!shopToUse)')
          .replace(/selectedShop/g, 'shopToUse');
      }
    );
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(fullPath, content, 'utf-8');
    console.log(`✅ Fixed ${filePath}`);
  } else {
    console.log(`⏭️  Skipped ${filePath} - no changes needed`);
  }
}

console.log('Starting to fix shop selection issues...\n');

filesToFix.forEach(fixFile);

console.log('\n✅ Done!');



