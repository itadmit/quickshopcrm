"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useShop } from "@/components/providers/ShopProvider"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Save,
  Columns,
  Loader2,
  Package,
  Search,
  Copy,
  Eye,
  EyeOff,
} from "lucide-react"

interface ProductVariant {
  id: string
  name: string
  sku: string | null
  price: number | null
  comparePrice: number | null
  cost: number | null
  inventoryQty: number
  weight: number | null
  option1: string | null
  option1Value: string | null
  option2: string | null
  option2Value: string | null
  option3: string | null
  option3Value: string | null
  image?: string | null
}

interface Product {
  id: string
  name: string
  sku: string | null
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED"
  price: number
  comparePrice: number | null
  cost: number | null
  inventoryQty: number
  availability: string
  vendor: string | null
  images?: string[] | null
  category: string | null
  variants: ProductVariant[]
}

interface BulkEditRow {
  id: string
  type: "product" | "variant"
  productId: string
  variantId?: string
  name: string
  sku: string | null
  price: number | null
  comparePrice: number | null
  cost: number | null
  inventoryQty: number
  onHandQty: number
  vendor: string | null
  category: string | null
  categoryId: string | null
  isHidden: boolean
  isVariant: boolean
  image?: string | null
  images?: string[]
  originalData: any
}

type ColumnKey = 
  | "product-id"
  | "product-title"
  | "product-category"
  | "vendor"
  | "base-price"
  | "compare-price"
  | "cost"
  | "on-hand-quantity"
  | "sku"

interface Column {
  key: ColumnKey
  label: string
  editable: boolean
  type: "text" | "number" | "select" | "status"
}

const AVAILABLE_COLUMNS: Column[] = [
  { key: "product-id", label: "ID מוצר", editable: false, type: "text" },
  { key: "product-title", label: "שם מוצר", editable: true, type: "text" },
  { key: "product-category", label: "קטגוריה", editable: true, type: "select" },
  { key: "vendor", label: "ספק", editable: true, type: "text" },
  { key: "base-price", label: "מחיר בסיס", editable: true, type: "number" },
  { key: "compare-price", label: "מחיר לפני הנחה", editable: true, type: "number" },
  { key: "cost", label: "עלות", editable: true, type: "number" },
  { key: "on-hand-quantity", label: "כמות במלאי", editable: true, type: "number" },
  { key: "sku", label: "מקט", editable: true, type: "text" },
]

