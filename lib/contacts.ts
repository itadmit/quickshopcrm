import { prisma } from "./prisma"

/**
 * פונקציה עזר ליצירת או עדכון Contact
 * מטפלת בכל הלוגיקה של יצירת Contact עם קטגוריות
 */
export async function createOrUpdateContact(params: {
  shopId: string
  email: string
  firstName?: string | null
  lastName?: string | null
  phone?: string | null
  company?: string | null
  notes?: string | null
  tags?: string[]
  categoryTypes: string[] // ["CUSTOMER", "NEWSLETTER", וכו']
  emailMarketingConsent?: boolean
  emailMarketingConsentSource?: string
  customerId?: string | null
}) {
  const {
    shopId,
    email,
    firstName,
    lastName,
    phone,
    company,
    notes,
    tags,
    categoryTypes,
    emailMarketingConsent = false,
    emailMarketingConsentSource,
    customerId,
  } = params

  // בדיקה אם יש Contact קיים
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

  let contact
  if (existingContact) {
    // עדכון Contact קיים
    contact = await prisma.contact.update({
      where: { id: existingContact.id },
      data: {
        firstName: firstName !== undefined ? firstName : existingContact.firstName,
        lastName: lastName !== undefined ? lastName : existingContact.lastName,
        phone: phone !== undefined ? phone : existingContact.phone,
        company: company !== undefined ? company : existingContact.company,
        notes: notes !== undefined ? notes : existingContact.notes,
        tags: tags !== undefined ? tags : existingContact.tags,
        emailMarketingConsent: emailMarketingConsent !== undefined 
          ? emailMarketingConsent 
          : existingContact.emailMarketingConsent,
        emailMarketingConsentAt: 
          emailMarketingConsent === true && !existingContact.emailMarketingConsent
            ? new Date()
            : existingContact.emailMarketingConsentAt,
        emailMarketingConsentSource: emailMarketingConsentSource || existingContact.emailMarketingConsentSource,
        customerId: customerId || existingContact.customerId,
      },
      include: {
        categoryAssignments: {
          include: {
            category: true,
          },
        },
      },
    })

    // הוספת קטגוריות חדשות אם יש
    const existingCategoryTypes = existingContact.categoryAssignments.map(
      (ca) => ca.category.type
    )

    const newCategoryTypes = categoryTypes.filter(
      (ct) => !existingCategoryTypes.includes(ct)
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
        categories.map((category) =>
          prisma.contactCategoryAssignment.create({
            data: {
              contactId: contact.id,
              categoryId: category.id,
              metadata: {
                addedAt: new Date().toISOString(),
                source: emailMarketingConsentSource || "system",
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
        },
      })
    }
  } else {
    // יצירת Contact חדש
    contact = await prisma.contact.create({
      data: {
        shopId,
        email: email.toLowerCase(),
        firstName: firstName || null,
        lastName: lastName || null,
        phone: phone || null,
        company: company || null,
        notes: notes || null,
        tags: tags || [],
        emailMarketingConsent,
        emailMarketingConsentAt: emailMarketingConsent ? new Date() : null,
        emailMarketingConsentSource: emailMarketingConsentSource || "system",
        customerId: customerId || null,
      },
      include: {
        categoryAssignments: {
          include: {
            category: true,
          },
        },
      },
    })

    // הוספת קטגוריות
    if (categoryTypes.length > 0) {
      const categories = await prisma.contactCategory.findMany({
        where: {
          shopId,
          type: { in: categoryTypes },
        },
      })

      await Promise.all(
        categories.map((category) =>
          prisma.contactCategoryAssignment.create({
            data: {
              contactId: contact.id,
              categoryId: category.id,
              metadata: {
                addedAt: new Date().toISOString(),
                source: emailMarketingConsentSource || "system",
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
        },
      })
    }
  }

  return contact
}

/**
 * אתחול קטגוריות בסיסיות לחנות
 */
export async function initContactCategories(shopId: string) {
  const defaultCategories = [
    {
      type: "CUSTOMER" as const,
      name: "לקוחות",
      description: "לקוחות שרכשו באתר",
      color: "#10b981",
    },
    {
      type: "CLUB_MEMBER" as const,
      name: "חברי מועדון",
      description: "נרשמו לאתר",
      color: "#3b82f6",
    },
    {
      type: "NEWSLETTER" as const,
      name: "ניוזלטר",
      description: "נרשמו לטופס ניוזלטר",
      color: "#f59e0b",
    },
    {
      type: "CONTACT_FORM" as const,
      name: "יצירת קשר",
      description: "השאירו הודעה בטופס יצירת קשר",
      color: "#8b5cf6",
    },
  ]

  const results = []
  
  for (const category of defaultCategories) {
    const existing = await prisma.contactCategory.findUnique({
      where: {
        shopId_type: {
          shopId,
          type: category.type,
        },
      },
    })

    if (!existing) {
      const created = await prisma.contactCategory.create({
        data: {
          shopId,
          ...category,
        },
      })
      results.push(created)
    } else {
      results.push(existing)
    }
  }

  return results
}


