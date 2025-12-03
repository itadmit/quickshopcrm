import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { initContactCategories } from "@/lib/contacts"

// GET - קבלת אנשי קשר עם סינון לפי קטגוריה
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "לא מאומת" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const shopId = searchParams.get("shopId")
    const categoryType = searchParams.get("categoryType") // CUSTOMER, CLUB_MEMBER, NEWSLETTER, CONTACT_FORM
    const search = searchParams.get("search")
    const emailMarketingConsent = searchParams.get("emailMarketingConsent") // true/false
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")

    // מציאת חנויות של החברה
    const shops = await prisma.shop.findMany({
      where: { companyId: session.user.companyId },
      select: { id: true },
    })

    const shopIds = shopId 
      ? shops.filter(s => s.id === shopId).map(s => s.id)
      : shops.map(s => s.id)

    if (shopIds.length === 0) {
      return NextResponse.json({
        contacts: [],
        pagination: {
          page: 1,
          limit,
          total: 0,
          totalPages: 0,
        },
      })
    }

    // בניית where clause
    const where: any = {
      shopId: { in: shopIds },
    }

    // סינון לפי קטגוריה
    if (categoryType) {
      where.categoryAssignments = {
        some: {
          category: {
            type: categoryType,
          },
        },
      }
    }

    // חיפוש
    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ]
    }

    // סינון לפי אישור דיוור
    if (emailMarketingConsent === "true") {
      where.emailMarketingConsent = true
    } else if (emailMarketingConsent === "false") {
      where.emailMarketingConsent = false
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        include: {
          categoryAssignments: {
            include: {
              category: true,
            },
          },
          customer: {
            select: {
              id: true,
              totalSpent: true,
              orderCount: true,
              tier: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.contact.count({ where }),
    ])

    return NextResponse.json({
      contacts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error: any) {
    console.error("Error fetching contacts:", error)
    return NextResponse.json(
      {
        error: error.message || "שגיאה בקבלת אנשי קשר",
      },
      { status: 500 }
    )
  }
}

// POST - יצירת איש קשר חדש
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "לא מאומת" }, { status: 401 })
    }

    const body = await req.json()
    const {
      shopId,
      email,
      firstName,
      lastName,
      phone,
      company,
      notes,
      tags,
      categoryTypes, // מערך של קטגוריות: ["CUSTOMER", "NEWSLETTER"]
      emailMarketingConsent,
      customerId, // אם יש קישור ללקוח קיים
    } = body

    if (!shopId || !email) {
      return NextResponse.json(
        { error: "shopId ו-email נדרשים" },
        { status: 400 }
      )
    }

    // בדיקה שהחנות שייכת לחברה
    const shop = await prisma.shop.findFirst({
      where: {
        id: shopId,
        companyId: session.user.companyId,
      },
    })

    if (!shop) {
      return NextResponse.json(
        { error: "חנות לא נמצאה" },
        { status: 404 }
      )
    }

    // אתחול קטגוריות אם צריך
    await initContactCategories(shopId)

    // בדיקה אם יש איש קשר קיים עם אותו אימייל
    const existingContact = await prisma.contact.findUnique({
      where: {
        shopId_email: {
          shopId,
          email: email.toLowerCase(),
        },
      },
      include: {
        categoryAssignments: {
          include: {
            category: true,
          },
        },
      },
    })

    let contact: any
    if (existingContact) {
      // עדכון איש קשר קיים
      contact = await prisma.contact.update({
        where: { id: existingContact.id },
        data: {
          firstName: firstName || existingContact.firstName,
          lastName: lastName || existingContact.lastName,
          phone: phone || existingContact.phone,
          company: company || existingContact.company,
          notes: notes || existingContact.notes,
          tags: tags || existingContact.tags,
          emailMarketingConsent: emailMarketingConsent !== undefined 
            ? emailMarketingConsent 
            : existingContact.emailMarketingConsent,
          emailMarketingConsentAt: emailMarketingConsent === true && !existingContact.emailMarketingConsent
            ? new Date()
            : existingContact.emailMarketingConsentAt,
          customerId: customerId || existingContact.customerId,
        },
        include: {
          categoryAssignments: {
            include: {
              category: true,
            },
          },
          customer: true,
        },
      })

      // הוספת קטגוריות חדשות אם יש
      if (categoryTypes && categoryTypes.length > 0) {
        const existingCategoryTypes = existingContact.categoryAssignments.map(
          (ca) => ca.category.type
        )

        const newCategoryTypes = categoryTypes.filter(
          (ct: string) => !existingCategoryTypes.includes(ct as any)
        )

        if (newCategoryTypes.length > 0) {
          // מציאת קטגוריות לפי type
          const categories = await prisma.contactCategory.findMany({
            where: {
              shopId,
              type: { in: newCategoryTypes },
            },
          })

          // יצירת assignments
          await Promise.all(
            categories.map((category: any) =>
              prisma.contactCategoryAssignment.create({
                data: {
                  contactId: contact.id,
                  categoryId: category.id,
                  metadata: {
                    addedAt: new Date().toISOString(),
                    source: "manual",
                  },
                },
              })
            )
          )

          // רענון contact עם קטגוריות חדשות
          contact = await prisma.contact.findUnique({
            where: { id: contact.id },
            include: {
              categoryAssignments: {
                include: {
                  category: true,
                },
              },
              customer: true,
            },
          })
        }
      }
    } else {
      // יצירת איש קשר חדש
      contact = await prisma.contact.create({
        data: {
          shopId,
          email: email.toLowerCase(),
          firstName,
          lastName,
          phone,
          company,
          notes,
          tags: tags || [],
          emailMarketingConsent: emailMarketingConsent || false,
          emailMarketingConsentAt: emailMarketingConsent ? new Date() : null,
          emailMarketingConsentSource: "manual",
          customerId,
        },
        include: {
          categoryAssignments: {
            include: {
              category: true,
            },
          },
          customer: true,
        },
      })

      // הוספת קטגוריות אם יש
      if (categoryTypes && categoryTypes.length > 0) {
        const categories = await prisma.contactCategory.findMany({
          where: {
            shopId,
            type: { in: categoryTypes },
          },
        })

        await Promise.all(
          categories.map((category: any) =>
            prisma.contactCategoryAssignment.create({
              data: {
                contactId: contact.id,
                categoryId: category.id,
                metadata: {
                  addedAt: new Date().toISOString(),
                  source: "manual",
                },
              },
            })
          )
        )

        // רענון contact עם קטגוריות
        contact = await prisma.contact.findUnique({
          where: { id: contact.id },
          include: {
            categoryAssignments: {
              include: {
                category: true,
              },
            },
            customer: true,
          },
        })
      }
    }

    return NextResponse.json(contact)
  } catch (error: any) {
    console.error("Error creating/updating contact:", error)
    return NextResponse.json(
      {
        error: error.message || "שגיאה ביצירת/עדכון איש קשר",
      },
      { status: 500 }
    )
  }
}

