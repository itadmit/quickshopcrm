#!/usr/bin/env node

/**
 * סקריפט בדיקה למערכת תורים
 * 
 * הרצה: npx ts-node scripts/test-automation-queue.ts
 */

import { queueAutomation } from "../lib/automation-queue"

async function testQueue() {
  console.log("🧪 Testing Automation Queue System")
  console.log("=".repeat(50))
  
  try {
    // בדיקה 1: אוטומציה מיידית
    console.log("\n📝 Test 1: Immediate automation")
    const job1 = await queueAutomation(
      "test-shop-id",
      "test.immediate",
      {
        customer: { email: "test@example.com", name: "Test User" },
        message: "This should run immediately"
      }
    )
    console.log(`✅ Queued immediate job: ${job1.id}`)
    
    // בדיקה 2: אוטומציה עם delay של 10 שניות
    console.log("\n📝 Test 2: Delayed automation (10 seconds)")
    const job2 = await queueAutomation(
      "test-shop-id",
      "test.delayed",
      {
        customer: { email: "test@example.com", name: "Test User" },
        message: "This should run in 10 seconds"
      },
      10 // 10 שניות
    )
    console.log(`✅ Queued delayed job: ${job2.id}`)
    console.log(`⏰ Will execute at: ${new Date(Date.now() + 10000).toLocaleTimeString()}`)
    
    // בדיקה 3: אוטומציה עם delay של דקה
    console.log("\n📝 Test 3: Delayed automation (1 minute)")
    const job3 = await queueAutomation(
      "test-shop-id",
      "test.delayed.long",
      {
        customer: { email: "test@example.com", name: "Test User" },
        message: "This should run in 1 minute"
      },
      60 // דקה
    )
    console.log(`✅ Queued delayed job: ${job3.id}`)
    console.log(`⏰ Will execute at: ${new Date(Date.now() + 60000).toLocaleTimeString()}`)
    
    console.log("\n" + "=".repeat(50))
    console.log("✅ All tests queued successfully!")
    console.log("\n💡 Tips:")
    console.log("  - Run 'npm run queue:stats' to see queue statistics")
    console.log("  - Run 'npm run worker' in another terminal to process jobs")
    console.log("  - Check the automation_logs table in your database")
    console.log("\n⚠️  Remember: Redis must be running!")
    console.log("  - macOS: brew services start redis")
    console.log("  - Docker: docker run -d -p 6379:6379 redis:alpine")
    
    process.exit(0)
  } catch (error: any) {
    console.error("\n❌ Error:", error.message)
    
    if (error.message.includes("ECONNREFUSED") || error.message.includes("Redis")) {
      console.error("\n🚨 Redis Connection Error!")
      console.error("Make sure Redis is running:")
      console.error("  macOS: brew services start redis")
      console.error("  Docker: docker run -d -p 6379:6379 redis:alpine")
      console.error("  Or set SKIP_QUEUE=true in .env.local for development without Redis")
    }
    
    process.exit(1)
  }
}

testQueue()

