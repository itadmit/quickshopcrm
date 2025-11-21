"use client"

import { useEffect, useState, Suspense } from "react"
import { useSession, signOut } from "next-auth/react"
import { useTranslations, useLocale } from "next-intl"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Sidebar } from "./Sidebar"
import { Header } from "./Header"
import { Footer } from "./Footer"
import { SubscriptionBlock } from "./SubscriptionBlock"
import { MobileBottomNav } from "./MobileBottomNav"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"

interface AppLayoutProps {
  children: React.ReactNode
  title?: string
  hideSidebar?: boolean
  hideHeader?: boolean
}

function AppLayoutContent({ children, title, hideSidebar, hideHeader }: AppLayoutProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const t = useTranslations()
  const locale = useLocale()
  const { toast } = useToast()
  const dir = locale === 'he' ? 'rtl' : 'ltr'
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null)
  const [checkingSubscription, setCheckingSubscription] = useState(true)

  // בדיקת מנוי פעיל - אופטימיזציה: רק פעם אחת בטעינה
  useEffect(() => {
    async function checkSubscription() {
      if (!session?.user?.companyId) {
        setCheckingSubscription(false)
        return
      }

      try {
        const response = await fetch('/api/subscriptions/check')
        if (response.ok) {
          const data = await response.json()
          setSubscriptionInfo(data)
        }
      } catch (error) {
        // שגיאה שקטה
      } finally {
        setCheckingSubscription(false)
      }
    }

    if (status === "authenticated" && session) {
      checkSubscription()
    } else {
      setCheckingSubscription(false)
    }
    // הסרת pathname מה-dependencies - לא צריך לטעון מחדש בכל ניווט
  }, [status, session])

  useEffect(() => {
    // לא לבדוק authentication בדפי הזמנה או רישום
    if (pathname?.startsWith("/invite") || pathname?.startsWith("/register")) {
      return
    }

    // בדיקה אם ה-session התבטל (משתמש נמחק)
    if (status === "unauthenticated" && session === null) {
      // בדיקה אם זה קרה אחרי מחיקה
      const userDeleted = sessionStorage.getItem("user_deleted")
      if (userDeleted === "true") {
        toast({
          title: t("appLayout.accountDeleted"),
          description: t("appLayout.accountDeletedDescription"),
          variant: "destructive",
        })
        sessionStorage.removeItem("user_deleted")
      }
      router.push("/login")
    }
  }, [status, session, router, toast, pathname])

  // בדיקה אם יש פרמטר blocked ב-URL
  const isBlocked = searchParams?.get("blocked") === "true"
  const shouldShowBlock = !checkingSubscription && 
                          subscriptionInfo && 
                          !subscriptionInfo.isActive && 
                          pathname !== "/settings" &&
                          pathname !== "/login" &&
                          !pathname?.startsWith("/shop/") // לא נחסום את החנות עצמה

  // אם צריך להסתיר Sidebar ו-Header (למשל בדף הזמנה)
  if (hideSidebar && hideHeader) {
    return (
      <div className="h-screen overflow-hidden" style={{ backgroundColor: '#f7f9fe' }} dir={dir}>
        <main className="h-full overflow-y-auto">
          {children}
        </main>
      </div>
    )
  }

  return (
    <>
      {shouldShowBlock && <SubscriptionBlock subscriptionInfo={subscriptionInfo} />}
      <div className="flex h-screen" style={{ backgroundColor: '#f7f9fe' }} dir={dir}>
        {!hideSidebar && (
          <div className="hidden md:block">
            <Sidebar />
          </div>
        )}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!hideHeader && <Header title={title} />}
          <main className="flex-1 overflow-y-auto">
            <div className="min-h-full flex flex-col">
              <div className="flex-1 p-4 md:p-6">
                <div className="max-w-7xl mx-auto">
                  {children}
                </div>
              </div>
              <Footer />
            </div>
          </main>
        </div>
        <MobileBottomNav />
      </div>
    </>
  )
}

export function AppLayout({ children, title, hideSidebar = false, hideHeader = false }: AppLayoutProps) {
  const locale = useLocale()
  const dir = locale === 'he' ? 'rtl' : 'ltr'
  
  return (
    <Suspense fallback={
      <div className="flex h-screen" style={{ backgroundColor: '#f7f9fe' }} dir={dir}>
        {!hideSidebar && (
          <div className="hidden md:block">
            <Sidebar />
          </div>
        )}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!hideHeader && <Header title={title} />}
          <main className="flex-1 overflow-y-auto">
            <div className="min-h-full flex flex-col">
              <div className="flex-1 p-4 md:p-6">
                <div className="max-w-7xl mx-auto">
                  <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-64 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>
              <Footer />
            </div>
          </main>
        </div>
      </div>
    }>
      <AppLayoutContent title={title} hideSidebar={hideSidebar} hideHeader={hideHeader}>
        {children}
      </AppLayoutContent>
    </Suspense>
  )
}

