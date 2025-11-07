import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Only allow admins and managers to reset data
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized - No session or company" }, { status: 401 })
    }
    
    // Allow ADMIN, MANAGER, and SUPER_ADMIN
    const allowedRoles = ['ADMIN', 'MANAGER', 'SUPER_ADMIN']
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized - Admin or Manager only" }, { status: 401 })
    }

    const companyId = session.user.companyId

    console.log('🗑️ Starting data reset for company:', companyId)

    // Delete all Quick Shop data for the company (in correct order due to foreign keys)
    
    // Delete shop-related data first
    const shops = await prisma.shop.findMany({
      where: { companyId },
      select: { id: true }
    })

    for (const shop of shops) {
      // Delete all shop-related data
      await prisma.shopEvent.deleteMany({ where: { shopId: shop.id } })
      await prisma.webhookLog.deleteMany({ 
        where: { webhook: { shopId: shop.id } }
      })
      await prisma.webhook.deleteMany({ where: { shopId: shop.id } })
      await prisma.return.deleteMany({ where: { shopId: shop.id } })
      await prisma.review.deleteMany({ where: { shopId: shop.id } })
      await prisma.storeCreditTransaction.deleteMany({
        where: { storeCredit: { shopId: shop.id } }
      })
      await prisma.storeCredit.deleteMany({ where: { shopId: shop.id } })
      await prisma.giftCardTransaction.deleteMany({
        where: { giftCard: { shopId: shop.id } }
      })
      await prisma.giftCard.deleteMany({ where: { shopId: shop.id } })
      await prisma.cart.deleteMany({ where: { shopId: shop.id } })
      await prisma.orderItem.deleteMany({
        where: { order: { shopId: shop.id } }
      })
      await prisma.order.deleteMany({ where: { shopId: shop.id } })
      await prisma.customer.deleteMany({ where: { shopId: shop.id } })
      await prisma.productCollection.deleteMany({
        where: { collection: { shopId: shop.id } }
      })
      await prisma.collection.deleteMany({ where: { shopId: shop.id } })
      await prisma.productCategory.deleteMany({
        where: { category: { shopId: shop.id } }
      })
      await prisma.category.deleteMany({ where: { shopId: shop.id } })
      await prisma.productTag.deleteMany({
        where: { product: { shopId: shop.id } }
      })
      await prisma.productOption.deleteMany({
        where: { product: { shopId: shop.id } }
      })
      await prisma.productVariant.deleteMany({
        where: { product: { shopId: shop.id } }
      })
      await prisma.bundleProduct.deleteMany({
        where: { bundle: { shopId: shop.id } }
      })
      await prisma.bundle.deleteMany({ where: { shopId: shop.id } })
      await prisma.product.deleteMany({ where: { shopId: shop.id } })
      await prisma.navigation.deleteMany({ where: { shopId: shop.id } })
      await prisma.page.deleteMany({ where: { shopId: shop.id } })
      await prisma.blogComment.deleteMany({
        where: { post: { blog: { shopId: shop.id } } }
      })
      await prisma.blogPostTag.deleteMany({
        where: { post: { blog: { shopId: shop.id } } }
      })
      await prisma.blogPostCategoryRelation.deleteMany({
        where: { post: { blog: { shopId: shop.id } } }
      })
      await prisma.blogPost.deleteMany({
        where: { blog: { shopId: shop.id } }
      })
      await prisma.blogPostCategory.deleteMany({
        where: { blog: { shopId: shop.id } }
      })
      await prisma.blog.deleteMany({ where: { shopId: shop.id } })
      await prisma.coupon.deleteMany({ where: { shopId: shop.id } })
      await prisma.discount.deleteMany({ where: { shopId: shop.id } })
    }

    // Note: We don't delete the shops themselves, only their data
    // The shops should remain in the system

    // Delete company-level data
    await prisma.notification.deleteMany({ where: { companyId } })
    await prisma.file.deleteMany({ where: { companyId } })
    await prisma.auditLog.deleteMany({ where: { companyId } })
    await prisma.emailTemplate.deleteMany({ where: { companyId } })
    await prisma.integration.deleteMany({ where: { companyId } })
    await prisma.calendarEvent.deleteMany({ where: { companyId } })
    await prisma.invitation.deleteMany({ where: { companyId } })
    await prisma.userPermission.deleteMany({
      where: { user: { companyId } }
    })

    console.log('✅ All data deleted successfully')

    return NextResponse.json({ 
      success: true, 
      message: "כל הנתונים נמחקו בהצלחה" 
    })
  } catch (error) {
    console.error("Error resetting data:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

