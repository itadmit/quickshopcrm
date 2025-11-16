import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Only allow admins and managers to seed data
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized - No session or company" }, { status: 401 })
    }
    
    // Allow ADMIN, MANAGER, and SUPER_ADMIN
    const allowedRoles = ['ADMIN', 'MANAGER', 'SUPER_ADMIN']
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized - Admin or Manager only" }, { status: 401 })
    }

    const companyId = session.user.companyId
    const userId = session.user.id

    console.log('🌱 Starting seed for company:', companyId)

    // Get or create shop (use first shop or create new one)
    let shop = await prisma.shop.findFirst({
      where: { companyId }
    })

    if (!shop) {
      shop = await prisma.shop.create({
        data: {
          name: 'חנות הדגמה',
          slug: 'demo-shop',
          description: 'חנות הדגמה של Quick Shop - מוצרים איכותיים במחירים מעולים',
          category: 'אופנה',
          email: 'info@demo-shop.com',
          phone: '03-1234567',
          address: 'רחוב הרצל 1, תל אביב',
          currency: 'ILS',
          taxEnabled: true,
          taxRate: 18,
          isPublished: true,
          companyId,
        },
      })
    }

    console.log('✅ Shop ready:', shop.name)

    // Delete existing categories for clean seed
    await prisma.category.deleteMany({
      where: { shopId: shop.id },
    })

    // Create categories
    const categories = await Promise.all([
      prisma.category.create({
        data: {
          name: 'נעליים',
          slug: 'shoes',
          description: 'נעליים אופנתיות ואיכותיות',
          shopId: shop.id,
        },
      }),
      prisma.category.create({
        data: {
          name: 'חולצות',
          slug: 'shirts',
          description: 'חולצות איכותיות',
          shopId: shop.id,
        },
      }),
      prisma.category.create({
        data: {
          name: 'אביזרים',
          slug: 'accessories',
          description: 'אביזרים משלימים',
          shopId: shop.id,
        },
      }),
    ])

    console.log(`✅ Created ${categories.length} categories`)

    // Create Nike Shoes with variants (black/yellow, sizes 38-42)
    const nikeShoes = await prisma.product.create({
      data: {
        name: 'נעליים נייק Air Max',
        slug: 'nike-air-max',
        description: 'נעליים נייק Air Max איכותיות ונוחות, מושלמות לספורט ולחיי היום יום',
        price: 599.90,
        comparePrice: 799.90,
        cost: 350,
        sku: 'NIKE-AM-001',
        inventoryQty: 0, // Will be calculated from variants
        lowStockAlert: 5,
        status: 'PUBLISHED',
        availability: 'IN_STOCK',
        images: [],
        shopId: shop.id,
        categories: {
          create: {
            categoryId: categories[0].id,
          },
        },
        tags: {
          create: [
            { name: 'נייק' },
            { name: 'נעליים' },
            { name: 'ספורט' },
          ],
        },
        options: {
          create: [
            {
              name: 'צבע',
              type: 'color',
              values: [
                { id: 'black', label: 'שחור', metadata: { color: '#000000' } },
                { id: 'yellow', label: 'צהוב', metadata: { color: '#FFD700' } },
              ],
              position: 0,
            },
            {
              name: 'מידה',
              type: 'button',
              values: [
                { id: '38', label: '38' },
                { id: '39', label: '39' },
                { id: '40', label: '40' },
                { id: '41', label: '41' },
                { id: '42', label: '42' },
              ],
              position: 1,
            },
          ],
        },
        variants: {
          create: [
            // Black variants
            { name: 'שחור / 38', sku: 'NIKE-AM-BLK-38', price: 599.90, inventoryQty: 3, option1: 'צבע', option1Value: 'שחור', option2: 'מידה', option2Value: '38' },
            { name: 'שחור / 39', sku: 'NIKE-AM-BLK-39', price: 599.90, inventoryQty: 5, option1: 'צבע', option1Value: 'שחור', option2: 'מידה', option2Value: '39' },
            { name: 'שחור / 40', sku: 'NIKE-AM-BLK-40', price: 599.90, inventoryQty: 8, option1: 'צבע', option1Value: 'שחור', option2: 'מידה', option2Value: '40' },
            { name: 'שחור / 41', sku: 'NIKE-AM-BLK-41', price: 599.90, inventoryQty: 4, option1: 'צבע', option1Value: 'שחור', option2: 'מידה', option2Value: '41' },
            { name: 'שחור / 42', sku: 'NIKE-AM-BLK-42', price: 599.90, inventoryQty: 2, option1: 'צבע', option1Value: 'שחור', option2: 'מידה', option2Value: '42' },
            // Yellow variants
            { name: 'צהוב / 38', sku: 'NIKE-AM-YLW-38', price: 599.90, inventoryQty: 2, option1: 'צבע', option1Value: 'צהוב', option2: 'מידה', option2Value: '38' },
            { name: 'צהוב / 39', sku: 'NIKE-AM-YLW-39', price: 599.90, inventoryQty: 4, option1: 'צבע', option1Value: 'צהוב', option2: 'מידה', option2Value: '39' },
            { name: 'צהוב / 40', sku: 'NIKE-AM-YLW-40', price: 599.90, inventoryQty: 6, option1: 'צבע', option1Value: 'צהוב', option2: 'מידה', option2Value: '40' },
            { name: 'צהוב / 41', sku: 'NIKE-AM-YLW-41', price: 599.90, inventoryQty: 3, option1: 'צבע', option1Value: 'צהוב', option2: 'מידה', option2Value: '41' },
            { name: 'צהוב / 42', sku: 'NIKE-AM-YLW-42', price: 599.90, inventoryQty: 1, option1: 'צבע', option1Value: 'צהוב', option2: 'מידה', option2Value: '42' },
          ],
        },
      },
    })

    // Create Adidas Shirt with variants (white/black, sizes S/M/L)
    const adidasShirt = await prisma.product.create({
      data: {
        name: 'חולצה אדידס קלאסית',
        slug: 'adidas-classic-shirt',
        description: 'חולצה אדידס קלאסית ואיכותית, 100% כותנה, נוחה ונושמת',
        price: 149.90,
        comparePrice: 199.90,
        cost: 80,
        sku: 'ADIDAS-SH-001',
        inventoryQty: 0, // Will be calculated from variants
        lowStockAlert: 3,
        status: 'PUBLISHED',
        availability: 'IN_STOCK',
        images: [],
        shopId: shop.id,
        categories: {
          create: {
            categoryId: categories[1].id,
          },
        },
        tags: {
          create: [
            { name: 'אדידס' },
            { name: 'חולצות' },
            { name: 'קלאסי' },
          ],
        },
        options: {
          create: [
            {
              name: 'צבע',
              type: 'color',
              values: [
                { id: 'white', label: 'לבן', metadata: { color: '#FFFFFF' } },
                { id: 'black', label: 'שחור', metadata: { color: '#000000' } },
              ],
              position: 0,
            },
            {
              name: 'מידה',
              type: 'button',
              values: [
                { id: 'S', label: 'S' },
                { id: 'M', label: 'M' },
                { id: 'L', label: 'L' },
              ],
              position: 1,
            },
          ],
        },
        variants: {
          create: [
            // White variants
            { name: 'לבן / S', sku: 'ADIDAS-SH-WHT-S', price: 149.90, inventoryQty: 5, option1: 'צבע', option1Value: 'לבן', option2: 'מידה', option2Value: 'S' },
            { name: 'לבן / M', sku: 'ADIDAS-SH-WHT-M', price: 149.90, inventoryQty: 8, option1: 'צבע', option1Value: 'לבן', option2: 'מידה', option2Value: 'M' },
            { name: 'לבן / L', sku: 'ADIDAS-SH-WHT-L', price: 149.90, inventoryQty: 6, option1: 'צבע', option1Value: 'לבן', option2: 'מידה', option2Value: 'L' },
            // Black variants
            { name: 'שחור / S', sku: 'ADIDAS-SH-BLK-S', price: 149.90, inventoryQty: 4, option1: 'צבע', option1Value: 'שחור', option2: 'מידה', option2Value: 'S' },
            { name: 'שחור / M', sku: 'ADIDAS-SH-BLK-M', price: 149.90, inventoryQty: 7, option1: 'צבע', option1Value: 'שחור', option2: 'מידה', option2Value: 'M' },
            { name: 'שחור / L', sku: 'ADIDAS-SH-BLK-L', price: 149.90, inventoryQty: 5, option1: 'צבע', option1Value: 'שחור', option2: 'מידה', option2Value: 'L' },
          ],
        },
      },
    })

    // Create additional products (2-3 more)
    const additionalProducts = await Promise.all([
      prisma.product.create({
        data: {
          name: 'תיק ספורט נייק',
          slug: 'nike-sport-bag',
          description: 'תיק ספורט נייק איכותי ונוח, מושלם לאימונים',
          price: 249.90,
          comparePrice: 349.90,
          cost: 120,
          sku: 'NIKE-BAG-001',
          inventoryQty: 15,
          lowStockAlert: 5,
          status: 'PUBLISHED',
          availability: 'IN_STOCK',
          images: [],
          shopId: shop.id,
          categories: {
            create: {
              categoryId: categories[2].id,
            },
          },
          tags: {
            create: [
              { name: 'תיקים' },
              { name: 'נייק' },
            ],
          },
        },
      }),
      prisma.product.create({
        data: {
          name: 'כובע אדידס',
          slug: 'adidas-cap',
          description: 'כובע אדידס קלאסי עם לוגו, מגן מפני השמש',
          price: 89.90,
          comparePrice: 129.90,
          cost: 45,
          sku: 'ADIDAS-CAP-001',
          inventoryQty: 20,
          lowStockAlert: 5,
          status: 'PUBLISHED',
          availability: 'IN_STOCK',
          images: [],
          shopId: shop.id,
          categories: {
            create: {
              categoryId: categories[2].id,
            },
          },
          tags: {
            create: [
              { name: 'כובעים' },
              { name: 'אדידס' },
            ],
          },
        },
      }),
    ])

    const allProducts = [nikeShoes, adidasShirt, ...additionalProducts]
    console.log(`✅ Created ${allProducts.length} products`)

    // Create collections (2-3)
    const collections = await Promise.all([
      prisma.collection.create({
        data: {
          name: 'מוצרים מומלצים',
          slug: 'featured',
          description: 'המוצרים המומלצים שלנו',
          type: 'MANUAL',
          shopId: shop.id,
          products: {
            create: [
              { productId: nikeShoes.id, position: 0 },
              { productId: adidasShirt.id, position: 1 },
            ],
          },
        },
      }),
      prisma.collection.create({
        data: {
          name: 'מבצעים',
          slug: 'sale',
          description: 'מוצרים במבצע',
          type: 'MANUAL',
          shopId: shop.id,
          products: {
            create: [
              { productId: additionalProducts[0].id, position: 0 },
              { productId: additionalProducts[1].id, position: 1 },
            ],
          },
        },
      }),
      prisma.collection.create({
        data: {
          name: 'חדש בחנות',
          slug: 'new-arrivals',
          description: 'מוצרים חדשים שהגיעו לחנות',
          type: 'MANUAL',
          shopId: shop.id,
          products: {
            create: [
              { productId: nikeShoes.id, position: 0 },
              { productId: adidasShirt.id, position: 1 },
              { productId: additionalProducts[0].id, position: 2 },
            ],
          },
        },
      }),
    ])

    console.log(`✅ Created ${collections.length} collections`)

    // Create customers (2-3)
    const customers = await Promise.all([
      prisma.customer.create({
        data: {
          email: 'yossi.cohen@example.com',
          firstName: 'יוסי',
          lastName: 'כהן',
          phone: '050-1234567',
          shopId: shop.id,
          totalSpent: 899.80,
          orderCount: 3,
          tier: 'VIP',
          isSubscribed: true,
          addresses: [
            {
              street: 'רחוב הרצל 10',
              city: 'תל אביב',
              zip: '12345',
              country: 'ישראל',
            },
          ],
        },
      }),
      prisma.customer.create({
        data: {
          email: 'sara.levi@example.com',
          firstName: 'שרה',
          lastName: 'לוי',
          phone: '052-9876543',
          shopId: shop.id,
          totalSpent: 449.70,
          orderCount: 2,
          tier: 'REGULAR',
          isSubscribed: true,
          addresses: [
            {
              street: 'דרך המלך 50',
              city: 'חיפה',
              zip: '54321',
              country: 'ישראל',
            },
          ],
        },
      }),
      prisma.customer.create({
        data: {
          email: 'david.mizrahi@example.com',
          firstName: 'דוד',
          lastName: 'מזרחי',
          phone: '054-5551234',
          shopId: shop.id,
          totalSpent: 149.90,
          orderCount: 1,
          tier: 'REGULAR',
          isSubscribed: false,
        },
      }),
    ])

    console.log(`✅ Created ${customers.length} customers`)

    // Delete existing coupons for clean seed (by shopId and code)
    const couponCodes = ['WELCOME10', 'SUMMER50', 'BUY2GET1']
    await prisma.coupon.deleteMany({
      where: {
        OR: [
          { shopId: shop.id },
          { code: { in: couponCodes } }
        ]
      },
    })

    // Create coupons (2-3) using upsert to handle existing codes
    const coupons = await Promise.all([
      prisma.coupon.upsert({
        where: { code: 'WELCOME10' },
        update: {
          type: 'PERCENTAGE',
          value: 10,
          minOrder: 100,
          maxUses: 100,
          usedCount: 2,
          isActive: true,
          shopId: shop.id,
        },
        create: {
          code: 'WELCOME10',
          type: 'PERCENTAGE',
          value: 10,
          minOrder: 100,
          maxUses: 100,
          usedCount: 2,
          isActive: true,
          shopId: shop.id,
        },
      }),
      prisma.coupon.upsert({
        where: { code: 'SUMMER50' },
        update: {
          type: 'FIXED',
          value: 50,
          minOrder: 200,
          maxUses: 50,
          usedCount: 1,
          isActive: true,
          shopId: shop.id,
        },
        create: {
          code: 'SUMMER50',
          type: 'FIXED',
          value: 50,
          minOrder: 200,
          maxUses: 50,
          usedCount: 1,
          isActive: true,
          shopId: shop.id,
        },
      }),
      prisma.coupon.upsert({
        where: { code: 'BUY2GET1' },
        update: {
          type: 'BUY_X_GET_Y',
          value: 2,
          buyQuantity: 2,
          getQuantity: 1,
          getDiscount: 100,
          minOrder: 300,
          maxUses: 20,
          usedCount: 0,
          isActive: true,
          shopId: shop.id,
        },
        create: {
          code: 'BUY2GET1',
          type: 'BUY_X_GET_Y',
          value: 2,
          buyQuantity: 2,
          getQuantity: 1,
          getDiscount: 100,
          minOrder: 300,
          maxUses: 20,
          usedCount: 0,
          isActive: true,
          shopId: shop.id,
        },
      }),
    ])

    console.log(`✅ Created ${coupons.length} coupons`)

    // Create discounts (2-3)
    const discounts = await Promise.all([
      prisma.discount.create({
        data: {
          title: 'הנחה על נעליים',
          description: '15% הנחה על כל הנעליים',
          type: 'PERCENTAGE',
          value: 15,
          target: 'SPECIFIC_CATEGORIES',
          applicableCategories: [categories[0].id],
          isActive: true,
          isAutomatic: true,
          shopId: shop.id,
        },
      }),
      prisma.discount.create({
        data: {
          title: 'הנחת כמות',
          description: 'הנחה על קנייה בכמויות',
          type: 'VOLUME_DISCOUNT',
          value: 0,
          volumeRules: [
            { quantity: 3, discount: 10 },
            { quantity: 5, discount: 20 },
          ],
          target: 'ALL_PRODUCTS',
          isActive: true,
          isAutomatic: true,
          shopId: shop.id,
        },
      }),
      prisma.discount.create({
        data: {
          title: 'הנחה ללקוחות VIP',
          description: '20% הנחה ללקוחות VIP',
          type: 'PERCENTAGE',
          value: 20,
          customerTarget: 'CUSTOMER_TIERS',
          customerTiers: ['VIP'],
          isActive: true,
          isAutomatic: true,
          shopId: shop.id,
        },
      }),
    ])

    console.log(`✅ Created ${discounts.length} discounts`)

    // Create orders (2-3)
    const nikeVariant = await prisma.productVariant.findFirst({
      where: { productId: nikeShoes.id, sku: 'NIKE-AM-BLK-40' },
    })
    const adidasVariant = await prisma.productVariant.findFirst({
      where: { productId: adidasShirt.id, sku: 'ADIDAS-SH-WHT-M' },
    })

    // Delete existing orders for clean seed (by shopId and orderNumber)
    const orderNumbers = ['ORD-000001', 'ORD-000002', 'ORD-000003']
    await prisma.order.deleteMany({
      where: {
        OR: [
          { shopId: shop.id },
          { orderNumber: { in: orderNumbers } }
        ]
      },
    })

    const orders = await Promise.all([
      prisma.order.create({
        data: {
          orderNumber: 'ORD-000001',
          shopId: shop.id,
          customerId: customers[0].id,
          customerName: `${customers[0].firstName} ${customers[0].lastName}`,
          customerEmail: customers[0].email,
          customerPhone: customers[0].phone,
          shippingAddress: (Array.isArray(customers[0].addresses) && customers[0].addresses[0]) || {
            street: 'רחוב הרצל 10',
            city: 'תל אביב',
            zip: '12345',
            country: 'ישראל',
          },
          subtotal: 599.90,
          shipping: 20,
          tax: 111.58,
          discount: 0,
          total: 731.48,
          status: 'CONFIRMED',
          paymentStatus: 'PAID',
          fulfillmentStatus: 'UNFULFILLED',
          paymentMethod: 'Credit Card',
          paidAt: new Date(), // שולם היום
          items: {
            create: {
              productId: nikeShoes.id,
              variantId: nikeVariant?.id,
              name: nikeShoes.name,
              sku: nikeVariant?.sku || nikeShoes.sku,
              quantity: 1,
              price: 599.90,
              total: 599.90,
            },
          },
        },
      }),
      prisma.order.create({
        data: {
          orderNumber: 'ORD-000002',
          shopId: shop.id,
          customerId: customers[1].id,
          customerName: `${customers[1].firstName} ${customers[1].lastName}`,
          customerEmail: customers[1].email,
          customerPhone: customers[1].phone,
          shippingAddress: (Array.isArray(customers[1].addresses) && customers[1].addresses[0]) || {
            street: 'דרך המלך 50',
            city: 'חיפה',
            zip: '54321',
            country: 'ישראל',
          },
          subtotal: 149.90,
          shipping: 15,
          tax: 29.68,
          discount: 0,
          total: 194.58,
          status: 'SHIPPED',
          paymentStatus: 'PAID',
          fulfillmentStatus: 'FULFILLED',
          paymentMethod: 'Credit Card',
          trackingNumber: 'TRACK123456',
          paidAt: new Date(), // שולם היום
          shippedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          items: {
            create: {
              productId: adidasShirt.id,
              variantId: adidasVariant?.id,
              name: adidasShirt.name,
              sku: adidasVariant?.sku || adidasShirt.sku,
              quantity: 1,
              price: 149.90,
              total: 149.90,
            },
          },
        },
      }),
      prisma.order.create({
        data: {
          orderNumber: 'ORD-000003',
          shopId: shop.id,
          customerId: customers[0].id,
          customerName: `${customers[0].firstName} ${customers[0].lastName}`,
          customerEmail: customers[0].email,
          customerPhone: customers[0].phone,
          shippingAddress: (Array.isArray(customers[0].addresses) && customers[0].addresses[0]) || {
            street: 'רחוב הרצל 10',
            city: 'תל אביב',
            zip: '12345',
            country: 'ישראל',
          },
          subtotal: 749.80,
          shipping: 0,
          tax: 134.96,
          discount: 50,
          total: 834.76,
          status: 'DELIVERED',
          paymentStatus: 'PAID',
          fulfillmentStatus: 'FULFILLED',
          paymentMethod: 'Credit Card',
          couponCode: 'SUMMER50',
          paidAt: new Date(), // שולם היום
          deliveredAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          items: {
            create: [
              {
                productId: nikeShoes.id,
                variantId: nikeVariant?.id,
                name: nikeShoes.name,
                sku: nikeVariant?.sku || nikeShoes.sku,
                quantity: 1,
                price: 599.90,
                total: 599.90,
              },
              {
                productId: adidasShirt.id,
                variantId: adidasVariant?.id,
                name: adidasShirt.name,
                sku: adidasVariant?.sku || adidasShirt.sku,
                quantity: 1,
                price: 149.90,
                total: 149.90,
              },
            ],
          },
        },
      }),
    ])

    console.log(`✅ Created ${orders.length} orders`)

    // Create reviews (2-3)
    const reviews = await Promise.all([
      prisma.review.create({
        data: {
          shopId: shop.id,
          productId: nikeShoes.id,
          customerId: customers[0].id,
          rating: 5,
          title: 'נעליים מעולות!',
          comment: 'נעליים מאוד נוחות ואיכותיות, ממליץ בחום!',
          isApproved: true,
          isVerified: true,
        },
      }),
      prisma.review.create({
        data: {
          shopId: shop.id,
          productId: adidasShirt.id,
          customerId: customers[1].id,
          rating: 4,
          title: 'חולצה איכותית',
          comment: 'חולצה נוחה ואיכותית, רק הצבע דהה קצת אחרי כביסה',
          isApproved: true,
          isVerified: true,
        },
      }),
      prisma.review.create({
        data: {
          shopId: shop.id,
          productId: nikeShoes.id,
          customerId: customers[2].id,
          rating: 5,
          title: 'מושלם!',
          comment: 'נעליים מדהימות, בדיוק מה שחיפשתי',
          isApproved: false, // Pending approval
          isVerified: false,
        },
      }),
    ])

    console.log(`✅ Created ${reviews.length} reviews`)

    // Delete existing gift cards for clean seed (by shopId and code)
    const giftCardCodes = ['GIFT100', 'GIFT200', 'GIFT50']
    await prisma.giftCard.deleteMany({
      where: {
        OR: [
          { shopId: shop.id },
          { code: { in: giftCardCodes } }
        ]
      },
    })

    // Create gift cards (2-3) using upsert to handle existing codes
    const giftCards = await Promise.all([
      prisma.giftCard.upsert({
        where: { code: 'GIFT100' },
        update: {
          shopId: shop.id,
          amount: 100,
          balance: 100,
          recipientEmail: 'recipient1@example.com',
          recipientName: 'יוסי כהן',
          senderName: 'שרה לוי',
          message: 'מתנה ליום הולדת!',
          isActive: true,
        },
        create: {
          shopId: shop.id,
          code: 'GIFT100',
          amount: 100,
          balance: 100,
          recipientEmail: 'recipient1@example.com',
          recipientName: 'יוסי כהן',
          senderName: 'שרה לוי',
          message: 'מתנה ליום הולדת!',
          isActive: true,
        },
      }),
      prisma.giftCard.upsert({
        where: { code: 'GIFT200' },
        update: {
          shopId: shop.id,
          amount: 200,
          balance: 150,
          recipientEmail: 'recipient2@example.com',
          recipientName: 'דוד מזרחי',
          senderName: 'יוסי כהן',
          message: 'תודה על הרכישה!',
          isActive: true,
        },
        create: {
          shopId: shop.id,
          code: 'GIFT200',
          amount: 200,
          balance: 150,
          recipientEmail: 'recipient2@example.com',
          recipientName: 'דוד מזרחי',
          senderName: 'יוסי כהן',
          message: 'תודה על הרכישה!',
          isActive: true,
        },
      }),
      prisma.giftCard.upsert({
        where: { code: 'GIFT50' },
        update: {
          shopId: shop.id,
          amount: 50,
          balance: 50,
          recipientEmail: 'recipient3@example.com',
          recipientName: 'מיכל רוזן',
          isActive: true,
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        },
        create: {
          shopId: shop.id,
          code: 'GIFT50',
          amount: 50,
          balance: 50,
          recipientEmail: 'recipient3@example.com',
          recipientName: 'מיכל רוזן',
          isActive: true,
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        },
      }),
    ])

    console.log(`✅ Created ${giftCards.length} gift cards`)

    // Create store credits (2-3)
    const storeCredits = await Promise.all([
      prisma.storeCredit.create({
        data: {
          shopId: shop.id,
          customerId: customers[0].id,
          amount: 50,
          balance: 50,
          reason: 'החזר על הזמנה',
        },
      }),
      prisma.storeCredit.create({
        data: {
          shopId: shop.id,
          customerId: customers[1].id,
          amount: 25,
          balance: 25,
          reason: 'בונוס לקוח VIP',
        },
      }),
      prisma.storeCredit.create({
        data: {
          shopId: shop.id,
          customerId: customers[0].id,
          amount: 100,
          balance: 0, // Used
          reason: 'קרדיט על ביטול הזמנה',
        },
      }),
    ])

    console.log(`✅ Created ${storeCredits.length} store credits`)

    // Delete existing bundles for clean seed
    await prisma.bundle.deleteMany({
      where: { shopId: shop.id },
    })

    // Create bundles (2-3)
    const bundles = await Promise.all([
      prisma.bundle.create({
        data: {
          shopId: shop.id,
          name: 'חבילת ספורט',
          description: 'נעליים נייק + חולצה אדידס במחיר מיוחד',
          price: 699.90,
          comparePrice: 749.80,
          isActive: true,
          products: {
            create: [
              { productId: nikeShoes.id, quantity: 1, position: 0 },
              { productId: adidasShirt.id, quantity: 1, position: 1 },
            ],
          },
        },
      }),
      prisma.bundle.create({
        data: {
          shopId: shop.id,
          name: 'חבילת אביזרים',
          description: 'תיק + כובע במחיר מיוחד',
          price: 299.90,
          comparePrice: 339.80,
          isActive: true,
          products: {
            create: [
              { productId: additionalProducts[0].id, quantity: 1, position: 0 },
              { productId: additionalProducts[1].id, quantity: 1, position: 1 },
            ],
          },
        },
      }),
    ])

    console.log(`✅ Created ${bundles.length} bundles`)

    // Delete existing pages for clean seed
    await prisma.page.deleteMany({
      where: { shopId: shop.id },
    })

    // Create pages (2-3)
    const pages = await Promise.all([
      prisma.page.create({
        data: {
          shopId: shop.id,
          title: 'אודות',
          slug: 'about',
          content: '<h1>אודות החנות</h1><p>ברוכים הבאים לחנות שלנו! אנחנו מתמחים במוצרי ספורט איכותיים.</p>',
          isPublished: true,
          showInMenu: true,
          menuPosition: 1,
        },
      }),
      prisma.page.create({
        data: {
          shopId: shop.id,
          title: 'מדיניות החזרות',
          slug: 'returns',
          content: '<h1>מדיניות החזרות</h1><p>אפשר להחזיר מוצרים תוך 14 יום מהרכישה.</p>',
          isPublished: true,
          showInMenu: true,
          menuPosition: 2,
        },
      }),
      prisma.page.create({
        data: {
          shopId: shop.id,
          title: 'צור קשר',
          slug: 'contact',
          content: '<h1>צור קשר</h1><p>ניתן ליצור קשר במייל: info@demo-shop.com</p>',
          isPublished: true,
          showInMenu: true,
          menuPosition: 3,
        },
      }),
    ])

    console.log(`✅ Created ${pages.length} pages`)

    // Delete existing navigations for clean seed
    await prisma.navigation.deleteMany({
      where: { shopId: shop.id },
    })

    // Create Desktop Navigation with Mega Menu
    const desktopNavigation = await prisma.navigation.create({
      data: {
        shopId: shop.id,
        name: 'תפריט ראשי למחשב',
        location: 'DESKTOP',
        items: [
          // פריט ראשי עם מגה מניו - מוצרים
          {
            id: 'nav-item-1',
            label: 'מוצרים',
            type: 'EXTERNAL',
            url: '#',
            position: 0,
            parentId: null,
            columnTitle: 'קטגוריות פופולריות',
            children: [
              {
                id: 'nav-item-1-1',
                label: categories[0].name, // נעליים
                type: 'CATEGORY',
                url: `/categories/${categories[0].slug}`,
                position: 0,
                parentId: 'nav-item-1',
                categoryId: categories[0].id,
              },
              {
                id: 'nav-item-1-2',
                label: categories[1].name, // חולצות
                type: 'CATEGORY',
                url: `/categories/${categories[1].slug}`,
                position: 1,
                parentId: 'nav-item-1',
                categoryId: categories[1].id,
              },
              {
                id: 'nav-item-1-3',
                label: categories[2].name, // אביזרים
                type: 'CATEGORY',
                url: `/categories/${categories[2].slug}`,
                position: 2,
                parentId: 'nav-item-1',
                categoryId: categories[2].id,
              },
              {
                id: 'nav-item-1-4',
                label: collections[0].name, // מוצרים מומלצים
                type: 'COLLECTION',
                url: `/collections/${collections[0].slug}`,
                position: 3,
                parentId: 'nav-item-1',
                collectionId: collections[0].id,
              },
              {
                id: 'nav-item-1-5',
                label: collections[1].name, // מבצעים
                type: 'COLLECTION',
                url: `/collections/${collections[1].slug}`,
                position: 4,
                parentId: 'nav-item-1',
                collectionId: collections[1].id,
              },
              {
                id: 'nav-item-1-6',
                label: collections[2].name, // חדש בחנות
                type: 'COLLECTION',
                url: `/collections/${collections[2].slug}`,
                position: 5,
                parentId: 'nav-item-1',
                collectionId: collections[2].id,
              },
            ],
          },
          // פריט ראשי עם מגה מניו - מותגים
          {
            id: 'nav-item-2',
            label: 'מותגים',
            type: 'EXTERNAL',
            url: '#',
            position: 1,
            parentId: null,
            columnTitle: 'מותגים מובילים',
            children: [
              {
                id: 'nav-item-2-1',
                label: 'נייק',
                type: 'EXTERNAL',
                url: `/shop/${shop.slug}/search?q=נייק`,
                position: 0,
                parentId: 'nav-item-2',
              },
              {
                id: 'nav-item-2-2',
                label: 'אדידס',
                type: 'EXTERNAL',
                url: `/shop/${shop.slug}/search?q=אדידס`,
                position: 1,
                parentId: 'nav-item-2',
              },
              {
                id: 'nav-item-2-3',
                label: 'פומה',
                type: 'EXTERNAL',
                url: `/shop/${shop.slug}/search?q=פומה`,
                position: 2,
                parentId: 'nav-item-2',
              },
            ],
          },
          // פריט רגיל - אודות
          {
            id: 'nav-item-3',
            label: pages[0].title, // אודות
            type: 'PAGE',
            url: `/pages/${pages[0].slug}`,
            position: 2,
            parentId: null,
            pageId: pages[0].id,
          },
          // פריט רגיל - צור קשר
          {
            id: 'nav-item-4',
            label: pages[2].title, // צור קשר
            type: 'PAGE',
            url: `/pages/${pages[2].slug}`,
            position: 3,
            parentId: null,
            pageId: pages[2].id,
          },
          // פריט רגיל - בלוג
          {
            id: 'nav-item-5',
            label: 'בלוג',
            type: 'EXTERNAL',
            url: `/shop/${shop.slug}/blog`,
            position: 4,
            parentId: null,
          },
        ],
      },
    })

    // Create Mobile Navigation (simpler version)
    const mobileNavigation = await prisma.navigation.create({
      data: {
        shopId: shop.id,
        name: 'תפריט למובייל',
        location: 'MOBILE',
        items: [
          {
            id: 'mobile-item-1',
            label: 'מוצרים',
            type: 'EXTERNAL',
            url: '#',
            position: 0,
            parentId: null,
            children: [
              {
                id: 'mobile-item-1-1',
                label: categories[0].name,
                type: 'CATEGORY',
                url: `/categories/${categories[0].slug}`,
                position: 0,
                parentId: 'mobile-item-1',
                categoryId: categories[0].id,
              },
              {
                id: 'mobile-item-1-2',
                label: categories[1].name,
                type: 'CATEGORY',
                url: `/categories/${categories[1].slug}`,
                position: 1,
                parentId: 'mobile-item-1',
                categoryId: categories[1].id,
              },
              {
                id: 'mobile-item-1-3',
                label: categories[2].name,
                type: 'CATEGORY',
                url: `/categories/${categories[2].slug}`,
                position: 2,
                parentId: 'mobile-item-1',
                categoryId: categories[2].id,
              },
            ],
          },
          {
            id: 'mobile-item-2',
            label: pages[0].title,
            type: 'PAGE',
            url: `/pages/${pages[0].slug}`,
            position: 1,
            parentId: null,
            pageId: pages[0].id,
          },
          {
            id: 'mobile-item-3',
            label: pages[1].title,
            type: 'PAGE',
            url: `/pages/${pages[1].slug}`,
            position: 2,
            parentId: null,
            pageId: pages[1].id,
          },
          {
            id: 'mobile-item-4',
            label: pages[2].title,
            type: 'PAGE',
            url: `/pages/${pages[2].slug}`,
            position: 3,
            parentId: null,
            pageId: pages[2].id,
          },
          {
            id: 'mobile-item-5',
            label: 'בלוג',
            type: 'EXTERNAL',
            url: `/shop/${shop.slug}/blog`,
            position: 4,
            parentId: null,
          },
        ],
      },
    })

    console.log(`✅ Created 2 navigations (Desktop with Mega Menu + Mobile)`)

    // Delete existing blog for clean seed
    await prisma.blog.deleteMany({
      where: { shopId: shop.id },
    })

    // Create blog and posts (2-3)
    const blog = await prisma.blog.create({
      data: {
        shopId: shop.id,
        title: 'בלוג החנות',
        slug: 'blog',
        description: 'עדכונים וטיפים על מוצרי ספורט',
      },
    })

    // Delete existing blog posts for clean seed
    await prisma.blogPost.deleteMany({
      where: { blogId: blog.id },
    })

    const blogPosts = await Promise.all([
      prisma.blogPost.create({
        data: {
          blogId: blog.id,
          title: 'איך לבחור נעליים לספורט',
          slug: 'how-to-choose-sports-shoes',
          content: '<p>מדריך מקיף לבחירת נעליים לספורט...</p>',
          excerpt: 'מדריך מקיף לבחירת נעליים לספורט',
          authorId: userId,
          isPublished: true,
          publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        },
      }),
      prisma.blogPost.create({
        data: {
          blogId: blog.id,
          title: 'טיפים לטיפול במוצרי ספורט',
          slug: 'sports-care-tips',
          content: '<p>איך לשמור על מוצרי הספורט שלכם...</p>',
          excerpt: 'איך לשמור על מוצרי הספורט שלכם',
          authorId: userId,
          isPublished: true,
          publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        },
      }),
      prisma.blogPost.create({
        data: {
          blogId: blog.id,
          title: 'מבצעים חדשים',
          slug: 'new-sales',
          content: '<p>מבצעים חדשים על כל המוצרים...</p>',
          excerpt: 'מבצעים חדשים על כל המוצרים',
          authorId: userId,
          isPublished: false, // Draft
        },
      }),
    ])

    console.log(`✅ Created blog with ${blogPosts.length} posts`)

    // Delete existing returns for clean seed
    await prisma.return.deleteMany({
      where: { shopId: shop.id },
    })

    // Create returns (2-3)
    const returns = await Promise.all([
      prisma.return.create({
        data: {
          shopId: shop.id,
          orderId: orders[0].id,
          customerId: customers[0].id,
          status: 'PENDING',
          reason: 'לא מתאים',
          items: [
            {
              productId: nikeShoes.id,
              variantId: nikeVariant?.id,
              quantity: 1,
              reason: 'מידה לא מתאימה',
            },
          ],
        },
      }),
      prisma.return.create({
        data: {
          shopId: shop.id,
          orderId: orders[1].id,
          customerId: customers[1].id,
          status: 'APPROVED',
          reason: 'פגם במוצר',
          refundAmount: 149.90,
          refundMethod: 'Credit Card',
          items: [
            {
              productId: adidasShirt.id,
              variantId: adidasVariant?.id,
              quantity: 1,
              reason: 'קרע במוצר',
            },
          ],
        },
      }),
      prisma.return.create({
        data: {
          shopId: shop.id,
          orderId: orders[2].id,
          customerId: customers[0].id,
          status: 'COMPLETED',
          reason: 'שינוי דעה',
          refundAmount: 599.90,
          refundMethod: 'Store Credit',
          items: [
            {
              productId: nikeShoes.id,
              variantId: nikeVariant?.id,
              quantity: 1,
              reason: 'לא רציתי',
            },
          ],
        },
      }),
    ])

    console.log(`✅ Created ${returns.length} returns`)

    // Delete existing carts for clean seed
    await prisma.cart.deleteMany({
      where: { shopId: shop.id },
    })

    // Create abandoned carts (2-3)
    const abandonedCarts = await Promise.all([
      prisma.cart.create({
        data: {
          shopId: shop.id,
          customerId: customers[2].id,
          items: [
            {
              productId: nikeShoes.id,
              variantId: nikeVariant?.id,
              quantity: 1,
              price: 599.90,
            },
          ],
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          abandonedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
      }),
      prisma.cart.create({
        data: {
          shopId: shop.id,
          sessionId: 'session-123',
          items: [
            {
              productId: adidasShirt.id,
              variantId: adidasVariant?.id,
              quantity: 2,
              price: 149.90,
            },
          ],
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          abandonedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        },
      }),
      prisma.cart.create({
        data: {
          shopId: shop.id,
          sessionId: 'session-456',
          items: [
            {
              productId: additionalProducts[0].id,
              quantity: 1,
              price: 249.90,
            },
          ],
          couponCode: 'WELCOME10',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          abandonedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        },
      }),
    ])

    console.log(`✅ Created ${abandonedCarts.length} abandoned carts`)

    // Create notifications
    const notifications = await Promise.all([
      prisma.notification.create({
        data: {
          type: 'order',
          title: 'הזמנה חדשה התקבלה',
          message: `הזמנה ${orders[0].orderNumber} בסכום של ₪${orders[0].total.toFixed(2)}`,
          companyId,
          userId,
          entityType: 'order',
          entityId: orders[0].id,
          isRead: false,
        },
      }),
      prisma.notification.create({
        data: {
          type: 'product',
          title: 'מלאי נמוך',
          message: `מוצר ${additionalProducts[1].name} - נותרו רק ${additionalProducts[1].inventoryQty} יחידות`,
          companyId,
          userId,
          entityType: 'product',
          entityId: additionalProducts[1].id,
          isRead: false,
        },
      }),
      prisma.notification.create({
        data: {
          type: 'review',
          title: 'ביקורת חדשה',
          message: `ביקורת חדשה על ${nikeShoes.name}`,
          companyId,
          userId,
          entityType: 'review',
          entityId: reviews[0].id,
          isRead: false,
        },
      }),
    ])

    console.log(`✅ Created ${notifications.length} notifications`)

    // Create shop event
    await prisma.shopEvent.create({
      data: {
        shopId: shop.id,
        type: 'shop.seeded',
        entityType: 'shop',
        entityId: shop.id,
        payload: {
          shopId: shop.id,
          name: shop.name,
          seededAt: new Date().toISOString(),
        },
        userId,
      },
    })

    console.log('✅ Seed completed successfully!')

    return NextResponse.json({ 
      success: true,
      message: "נתוני הדמו נטענו בהצלחה!",
      stats: {
        shop: 1,
        categories: categories.length,
        products: allProducts.length,
        collections: collections.length,
        customers: customers.length,
        orders: orders.length,
        coupons: coupons.length,
        discounts: discounts.length,
        reviews: reviews.length,
        giftCards: giftCards.length,
        storeCredits: storeCredits.length,
        bundles: bundles.length,
        pages: pages.length,
        blogPosts: blogPosts.length,
        returns: returns.length,
        abandonedCarts: abandonedCarts.length,
        notifications: notifications.length,
        navigations: 2,
      }
    })
  } catch (error) {
    console.error("Error seeding data:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