export default function BulkEditPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { selectedShop, shops, loading: shopLoading } = useShop()
  const [rows, setRows] = useState<BulkEditRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>([
    "product-id",
    "product-title",
    "sku",
    "base-price",
    "on-hand-quantity",
    "product-category",
  ])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "hidden">("all")
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [categories, setCategories] = useState<Array<{ id: string; name: string; parentId: string | null; parent?: any }>>([])
  const cellRefs = useRef<Map<string, HTMLInputElement | HTMLButtonElement>>(new Map())

  // קבלת מוצרים נבחרים מ-query params או טעינת כל המוצרים
  const productIdsString = useMemo(() => {
    return searchParams.get("ids") || ""
  }, [searchParams])

  const productIds = useMemo(() => {
    if (!productIdsString) return null
    return productIdsString.split(",").filter(Boolean)
  }, [productIdsString])

  useEffect(() => {
    // אם ה-ShopProvider עדיין טוען, נחכה
    if (shopLoading) {
      return
    }
    
    if (selectedShop) {
      fetchCategories()
      fetchProducts()
    } else {
      // אם אין חנות נבחרת, נעצור את הטעינה
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedShop?.id, productIdsString, shopLoading])

  const fetchCategories = async () => {
    const shopToUse = selectedShop || shops[0]
    if (!shopToUse) return

    try {
      const response = await fetch(`/api/categories?shopId=${shopToUse.id}`)
      if (response.ok) {
        const data = await response.json()
        setCategories(data || [])
      }
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  // בניית עץ קטגוריות היררכי
  const categoryTree = useMemo(() => {
    const buildTree = (items: any[], parentId: string | null = null): any[] => {
      return items
        .filter(item => item.parentId === parentId)
        .map(item => ({
          ...item,
          children: buildTree(items, item.id),
        }))
    }
    return buildTree(categories)
  }, [categories])

  // פונקציה להעתקת ערך לכולם
  const copyToAll = (columnKey: ColumnKey) => {
    if (selectedRows.size === 0) {
      toast({
        title: "שגיאה",
        description: "יש לבחור לפחות שורה אחת",
        variant: "destructive",
      })
      return
    }

    const firstSelectedRow = rows.find(row => selectedRows.has(row.id))
    if (!firstSelectedRow) return

    let valueToCopy: any = null
    switch (columnKey) {
      case "product-category":
        valueToCopy = firstSelectedRow.category
        break
      case "vendor":
        valueToCopy = firstSelectedRow.vendor
        break
      case "base-price":
        valueToCopy = firstSelectedRow.price
        break
      case "compare-price":
        valueToCopy = firstSelectedRow.comparePrice
        break
      case "cost":
        valueToCopy = firstSelectedRow.cost
        break
      case "on-hand-quantity":
        valueToCopy = firstSelectedRow.onHandQty
        break
      case "sku":
        valueToCopy = firstSelectedRow.sku
        break
    }

    if (valueToCopy !== null) {
      setRows(prevRows => prevRows.map(row => {
        if (selectedRows.has(row.id)) {
          const updated = { ...row }
          switch (columnKey) {
            case "product-category":
              updated.category = valueToCopy
              updated.categoryId = firstSelectedRow.categoryId
              break
            case "vendor":
              updated.vendor = valueToCopy
              break
            case "base-price":
              updated.price = valueToCopy
              break
            case "compare-price":
              updated.comparePrice = valueToCopy
              break
            case "cost":
              updated.cost = valueToCopy
              break
            case "on-hand-quantity":
              updated.onHandQty = valueToCopy
              updated.inventoryQty = valueToCopy
              break
            case "sku":
              updated.sku = valueToCopy
              break
          }
          return updated
        }
        return row
      }))
      setHasUnsavedChanges(true)
      toast({
        title: "הצלחה",
        description: "הערך הועתק לכל השורות הנבחרות",
      })
    }
  }

  // סינון וחיפוש
  const filteredRows = useMemo(() => {
    let filtered = rows

    // סינון לפי חיפוש
    if (searchQuery) {
      filtered = filtered.filter(row => 
        row.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.productId.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // סינון לפי סטטוס פעיל/לא פעיל
    if (filterStatus === "active") {
      filtered = filtered.filter(row => !row.isHidden)
    } else if (filterStatus === "hidden") {
      filtered = filtered.filter(row => row.isHidden)
    }

    return filtered
  }, [rows, searchQuery, filterStatus])

  // פונקציה להחלפת סטטוס פעיל/לא פעיל
  const toggleVisibility = (rowId: string) => {
    setRows(prevRows => prevRows.map(row => {
      if (row.id === rowId) {
        return { ...row, isHidden: !row.isHidden }
      }
      return row
    }))
    setHasUnsavedChanges(true)
  }

  // פונקציה להחלפת סטטוס פעיל/לא פעיל לכולם
  const toggleVisibilityForAll = (isHidden: boolean) => {
    if (selectedRows.size === 0) {
      toast({
        title: "שגיאה",
        description: "יש לבחור לפחות שורה אחת",
        variant: "destructive",
      })
      return
    }

    setRows(prevRows => prevRows.map(row => {
      if (selectedRows.has(row.id)) {
        return { ...row, isHidden }
      }
      return row
    }))
    setHasUnsavedChanges(true)
    toast({
      title: "הצלחה",
      description: `כל השורות הנבחרות ${isHidden ? "הוסתרו" : "הופעלו"}`,
    })
  }

  const fetchProducts = async () => {
    const shopToUse = selectedShop || shops[0]
    if (!shopToUse) {
      console.log("No shop available")
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams({
        shopId: shopToUse.id,
        limit: "1000", // טעינת הרבה מוצרים לעריכה קבוצתית
        ...(productIds && productIds.length > 0 && { ids: productIds.join(",") }),
      })

      const response = await fetch(`/api/products/bulk-edit?${params}`)
      if (response.ok) {
        const data = await response.json()
        const products: Product[] = data.products || []
        
        // המרת מוצרים לשורות עם וריאציות
        const newRows: BulkEditRow[] = []
        products.forEach((product: any) => {
          const productImage = product.images && product.images.length > 0 ? product.images[0] : null
          
          // הוספת שורה למוצר עצמו
          // אם אין מחיר לפני הנחה, נגדיר אותו כמחיר הבסיסי
          const defaultComparePrice = product.comparePrice ?? product.price
          newRows.push({
            id: product.id,
            type: "product",
            productId: product.id,
            name: product.name,
            sku: product.sku,
            price: product.price,
            comparePrice: defaultComparePrice,
            cost: product.cost,
            inventoryQty: product.inventoryQty,
            onHandQty: product.inventoryQty,
            vendor: product.vendor,
            category: product.category,
            categoryId: (product as any).categories?.[0]?.categoryId || (product as any).categories?.[0]?.category?.id || null,
            isHidden: (product as any).isHidden || false,
            isVariant: false,
            image: productImage,
            images: product.images || undefined,
            originalData: product,
          })

          // הוספת שורות לווריאציות
          if (product.variants && product.variants.length > 0) {
            product.variants.forEach((variant: any) => {
              const variantImage = variant.image || productImage
              const variantPrice = variant.price ?? product.price
              // אם אין מחיר לפני הנחה, נגדיר אותו כמחיר הבסיסי של הווריאציה
              const variantComparePrice = variant.comparePrice ?? variantPrice
              newRows.push({
                id: `${product.id}-${variant.id}`,
                type: "variant",
                productId: product.id,
                variantId: variant.id,
                name: variant.name,
                sku: variant.sku,
                price: variantPrice,
                comparePrice: variantComparePrice,
                cost: variant.cost ?? product.cost,
                inventoryQty: variant.inventoryQty,
                onHandQty: variant.inventoryQty,
                vendor: product.vendor,
                category: product.category,
                categoryId: (product as any).categories?.[0]?.categoryId || (product as any).categories?.[0]?.category?.id || null,
                isHidden: (product as any).isHidden || false,
                isVariant: true,
                image: variantImage,
                images: product.images || undefined,
                originalData: variant,
              })
            })
          }
        })

        setRows(newRows)
      } else {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        console.error("Error response:", errorData)
        toast({
          title: "שגיאה",
          description: errorData.error || "לא הצלחנו לטעון את המוצרים",
          variant: "destructive",
        })
        setRows([])
      }
    } catch (error: any) {
      console.error("Error fetching products:", error)
      toast({
        title: "שגיאה",
        description: error.message || "אירעה שגיאה בטעינת המוצרים",
        variant: "destructive",
      })
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  const updateRow = (rowId: string, columnKey: ColumnKey, value: any) => {
    setRows((prevRows) => {
      const newRows = prevRows.map((row: any) => {
        if (row.id === rowId) {
          const updated = { ...row }
          
          switch (columnKey) {
            case "product-id":
              // לא ניתן לערוך ID
              break
            case "product-title":
              updated.name = value
              break
            case "product-category":
              updated.category = value
              break
            case "vendor":
              updated.vendor = value
              break
            case "base-price":
              const newPrice = value !== "" ? parseFloat(value) || null : null
              updated.price = newPrice
              break
            case "compare-price":
              const newComparePrice = value !== "" ? parseFloat(value) || null : null
              // מאפשרים להקליד כל ערך - הוולידציה תתבצע ב-onBlur
              updated.comparePrice = newComparePrice
              break
            case "cost":
              updated.cost = value !== "" ? parseFloat(value) || null : null
              break
            case "on-hand-quantity":
              updated.onHandQty = parseInt(value) || 0
              updated.inventoryQty = updated.onHandQty
              break
            case "sku":
              updated.sku = value
              break
          }
          
          return updated
        }
        return row
      })
      
      setHasUnsavedChanges(true)
      return newRows
    })
  }

  // פונקציה לוולידציה ב-onBlur
  const validateComparePrice = (rowId: string) => {
    setRows((prevRows) => {
      return prevRows.map((row: any) => {
        if (row.id === rowId) {
          // וולידציה: המחיר לפני הנחה חייב להיות גדול מהמחיר הבסיסי
          if (row.price !== null && row.comparePrice !== null && row.comparePrice <= row.price) {
            // אם המחיר לפני הנחה קטן או שווה למחיר, נעדכן אותו למחיר + 1%
            return {
              ...row,
              comparePrice: row.price * 1.01
            }
          }
        }
        return row
      })
    })
  }

  const handleSave = async () => {
    const shopToUse = selectedShop || shops[0]
    if (!shopToUse) return

    setSaving(true)
    try {
      // וולידציה לפני שמירה - תיקון אוטומטי של מחירים לפני הנחה
      const validatedRows = rows.map((row: any) => {
        if (row.price !== null && row.comparePrice !== null && row.comparePrice <= row.price) {
          return {
            ...row,
            comparePrice: row.price * 1.01
          }
        }
        return row
      })

      // עדכון ה-state עם הערכים המתוקנים
      setRows(validatedRows)

      // איסוף כל השינויים (אחרי התיקון)
      const updates: any[] = []
      
      validatedRows.forEach((row: any) => {
        const changes: any = {}
        const original = row.originalData
        
        if (row.type === "product") {
          // עדכון מוצר
          if (row.name !== original.name) changes.name = row.name
          if (row.sku !== original.sku) changes.sku = row.sku
          if (row.price !== original.price) changes.price = row.price
          if (row.comparePrice !== original.comparePrice) changes.comparePrice = row.comparePrice
          if (row.cost !== original.cost) changes.cost = row.cost
          if (row.inventoryQty !== original.inventoryQty) changes.inventoryQty = row.inventoryQty
          if (row.isHidden !== (original.isHidden || false)) changes.isHidden = row.isHidden
          
          // עדכון קטגוריה - השוואה לפי ID הקטגוריה
          const originalCategoryId = original.categories?.[0]?.categoryId || original.categories?.[0]?.category?.id || null
          if (row.categoryId !== originalCategoryId) {
            changes.categories = row.categoryId ? [row.categoryId] : []
          }
          
          if (Object.keys(changes).length > 0) {
            updates.push({
              type: "product",
              id: row.productId,
              productId: row.productId,
              changes,
            })
          }
        } else if (row.type === "variant") {
          // עדכון וריאציה
          if (row.name !== original.name) changes.name = row.name
          if (row.sku !== original.sku) changes.sku = row.sku
          if (row.price !== original.price) changes.price = row.price
          if (row.comparePrice !== original.comparePrice) changes.comparePrice = row.comparePrice
          if (row.cost !== original.cost) changes.cost = row.cost
          if (row.inventoryQty !== original.inventoryQty) changes.inventoryQty = row.inventoryQty
          
          if (Object.keys(changes).length > 0) {
            updates.push({
              type: "variant",
              productId: row.productId,
              variantId: row.variantId,
              changes,
            })
          }
        }
      })

      if (updates.length === 0) {
        toast({
          title: "אין שינויים",
          description: "לא בוצעו שינויים לשמירה",
        })
        setSaving(false)
        return
      }

      const response = await fetch("/api/products/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: `עודכנו ${updates.length} פריטים בהצלחה`,
        })
        setHasUnsavedChanges(false)
        // רענון הנתונים
        fetchProducts()
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "אירעה שגיאה בשמירת השינויים",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error saving bulk edits:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בשמירת השינויים",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, rowId: string, columnKey: ColumnKey) => {
    const currentIndex = rows.findIndex((r) => r.id === rowId)
    const columnIndex = visibleColumns.indexOf(columnKey)
    
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault()
      const nextColumnIndex = e.key === "ArrowRight" 
        ? columnIndex + 1 
        : columnIndex - 1
      
      if (nextColumnIndex >= 0 && nextColumnIndex < visibleColumns.length) {
        const nextColumn = visibleColumns[nextColumnIndex]
        const cellKey = `${rowId}-${nextColumn}`
        const cell = cellRefs.current.get(cellKey)
        if (cell && 'focus' in cell) {
          cell.focus()
        }
      }
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault()
      const nextRowIndex = e.key === "ArrowDown" 
        ? currentIndex + 1 
        : currentIndex - 1
      
      if (nextRowIndex >= 0 && nextRowIndex < rows.length) {
        const nextRow = rows[nextRowIndex]
        const cellKey = `${nextRow.id}-${columnKey}`
        const cell = cellRefs.current.get(cellKey)
        if (cell && 'focus' in cell) {
          cell.focus()
        }
      }
    } else if (e.key === "Enter") {
      e.preventDefault()
      // מעבר לשורה הבאה באותה עמודה
      if (currentIndex < rows.length - 1) {
        const nextRow = rows[currentIndex + 1]
        const cellKey = `${nextRow.id}-${columnKey}`
        const cell = cellRefs.current.get(cellKey)
        if (cell && 'focus' in cell) {
          cell.focus()
        }
      }
    }
  }

  const renderCell = (row: BulkEditRow, column: Column) => {
    const cellKey = `${row.id}-${column.key}`
    let value: any = ""
    
    switch (column.key) {
      case "product-id":
        return (
          <div className="text-sm text-gray-600 font-mono">
            {row.productId.substring(0, 8)}...
          </div>
        )
      case "product-title":
        // עבור שם מוצר, נציג תמונה + שם
        return (
          <div className="flex items-center gap-3 w-full">
            {row.image ? (
              <img
                src={row.image}
                alt={row.name}
                className="w-10 h-10 rounded-md object-cover border border-gray-200 flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                <Package className="w-5 h-5 text-gray-400" />
              </div>
            )}
            <Input
              type="text"
              value={row.name}
              onChange={(e) => updateRow(row.id, column.key, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, row.id, column.key)}
              className="h-9 flex-1 border border-gray-200 rounded-md bg-white px-3 py-2 text-sm hover:border-gray-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              ref={(el) => {
                if (el) cellRefs.current.set(cellKey, el)
              }}
            />
          </div>
        )
      case "product-category":
        value = row.category || ""
        break
      case "vendor":
        value = row.vendor || ""
        break
      case "base-price":
        value = row.price ?? ""
        break
      case "compare-price":
        value = row.comparePrice ?? ""
        break
      case "cost":
        value = row.cost ?? ""
        break
      case "on-hand-quantity":
        value = row.onHandQty
        break
      case "sku":
        value = row.sku || ""
        break
    }

    if (column.key === "product-category") {
      // בניית עץ קטגוריות היררכי
      const buildCategoryOptions = (cats: any[], level = 0): any[] => {
        const options: any[] = []
        cats.forEach(cat => {
          const prefix = level > 0 ? "  ".repeat(level) + "└ " : ""
          options.push({ value: cat.id, label: `${prefix}${cat.name}` })
          if (cat.children && cat.children.length > 0) {
            options.push(...buildCategoryOptions(cat.children, level + 1))
          }
        })
        return options
      }

      const categoryOptions = buildCategoryOptions(categoryTree)

      return (
        <Select
          value={row.categoryId || ""}
          onValueChange={(categoryId) => {
            const selectedCategory = categories.find(c => c.id === categoryId)
            updateRow(row.id, column.key, selectedCategory?.name || "")
            setRows(prevRows => prevRows.map(r => 
              r.id === row.id ? { ...r, categoryId, category: selectedCategory?.name || "" } : r
            ))
            setHasUnsavedChanges(true)
          }}
        >
          <SelectTrigger className="h-9 w-full border border-gray-200 rounded-md bg-white px-3 py-2 text-sm hover:border-gray-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors">
            <SelectValue placeholder="בחר קטגוריה" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">ללא קטגוריה</SelectItem>
            {categoryOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    // בדיקת וולידציה למחיר לפני הנחה
    const isComparePriceInvalid = column.key === "compare-price" && 
      row.price !== null && 
      row.comparePrice !== null && 
      row.comparePrice <= row.price

    // הוספת onBlur לוולידציה למחיר לפני הנחה ולמחיר הבסיסי
    const handleBlur = () => {
      if (column.key === "compare-price" || column.key === "base-price") {
        validateComparePrice(row.id)
      }
    }

    return (
      <Input
        type={column.type === "number" ? "number" : "text"}
        value={value}
        onChange={(e) => updateRow(row.id, column.key, e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => handleKeyDown(e, row.id, column.key)}
        className={`h-9 w-full border rounded-md bg-white px-3 py-2 text-sm transition-colors ${
          isComparePriceInvalid
            ? "border-red-300 bg-red-50 focus:border-red-500 focus:ring-1 focus:ring-red-500"
            : "border-gray-200 hover:border-gray-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
        }`}
        ref={(el) => {
          if (el) cellRefs.current.set(cellKey, el)
        }}
      />
    )
  }

  const visibleColumnsData = AVAILABLE_COLUMNS.filter((col: any) =>
    visibleColumns.includes(col.key)
  )

  if (shopLoading) {
    return (
      <AppLayout title="עריכה קבוצתית">
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 mx-auto animate-spin text-gray-400" />
              <p className="text-gray-600 mt-4">טוען חנויות...</p>
            </div>
          </CardContent>
        </Card>
      </AppLayout>
    )
  }

  // אם אין חנות נבחרת, נשתמש בחנות הראשונה
  const shopToUse = selectedShop || shops[0]
  
  if (!shopToUse && !loading) {
    return (
      <AppLayout title="עריכה קבוצתית">
        <div className="text-center py-12">
          <p className="text-gray-600">לא נמצאה חנות. אנא צור חנות תחילה.</p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="עריכה קבוצתית">
      <div className={`space-y-6 ${hasUnsavedChanges ? "pb-24" : ""}`}>
        {/* Mobile Warning */}
        <div className="md:hidden bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <div className="text-amber-600 flex-shrink-0 mt-0.5">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1 text-sm">
            <p className="font-medium text-amber-800 mb-1">תכונה זו מיועדת למסך גדול</p>
            <p className="text-amber-700">לחוויית עריכה מיטבית, מומלץ להשתמש בעריכה קבוצתית ממחשב או טאבלט.</p>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                עריכה קבוצתית
              </h1>
              <p className="text-sm text-gray-500">
                עריכת {filteredRows.length} {filteredRows.length === 1 ? "מוצר" : "מוצרים"}
                {filteredRows.length !== rows.length && ` מתוך ${rows.length}`}
              </p>
            </div>
            {hasUnsavedChanges && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-medium px-3 py-1">
                שינויים שלא נשמרו
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="border-gray-300 hover:bg-gray-50">
                  <Columns className="w-4 h-4 ml-2" />
                  עמודות
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {AVAILABLE_COLUMNS.map((column: any) => (
                  <DropdownMenuCheckboxItem
                    key={column.key}
                    checked={visibleColumns.includes(column.key)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setVisibleColumns([...visibleColumns, column.key])
                      } else {
                        setVisibleColumns(visibleColumns.filter((key: any) => key !== column.key))
                      }
                    }}
                    className="text-right"
                  >
                    {column.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              onClick={handleSave}
              disabled={!hasUnsavedChanges || saving}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-md hover:shadow-lg transition-all duration-200 px-6"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  שומר...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 ml-2" />
                  שמור שינויים
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 mx-auto animate-spin text-gray-400" />
                <p className="text-gray-600 mt-4">טוען מוצרים...</p>
              </div>
            </CardContent>
          </Card>
        ) : rows.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-12">
                <p className="text-gray-600">לא נמצאו מוצרים לעריכה</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* סינון וחיפוש */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="חיפוש לפי שם, מקט או ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pr-10"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={filterStatus === "all" ? "default" : "outline"}
                      onClick={() => setFilterStatus("all")}
                      size="sm"
                    >
                      הכל
                    </Button>
                    <Button
                      variant={filterStatus === "active" ? "default" : "outline"}
                      onClick={() => setFilterStatus("active")}
                      size="sm"
                    >
                      <Eye className="w-4 h-4 ml-2" />
                      פעיל
                    </Button>
                    <Button
                      variant={filterStatus === "hidden" ? "default" : "outline"}
                      onClick={() => setFilterStatus("hidden")}
                      size="sm"
                    >
                      <EyeOff className="w-4 h-4 ml-2" />
                      מוסתר
                    </Button>
                  </div>
                  {selectedRows.size > 0 && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleVisibilityForAll(false)}
                      >
                        <Eye className="w-4 h-4 ml-2" />
                        הפעל נבחרים
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleVisibilityForAll(true)}
                      >
                        <EyeOff className="w-4 h-4 ml-2" />
                        הסתר נבחרים
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* כפתורי העתק לכולם */}
            {selectedRows.size > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-wrap gap-2">
                    <span className="text-sm text-gray-600 self-center">העתק לכולם:</span>
                    {visibleColumnsData
                      .filter(col => col.editable && col.key !== "product-id" && col.key !== "product-title")
                      .map((column: any) => (
                        <Button
                          key={column.key}
                          variant="outline"
                          size="sm"
                          onClick={() => copyToAll(column.key)}
                        >
                          <Copy className="w-3 h-3 ml-1" />
                          {column.label}
                        </Button>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border-0 shadow-lg">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b-2 border-gray-200">
                        <th className="text-right px-6 py-4 text-xs font-semibold text-gray-700 uppercase tracking-wider w-12 sticky right-0 bg-gradient-to-r from-gray-50 to-gray-100/50 z-10">
                          <Checkbox
                            checked={selectedRows.size === filteredRows.length && filteredRows.length > 0}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedRows(new Set(filteredRows.map((r: any) => r.id)))
                              } else {
                                setSelectedRows(new Set())
                              }
                            }}
                          />
                        </th>
                        <th className="text-right px-6 py-4 text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap border-l border-gray-200/50">
                          פעיל/מוסתר
                        </th>
                        {visibleColumnsData.map((column: any) => (
                          <th
                            key={column.key}
                            className="text-right px-6 py-4 text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap border-l border-gray-200/50 first:border-l-0"
                          >
                            {column.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {filteredRows.map((row, index) => (
                      <tr
                        key={row.id}
                        className={`
                          transition-all duration-150
                          ${selectedRows.has(row.id) 
                            ? "bg-blue-50/50 border-r-2 border-blue-400" 
                            : "hover:bg-gray-50/50"
                          }
                          ${row.isVariant ? "bg-gray-50/30" : "bg-white"}
                          ${index % 2 === 0 && !row.isVariant ? "bg-white" : ""}
                        `}
                      >
                        <td className="px-6 py-3 sticky right-0 bg-inherit z-10 border-l border-gray-200/30">
                          <Checkbox
                            checked={selectedRows.has(row.id)}
                            onCheckedChange={(checked) => {
                              const newSelected = new Set(selectedRows)
                              if (checked) {
                                newSelected.add(row.id)
                              } else {
                                newSelected.delete(row.id)
                              }
                              setSelectedRows(newSelected)
                            }}
                          />
                        </td>
                        <td className="px-6 py-3 border-l border-gray-200/30">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleVisibility(row.id)}
                            className="h-8 w-8 p-0"
                          >
                            {row.isHidden ? (
                              <EyeOff className="w-4 h-4 text-gray-400" />
                            ) : (
                              <Eye className="w-4 h-4 text-green-600" />
                            )}
                          </Button>
                        </td>
                        {visibleColumnsData.map((column: any) => (
                          <td
                            key={column.key}
                            className={`
                              px-6 py-3 border-l border-gray-200/30 first:border-l-0
                              ${row.isVariant ? "pr-12" : ""}
                              group
                            `}
                          >
                            <div className="flex items-center min-h-[32px]">
                              {column.key === "product-title" && row.isVariant ? (
                                <div className="flex items-center gap-3 w-full">
                                  <span className="text-gray-300 text-lg font-light flex-shrink-0">┘</span>
                                  {renderCell(row, column)}
                                </div>
                              ) : (
                                renderCell(row, column)
                              )}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          </>
        )}

        {/* Floating Save Button */}
        {hasUnsavedChanges && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ease-in-out">
            <div className="bg-white rounded-lg shadow-2xl p-2 border border-gray-200">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-8 py-6 text-base font-semibold"
                size="lg"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                    שומר...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 ml-2" />
                    שמור שינויים
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

