import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const addItemSchema = z.object({
  navigationId: z.string(),
  pageId: z.string().optional(),
  categoryId: z.string().optional(),
  label: z.string().min(1),
  type: z.enum(["PAGE", "CATEGORY", "EXTERNAL"]),
  url: z.string().optional().nullable(),
})

// POST - הוספת פריט לתפריט
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const data = addItemSchema.parse(body)

    // בדיקה שהתפריט שייך לחברה
    const navigation = await prisma.navigation.findFirst({
      where: {
        id: data.navigationId,
        shop: {
          companyId: session.user.companyId,
        },
      },
    })

    if (!navigation) {
      return NextResponse.json({ error: "Navigation not found" }, { status: 404 })
    }

    const items = (navigation.items as any[]) || []

    // בדיקה אם הפריט כבר קיים בתפריט
    const existingItemIndex = items.findIndex((item: any) => {
      if (data.pageId) {
        return item.id === `page-${data.pageId}` || 
               (item.type === "PAGE" && item.url === data.url)
      }
      if (data.categoryId) {
        return item.id === `category-${data.categoryId}` || 
               (item.type === "CATEGORY" && item.categoryId === data.categoryId)
      }
      return item.type === data.type && item.url === data.url
    })

    if (existingItemIndex !== -1) {
      return NextResponse.json(
        { error: "הפריט כבר קיים בתפריט" },
        { status: 400 }
      )
    }

    // הוספת הפריט החדש בסוף הרשימה
    let itemId: string
    if (data.pageId) {
      itemId = `page-${data.pageId}`
    } else if (data.categoryId) {
      itemId = `category-${data.categoryId}`
    } else {
      itemId = `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }

    const newItem: any = {
      id: itemId,
      label: data.label,
      type: data.type,
      url: data.url || null,
      position: items.length,
      parentId: null,
    }

    // הוספת ID ספציפי לפי סוג
    if (data.pageId) {
      newItem.pageId = data.pageId
    }
    if (data.categoryId) {
      newItem.categoryId = data.categoryId
    }

    items.push(newItem)

    // עדכון התפריט
    const updatedNavigation = await prisma.navigation.update({
      where: { id: data.navigationId },
      data: { items },
    })

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: navigation.shopId,
        type: "navigation.item_added",
        entityType: "navigation",
        entityId: navigation.id,
        payload: {
          navigationId: navigation.id,
          item: newItem,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json(updatedNavigation)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error adding item to navigation:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE - הסרת פריט מתפריט
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const navigationId = searchParams.get("navigationId")
    const itemId = searchParams.get("itemId")

    if (!navigationId || !itemId) {
      return NextResponse.json(
        { error: "navigationId and itemId are required" },
        { status: 400 }
      )
    }

    // בדיקה שהתפריט שייך לחברה
    const navigation = await prisma.navigation.findFirst({
      where: {
        id: navigationId,
        shop: {
          companyId: session.user.companyId,
        },
      },
    })

    if (!navigation) {
      return NextResponse.json({ error: "Navigation not found" }, { status: 404 })
    }

    const items = (navigation.items as any[]) || []
    const filteredItems = items.filter((item: any) => item.id !== itemId)

    // עדכון התפריט
    const updatedNavigation = await prisma.navigation.update({
      where: { id: navigationId },
      data: { items: filteredItems },
    })

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: navigation.shopId,
        type: "navigation.item_removed",
        entityType: "navigation",
        entityId: navigation.id,
        payload: {
          navigationId: navigation.id,
          itemId,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json(updatedNavigation)
  } catch (error) {
    console.error("Error removing item from navigation:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

