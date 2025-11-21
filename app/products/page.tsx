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
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
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
import { formatProductPrice, formatComparePrice } from "@/lib/product-price"
import { MobileListView, MobileListItem } from "@/components/MobileListView"
import { MobileFilters, FilterConfig } from "@/components/MobileFilters"
import { useMediaQuery } from "@/hooks/useMediaQuery"

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
  variants?: Array<{
    id: string
    name: string
    price: number | null
  }>
  options?: Array<{
    id: string
    name: string
    values: any
  }>
  categories?: Array<{
    categoryId: string
    category: {
      name: string
    }
  }>
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
  const [collectionFilter, setCollectionFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("createdAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [viewMode, setViewMode] = useState<"table" | "grid">("table")
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [isSearching, setIsSearching] = useState(false)
  
  // Collections
  const [collections, setCollections] = useState<Array<{ id: string; name: string }>>([])

  // Mobile detection
  const isMobile = useMediaQuery("(max-width: 768px)")

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
    // טעינת הנתונים מיד - לא מחכים ל-selectedShop
    fetchProducts()
  }, [pagination.page, statusFilter, collectionFilter, sortBy, sortOrder, selectedShop?.id])

  // Fetch collections
  useEffect(() => {
    if (selectedShop?.id) {
      fetchCollections()
    }
  }, [selectedShop?.id])

  // Debounced search effect
  useEffect(() => {
    if (search === "" ) {
      // אם החיפוש ריק, טען מיד
      setIsSearching(false)
      fetchProducts()
      return
    }
    setIsSearching(true)
    const timer = setTimeout(() => {
      fetchProducts()
    }, 600) // 600ms delay for better Hebrew typing experience
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const fetchCollections = async () => {
    if (!selectedShop?.id) return
    
    try {
      const collectionsRes = await fetch(`/api/collections?shopId=${selectedShop.id}`)

      if (collectionsRes.ok) {
        const collectionsData = await collectionsRes.json()
        setCollections(collectionsData)
      }
    } catch (error) {
      console.error("Error fetching collections:", error)
    }
  }

  const fetchProducts = async () => {
    setLoading(true)
    setIsSearching(false)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(collectionFilter !== "all" && { collectionId: collectionFilter }),
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

  const handleBulkDelete = async () => {
    const selectedArray = Array.from(selectedProducts)
    if (selectedArray.length === 0) {
      toast({
        title: "שים לב",
        description: "לא נבחרו מוצרים למחיקה",
        variant: "destructive",
      })
      return
    }

    if (!confirm(`האם אתה בטוח שברצונך למחוק ${selectedArray.length} מוצרים?`)) {
      return
    }

    try {
      const response = await fetch("/api/products/bulk-delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: selectedArray }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: `${data.results.success} מוצרים נמחקו בהצלחה${data.results.failed > 0 ? `, ${data.results.failed} נכשלו` : ""}`,
        })
        setSelectedProducts(new Set())
        fetchProducts()
      } else {
        toast({
          title: "שגיאה",
          description: data.error || "לא הצלחנו למחוק את המוצרים",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error bulk deleting products:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה במחיקת המוצרים",
        variant: "destructive",
      })
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

  // Convert products to mobile list format
  const convertToMobileList = (): MobileListItem[] => {
    return products.map((product) => {
      // Get first collection name (קולקציה = קטגוריה במערכת)
      const categoryName = (product as any).collections && (product as any).collections.length > 0 
        ? (product as any).collections[0].collection?.name 
        : null;

      const formattedPrice = formatProductPrice(product as any);
      const formattedComparePrice = formatComparePrice(product as any);
      
      // Calculate total inventory (product + all variants)
      let totalInventory = product.inventoryQty || 0;
      if (product.variants && product.variants.length > 0) {
        totalInventory = product.variants.reduce((sum, variant: any) => {
          return sum + (variant.inventoryQty || 0);
        }, 0);
      }
      
      // Build metadata array
      const metadata = [];
      if (categoryName && product.sku) {
        metadata.push({
          label: categoryName,
          value: product.sku
        });
      } else if (categoryName) {
        metadata.push({
          label: "",
          value: categoryName
        });
      } else if (product.sku) {
        metadata.push({
          label: "",
          value: product.sku
        });
      }
      
      return {
        id: product.id,
        title: product.name,
        image: product.images && product.images.length > 0 ? product.images[0] : undefined,
        icon: !product.images || product.images.length === 0 ? <Package className="w-6 h-6 text-gray-400" /> : undefined,
        price: formattedPrice,
        comparePrice: formattedComparePrice || undefined,
        inventory: totalInventory,
        status: product.status,
        metadata: metadata,
      actions: [
        {
          label: "עריכה",
          icon: <Edit className="w-4 h-4" />,
          onClick: () => router.push(`/products/${product.slug}/edit`)
        },
        {
          label: "צפייה בחנות",
          icon: <Eye className="w-4 h-4" />,
          onClick: () => handleViewProduct(product)
        },
        {
          label: "שכפול",
          icon: <Copy className="w-4 h-4" />,
          onClick: () => handleDuplicate(product)
        },
        {
          label: "מחיקה",
          icon: <Trash2 className="w-4 h-4" />,
          onClick: () => handleDelete(product.id),
          variant: "destructive"
        }
      ]
      }
    })
  }

  const mobileFilters: FilterConfig[] = [
    {
      id: "collection",
      label: "קולקציה",
      type: "select",
      value: collectionFilter,
      onChange: setCollectionFilter,
      options: [
        { value: "all", label: "כל הקולקציות" },
        ...collections.map(c => ({ value: c.id, label: c.name }))
      ]
    },
    {
      id: "status",
      label: "סטטוס",
      type: "select",
      value: statusFilter,
      onChange: setStatusFilter,
      options: [
        { value: "all", label: "כל המוצרים" },
        { value: "PUBLISHED", label: "פורסם" },
        { value: "DRAFT", label: "טיוטה" },
        { value: "ARCHIVED", label: "ארכיון" }
      ]
    },
    {
      id: "sort",
      label: "מיון",
      type: "select",
      value: `${sortBy}-${sortOrder}`,
      onChange: (value) => {
        const [field, order] = value.split("-")
        setSortBy(field)
        setSortOrder(order as "asc" | "desc")
      },
      options: [
        { value: "createdAt-desc", label: "תאריך (חדש לישן)" },
        { value: "createdAt-asc", label: "תאריך (ישן לחדש)" },
        { value: "name-asc", label: "שם (א-ת)" },
        { value: "name-desc", label: "שם (ת-א)" },
        { value: "price-asc", label: "מחיר (נמוך לגבוה)" },
        { value: "price-desc", label: "מחיר (גבוה לנמוך)" },
        { value: "inventoryQty-asc", label: "מלאי (נמוך לגבוה)" },
        { value: "inventoryQty-desc", label: "מלאי (גבוה לנמוך)" }
      ]
    }
  ]

  // הצגת skeleton רק בזמן טעינה ראשונית
  if (loading) {
    return (
      <AppLayout title="מוצרים">
        <ProductsSkeleton />
      </AppLayout>
    )
  }

  return (
    <AppLayout title="מוצרים">
      <div className={isMobile ? "pb-20" : ""}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">מוצרים</h1>
          <p className="text-gray-600 mt-1">נהל את כל המוצרים שלך</p>
        </div>
        <div className="flex gap-2">
          {selectedProducts.size > 0 && (
            <>
              <Button
                onClick={() => {
                  const ids = Array.from(selectedProducts).join(",")
                  router.push(`/products/bulk-edit?ids=${ids}`)
                }}
                variant="default"
                className="bg-emerald-600 hover:bg-emerald-700 hidden md:flex"
              >
                <Edit3 className="w-4 h-4 ml-2" />
                עריכה קבוצתית ({selectedProducts.size})
              </Button>
              <Button
                onClick={handleBulkDelete}
                variant="destructive"
                className="bg-red-600 hover:bg-red-700 hidden md:flex"
              >
                <Trash2 className="w-4 h-4 ml-2" />
                מחיקה קבוצתית ({selectedProducts.size})
              </Button>
            </>
          )}
          <div className="hidden md:flex gap-2">
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
          </div>
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
            className="whitespace-nowrap"
          >
            <Plus className="w-4 h-4 ml-2" />
            <span className="hidden md:inline">מוצר חדש</span>
            <span className="md:hidden">חדש</span>
          </Button>
        </div>
      </div>

      {/* Filters - Mobile vs Desktop */}
      {isMobile ? (
        <div className="mb-6">
          <MobileFilters
            searchValue={search}
            onSearchChange={(value) => {
              setSearch(value)
              setPagination((prev) => ({ ...prev, page: 1 }))
            }}
            searchPlaceholder="חיפוש לפי שם, SKU..."
            filters={mobileFilters}
            isSearching={isSearching}
          />
        </div>
      ) : (
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
                  className="pr-10 pl-10"
                />
                {isSearching && (
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <Loader2 className="w-4 h-4 text-[#15b981] animate-spin" />
                  </div>
                )}
              </div>

              {/* Collection Filter */}
              <Select value={collectionFilter} onValueChange={setCollectionFilter}>
                <SelectTrigger className="w-full md:w-[200px] flex-shrink-0">
                  <SelectValue placeholder="כל הקולקציות" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הקולקציות</SelectItem>
                  {collections.map((collection) => (
                    <SelectItem key={collection.id} value={collection.id}>
                      {collection.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[160px] flex-shrink-0">
                  <SelectValue placeholder="תאריך (חדש לישן)" />
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
                <SelectTrigger className="w-full md:w-[180px] flex-shrink-0">
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
      )}

      {/* Products List - Mobile vs Desktop */}
      {isMobile ? (
        <MobileListView
          items={convertToMobileList()}
          onItemClick={(item) => router.push(`/products/${products.find(p => p.id === item.id)?.slug}/edit`)}
          selectedItems={selectedProducts}
          onSelectionChange={setSelectedProducts}
          showCheckbox={selectedProducts.size > 0}
          settingsType="products"
          emptyState={{
            icon: <Package className="w-12 h-12 text-gray-400" />,
            title: "אין מוצרים",
            description: "התחל ליצור את המוצר הראשון שלך",
            action: selectedShop ? {
              label: "צור מוצר חדש",
              onClick: () => router.push("/products/new")
            } : undefined
          }}
        />
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
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">מחיר</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">מקט</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">אפשרויות</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">קטגוריות</th>
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatProductPrice(product as any)}
                        </div>
                        {formatComparePrice(product as any) && (
                          <div className="text-sm text-gray-500 line-through">
                            {formatComparePrice(product as any)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.sku || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {product.options && product.options.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {product.options.map((option: any) => {
                              let values = '';
                              
                              // בדיקה אם values הוא מערך
                              if (Array.isArray(option.values)) {
                                values = option.values
                                  .map((v: any) => {
                                    if (typeof v === 'string') {
                                      return v;
                                    } else if (typeof v === 'object' && v !== null) {
                                      // הפורמט הרשמי: { id, label, metadata? }
                                      return v.label || v.value || v.name || v.id || '';
                                    }
                                    return '';
                                  })
                                  .filter(Boolean)
                                  .join(', ');
                              } else if (typeof option.values === 'object' && option.values !== null) {
                                // אם values הוא אובייקט, נסה להמיר אותו למערך
                                const valuesArray = Object.values(option.values);
                                values = valuesArray
                                  .map((v: any) => {
                                    if (typeof v === 'string') {
                                      return v;
                                    } else if (typeof v === 'object' && v !== null) {
                                      return v.label || v.value || v.name || v.id || '';
                                    }
                                    return '';
                                  })
                                  .filter(Boolean)
                                  .join(', ');
                              } else if (typeof option.values === 'string') {
                                // אם זה string, נסה לפרסר אותו כ-JSON
                                try {
                                  const parsed = JSON.parse(option.values);
                                  if (Array.isArray(parsed)) {
                                    values = parsed
                                      .map((v: any) => typeof v === 'string' ? v : (v.label || v.value || v.name || v.id || ''))
                                      .filter(Boolean)
                                      .join(', ');
                                  }
                                } catch {
                                  values = option.values;
                                }
                              }
                              
                              return (
                                <div key={option.id} className="text-xs">
                                  <span className="font-medium text-gray-700">{option.name}:</span>{' '}
                                  <span className="text-gray-600">{values || '-'}</span>
                                </div>
                              );
                            })}
                          </div>
                        ) : product.variants && product.variants.length > 0 ? (
                          <span className="text-blue-600">{product.variants.length} אפשרויות</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(product as any).collections && (product as any).collections.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {(product as any).collections.slice(0, 2).map((col: any) => (
                              <Badge key={col.collectionId} variant="outline" className="text-xs">
                                {col.collection?.name || 'קטגוריה'}
                              </Badge>
                            ))}
                            {(product as any).collections.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{(product as any).collections.length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
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
                    <span className="text-xl font-bold">{formatProductPrice(product as any)}</span>
                    {formatComparePrice(product as any) && (
                      <span className="text-sm text-gray-500 line-through">
                        {formatComparePrice(product as any)}
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
      </div>
    </AppLayout>
  )
}

