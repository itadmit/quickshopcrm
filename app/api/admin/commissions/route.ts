import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"
import { getPayPlusCredentials, chargeByToken } from "@/lib/payplus"

/**
 * GET - קבלת רשימת חנויות ועמלות שטרם נגבו
 */
export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

    if (!token || token.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 })
    }

    // קבלת כל החברות עם מנויים פעילים
    const companies = await prisma.company.findMany({
      where: {
        subscription: {
          status: {
            in: ["ACTIVE", "TRIAL"],
          },
        },
      },
      include: {
        subscription: true,
        users: {
          take: 1,
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    // חישוב עמלות לכל חברה (0.5% מכל המכירות)
    const commissionsData = await Promise.all(
      companies.map(async (company) => {
        // חישוב סך המכירות מאז התשלום האחרון
        const lastCommissionDate =
          (company.subscription?.paymentDetails as any)?.lastCommissionDate ||
          company.subscription?.subscriptionStartDate ||
          new Date()

        // קבלת כל החנויות של החברה
        const shops = await prisma.shop.findMany({
          where: { companyId: company.id },
          select: { id: true },
        })

        const shopIds = shops.map((shop: any) => shop.id)

        // חישוב סך המכירות האמיתי מההזמנות של כל החנויות
        const orders = await prisma.order.aggregate({
          where: {
            shopId: { in: shopIds }, // כל החנויות של החברה
            status: "PAID", // רק הזמנות ששולמו
            paidAt: {
              gte: new Date(lastCommissionDate), // מאז הגבייה האחרונה
            },
          },
          _sum: {
            total: true,
          },
        })

        const totalSales = orders._sum.total || 0
        const commissionRate = 0.005 // 0.5%
        const commissionAmount = totalSales * commissionRate

        return {
          companyId: company.id,
          companyName: company.name,
          ownerName: company.users[0]?.name || "לא ידוע",
          ownerEmail: company.users[0]?.email || "לא ידוע",
          plan: company.subscription?.plan || "TRIAL",
          status: company.subscription?.status || "TRIAL",
          totalSales,
          commissionRate: "0.5%",
          commissionAmount,
          lastCommissionDate,
          hasToken: !!(company.subscription?.paymentDetails as any)?.recurringToken,
          token: (company.subscription?.paymentDetails as any)?.recurringToken,
        }
      })
    )

    return NextResponse.json({
      companies: commissionsData,
      totalCommissions: commissionsData.reduce((sum, c) => sum + c.commissionAmount, 0),
    })
  } catch (error) {
    console.error("Error fetching commissions:", error)
    return NextResponse.json({ error: "שגיאה בטעינת נתונים" }, { status: 500 })
  }
}

/**
 * POST - גביית עמלה מחנות ספציפית
 */
export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

    if (!token || token.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 })
    }

    const { companyId, amount } = await req.json()

    if (!companyId || !amount) {
      return NextResponse.json({ error: "חסרים פרמטרים" }, { status: 400 })
    }

    // קבלת פרטי החברה
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { subscription: true },
    })

    if (!company || !company.subscription) {
      return NextResponse.json({ error: "חברה לא נמצאה" }, { status: 404 })
    }

    const paymentDetails = company.subscription.paymentDetails as any
    const recurringToken = paymentDetails?.recurringToken
    const cashierUid = paymentDetails?.cashierUid
    const customerUid = paymentDetails?.customerUid

    if (!recurringToken) {
      return NextResponse.json(
        { error: "אין Token שמור עבור חברה זו" },
        { status: 400 }
      )
    }

    if (!customerUid) {
      return NextResponse.json(
        { error: "חסר customer_uid - יש לשלם מנוי מחדש" },
        { status: 400 }
      )
    }

    // קבלת credentials של PayPlus
    const payplusCredentials = await getPayPlusCredentials(null, true)
    if (!payplusCredentials) {
      return NextResponse.json(
        { error: "PayPlus לא מוגדר" },
        { status: 400 }
      )
    }

    // ביצוע חיוב דרך PayPlus API עם ה-Token
    // עיגול הסכום ל-2 ספרות אחרי הנקודה (דרישת PayPlus)
    const roundedAmount = Math.round(amount * 100) / 100

    console.log("Charging commission:", {
      companyId,
      companyName: company.name,
      originalAmount: amount,
      roundedAmount,
      hasToken: !!recurringToken,
      hasCashier: !!cashierUid,
      hasCustomer: !!customerUid,
    })

    const chargeResult = await chargeByToken(payplusCredentials, {
      token: recurringToken,
      customerUid, // נשתמש ב-customer_uid המקורי מ-PayPlus
      cashierUid, // נשתמש ב-cashier שנשמר מהתשלום המקורי
      amount: roundedAmount,
      description: `עמלת Quick Shop - ${company.name}`,
      moreInfo: JSON.stringify({
        type: "commission",
        companyId,
        companyName: company.name,
        amount: roundedAmount,
        date: new Date().toISOString(),
      }),
    })

    if (!chargeResult.success) {
      console.error("Failed to charge commission:", chargeResult.error)
      return NextResponse.json(
        { error: chargeResult.error || "נכשל בגבייה" },
        { status: 500 }
      )
    }

    console.log("Commission charged successfully:", chargeResult.data)

    // עדכון תאריך גבייה אחרון
    await prisma.subscription.update({
      where: { companyId },
      data: {
        paymentDetails: {
          ...paymentDetails,
          lastCommissionDate: new Date().toISOString(),
          lastCommissionAmount: roundedAmount,
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: `נגבו ${roundedAmount.toFixed(2)}₪ מ-${company.name}`,
      companyName: company.name,
      amount: roundedAmount,
    })
  } catch (error) {
    console.error("Error charging commission:", error)
    return NextResponse.json({ error: "שגיאה בגבייה" }, { status: 500 })
  }
}

