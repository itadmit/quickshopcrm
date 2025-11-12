import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function createDefaultNavigations(email: string) {
  try {
    console.log(`🔍 Looking for user: ${email}`)

    // מציאת המשתמש לפי אימייל
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        company: {
          include: {
            shops: {
              include: {
                Navigation: true,
              },
            },
          },
        },
      },
    })

    if (!user) {
      console.error(`❌ User not found: ${email}`)
      return
    }

    if (!user.companyId) {
      console.error(`❌ User has no company`)
      return
    }

    const company = user.company
    if (!company) {
      console.error(`❌ Company not found`)
      return
    }

    const shops = company.shops
    if (shops.length === 0) {
      console.log(`ℹ️  No shops found for user ${email}`)
      return
    }

    console.log(`✅ Found ${shops.length} shop(s) for user ${email}`)

    // תפריטים ברירת מחדל
    const defaultNavigations = [
      { name: "תפריט למחשב", location: "DESKTOP" },
      { name: "תפריט למובייל", location: "MOBILE" },
      { name: "תפריט לפוטר", location: "FOOTER" },
      { name: "תפריט לצ'ק אאוט", location: "CHECKOUT" },
    ]

    let totalCreated = 0

    // עבור כל חנות
    for (const shop of shops) {
      console.log(`\n📦 Processing shop: ${shop.name} (${shop.id})`)
      
      const existingLocations = new Set(shop.Navigation.map((nav: any) => nav.location))
      console.log(`   Existing navigations: ${Array.from(existingLocations).join(", ") || "none"}`)

      // יצירת תפריטים שחסרים
      for (const nav of defaultNavigations) {
        if (!existingLocations.has(nav.location)) {
          try {
            await prisma.navigation.create({
              data: {
                shopId: shop.id,
                name: nav.name,
                location: nav.location,
                items: [],
              },
            })
            console.log(`   ✅ Created: ${nav.name} (${nav.location})`)
            totalCreated++
          } catch (error: any) {
            console.error(`   ❌ Error creating ${nav.location}:`, error.message)
          }
        } else {
          console.log(`   ⏭️  Skipped: ${nav.name} (${nav.location}) - already exists`)
        }
      }
    }

    console.log(`\n✨ Done! Created ${totalCreated} navigation(s) in total`)
  } catch (error) {
    console.error("❌ Error:", error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// הרצת הסקריפט
const email = process.argv[2] || "0547359@gmail.com"

createDefaultNavigations(email)
  .then(() => {
    console.log("\n✅ Script completed successfully")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error)
    process.exit(1)
  })

