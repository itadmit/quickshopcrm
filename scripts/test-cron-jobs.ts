#!/usr/bin/env ts-node

/**
 * Script לבדיקת Cron Jobs
 * 
 * שימוש:
 *   npm run cron:test
 * 
 * או עם URL מותאם:
 *   APP_URL=https://quickshopcrm.vercel.app npm run cron:test
 */

import { execSync } from 'child_process'

const APP_URL = process.env.APP_URL || 'http://localhost:3000'
const CRON_SECRET = process.env.CRON_SECRET || 'change-this-in-production'

console.log('🧪 בודק Cron Jobs...')
console.log('📍 URL:', APP_URL)
console.log('')

// פונקציה לבדיקת endpoint
function testCronEndpoint(name: string, path: string) {
  console.log(`\n🔍 בודק ${name}...`)
  console.log(`   Path: ${path}`)
  
  try {
    const url = `${APP_URL}${path}`
    const command = `curl -s -w "\\nHTTP Status: %{http_code}" -X GET "${url}" -H "Authorization: Bearer ${CRON_SECRET}"`
    
    const output = execSync(command, { encoding: 'utf-8' })
    const lines = output.trim().split('\n')
    const statusLine = lines[lines.length - 1]
    const body = lines.slice(0, -1).join('\n')
    
    const httpStatus = statusLine.match(/HTTP Status: (\d+)/)?.[1]
    
    if (httpStatus === '200') {
      console.log('   ✅ הצליח!')
      try {
        const json = JSON.parse(body)
        console.log('   📊 תגובה:', JSON.stringify(json, null, 2))
      } catch {
        console.log('   📊 תגובה:', body)
      }
      return true
    } else {
      console.log(`   ❌ נכשל! Status: ${httpStatus}`)
      console.log('   📊 תגובה:', body)
      return false
    }
  } catch (error: any) {
    console.log(`   ❌ שגיאה: ${error.message}`)
    return false
  }
}

// בדיקת שני ה-endpoints
const results = {
  automations: testCronEndpoint('Automations Cron', '/api/cron/automations'),
  abandonedCarts: testCronEndpoint('Abandoned Carts Cron', '/api/cron/abandoned-carts'),
}

// סיכום
console.log('\n' + '='.repeat(50))
console.log('📊 סיכום בדיקות:')
console.log('='.repeat(50))
console.log(`Automations:        ${results.automations ? '✅ עובד' : '❌ נכשל'}`)
console.log(`Abandoned Carts:    ${results.abandonedCarts ? '✅ עובד' : '❌ נכשל'}`)
console.log('='.repeat(50))

if (results.automations && results.abandonedCarts) {
  console.log('\n🎉 כל ה-Cron Jobs עובדים מצוין!')
  process.exit(0)
} else {
  console.log('\n⚠️  חלק מה-Cron Jobs נכשלו. בדוק את הלוגים למעלה.')
  process.exit(1)
}

