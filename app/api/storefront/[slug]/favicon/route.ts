import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { readFile } from "fs/promises"
import { join } from "path"

// GET - קבלת favicon של חנות
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const shop = await prisma.shop.findFirst({
      where: {
        slug: params.slug,
      },
      select: {
        favicon: true,
      },
    })

    // אם יש favicon מותאם אישית, נחזיר אותו
    if (shop?.favicon) {
      try {
        const filePath = join(process.cwd(), shop.favicon)
        const fileBuffer = await readFile(filePath)
        
        // קביעת content type לפי סוג הקובץ
        const contentType = shop.favicon.endsWith('.svg') 
          ? 'image/svg+xml' 
          : shop.favicon.endsWith('.png')
          ? 'image/png'
          : shop.favicon.endsWith('.ico')
          ? 'image/x-icon'
          : 'image/png'

        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        })
      } catch (error) {
        console.error('Error reading favicon file:', error)
        // אם יש שגיאה, נחזיר את ברירת המחדל
      }
    }

    // ברירת מחדל - favicon של Quick Shop
    try {
      const defaultFaviconPath = join(process.cwd(), 'public', 'favicon.svg')
      const fileBuffer = await readFile(defaultFaviconPath)
      
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      })
    } catch (error) {
      console.error('Error reading default favicon:', error)
      // אם גם זה נכשל, נחזיר 404
      return NextResponse.json({ error: "Favicon not found" }, { status: 404 })
    }
  } catch (error) {
    console.error("Error fetching favicon:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

