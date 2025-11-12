#!/usr/bin/env node

/**
 * Automation Worker Process
 * ============================================
 * 
 * Worker נפרד שמעבד את תור האוטומציות.
 * 
 * יתרונות של worker נפרד:
 * 1. לא מעמיס על השרת הראשי
 * 2. ניתן להריץ מספר workers במקביל (scaling)
 * 3. ניתן להפעיל/לעצור בנפרד
 * 
 * הרצה:
 * $ node workers/automation-worker.ts
 * או:
 * $ ts-node workers/automation-worker.ts
 * 
 * Production:
 * השתמש ב-PM2 או supervisor אחר להרצת ה-worker
 */

import "../lib/automation-queue"

console.log("🚀 Automation Worker Started")
console.log("📊 Listening for automation jobs...")
console.log("⏹️  Press Ctrl+C to stop")

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("📴 Shutting down worker...")
  process.exit(0)
})

process.on("SIGINT", async () => {
  console.log("📴 Shutting down worker...")
  process.exit(0)
})

// Keep the process alive
process.stdin.resume()

