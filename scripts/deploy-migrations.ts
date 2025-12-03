#!/usr/bin/env ts-node

/**
 * Script להרצת Prisma Migrations על הפרודקשן
 * 
 * שימוש:
 *   DATABASE_URL="postgresql://..." ts-node scripts/deploy-migrations.ts
 * 
 * או:
 *   export DATABASE_URL="postgresql://..."
 *   npm run db:migrate:deploy
 */

import { execSync } from 'child_process'

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('❌ שגיאה: DATABASE_URL לא מוגדר!')
  console.error('')
  console.error('השתמש באחת מהאפשרויות:')
  console.error('  1. export DATABASE_URL="postgresql://..."')
  console.error('  2. DATABASE_URL="postgresql://..." ts-node scripts/deploy-migrations.ts')
  console.error('')
  process.exit(1)
}

// בדיקה שזה לא DB מקומי בטעות
if (DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1')) {
  console.error('⚠️  אזהרה: נראה שאתה מנסה להריץ על DB מקומי!')
  console.error('   DATABASE_URL:', DATABASE_URL.replace(/:[^:@]+@/, ':****@'))
  console.error('')
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  
  const answer = await new Promise<string>((resolve) => {
    readline.question('האם אתה בטוח? (yes/no): ', resolve)
  })
  readline.close()
  
  if (answer.toLowerCase() !== 'yes') {
    console.log('❌ בוטל')
    process.exit(0)
  }
}

console.log('🚀 מריץ Prisma Migrations על הפרודקשן...')
console.log('📊 Database:', DATABASE_URL.replace(/:[^:@]+@/, ':****@').split('?')[0])
console.log('')

try {
  execSync(`DATABASE_URL="${DATABASE_URL}" npx prisma migrate deploy`, {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL,
    },
  })
  console.log('')
  console.log('✅ Migrations הורצו בהצלחה על הפרודקשן!')
} catch (error) {
  console.error('')
  console.error('❌ שגיאה בהרצת migrations:', error)
  process.exit(1)
}

