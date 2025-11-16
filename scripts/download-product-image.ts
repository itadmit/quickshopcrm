/**
 * סקריפט להורדת תמונה ממוצר ולהעלאתה למוצר במערכת
 * 
 * שימוש:
 * npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/download-product-image.ts
 */

import { PrismaClient } from '@prisma/client'
import https from 'https'
import fs from 'fs'
import path from 'path'
import { promisify } from 'util'

const prisma = new PrismaClient()

async function downloadImage(url: string, filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download image: ${response.statusCode}`))
        return
      }

      const fileStream = fs.createWriteStream(filePath)
      response.pipe(fileStream)

      fileStream.on('finish', () => {
        fileStream.close()
        resolve()
      })

      fileStream.on('error', (err) => {
        fs.unlink(filePath, () => {}) // מחק את הקובץ אם יש שגיאה
        reject(err)
      })
    }).on('error', reject)
  })
}

async function main() {
  console.log('🌱 מתחיל הורדת תמונות למוצר VITAMIN D3...\n')

  // מציאת המשתמש
  const userEmail = 'itadmit@gmail.com'
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
    include: {
      company: {
        include: {
          shops: {
            take: 1,
          },
        },
      },
    },
  })

  if (!user || !user.company) {
    console.log(`⚠️  לא נמצא משתמש או חברה`)
    return
  }

  const shop: any = user.company.shops[0] || await prisma.shop.findFirst({
    where: { companyId: user.company.id },
  })

  if (!shop) {
    console.log('⚠️  לא נמצאה חנות')
    return
  }

  // מציאת המוצר VITAMIN D3
  const product = await prisma.product.findFirst({
    where: {
      shopId: shop.id,
      name: { contains: 'VITAMIN D3', mode: 'insensitive' },
    },
  })

  if (!product) {
    console.log('⚠️  לא נמצא מוצר VITAMIN D3')
    return
  }

  console.log(`✅ נמצא מוצר: ${product.name} (ID: ${product.id})\n`)

  // הורדת התמונות
  const imageUrls = [
    'https://www.mayven.co.il/cdn/shop/files/2V8A8542C_1080x.jpg?v=1711013648',
    'https://www.mayven.co.il/cdn/shop/files/IMG_285301_1080x.png?v=1711013648',
  ]
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'products')
  
  // יצירת תיקייה אם לא קיימת
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
  }

  const currentImages = (product.images as string[]) || []
  const newImages: string[] = []

  console.log('📥 מוריד תמונות...')
  for (let i = 0; i < imageUrls.length; i++) {
    const imageUrl = imageUrls[i]
    // קביעת סיומת לפי URL
    const extension = imageUrl.includes('.jpg') ? 'jpg' : 'png'
    const fileName = `vitamin-d3-${i + 1}-${Date.now()}.${extension}`
    const filePath = path.join(uploadsDir, fileName)

    try {
      await downloadImage(imageUrl, filePath)
      const imageUrlPath = `/uploads/products/${fileName}`
      newImages.push(imageUrlPath)
      console.log(`✅ תמונה ${i + 1} הורדה: ${imageUrlPath}`)
    } catch (error) {
      console.error(`❌ שגיאה בהורדת תמונה ${i + 1}:`, error)
    }
  }

  if (newImages.length > 0) {
    // עדכון המוצר עם התמונות החדשות (בתחילת הרשימה)
    await prisma.product.update({
      where: { id: product.id },
      data: {
        images: [...newImages, ...currentImages],
      },
    })

    console.log(`\n✅ המוצר עודכן עם ${newImages.length} תמונות חדשות`)
    console.log(`💡 התמונות זמינות בכתובות:`)
    newImages.forEach((img, idx) => console.log(`   ${idx + 1}. ${img}`))
  }
}

main()
  .catch((e) => {
    console.error('❌ שגיאה:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

