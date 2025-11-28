"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { FolderTree, Plus, Sparkles } from "lucide-react"
import { useState, useEffect, useMemo, useCallback } from "react"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"

interface Category {
  id: string
  name: string
  slug: string
  type?: "MANUAL" | "AUTOMATIC"
}

interface CategoriesCardProps {
  selectedCategories: string[]
  onChange: (categoryIds: string[]) => void
  shopId: string
  productId?: string // אופציונלי - אם יש, נבדוק קטגוריות אוטומטיות
  refreshTrigger?: string | number // אופציונלי - אם משתנה, נבדוק מחדש קטגוריות אוטומטיות
}

export function CategoriesCard({ selectedCategories, onChange, shopId, productId, refreshTrigger }: CategoriesCardProps) {
  const { toast } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [automaticCategories, setAutomaticCategories] = useState<string[]>([])

  const fetchCategories = async () => {
    try {
      const response = await fetch(`/api/categories?shopId=${shopId}`)
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error("Error fetching categories:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAutomaticCategories = useCallback(async () => {
    if (!productId) return
    
    try {
      const response = await fetch(`/api/products/${productId}/automatic-categories`)
      if (response.ok) {
        const data = await response.json()
        setAutomaticCategories(data.automaticCategories?.map((c: any) => c.id) || [])
      }
    } catch (error) {
      console.error("Error fetching automatic categories:", error)
    }
  }, [productId])

  useEffect(() => {
    fetchCategories()
  }, [shopId])

  useEffect(() => {
    if (!productId) return
    
    // Debounce כדי למנוע קריאות API מיותרות
    const timer = setTimeout(() => {
      fetchAutomaticCategories()
    }, 500) // 500ms delay
    
    return () => clearTimeout(timer)
  }, [productId, refreshTrigger, fetchAutomaticCategories])

  // בניית עץ קטגוריות עם תמיכה בהיררכיה
  const categoryTree = useMemo(() => {
    const buildTree = (items: Category[], parentId: string | null = null): Category[] => {
      return items
        .filter(item => (item as any).parentId === parentId)
        .map(item => ({
          ...item,
          children: buildTree(items, item.id),
        }))
    }
    return buildTree(categories)
  }, [categories])

  const toggleCategory = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      onChange(selectedCategories.filter(id => id !== categoryId))
    } else {
      onChange([...selectedCategories, categoryId])
    }
  }

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({
        title: "שגיאה",
        description: "נא להזין שם קטגוריה",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId,
          name: newCategoryName,
        }),
      })

      if (response.ok) {
        const newCategory = await response.json()
        toast({
          title: "הצלחה",
          description: "הקטגוריה נוצרה בהצלחה",
        })
        setNewCategoryName("")
        setDialogOpen(false)
        await fetchCategories()
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "אירעה שגיאה ביצירת הקטגוריה",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating category:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה ביצירת הקטגוריה",
        variant: "destructive",
      })
    }
  }

  const renderCategory = (category: Category) => {
    const isSelected = selectedCategories.includes(category.id)
    const isAutomatic = category.type === "AUTOMATIC"
    const isInAutomatic = productId && automaticCategories.includes(category.id)

    return (
      <div key={category.id}>
        <div className="flex items-center gap-2 py-2 hover:bg-gray-50 rounded px-2">
          {isAutomatic ? (
            <div className="w-5" />
          ) : (
            <Checkbox
              id={`category-${category.id}`}
              checked={isSelected}
              onCheckedChange={() => toggleCategory(category.id)}
            />
          )}
          
          <Label
            htmlFor={isAutomatic ? undefined : `category-${category.id}`}
            className={`flex-1 ${isAutomatic ? '' : 'cursor-pointer'}`}
          >
            <div className="flex items-center gap-2">
              <span>{category.name}</span>
              {isAutomatic && (
                <Badge variant="outline" className="text-xs">
                  <Sparkles className="w-3 h-3 ml-1" />
                  אוטומטי
                </Badge>
              )}
              {isInAutomatic && (
                <Badge variant="default" className="text-xs bg-green-100 text-green-800 border-green-300">
                  בקטגוריה זו
                </Badge>
              )}
            </div>
          </Label>
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderTree className="w-5 h-5" />
            קטגוריות
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                הוסף קטגוריה
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>קטגוריה חדשה</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="categoryName">שם הקטגוריה</Label>
                  <Input
                    id="categoryName"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="לדוגמה: חולצות"
                  />
                </div>
                <Button onClick={handleCreateCategory} className="w-full">
                  צור קטגוריה
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center text-gray-500 py-4">טוען קטגוריות...</div>
        ) : categoryTree.length === 0 ? (
          <div className="text-center text-gray-500 py-4">
            אין קטגוריות עדיין. צור קטגוריה חדשה כדי להתחיל.
          </div>
        ) : (
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {categoryTree.map(category => renderCategory(category))}
            {productId && automaticCategories.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-gray-500 mb-2">
                  <Sparkles className="w-3 h-3 inline ml-1" />
                  המוצר נמצא בקטגוריות אוטומטיות לפי התנאים שהגדרת
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

