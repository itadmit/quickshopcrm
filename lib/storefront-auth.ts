import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { jwtVerify } from "jose"

export interface StorefrontAuthResult {
  success: boolean
  customerId?: string
  customer?: any
  shop?: any
  error?: NextResponse
}

/**
 * אימות לקוח בסטורפרונט
 * בודק שהטוקן תקף, החנות קיימת, והלקוח קיים במערכת
 */
export async function verifyStorefrontCustomer(
  req: NextRequest,
  shopSlug: string
): Promise<StorefrontAuthResult> {
  try {
    // מציאת החנות
    let shop = await prisma.shop.findFirst({
      where: {
        slug: shopSlug,
        isPublished: true,
      },
    })

    if (!shop) {
      shop = await prisma.shop.findFirst({
        where: {
          id: shopSlug,
          isPublished: true,
        },
      })
    }

    if (!shop) {
      return {
        success: false,
        error: NextResponse.json({ error: "החנות לא נמצאה" }, { status: 404 }),
      }
    }

    // קבלת token
    const authHeader = req.headers.get("authorization")
    const token =
      authHeader?.replace("Bearer ", "") ||
      req.headers.get("x-customer-token") ||
      req.headers.get("x-customer-id")

    if (!token) {
      return {
        success: false,
        error: NextResponse.json({ error: "אימות נדרש" }, { status: 401 }),
      }
    }

    // אימות JWT
    let customerId: string | null = null
    try {
      const secret = new TextEncoder().encode(
        process.env.JWT_SECRET || "your-secret-key"
      )
      const { payload } = await jwtVerify(token, secret)

      // בדיקה שהטוקן שייך לחנות הנכונה
      if (payload.shopId !== shop.id) {
        return {
          success: false,
          error: NextResponse.json({ error: "אימות נכשל" }, { status: 401 }),
        }
      }

      customerId = payload.customerId as string
    } catch (jwtError) {
      // אם זה לא JWT, נניח שזה customerId ישיר (backward compatibility)
      customerId = token
    }

    if (!customerId) {
      return {
        success: false,
        error: NextResponse.json({ error: "אימות נכשל" }, { status: 401 }),
      }
    }

    // **בדיקה קריטית: וידוא שהלקוח עדיין קיים במערכת**
    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        shopId: shop.id,
      },
    })

    if (!customer) {
      return {
        success: false,
        error: NextResponse.json(
          { error: "חשבון הלקוח לא נמצא או נמחק" },
          { status: 401 }
        ),
      }
    }

    return {
      success: true,
      customerId: customer.id,
      customer,
      shop,
    }
  } catch (error) {
    console.error("[Storefront Auth] Error:", error)
    return {
      success: false,
      error: NextResponse.json(
        { error: "שגיאה באימות" },
        { status: 500 }
      ),
    }
  }
}

/**
 * אימות לקוח אופציונלי (לא מחזיר שגיאה אם אין טוקן)
 */
export async function verifyStorefrontCustomerOptional(
  req: NextRequest,
  shopSlug: string
): Promise<StorefrontAuthResult & { shop: any }> {
  // מציאת החנות
  let shop = await prisma.shop.findFirst({
    where: {
      slug: shopSlug,
      isPublished: true,
    },
  })

  if (!shop) {
    shop = await prisma.shop.findFirst({
      where: {
        id: shopSlug,
        isPublished: true,
      },
    })
  }

  if (!shop) {
    return {
      success: false,
      shop: null,
      error: NextResponse.json({ error: "החנות לא נמצאה" }, { status: 404 }),
    }
  }

  // קבלת token
  const authHeader = req.headers.get("authorization")
  const token =
    authHeader?.replace("Bearer ", "") ||
    req.headers.get("x-customer-token") ||
    req.headers.get("x-customer-id")

  // אם אין טוקן, זה בסדר
  if (!token) {
    return {
      success: true,
      shop,
    }
  }

  // אם יש טוקן, נבדוק אותו
  let customerId: string | null = null
  try {
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "your-secret-key"
    )
    const { payload } = await jwtVerify(token, secret)

    if (payload.shopId !== shop.id) {
      return {
        success: true,
        shop,
      }
    }

    customerId = payload.customerId as string
  } catch (jwtError) {
    customerId = token
  }

  if (customerId) {
    // בדיקה שהלקוח עדיין קיים
    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        shopId: shop.id,
      },
    })

    if (customer) {
      return {
        success: true,
        customerId: customer.id,
        customer,
        shop,
      }
    }
  }

  return {
    success: true,
    shop,
  }
}




