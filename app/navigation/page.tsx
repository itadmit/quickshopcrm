"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useShop } from "@/components/providers/ShopProvider"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import { Save, Menu, Plus, Trash2, GripVertical, Monitor, Smartphone, Layout, ShoppingCart, Copy, AlertCircle, Search, X, Image as ImageIcon, ChevronDown, ChevronUp } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { NavigationItemEditor } from "@/components/navigation/NavigationItemEditor"

interface NavigationItem {
  id: string
  label: string
  type: "PAGE" | "CATEGORY" | "COLLECTION" | "EXTERNAL"
  url: string | null
  position: number
  parentId: string | null
  children?: NavigationItem[]
  categoryId?: string
  collectionId?: string
  image?: string
  columnTitle?: string
}

interface Navigation {
  id: string
  name: string
  location: "DESKTOP" | "MOBILE" | "FOOTER" | "CHECKOUT" | "HEADER" | "SIDEBAR"
  items: NavigationItem[]
}

const LOCATION_OPTIONS = [
  { value: "DESKTOP", label: "תפריט למחשב", icon: Monitor },
  { value: "MOBILE", label: "תפריט למובייל", icon: Smartphone },
  { value: "FOOTER", label: "תפריט לפוטר", icon: Layout },
  { value: "CHECKOUT", label: "תפריט לצ'ק אאוט", icon: ShoppingCart },
] as const

