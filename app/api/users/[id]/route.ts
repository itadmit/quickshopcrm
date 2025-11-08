import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// DELETE - מחיקת משתמש
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // רק ADMIN יכול למחוק משתמשים
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // לא ניתן למחוק את עצמך
    if (params.id === session.user.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      )
    }

    // בדיקה שהמשתמש שייך לאותה חברה
    const userToDelete = await prisma.user.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId,
      },
      include: {
        // הערה: חלק מהמודלים לא קיימים ב-schema הנוכחי
        // _count: {
        //   select: {
        //     ownedLeads: true,
        //     ownedClients: true,
        //     assignedTasks: true,
        //     createdAutomations: true,
        //     notifications: true,
        //     sentInvitations: true,
        //     permissions: true,
        //   },
        // },
      },
    })

    if (!userToDelete) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // לא ניתן למחוק ADMIN אחר
    if (userToDelete.role === "ADMIN" || userToDelete.role === "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Cannot delete admin users" },
        { status: 400 }
      )
    }

    // מחיקת כל הנתונים הקשורים למשתמש
    // 1. מחיקת הרשאות (UserPermission) - יש cascade delete
    // 2. עדכון לידים - הסרת owner
    // הערה: מודל lead לא קיים ב-schema הנוכחי
    // TODO: להוסיף מודל lead ל-schema אם נדרש

    // 3. עדכון לקוחות - הסרת owner
    // הערה: מודל client לא קיים - יש customer במקום (ללא owner)
    // TODO: לבדוק אם צריך להוסיף owner ל-customer

    // 4. עדכון משימות - הסרת assignee
    // הערה: מודל task לא קיים ב-schema הנוכחי
    // TODO: להוסיף מודל task ל-schema אם נדרש

    // 5. מחיקת אוטומציות שנוצרו על ידי המשתמש
    // הערה: מודל automation לא קיים ב-schema הנוכחי
    // TODO: להוסיף מודל automation ל-schema אם נדרש

    // 6. מחיקת התראות
    await prisma.notification.deleteMany({
      where: {
        userId: params.id,
        companyId: session.user.companyId,
      },
    })

    // 7. עדכון הזמנות שנשלחו על ידי המשתמש
    await prisma.invitation.updateMany({
      where: {
        invitedBy: params.id,
        companyId: session.user.companyId,
      },
      data: {
        invitedBy: session.user.id, // העברת הזמנות למנהל
      },
    })

    // 8. מחיקת הזמנה שקשורה למשתמש (אם יש)
    await prisma.invitation.deleteMany({
      where: {
        userId: params.id,
        companyId: session.user.companyId,
      },
    })

    // 9. מחיקת audit logs
    await prisma.auditLog.deleteMany({
      where: {
        userId: params.id,
        companyId: session.user.companyId,
      },
    })

    // 10. מחיקת המשתמש עצמו (UserPermission ימחק אוטומטית בגלל cascade)
    await prisma.user.delete({
      where: {
        id: params.id,
      },
    })

    console.log(`✅ User ${params.id} deleted successfully`)

    return NextResponse.json({
      success: true,
      message: "User deleted successfully",
      deletedData: {
        // הערה: חלק מהמודלים לא קיימים ב-schema הנוכחי
        // ownedLeads: userToDelete._count?.ownedLeads || 0,
        // ownedClients: userToDelete._count?.ownedClients || 0,
        // assignedTasks: userToDelete._count?.assignedTasks || 0,
        // createdAutomations: userToDelete._count?.createdAutomations || 0,
        notifications: 0, // TODO: לספור מתוך prisma.notification
        sentInvitations: 0, // TODO: לספור מתוך prisma.invitation
        permissions: 0, // TODO: לספור מתוך prisma.userPermission
      },
    })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

