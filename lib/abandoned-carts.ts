import { prisma } from "./prisma"

/**
 * זיהוי עגלות נטושות
 * עגלה נטושה = עגלה שלא עודכנה במשך 24 שעות
 */
export async function identifyAbandonedCarts() {
  try {
    const twentyFourHoursAgo = new Date()
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

    const abandonedCarts = await prisma.cart.findMany({
      where: {
        updatedAt: {
          lt: twentyFourHoursAgo,
        },
        abandonedAt: null,
      },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // סימון עגלות כנטושות
    for (const cart of abandonedCarts) {
      await prisma.cart.update({
        where: { id: cart.id },
        data: {
          abandonedAt: new Date(),
        },
      })

      // קבלת shop slug ליצירת לינק
      const shop = await prisma.shop.findUnique({
        where: { id: cart.shopId },
        select: { slug: true },
      })

      // יצירת אירוע
      await prisma.shopEvent.create({
        data: {
          shopId: cart.shopId,
          type: "cart.abandoned",
          entityType: "cart",
          entityId: cart.id,
          payload: {
            cartId: cart.id,
            shopId: cart.shopId,
            shopSlug: shop?.slug || "",
            customerId: cart.customerId || null,
            items: cart.items,
            // לינק ישיר לצ'ק אאוט עם העגלה
            checkoutUrl: shop?.slug 
              ? `${(await import('@/lib/utils')).getBaseUrl()}/shop/${shop.slug}/checkout?cartId=${cart.id}`
              : null,
          },
        },
      })
    }

    return abandonedCarts.length
  } catch (error) {
    console.error("Error identifying abandoned carts:", error)
    return 0
  }
}

/**
 * שחזור עגלה נטושה
 */
export async function recoverAbandonedCart(cartId: string) {
  try {
    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
    })

    if (!cart || !cart.abandonedAt) {
      return false
    }

    await prisma.cart.update({
      where: { id: cartId },
      data: {
        recoveredAt: new Date(),
        abandonedAt: null,
      },
    })

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: cart.shopId,
        type: "cart.recovered",
        entityType: "cart",
        entityId: cart.id,
        payload: {
          cartId: cart.id,
        },
      },
    })

    return true
  } catch (error) {
    console.error("Error recovering abandoned cart:", error)
    return false
  }
}

/**
 * קבלת רשימת עגלות נטושות לחנות
 */
export async function getAbandonedCarts(shopId: string) {
  try {
    const carts = await prisma.cart.findMany({
      where: {
        shopId,
        abandonedAt: {
          not: null,
        },
        recoveredAt: null,
      },
      orderBy: {
        abandonedAt: "desc",
      },
    })

    return carts
  } catch (error) {
    console.error("Error fetching abandoned carts:", error)
    return []
  }
}

