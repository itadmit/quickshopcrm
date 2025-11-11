"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useShop } from "@/components/providers/ShopProvider"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import { ProductsSkeleton } from "@/components/skeletons/ProductsSkeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Package,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  MoreVertical,
  Edit,
  Copy,
  Archive,
  Trash2,
  Grid,
  List,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Edit3,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getShopProductUrl } from "@/lib/utils"

interface Product {
  id: string
  name: string
  slug: string
  sku: string | null
  price: number
  comparePrice: number | null
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED"
  images: string[]
  inventoryQty: number
  availability: string
  createdAt: string
  updatedAt: string
  shop: {
    id: string
    name: string
    slug: string
    domain?: string | null
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function ProductsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { selectedShop } = useShop()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })
  
  // Filters
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("createdAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [viewMode, setViewMode] = useState<"table" | "grid">("table")
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())

  // Import dialog state
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{
    imported: number
    errors: number
    errorDetails: string[]
    products: Array<{ id: string; name: string }>
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (selectedShop) {
      fetchProducts()
    }
  }, [pagination.page, statusFilter, categoryFilter, sortBy, sortOrder, search, selectedShop?.id])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(search && { search }),
        ...(selectedShop?.id && { shopId: selectedShop.id }),
      })

      const response = await fetch(`/api/products?${params}`)
      if (response.ok) {
        const data = await response.json()
        setProducts(data.products || [])
        setPagination(data.pagination || pagination)
      } else {
        toast({
          title: "שגיאה",
          description: "לא הצלחנו לטעון את המוצרים",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching products:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת המוצרים",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (productId: string) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק את המוצר?")) return

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "המוצר נמחק בהצלחה",
        })
        fetchProducts()
      } else {
        toast({
          title: "שגיאה",
          description: "לא הצלחנו למחוק את המוצר",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting product:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה במחיקת המוצר",
        variant: "destructive",
      })
    }
  }

  const handleDuplicate = async (product: Product) => {
    try {
      const response = await fetch(`/api/products/${product.id}/duplicate`, {
        method: "POST",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "שגיאה בשכפול המוצר")
      }

      const duplicatedProduct = await response.json()

      toast({
        title: "המוצר שוכפל בהצלחה",
        description: `המוצר "${duplicatedProduct.name}" נוצר בהצלחה`,
      })

      // רענון רשימת המוצרים
      fetchProducts()
    } catch (error: any) {
      console.error("Error duplicating product:", error)
      toast({
        title: "שגיאה בשכפול המוצר",
        description: error.message || "אירעה שגיאה בשכפול המוצר",
        variant: "destructive",
      })
    }
  }

  const handleArchive = async (productId: string) => {
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ARCHIVED" }),
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "המוצר הועבר לארכיון",
        })
        fetchProducts()
      }
    } catch (error) {
      console.error("Error archiving product:", error)
    }
  }

  const handleViewProduct = (product: Product) => {
    if (!product.shop?.slug) {
      toast({
        title: "שגיאה",
        description: "לא ניתן לצפות במוצר - חנות לא זוהתה",
        variant: "destructive",
      })
      return
    }

    if (product.status !== "PUBLISHED") {
      toast({
        title: "שגיאה",
        description: "המוצר לא פורסם - לא ניתן לצפות בו בחנות",
        variant: "destructive",
      })
      return
    }

    const productIdentifier = product.slug || product.id
    const url = getShopProductUrl(
      { slug: product.shop.slug, domain: product.shop.domain },
      productIdentifier
    )
    window.open(url, "_blank")
  }


  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      PUBLISHED: { label: "פורסם", className: "bg-green-100 text-green-800 rounded-md" },
      DRAFT: { label: "טיוטה", className: "bg-gray-100 text-gray-800 rounded-md" },
      ARCHIVED: { label: "ארכיון", className: "bg-yellow-100 text-yellow-800 rounded-md" },
    }
    const variant = variants[status] || variants.DRAFT
    return <Badge className={variant.className}>{variant.label}</Badge>
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // בדיקה שהקובץ הוא CSV
      if (!file.name.endsWith('.csv') && !file.name.endsWith('.CSV')) {
        toast({
          title: "שגיאה",
          description: "יש לבחור קובץ CSV בלבד",
          variant: "destructive",
        })
        return
      }
      setSelectedFile(file)
      setImportResult(null)
    }
  }

  const handleImport = async () => {
    if (!selectedFile || !selectedShop) {
      toast({
        title: "שגיאה",
        description: "יש לבחור קובץ וחנות",
        variant: "destructive",
      })
      return
    }

    setImporting(true)
    setImportResult(null)

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("shopId", selectedShop.id)

      const response = await fetch("/api/products/import", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "שגיאה בייבוא מוצרים")
      }

      setImportResult(data)

      if (data.imported > 0) {
        toast({
          title: "ייבוא הושלם",
          description: `יובאו ${data.imported} מוצרים בהצלחה${data.errors > 0 ? `, ${data.errors} שגיאות` : ""}`,
        })
        // רענון רשימת המוצרים
        fetchProducts()
      } else {
        toast({
          title: "ייבוא נכשל",
          description: "לא יובאו מוצרים. בדוק את השגיאות",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("Error importing products:", error)
      toast({
        title: "שגיאה",
        description: error.message || "אירעה שגיאה בייבוא המוצרים",
        variant: "destructive",
      })
    } finally {
      setImporting(false)
    }
  }

  const handleCloseImportDialog = () => {
    setImportDialogOpen(false)
    setSelectedFile(null)
    setImportResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <AppLayout title="מוצרים">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">מוצרים</h1>
          <p className="text-gray-600 mt-1">נהל את כל המוצרים שלך</p>
        </div>
        <div className="flex gap-2">
          {selectedProducts.size > 0 && (
            <Button
              onClick={() => {
                const ids = Array.from(selectedProducts).join(",")
                router.push(`/products/bulk-edit?ids=${ids}`)
              }}
              variant="default"
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Edit3 className="w-4 h-4 ml-2" />
              עריכה קבוצתית ({selectedProducts.size})
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={() => {
              if (!selectedShop) {
                toast({
                  title: "שגיאה",
                  description: "יש לבחור חנות מההדר לפני ייבוא מוצרים",
                  variant: "destructive",
                })
                return
              }
              setImportDialogOpen(true)
            }}
            disabled={!selectedShop}
          >
            <Upload className="w-4 h-4 ml-2" />
            ייבוא
          </Button>
          <Button variant="outline" onClick={() => toast({ title: "בפיתוח", description: "תכונת ייצוא תהיה זמינה בקרוב" })}>
            <Download className="w-4 h-4 ml-2" />
            ייצוא
          </Button>
          <Button 
            onClick={() => {
              if (selectedShop) {
                router.push("/products/new")
              } else {
                toast({
                  title: "שגיאה",
                  description: "יש לבחור חנות מההדר לפני יצירת מוצר",
                  variant: "destructive",
                })
              }
            }} 
            disabled={!selectedShop}
          >
            <Plus className="w-4 h-4 ml-2" />
            מוצר חדש
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between w-full">
            {/* Search */}
            <div className="relative flex-1 min-w-0">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="חיפוש לפי שם, SKU..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPagination((prev) => ({ ...prev, page: 1 }))
                }}
                className="pr-10"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px] flex-shrink-0">
                <SelectValue placeholder="סטטוס" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל המוצרים</SelectItem>
                <SelectItem value="PUBLISHED">פורסם</SelectItem>
                <SelectItem value="DRAFT">טיוטה</SelectItem>
                <SelectItem value="ARCHIVED">ארכיון</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
              const [field, order] = value.split("-")
              setSortBy(field)
              setSortOrder(order as "asc" | "desc")
            }}>
              <SelectTrigger className="w-[180px] flex-shrink-0">
                <SelectValue placeholder="מיון" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt-desc">תאריך (חדש לישן)</SelectItem>
                <SelectItem value="createdAt-asc">תאריך (ישן לחדש)</SelectItem>
                <SelectItem value="name-asc">שם (א-ת)</SelectItem>
                <SelectItem value="name-desc">שם (ת-א)</SelectItem>
                <SelectItem value="price-asc">מחיר (נמוך לגבוה)</SelectItem>
                <SelectItem value="price-desc">מחיר (גבוה לנמוך)</SelectItem>
                <SelectItem value="inventoryQty-asc">מלאי (נמוך לגבוה)</SelectItem>
                <SelectItem value="inventoryQty-desc">מלאי (גבוה לנמוך)</SelectItem>
              </SelectContent>
            </Select>

            {/* View Mode Toggle */}
            <div className="flex gap-2 border rounded-lg p-1 flex-shrink-0">
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Table/Grid */}
      {loading ? (
        <ProductsSkeleton />
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2 prodify-gradient-text">אין מוצרים</h3>
              <p className="text-gray-600 mb-4">התחל ליצור את המוצר הראשון שלך</p>
              <Button 
                onClick={() => {
                  if (selectedShop) {
                    router.push("/products/new")
                  } else {
                    toast({
                      title: "שגיאה",
                      description: "יש לבחור חנות מההדר לפני יצירת מוצר",
                      variant: "destructive",
                    })
                  }
                }} 
                className="prodify-gradient text-white"
                disabled={!selectedShop}
              >
                <Plus className="w-4 h-4 ml-2" />
                צור מוצר חדש
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : viewMode === "table" ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap w-12">
                      <Checkbox
                        checked={selectedProducts.size === products.length && products.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedProducts(new Set(products.map((p) => p.id)))
                          } else {
                            setSelectedProducts(new Set())
                          }
                        }}
                      />
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">תמונה</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">שם מוצר</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">SKU</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">מחיר</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">מלאי</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">סטטוס</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">עודכן</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">פעולות</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.map((product) => (
                    <tr 
                      key={product.id} 
                      className={`hover:bg-gray-50 ${selectedProducts.has(product.id) ? "bg-blue-50" : ""}`}
                    >
                      <td 
                        className="px-6 py-4 whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={selectedProducts.has(product.id)}
                          onCheckedChange={(checked) => {
                            const newSelected = new Set(selectedProducts)
                            if (checked) {
                              newSelected.add(product.id)
                            } else {
                              newSelected.delete(product.id)
                            }
                            setSelectedProducts(newSelected)
                          }}
                        />
                      </td>
                      <td 
                        className="px-6 py-4 whitespace-nowrap cursor-pointer"
                        onClick={() => router.push(`/products/${product.slug}/edit`)}
                      >
                        {product.images && product.images.length > 0 ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                            <Package className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        {product.shop && (
                          <div className="text-sm text-gray-500">{product.shop.name}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.sku || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          ₪{product.price.toFixed(2)}
                        </div>
                        {product.comparePrice && (
                          <div className="text-sm text-gray-500 line-through">
                            ₪{product.comparePrice.toFixed(2)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.inventoryQty}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(product.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(product.updatedAt).toLocaleDateString("he-IL")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="min-w-[160px]">
                            <DropdownMenuItem onClick={() => router.push(`/products/${product.slug}/edit`)} className="flex flex-row-reverse items-center gap-2 cursor-pointer">
                              <Edit className="w-4 h-4 flex-shrink-0" />
                              ערוך
                            </DropdownMenuItem>
                            {product.shop?.slug && (
                              <DropdownMenuItem onClick={() => handleViewProduct(product)} className="flex flex-row-reverse items-center gap-2 cursor-pointer">
                                <Eye className="w-4 h-4 flex-shrink-0" />
                                צפייה בחנות
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleDuplicate(product)} className="flex flex-row-reverse items-center gap-2 cursor-pointer">
                              <Copy className="w-4 h-4 flex-shrink-0" />
                              שכפל
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleArchive(product.id)} className="flex flex-row-reverse items-center gap-2 cursor-pointer">
                              <Archive className="w-4 h-4 flex-shrink-0" />
                              העבר לארכיון
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(product.id)}
                              className="text-red-600 flex flex-row-reverse items-center gap-2 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4 flex-shrink-0" />
                              מחק
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <Card
              key={product.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push(`/products/${product.slug}/edit`)}
            >
              <CardContent className="p-0">
                <div className="relative">
                  {product.images && product.images.length > 0 ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gray-200 rounded-t-lg flex items-center justify-center">
                      <Package className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    {getStatusBadge(product.status)}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xl font-bold">₪{product.price.toFixed(2)}</span>
                    {product.comparePrice && (
                      <span className="text-sm text-gray-500 line-through">
                        ₪{product.comparePrice.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>מלאי: {product.inventoryQty}</span>
                    {product.sku && <span>SKU: {product.sku}</span>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            מציג {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} מתוך {pagination.total} מוצרים
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
            >
              <ChevronRight className="w-4 h-4" />
              קודם
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page >= pagination.totalPages}
            >
              הבא
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Import Products Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={handleCloseImportDialog}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>ייבוא מוצרים מקובץ CSV</DialogTitle>
            <DialogDescription>
              העלה קובץ CSV עם פרטי המוצרים. השדות החובה הם: name, price
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* File Selection */}
            {!importResult && (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="csv-file-input"
                  />
                  <div className="cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-sm text-gray-600 mb-2">
                      {selectedFile ? selectedFile.name : "לחץ לבחירת קובץ CSV"}
                    </p>
                    <Button variant="outline" type="button">
                      <Upload className="w-4 h-4 ml-2" />
                      בחר קובץ
                    </Button>
                  </div>
                  <label htmlFor="csv-file-input" className="hidden">
                    בחר קובץ CSV
                  </label>
                </div>

                {selectedFile && (
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <FileText className="w-5 h-5 text-gray-600" />
                    <span className="flex-1 text-sm text-gray-700">{selectedFile.name}</span>
                    <span className="text-xs text-gray-500">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedFile(null)
                        if (fileInputRef.current) {
                          fileInputRef.current.value = ""
                        }
                      }}
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {/* CSV Format Info */}
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-blue-800">
                        <p className="font-semibold mb-2">פורמט הקובץ:</p>
                        <p className="mb-1">השדות החובה: <strong>name, price</strong></p>
                        <p className="mb-1">שדות אופציונליים: description, sku, comparePrice, cost, taxEnabled, inventoryEnabled, inventoryQty, lowStockAlert, weight, status, images (מופרדים ב-|), video, minQuantity, maxQuantity, availability, seoTitle, seoDescription</p>
                        <p className="text-xs mt-2 text-blue-700">דוגמה: name,price,description,sku</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Import Results */}
            {importResult && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-green-700">
                        יובאו {importResult.imported} מוצרים בהצלחה
                      </span>
                    </div>
                    {importResult.errors > 0 && (
                      <div className="flex items-center gap-2">
                        <XCircle className="w-5 h-5 text-red-600" />
                        <span className="font-semibold text-red-700">
                          {importResult.errors} שגיאות
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Error Details */}
                {importResult.errorDetails && importResult.errorDetails.length > 0 && (
                  <Card className="border-red-200">
                    <CardHeader>
                      <CardTitle className="text-red-700 text-base">פרטי שגיאות:</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {importResult.errorDetails.map((error, index) => (
                          <div key={index} className="text-sm text-red-600 p-2 bg-red-50 rounded">
                            {error}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Imported Products List */}
                {importResult.products && importResult.products.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">מוצרים שיובאו:</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {importResult.products.map((product) => (
                          <div key={product.id} className="text-sm p-2 bg-green-50 rounded">
                            {product.name}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            {!importResult ? (
              <>
                <Button variant="outline" onClick={handleCloseImportDialog}>
                  ביטול
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={!selectedFile || importing}
                  className="prodify-gradient text-white"
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                      מייבא...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 ml-2" />
                      ייבא מוצרים
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button onClick={handleCloseImportDialog} className="prodify-gradient text-white">
                סגור
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}

