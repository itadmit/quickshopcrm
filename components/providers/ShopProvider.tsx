"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { useSession } from "next-auth/react"

interface Shop {
  id: string
  name: string
  slug: string
  domain?: string | null
}

interface ShopContextType {
  selectedShop: Shop | null
  shops: Shop[]
  setSelectedShop: (shop: Shop | null) => void
  loading: boolean
}

const ShopContext = createContext<ShopContextType | undefined>(undefined)

export function ShopProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()
  const [selectedShop, setSelectedShopState] = useState<Shop | null>(null)
  const [shops, setShops] = useState<Shop[]>([])
  const [loading, setLoading] = useState(true)

  // טעינת חנויות וחנות נבחרת - רק אחרי שהמשתמש מחובר
  useEffect(() => {
    // אם ה-session עדיין נטען, נשאר ב-loading
    if (status === "loading") {
      return
    }

    // אם המשתמש לא מחובר, סיים את הטעינה
    if (status === "unauthenticated") {
      setLoading(false)
      return
    }

    // אם המשתמש מחובר, טען חנויות
    if (status === "authenticated" && session?.user) {
      async function loadShops() {
        try {
          const response = await fetch("/api/shops")
          if (response.ok) {
            const data = await response.json()
            setShops(data)

            if (data.length === 0) {
              setLoading(false)
              return
            }

            // נסה לטעון חנות שמורה מ-localStorage
            const savedShopId = localStorage.getItem("selectedShopId")
            if (savedShopId) {
              const savedShop = data.find((s: Shop) => s.id === savedShopId)
              if (savedShop) {
                setSelectedShopState(savedShop)
              } else {
                // אם החנות השמורה לא קיימת, קח את הראשונה
                setSelectedShopState(data[0])
                localStorage.setItem("selectedShopId", data[0].id)
              }
            } else {
              // אם אין חנות שמורה, קח את הראשונה אוטומטית
              setSelectedShopState(data[0])
              localStorage.setItem("selectedShopId", data[0].id)
            }
          }
        } catch (error) {
          console.error("Error loading shops:", error)
        } finally {
          setLoading(false)
        }
      }

      loadShops()
    } else {
      // אם יש בעיה עם ה-session, סיים את הטעינה
      setLoading(false)
    }
  }, [session, status])

  const setSelectedShop = (shop: Shop | null) => {
    setSelectedShopState(shop)
    if (shop) {
      localStorage.setItem("selectedShopId", shop.id)
    } else {
      localStorage.removeItem("selectedShopId")
    }
  }

  return (
    <ShopContext.Provider value={{ selectedShop, shops, setSelectedShop, loading }}>
      {children}
    </ShopContext.Provider>
  )
}

export function useShop() {
  const context = useContext(ShopContext)
  if (context === undefined) {
    throw new Error("useShop must be used within a ShopProvider")
  }
  return context
}

