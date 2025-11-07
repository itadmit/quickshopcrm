import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { deleteFromS3 } from "@/lib/s3"

interface ExtendedSession {
  user: {
    id: string
    companyId: string
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions)) as ExtendedSession | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const filePath = searchParams.get("path")

    if (!filePath) {
      return NextResponse.json({ error: "File path is required" }, { status: 400 })
    }

    // בדיקה אם זה קובץ ב-S3
    const isS3File = filePath.startsWith("https://") && filePath.includes(".s3.")
    
    if (isS3File) {
      try {
        // חילוץ ה-key מ-S3 מה-URL
        // פורמט: https://bucket-name.s3.region.amazonaws.com/key
        const url = new URL(filePath)
        const key = url.pathname.substring(1) // הסרת ה-/ הראשונה
        
        // מחיקה מ-S3
        await deleteFromS3(key)
      } catch (error) {
        console.error("Error deleting from S3:", error)
        // ממשיכים גם אם יש שגיאה ב-S3
      }
    } else {
      // אם זה קובץ מקומי, אפשר למחוק אותו מהדיסק (אופציונלי)
      // const fs = require('fs')
      // const path = require('path')
      // const filePathLocal = path.join(process.cwd(), filePath)
      // if (fs.existsSync(filePathLocal)) {
      //   fs.unlinkSync(filePathLocal)
      // }
    }

    // ניסיון למחוק מהמסד הנתונים (File table)
    // אם זה logo/favicon שנשמר ישירות ב-Shop, לא יהיה רשומה ב-File
    const fileRecord = await prisma.file.findFirst({
      where: {
        path: filePath,
        companyId: session.user.companyId,
      },
    })

    if (fileRecord) {
      await prisma.file.delete({
        where: {
          id: fileRecord.id,
        },
      })
    }
    
    // בדיקה אם זה logo או favicon של shop - אם כן, נמחק גם משם
    const shopWithFile = await prisma.shop.findFirst({
      where: {
        companyId: session.user.companyId,
        OR: [
          { logo: filePath },
          { favicon: filePath },
        ],
      },
    })

    if (shopWithFile) {
      const updateData: { logo?: null; favicon?: null } = {}
      if (shopWithFile.logo === filePath) {
        updateData.logo = null
      }
      if (shopWithFile.favicon === filePath) {
        updateData.favicon = null
      }
      
      await prisma.shop.update({
        where: { id: shopWithFile.id },
        data: updateData,
      })
    }

    return NextResponse.json({
      success: true,
      message: "File deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting file:", error)
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    )
  }
}

