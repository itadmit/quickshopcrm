import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { z } from "zod"

const popupSchema = z.object({
  name: z.string().min(1, "שם הפופאפ נדרש").optional(),
  layout: z.enum(["one-column", "two-column"]).optional(),
  borderRadius: z.number().min(0).max(50).optional(),
  isActive: z.boolean().optional(),
  content: z.any().optional(),
  displayFrequency: z.enum(["every-visit", "once-daily", "once-weekly", "once-monthly"]).optional(),
  displayLocation: z.enum(["all-pages", "specific-pages"]).optional(),
  specificPages: z.array(z.string()).optional(),
  delay: z.number().min(0).optional(),
  trigger: z.enum(["on-load", "on-exit-intent", "on-scroll"]).optional(),
  scrollPercentage: z.number().min(0).max(100).optional(),
  backgroundColor: z.string().optional(),
  textColor: z.string().optional(),
  overlayColor: z.string().optional(),
  overlayOpacity: z.number().min(0).max(1).optional(),
})

// GET - קבלת פופאפ ספציפי
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const popup = await prisma.popup.findUnique({
      where: {
        id: params.id,
      },
      include: {
        shop: true,
      },
    })

    if (!popup) {
      return NextResponse.json({ error: "Popup not found" }, { status: 404 })
    }

    // בדיקה שהחנות שייכת לחברה של המשתמש
    if (popup.shop.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    return NextResponse.json(popup)
  } catch (error) {
    console.error("Error fetching popup:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT - עדכון פופאפ
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const data = popupSchema.parse(body)

    // בדיקה שהפופאפ שייך לחנות של המשתמש
    const popup = await prisma.popup.findUnique({
      where: {
        id: params.id,
      },
      include: {
        shop: true,
      },
    })

    if (!popup) {
      return NextResponse.json({ error: "Popup not found" }, { status: 404 })
    }

    if (popup.shop.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const updatedPopup = await prisma.popup.update({
      where: {
        id: params.id,
      },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.layout !== undefined && { layout: data.layout }),
        ...(data.borderRadius !== undefined && { borderRadius: data.borderRadius }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.displayFrequency !== undefined && { displayFrequency: data.displayFrequency }),
        ...(data.displayLocation !== undefined && { displayLocation: data.displayLocation }),
        ...(data.specificPages !== undefined && { specificPages: data.specificPages || null }),
        ...(data.delay !== undefined && { delay: data.delay }),
        ...(data.trigger !== undefined && { trigger: data.trigger }),
        ...(data.scrollPercentage !== undefined && { scrollPercentage: data.scrollPercentage || null }),
        ...(data.backgroundColor !== undefined && { backgroundColor: data.backgroundColor }),
        ...(data.textColor !== undefined && { textColor: data.textColor }),
        ...(data.overlayColor !== undefined && { overlayColor: data.overlayColor }),
        ...(data.overlayOpacity !== undefined && { overlayOpacity: data.overlayOpacity }),
      },
    })

    return NextResponse.json(updatedPopup)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error("Error updating popup:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE - מחיקת פופאפ
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // בדיקה שהפופאפ שייך לחנות של המשתמש
    const popup = await prisma.popup.findUnique({
      where: {
        id: params.id,
      },
      include: {
        shop: true,
      },
    })

    if (!popup) {
      return NextResponse.json({ error: "Popup not found" }, { status: 404 })
    }

    if (popup.shop.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    await prisma.popup.delete({
      where: {
        id: params.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting popup:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}


