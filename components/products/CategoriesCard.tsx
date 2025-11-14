"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { FolderTree, ChevronRight, ChevronDown, Plus } from "lucide-react"
import { useState, useEffect, useMemo } from "react"
import { useToast } from "@/components/ui/use-toast"

interface Category {
  id: string
  name: string
  slug: string
  parentId: string | null
  children?: Category[]
}

interface CategoriesCardProps {
  selectedCategories: string[]
  onChange: (categoryIds: string[]) => void
  shopId: string
}

export function CategoriesCard({ selectedCategories, onChange, shopId }: CategoriesCardProps) {
  const { toast } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryParent, setNewCategoryParent] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    fetchCategories()
  }, [shopId])

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

  const buildCategoryTree = (cats: Category[]): Category[] => {
    const categoryMap = new Map<string, Category>()
    const rootCategories: Category[] = []

    // יצירת מפה של כל הקטגוריות
    cats.forEach(cat => {
      categoryMap.set(cat.id, { ...cat, children: [] })
    })

    // בניית העץ
    cats.forEach(cat => {
      const category = categoryMap.get(cat.id)!
      if (cat.parentId && categoryMap.has(cat.parentId)) {
        const parent = categoryMap.get(cat.parentId)!
        if (!parent.children) parent.children = []
        parent.children.push(category)
      } else {
        rootCategories.push(category)
      }
    })

    return rootCategories
  }

  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories])

  const toggleExpand = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

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
          parentId: newCategoryParent,
        }),
      })

      if (response.ok) {
        const newCategory = await response.json()
        toast({
          title: "הצלחה",
          description: "הקטגוריה נוצרה בהצלחה",
        })
        setNewCategoryName("")
        setNewCategoryParent(null)
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

  const renderCategory = (category: Category, level: number = 0) => {
    const hasChildren = category.children && category.children.length > 0
    const isExpanded = expandedCategories.has(category.id)
    const isSelected = selectedCategories.includes(category.id)

    return (
      <div key={category.id}>
        <div
          className="flex items-center gap-2 py-2 hover:bg-gray-50 rounded px-2"
          style={{ paddingLeft: `${level * 20 + 8}px` }}
        >
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(category.id)}
              className="p-0.5 hover:bg-gray-200 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-600" />
              )}
            </button>
          ) : (
            <div className="w-5" />
          )}
          
          <Checkbox
            id={`category-${category.id}`}
            checked={isSelected}
            onCheckedChange={() => toggleCategory(category.id)}
          />
          
          <Label
            htmlFor={`category-${category.id}`}
            className="flex-1 cursor-pointer"
          >
            {category.name}
          </Label>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {category.children!.map(child => renderCategory(child, level + 1))}
          </div>
        )}
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
                <div className="space-y-2">
                  <Label htmlFor="parentCategory">קטגוריית אב (אופציונלי)</Label>
                  <select
                    id="parentCategory"
                    value={newCategoryParent || ""}
                    onChange={(e) => setNewCategoryParent(e.target.value || null)}
                    className="w-full border rounded-md px-3 py-2"
                  >
                    <option value="">ללא קטגוריית אב</option>
                    {categories
                      .filter(cat => !cat.parentId)
                      .map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                  </select>
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
          </div>
        )}
      </CardContent>
    </Card>
  )
}

