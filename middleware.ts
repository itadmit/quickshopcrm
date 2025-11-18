import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

// Middleware פשוט שרק בודק authentication
// בדיקת subscription תתבצע ברמת האפליקציה (AppLayout, API routes)
// כי middleware רץ ב-Edge Runtime שלא תומך ב-Prisma
// 
// הערה: עם localePrefix: 'never' ב-next-intl, אין צורך ב-i18n middleware
// השפה נטענת ישירות מ-cookies ב-i18n.ts

export default withAuth(
  async function middleware(req) {
    // המשך רגיל - רק בדיקת authentication
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname
        
        // API routes מותרים גם בלי token - הם יבדקו את האימות בעצמם
        if (pathname.startsWith("/api/")) {
          return true
        }
        
        // Storefront routes - לא צריך auth
        if (pathname.startsWith("/shop/")) {
          return true
        }
        
        // אם אין token (כולל מקרים של שגיאת decryption), נחזיר false
        // זה יגרום ל-next-auth להפנות לעמוד התחברות
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/influencer/:path*",
    "/settings/:path*",
    "/notifications/:path*",
    "/products/:path*",
    "/orders/:path*",
    "/customers/:path*",
    "/inventory/:path*",
    "/discounts/:path*",
    "/coupons/:path*",
    "/collections/:path*",
    "/gift-cards/:path*",
    "/abandoned-carts/:path*",
    "/pages/:path*",
    "/navigation/:path*",
    "/blog/:path*",
    "/reviews/:path*",
    "/returns/:path*",
    "/store-credits/:path*",
    "/bundles/:path*",
    "/analytics/:path*",
    "/webhooks/:path*",
    "/tracking-pixels/:path*",
    "/customize/:path*",
  ]
}
