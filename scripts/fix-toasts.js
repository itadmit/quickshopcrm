const fs = require('fs');
const path = require('path');
const glob = require('glob');

// מצא את כל הקבצים שמשתמשים ב-useToast
const files = glob.sync('app/**/*.{ts,tsx}', { 
  cwd: path.join(__dirname, '..'),
  absolute: true,
  ignore: ['**/node_modules/**']
});

let updatedCount = 0;
let skippedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;

  // בדיקה אם הקובץ משתמש ב-useToast
  if (content.includes('from "@/components/ui/use-toast"')) {
    console.log(`\nעיבוד: ${path.relative(process.cwd(), file)}`);
    
    // החלפת import
    if (!content.includes('useOptimisticToast')) {
      const oldImport = 'import { useToast } from "@/components/ui/use-toast"';
      const newImport = 'import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"';
      
      if (content.includes(oldImport)) {
        content = content.replace(oldImport, newImport);
        modified = true;
        console.log('  ✓ עדכון import');
      }
    }

    if (modified) {
      fs.writeFileSync(file, content, 'utf8');
      updatedCount++;
      console.log('  ✓ הקובץ עודכן');
    } else {
      skippedCount++;
      console.log('  - כבר עדכני או לא נדרש עדכון');
    }
  }
});

console.log(`\n${'='.repeat(50)}`);
console.log(`סיכום:`);
console.log(`  קבצים שעודכנו: ${updatedCount}`);
console.log(`  קבצים שדולגו: ${skippedCount}`);
console.log(`  סה"כ קבצים שנבדקו: ${files.length}`);
console.log(`${'='.repeat(50)}\n`);

