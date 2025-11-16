"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useShop } from "@/components/providers/ShopProvider"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import {
  Plus,
  Ruler,
  Globe,
  FolderOpen,
  Package,
} from "lucide-react"
import { DataListTable, DataListItem } from "@/components/ui/DataListTable"

interface SizeChart {
  id: string
  name: string
  content: string | null
  imageUrl: string | null
  displayType: "global" | "categories" | "products"
  categoryIds: string[]
  productIds: string[]
  isActive: boolean
  createdAt: string
  shop: {
    id: string
    name: string
  }
}

export default function SizeChartsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { selectedShop } = useShop()
  const [sizeCharts, setSizeCharts] = useState<SizeChart[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (selectedShop) {
      fetchSizeCharts()
    }
  }, [selectedShop])

  const fetchSizeCharts = async () => {
    if (!selectedShop) return

    setLoading(true)
    try {
      const response = await fetch(`/api/size-charts?shopId=${selectedShop.id}`)
      if (response.ok) {
        const data = await response.json()
        setSizeCharts(data)
      }
    } catch (error) {
      console.error("Error fetching size charts:", error)
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לטעון את טבלאות המידות",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/size-charts/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "טבלת המידות נמחקה בהצלחה",
        })
        fetchSizeCharts()
      } else {
        toast({
          title: "שגיאה",
          description: "לא הצלחנו למחוק את טבלת המידות",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting size chart:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה במחיקת טבלת המידות",
        variant: "destructive",
      })
    }
  }

  const getDisplayTypeLabel = (type: string) => {
    switch (type) {
      case "global":
        return "גלובלי"
      case "categories":
        return "קטגוריות"
      case "products":
        return "מוצרים"
      default:
        return type
    }
  }

  const getDisplayTypeIcon = (type: string) => {
    switch (type) {
      case "global":
        return Globe
      case "categories":
        return FolderOpen
      case "products":
        return Package
      default:
        return Ruler
    }
  }

  const dataListItems: DataListItem[] = sizeCharts.map((chart) => {
    const Icon = getDisplayTypeIcon(chart.displayType)
    const subtitle = (
      <>
        <Icon className="w-4 h-4" />
        <span>{getDisplayTypeLabel(chart.displayType)}</span>
        {chart.displayType === "categories" &&
          chart.categoryIds.length > 0 && (
            <span className="text-gray-400">
              • {chart.categoryIds.length} קטגוריות
            </span>
          )}
        {chart.displayType === "products" &&
          chart.productIds.length > 0 && (
            <span className="text-gray-400">
              • {chart.productIds.length} מוצרים
            </span>
          )}
      </>
    )

    return {
      id: chart.id,
      title: chart.name,
      subtitle,
      icon: Ruler,
      iconBgColor: "bg-purple-100",
      iconColor: "text-purple-600",
      badges: !chart.isActive ? [{ label: "לא פעיל", variant: "secondary" }] : undefined,
      isActive: chart.isActive,
      originalData: chart,
    }
  })

  if (!selectedShop) {
    return (
      <AppLayout>
        <div className="p-6">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-gray-500">אנא בחר חנות</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">טבלאות מידות</h1>
            <p className="text-gray-600 mt-1">נהל טבלאות מידות למוצרים</p>
          </div>
          <Button onClick={() => router.push("/size-charts/new")}>
            <Plus className="w-4 h-4 ml-2" />
            צור טבלת מידות
          </Button>
        </div>

        <DataListTable
          title="טבלאות מידות"
          items={dataListItems}
          loading={loading}
          searchPlaceholder="חפש טבלאות מידות..."
          searchValue={search}
          onSearchChange={setSearch}
          emptyStateIcon={Ruler}
          emptyStateTitle="אין טבלאות מידות"
          emptyStateAction={
            <Button onClick={() => router.push("/size-charts/new")}>
              <Plus className="w-4 h-4 ml-2" />
              צור טבלת מידות ראשונה
            </Button>
          }
          onEdit={(item) => router.push(`/size-charts/${item.id}/edit`)}
          onDelete={(item) => handleDelete(item.id)}
          deleteConfirmMessage="האם אתה בטוח שברצונך למחוק את טבלת המידות?"
        />
      </div>
    </AppLayout>
  )
}