export default function NavigationPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { selectedShop } = useShop()
  const [navigations, setNavigations] = useState<Navigation[]>([])
  const [selectedNavigation, setSelectedNavigation] = useState<Navigation | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newNavigationName, setNewNavigationName] = useState("")
  const [newNavigationLocation, setNewNavigationLocation] = useState<"DESKTOP" | "MOBILE" | "FOOTER" | "CHECKOUT">("DESKTOP")
  const [savedNavigationState, setSavedNavigationState] = useState<Navigation | null>(null)
  const [unsavedChangesDialogOpen, setUnsavedChangesDialogOpen] = useState(false)
  const [pendingNavigationId, setPendingNavigationId] = useState<string | null>(null)
  const [pageSearchQueries, setPageSearchQueries] = useState<Record<string, string>>({})
  const [pageSearchResults, setPageSearchResults] = useState<Record<string, Array<{ id: string; title: string; slug: string }>>>({})
  const [loadingPages, setLoadingPages] = useState<Record<string, boolean>>({})
  const [categorySearchQueries, setCategorySearchQueries] = useState<Record<string, string>>({})
  const [categorySearchResults, setCategorySearchResults] = useState<Record<string, Array<{ id: string; name: string; slug: string }>>>({})
  const [loadingCategories, setLoadingCategories] = useState<Record<string, boolean>>({})
  const [collectionSearchQueries, setCollectionSearchQueries] = useState<Record<string, string>>({})
  const [collectionSearchResults, setCollectionSearchResults] = useState<Record<string, Array<{ id: string; name: string; slug: string }>>>({})
  const [loadingCollections, setLoadingCollections] = useState<Record<string, boolean>>({})
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (selectedShop) {
      fetchNavigations()
    }
  }, [selectedShop])

  const fetchNavigations = async () => {
    if (!selectedShop) return

    setLoading(true)
    try {
      const response = await fetch(`/api/navigation?shopId=${selectedShop.id}`)
      if (response.ok) {
        const data = await response.json()
        const navs = (data || []).map((nav: any) => {
          const baseTime = Date.now()
          const itemsWithIds = (nav.items || []).map((item: NavigationItem, index: number) => ({
            ...item,
            id: item.id || `item-${baseTime}-${index}-${Math.random().toString(36).substr(2, 9)}`,
          }))
          return {
            ...nav,
            location: nav.location || "DESKTOP",
            items: itemsWithIds,
          }
        })
        setNavigations(navs)
        // אם יש תפריטים, נבחר את הראשון
        if (navs.length > 0 && !selectedNavigation) {
          const firstNav = navs[0]
          setSelectedNavigation(firstNav)
          setSavedNavigationState(JSON.parse(JSON.stringify(firstNav))) // שמירת מצב שמור
        } else if (navs.length === 0) {
          setSelectedNavigation(null)
          setSavedNavigationState(null)
        } else {
          // עדכון המצב השמור של התפריט הנבחר
          const currentNav = navs.find((nav: Navigation) => nav.id === selectedNavigation?.id)
          if (currentNav) {
            setSavedNavigationState(JSON.parse(JSON.stringify(currentNav)))
          }
        }
      }
    } catch (error) {
      console.error("Error fetching navigations:", error)
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לטעון את התפריטים",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!selectedShop || !selectedNavigation) return

    setSaving(true)
    try {
      const method = selectedNavigation.id ? "PUT" : "POST"
      const url = selectedNavigation.id
        ? `/api/navigation/${selectedNavigation.id}`
        : "/api/navigation"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId: selectedShop.id,
          name: selectedNavigation.name,
          location: selectedNavigation.location,
          items: selectedNavigation.items,
        }),
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "התפריט נשמר בהצלחה",
        })
        // עדכון המצב השמור אחרי שמירה מוצלחת
        if (selectedNavigation) {
          setSavedNavigationState(JSON.parse(JSON.stringify(selectedNavigation)))
        }
        fetchNavigations()
      }
    } catch (error) {
      console.error("Error saving navigation:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בשמירת התפריט",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCreateNavigation = async () => {
    if (!selectedShop || !newNavigationName.trim()) {
      toast({
        title: "שגיאה",
        description: "יש להזין שם לתפריט",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const response = await fetch("/api/navigation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId: selectedShop.id,
          name: newNavigationName,
          location: newNavigationLocation,
          items: [],
        }),
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "התפריט נוצר בהצלחה",
        })
        setCreateDialogOpen(false)
        setNewNavigationName("")
        setNewNavigationLocation("DESKTOP")
        fetchNavigations()
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "לא הצלחנו ליצור את התפריט",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating navigation:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה ביצירת התפריט",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteNavigation = async (id: string) => {
    const navToDelete = navigations.find((nav) => nav.id === id)
    
    // בדיקה אם התפריט מוגן
    if (navToDelete && (navToDelete.location === "DESKTOP" || navToDelete.location === "MOBILE")) {
      toast({
        title: "לא ניתן למחוק",
        description: "תפריט למחשב ותפריט למובייל לא ניתנים למחיקה",
        variant: "destructive",
      })
      return
    }

    if (!confirm("האם אתה בטוח שברצונך למחוק את התפריט?")) return

    try {
      const response = await fetch(`/api/navigation/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "התפריט נמחק בהצלחה",
        })
        fetchNavigations()
        if (selectedNavigation?.id === id) {
          setSelectedNavigation(null)
        }
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "לא הצלחנו למחוק את התפריט",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting navigation:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה במחיקת התפריט",
        variant: "destructive",
      })
    }
  }

  const addItem = () => {
    if (!selectedNavigation) return

    const newItem: NavigationItem = {
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      label: "פריט חדש",
      type: "PAGE",
      url: null,
      position: selectedNavigation.items.length,
      parentId: null,
    }

    setSelectedNavigation({
      ...selectedNavigation,
      items: [...selectedNavigation.items, newItem],
    })
  }

  const removeItem = (id: string) => {
    if (!selectedNavigation) return

    // הסרת פריט וגם כל הילדים שלו
    const removeItemRecursive = (items: NavigationItem[]): NavigationItem[] => {
      return items
        .filter((item) => item.id !== id)
        .map((item) => ({
          ...item,
          children: item.children ? removeItemRecursive(item.children) : undefined,
        }))
    }

    setSelectedNavigation({
      ...selectedNavigation,
      items: removeItemRecursive(selectedNavigation.items),
    })
  }

  const addChildItem = (parentId: string) => {
    if (!selectedNavigation) return

    const addChildRecursive = (items: NavigationItem[]): NavigationItem[] => {
      return items.map((item) => {
        if (item.id === parentId) {
          const newChild: NavigationItem = {
            id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            label: "פריט חדש",
            type: "PAGE",
            url: null,
            position: (item.children?.length || 0),
            parentId: parentId,
          }
          return {
            ...item,
            children: [...(item.children || []), newChild],
          }
        }
        return {
          ...item,
          children: item.children ? addChildRecursive(item.children) : undefined,
        }
      })
    }

    setSelectedNavigation({
      ...selectedNavigation,
      items: addChildRecursive(selectedNavigation.items),
    })
  }

  // פונקציה רקורסיבית לעדכון פריט בתפריט (כולל ילדים)
  const updateItemRecursive = (items: NavigationItem[], id: string, updates: Partial<NavigationItem>): NavigationItem[] => {
    return items.map((item) => {
      if (item.id === id) {
        return { ...item, ...updates }
      }
      if (item.children && item.children.length > 0) {
        return {
          ...item,
          children: updateItemRecursive(item.children, id, updates),
        }
      }
      return item
    })
  }

  const updateItem = (id: string, updates: Partial<NavigationItem>) => {
    if (!selectedNavigation) return

    // חיפוש הפריט (כולל ילדים)
    const findItem = (items: NavigationItem[]): NavigationItem | null => {
      for (const item of items) {
        if (item.id === id) return item
        if (item.children && item.children.length > 0) {
          const found = findItem(item.children)
          if (found) return found
        }
      }
      return null
    }

    const currentItem = findItem(selectedNavigation.items)
    if (!currentItem) {
      console.warn("Item not found:", id)
      return
    }

    // אם משנים תווית של קטגוריה/קולקציה, עדכן את כל הפריטים מאותו סוג עם אותו ID בכל התפריטים
    if (updates.label && (currentItem.type === "CATEGORY" || currentItem.type === "COLLECTION")) {
      const identifier = currentItem.type === "CATEGORY" ? currentItem.categoryId : currentItem.collectionId
      
      if (identifier) {
        // עדכון בכל התפריטים (רקורסיבי)
        const updateAllItems = (items: NavigationItem[]): NavigationItem[] => {
          return items.map(item => {
            let updated = item
              if (item.type === currentItem.type) {
                if (currentItem.type === "CATEGORY" && item.categoryId === identifier) {
                updated = { ...item, label: updates.label! }
                }
                if (currentItem.type === "COLLECTION" && item.collectionId === identifier) {
                updated = { ...item, label: updates.label! }
              }
            }
            if (updated.children && updated.children.length > 0) {
              updated = { ...updated, children: updateAllItems(updated.children) }
            }
            return updated.id === id ? { ...updated, ...updates } : updated
          })
        }

        setNavigations(prevNavigations => 
          prevNavigations.map(nav => ({
            ...nav,
            items: updateAllItems(nav.items),
          }))
        )
        
        // עדכון התפריט הנוכחי
        setSelectedNavigation({
          ...selectedNavigation,
          items: updateAllItems(selectedNavigation.items),
        })
        return
      }
    }

    // עדכון רגיל לפריטים אחרים (כולל ילדים)
    setSelectedNavigation({
      ...selectedNavigation,
      items: updateItemRecursive(selectedNavigation.items, id, updates),
    })
  }

  const updateNavigationName = (name: string) => {
    if (!selectedNavigation) return
    setSelectedNavigation({
      ...selectedNavigation,
      name,
    })
  }

  const copyFromDesktop = async () => {
    if (!selectedShop || !selectedNavigation) return

    // טעינה מחדש של התפריטים מהשרת כדי לקבל את הגרסה העדכנית
    try {
      const response = await fetch(`/api/navigation?shopId=${selectedShop.id}`)
      if (response.ok) {
        const data = await response.json()
        const desktopNav = data.find((nav: any) => nav.location === "DESKTOP")
        
        if (!desktopNav || !desktopNav.items || desktopNav.items.length === 0) {
          toast({
            title: "שגיאה",
            description: "תפריט המחשב ריק או לא קיים. יש לשמור את תפריט המחשב תחילה.",
            variant: "destructive",
          })
          return
        }

        // העתקת הפריטים מתפריט המחשב
        const baseTime = Date.now()
        const copiedItems = (desktopNav.items || []).map((item: any, index: number) => ({
          ...item,
          id: `temp-${baseTime}-${index}-${Math.random().toString(36).substr(2, 9)}`,
          position: index,
        }))

        setSelectedNavigation({
          ...selectedNavigation,
          items: copiedItems,
        })

        toast({
          title: "הצלחה",
          description: "התפריט הועתק מתפריט המחשב",
        })
      }
    } catch (error) {
      console.error("Error fetching desktop navigation:", error)
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לטעון את תפריט המחשב",
        variant: "destructive",
      })
    }
  }

  // בדיקה אם צריך להציע העתקה
  const shouldShowCopySuggestion = () => {
    if (!selectedNavigation || selectedNavigation.location !== "MOBILE") return false
    if (selectedNavigation.items.length > 0) return false // אם יש כבר פריטים, לא להציע
    
    // חיפוש תפריט מחשב שמור (לא רק מהרשימה הנוכחית)
    const desktopNav = navigations.find((nav) => nav.location === "DESKTOP")
    return desktopNav && desktopNav.items.length > 0
  }

  // בדיקה אם יש שינויים לא שמורים
  const hasUnsavedChanges = () => {
    if (!selectedNavigation || !savedNavigationState) return false
    
    // השוואה בין המצב הנוכחי למצב השמור
    return JSON.stringify(selectedNavigation) !== JSON.stringify(savedNavigationState)
  }

  // מעבר לתפריט אחר עם בדיקת שינויים לא שמורים
  const handleNavigationSelect = (nav: Navigation) => {
    if (hasUnsavedChanges()) {
      // יש שינויים לא שמורים - הצגת דיאלוג
      setPendingNavigationId(nav.id)
      setUnsavedChangesDialogOpen(true)
    } else {
      // אין שינויים - מעבר ישיר
      setSelectedNavigation(nav)
      setSavedNavigationState(JSON.parse(JSON.stringify(nav)))
    }
  }

  // שמירה ומעבר לתפריט החדש
  const handleSaveAndSwitch = async () => {
    if (!selectedNavigation) return
    
    await handleSave()
    // אחרי שמירה מוצלחת, מעבר לתפריט החדש
    if (pendingNavigationId) {
      const newNav = navigations.find(nav => nav.id === pendingNavigationId)
      if (newNav) {
        setSelectedNavigation(newNav)
        setSavedNavigationState(JSON.parse(JSON.stringify(newNav)))
      }
      setPendingNavigationId(null)
    }
    setUnsavedChangesDialogOpen(false)
  }

  // ביטול ומעבר לתפריט החדש ללא שמירה
  const handleDiscardAndSwitch = () => {
    if (pendingNavigationId) {
      const newNav = navigations.find(nav => nav.id === pendingNavigationId)
      if (newNav) {
        setSelectedNavigation(newNav)
        setSavedNavigationState(JSON.parse(JSON.stringify(newNav)))
      }
      setPendingNavigationId(null)
    }
    setUnsavedChangesDialogOpen(false)
  }

  // חיפוש דפים עם debounce
  useEffect(() => {
    const timeouts: Record<string, NodeJS.Timeout> = {}
    
    Object.keys(pageSearchQueries).forEach((itemId) => {
      const query = pageSearchQueries[itemId]
      
      // ניקוי timeout קודם
      if (timeouts[itemId]) {
        clearTimeout(timeouts[itemId])
      }
      
      // יצירת timeout חדש
      timeouts[itemId] = setTimeout(async () => {
        if (!selectedShop || !query.trim()) {
          setPageSearchResults(prev => ({ ...prev, [itemId]: [] }))
          return
        }

        setLoadingPages(prev => ({ ...prev, [itemId]: true }))

        try {
          const response = await fetch(`/api/pages?shopId=${selectedShop.id}`)
          if (response.ok) {
            const pages = await response.json()
            const searchTerm = query.replace("/pages/", "").toLowerCase()
            const filtered = pages.filter((page: any) =>
              page.title.toLowerCase().includes(searchTerm) ||
              page.slug.toLowerCase().includes(searchTerm)
            ).slice(0, 5) // הגבלה ל-5 תוצאות
            
            setPageSearchResults(prev => ({ ...prev, [itemId]: filtered }))
          }
        } catch (error) {
          console.error("Error searching pages:", error)
          setPageSearchResults(prev => ({ ...prev, [itemId]: [] }))
        } finally {
          setLoadingPages(prev => ({ ...prev, [itemId]: false }))
        }
      }, 300) // debounce של 300ms
    })
    
    return () => {
      Object.values(timeouts).forEach(timeout => clearTimeout(timeout))
    }
  }, [pageSearchQueries, selectedShop])

  // חיפוש קטגוריות/קולקציות עם debounce
  useEffect(() => {
    const timeouts: Record<string, NodeJS.Timeout> = {}
    
    Object.keys(categorySearchQueries).forEach((itemId) => {
      const query = categorySearchQueries[itemId]
      
      if (timeouts[itemId]) {
        clearTimeout(timeouts[itemId])
      }
      
      timeouts[itemId] = setTimeout(async () => {
        if (!selectedShop || !query.trim()) {
          setCategorySearchResults(prev => ({ ...prev, [itemId]: [] }))
          return
        }

        setLoadingCategories(prev => ({ ...prev, [itemId]: true }))

        try {
          const response = await fetch(`/api/categories?shopId=${selectedShop.id}&search=${encodeURIComponent(query)}`)
          if (response.ok) {
            const categories = await response.json()
            setCategorySearchResults(prev => ({ ...prev, [itemId]: categories.slice(0, 5) }))
          }
        } catch (error) {
          console.error("Error searching categories:", error)
          setCategorySearchResults(prev => ({ ...prev, [itemId]: [] }))
        } finally {
          setLoadingCategories(prev => ({ ...prev, [itemId]: false }))
        }
      }, 300)
    })
    
    return () => {
      Object.values(timeouts).forEach(timeout => clearTimeout(timeout))
    }
  }, [categorySearchQueries, selectedShop])

  // חיפוש קטגוריות/קולקציות עם debounce
  useEffect(() => {
    const timeouts: Record<string, NodeJS.Timeout> = {}
    
    Object.keys(collectionSearchQueries).forEach((itemId) => {
      const query = collectionSearchQueries[itemId]
      
      if (timeouts[itemId]) {
        clearTimeout(timeouts[itemId])
      }
      
      timeouts[itemId] = setTimeout(async () => {
        if (!selectedShop || !query.trim()) {
          setCollectionSearchResults(prev => ({ ...prev, [itemId]: [] }))
          return
        }

        setLoadingCollections(prev => ({ ...prev, [itemId]: true }))

        try {
          const response = await fetch(`/api/collections?shopId=${selectedShop.id}`)
          if (response.ok) {
            const collections = await response.json()
            const searchTerm = query.toLowerCase()
            const filtered = collections.filter((collection: any) =>
              collection.name.toLowerCase().includes(searchTerm) ||
              collection.slug.toLowerCase().includes(searchTerm)
            ).slice(0, 5)
            setCollectionSearchResults(prev => ({ ...prev, [itemId]: filtered }))
          }
        } catch (error) {
          console.error("Error searching collections:", error)
          setCollectionSearchResults(prev => ({ ...prev, [itemId]: [] }))
        } finally {
          setLoadingCollections(prev => ({ ...prev, [itemId]: false }))
        }
      }, 300)
    })
    
    return () => {
      Object.values(timeouts).forEach(timeout => clearTimeout(timeout))
    }
  }, [collectionSearchQueries, selectedShop])

  // בחירת דף
  const selectPage = (itemId: string, page: { slug: string; title: string }) => {
    updateItem(itemId, {
      url: `/pages/${page.slug}`,
      label: page.title,
    })
    setPageSearchResults(prev => ({ ...prev, [itemId]: [] }))
    setPageSearchQueries(prev => ({ ...prev, [itemId]: "" }))
  }

  // בחירת קטגוריה/קולקציה
  const selectCategory = (itemId: string, category: { id: string; slug: string; name: string }) => {
    updateItem(itemId, {
      url: `/categories/${category.slug}`, // נשמור גם את ה-URL לצורך תצוגה
      label: category.name,
      type: "CATEGORY",
      categoryId: category.id, // נשמור את ה-ID לשימוש בפרונט
    })
    setCategorySearchResults(prev => ({ ...prev, [itemId]: [] }))
    setCategorySearchQueries(prev => ({ ...prev, [itemId]: "" }))
  }

  // בחירת קטגוריה/קולקציה
  const selectCollection = (itemId: string, collection: { id: string; slug: string; name: string }) => {
    updateItem(itemId, {
      url: `/collections/${collection.slug}`, // נשמור גם את ה-URL לצורך תצוגה
      label: collection.name,
      type: "COLLECTION",
      collectionId: collection.id, // נשמור את ה-ID לשימוש בפרונט
    })
    setCollectionSearchResults(prev => ({ ...prev, [itemId]: [] }))
    setCollectionSearchQueries(prev => ({ ...prev, [itemId]: "" }))
  }

  if (!selectedShop) {
    return (
      <AppLayout title="תפריט ניווט">
        <div className="text-center py-12">
          <Menu className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            אין חנות נבחרת
          </h3>
          <p className="text-gray-600">יש לבחור חנות מההדר לפני ניהול תפריט</p>
        </div>
      </AppLayout>
    )
  }

  if (loading) {
    return (
      <AppLayout title="תפריט ניווט">
        <div className="text-center py-12">
          <p className="text-gray-600">טוען תפריט...</p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="תפריט ניווט">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">תפריט ניווט</h1>
            <p className="text-gray-600 mt-1">נהל את תפריטי הניווט של החנות</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="w-4 h-4 ml-2" />
              צור תפריט חדש
            </Button>
            {selectedNavigation && (
              <>
                <Button
                  variant="outline"
                  onClick={addItem}
                >
                  <Plus className="w-4 h-4 ml-2" />
                  הוסף פריט
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="prodify-gradient text-white"
                >
                  <Save className="w-4 h-4 ml-2" />
                  {saving ? "שומר..." : "שמור תפריט"}
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* רשימת תפריטים */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Menu className="w-5 h-5" />
                  תפריטים
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {navigations.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    אין תפריטים. צור תפריט חדש כדי להתחיל.
                  </p>
                ) : (
                  // מיון התפריטים לפי סדר מוגדר: DESKTOP, MOBILE, FOOTER, CHECKOUT, ואז השאר
                  [...navigations].sort((a, b) => {
                    const order: Record<string, number> = {
                      DESKTOP: 1,
                      MOBILE: 2,
                      FOOTER: 3,
                      CHECKOUT: 4,
                    }
                    const orderA = order[a.location] || 999
                    const orderB = order[b.location] || 999
                    return orderA - orderB
                  }).map((nav) => {
                    const locationOption = LOCATION_OPTIONS.find(opt => opt.value === nav.location) || LOCATION_OPTIONS[0]
                    const Icon = locationOption.icon
                    const isSelected = selectedNavigation?.id === nav.id
                    const isProtected = nav.location === "DESKTOP" || nav.location === "MOBILE"
                    
                    return (
                      <div
                        key={nav.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected
                            ? "border-purple-500 bg-purple-50"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                        onClick={() => handleNavigationSelect(nav)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Icon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{nav.name}</p>
                              <p className="text-xs text-gray-500">{locationOption.label}</p>
                            </div>
                          </div>
                          {!isProtected && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteNavigation(nav.id)
                              }}
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{nav.items.length} פריטים</p>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>
          </div>

          {/* עריכת תפריט נבחר */}
          <div className="lg:col-span-3">
            {selectedNavigation ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <Input
                        value={selectedNavigation.name}
                        onChange={(e) => updateNavigationName(e.target.value)}
                        className="text-lg font-semibold border-0 p-0 h-auto focus-visible:ring-0"
                        placeholder="שם התפריט"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        {LOCATION_OPTIONS.find(opt => opt.value === selectedNavigation.location)?.label}
                      </p>
                    </div>
                    {selectedNavigation.location === "MOBILE" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyFromDesktop}
                        className="mr-2"
                      >
                        <Copy className="w-4 h-4 ml-2" />
                        העתק מתפריט מחשב
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* הצעה להעתקה מתפריט מחשב */}
                  {shouldShowCopySuggestion() && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-purple-900 mb-1">
                            תפריט המחשב מכיל פריטים
                          </h4>
                          <p className="text-sm text-purple-700 mb-3">
                            האם תרצה להעתיק את הפריטים מתפריט המחשב לתפריט המובייל?
                          </p>
                          <Button
                            size="sm"
                            onClick={copyFromDesktop}
                            className="prodify-gradient text-white"
                          >
                            <Copy className="w-4 h-4 ml-2" />
                            העתק מתפריט מחשב
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {selectedNavigation.items.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-600 mb-4">אין פריטים בתפריט</p>
                      <div className="flex gap-2 justify-center">
                        {selectedNavigation.location === "MOBILE" && (
                          <Button onClick={copyFromDesktop} variant="outline">
                            <Copy className="w-4 h-4 ml-2" />
                            העתק מתפריט מחשב
                          </Button>
                        )}
                        <Button onClick={addItem} variant="outline">
                          <Plus className="w-4 h-4 ml-2" />
                          הוסף פריט ראשון
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {selectedNavigation && selectedNavigation.items.map((item) => (
                        <NavigationItemEditor
                        key={item.id}
                          item={item}
                          shopId={selectedShop.id}
                          location={selectedNavigation.location}
                          onUpdate={updateItem}
                          onRemove={removeItem}
                          onAddChild={addChildItem}
                          pageSearchQueries={pageSearchQueries}
                          pageSearchResults={pageSearchResults}
                          loadingPages={loadingPages}
                          categorySearchQueries={categorySearchQueries}
                          categorySearchResults={categorySearchResults}
                          loadingCategories={loadingCategories}
                          collectionSearchQueries={collectionSearchQueries}
                          collectionSearchResults={collectionSearchResults}
                          loadingCollections={loadingCollections}
                          onPageSearch={(itemId, query) => setPageSearchQueries(prev => ({ ...prev, [itemId]: query }))}
                          onCategorySearch={(itemId, query) => setCategorySearchQueries(prev => ({ ...prev, [itemId]: query }))}
                          onCollectionSearch={(itemId, query) => setCollectionSearchQueries(prev => ({ ...prev, [itemId]: query }))}
                          onSelectPage={selectPage}
                          onSelectCategory={selectCategory}
                          onSelectCollection={selectCollection}
                          expandedItems={expandedItems}
                          onToggleExpand={(itemId) => {
                            setExpandedItems(prev => {
                              const newSet = new Set(prev)
                              if (newSet.has(itemId)) {
                                newSet.delete(itemId)
                              } else {
                                newSet.add(itemId)
                              }
                              return newSet
                            })
                          }}
                        />
                                ))}
                              </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <Menu className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      אין תפריט נבחר
                    </h3>
                    <p className="text-gray-600 mb-4">
                      בחר תפריט מהרשימה או צור תפריט חדש
                    </p>
                    <Button onClick={() => setCreateDialogOpen(true)}>
                      <Plus className="w-4 h-4 ml-2" />
                      צור תפריט חדש
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* דיאלוג יצירת תפריט חדש */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>צור תפריט חדש</DialogTitle>
            <DialogDescription>
              בחר שם ומיקום לתפריט החדש
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>שם התפריט</Label>
              <Input
                value={newNavigationName}
                onChange={(e) => setNewNavigationName(e.target.value)}
                placeholder="לדוגמה: תפריט ראשי"
              />
            </div>
            
            <div className="space-y-2">
              <Label>מיקום התפריט</Label>
              <div className="grid grid-cols-2 gap-2">
                {LOCATION_OPTIONS.map((option) => {
                  const Icon = option.icon
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setNewNavigationLocation(option.value)}
                      className={`p-3 border rounded-lg text-right transition-colors ${
                        newNavigationLocation === option.value
                          ? "border-purple-500 bg-purple-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-5 h-5 text-gray-600" />
                        <span className="text-sm font-medium">{option.label}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false)
                setNewNavigationName("")
                setNewNavigationLocation("DESKTOP")
              }}
            >
              ביטול
            </Button>
            <Button
              onClick={handleCreateNavigation}
              disabled={!newNavigationName.trim() || saving}
              className="prodify-gradient text-white"
            >
              צור תפריט
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* דיאלוג שינויים לא שמורים */}
      <Dialog open={unsavedChangesDialogOpen} onOpenChange={setUnsavedChangesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>יש שינויים לא שמורים</DialogTitle>
            <DialogDescription>
              יש שינויים בתפריט הנוכחי שלא נשמרו. האם תרצה לשמור לפני המעבר לתפריט אחר?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleDiscardAndSwitch}
            >
              ביטול שינויים
            </Button>
            <Button
              onClick={handleSaveAndSwitch}
              disabled={saving}
              className="prodify-gradient text-white"
            >
              {saving ? "שומר..." : "שמור ומעבר"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}

