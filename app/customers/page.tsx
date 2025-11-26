"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Users, Search, Eye, Calendar, ShoppingBag, TrendingUp, UserPlus, MoreVertical, Trash2 } from "lucide-react"
import { CustomersSkeleton } from "@/components/skeletons/CustomersSkeleton"
import { format } from "date-fns"
import { he } from "date-fns/locale"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import { useShop } from "@/components/providers/ShopProvider"
import { useMediaQuery } from "@/hooks/useMediaQuery"

interface Customer {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  phone: string | null
  totalSpent: number
  orderCount: number
  tier: string
  isSubscribed: boolean
  createdAt: string
  lastLoginAt: string | null
  shop: {
    id: string
    name: string
  }
}

export default function CustomersPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { selectedShop, shops } = useShop()
  const { toast } = useToast()
  const isMobile = useMediaQuery("(max-width: 768px)")
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [tierFilter, setTierFilter] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  
  // State for add customer dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newCustomer, setNewCustomer] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    tier: "REGULAR" as "REGULAR" | "VIP" | "PREMIUM",
    isSubscribed: false,
  })

  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN"

  useEffect(() => {
    // טעינת הנתונים מיד
    fetchCustomers()
  }, [page, tierFilter, search])

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      })

      if (tierFilter !== "all") {
        params.append("tier", tierFilter)
      }
      if (search) {
        params.append("search", search)
      }

      const response = await fetch(`/api/customers?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setCustomers(data.customers || [])
        setTotalPages(data.pagination?.totalPages || 1)
      }
    } catch (error) {
      console.error("Error fetching customers:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchCustomers()
  }

  const getTierBadge = (tier: string) => {
    const tierMap: Record<string, { label: string; className: string }> = {
      REGULAR: { label: "רגיל", className: "bg-gray-100 text-gray-800 border-gray-300" },
      VIP: { label: "VIP", className: "bg-emerald-100 text-emerald-800 border-emerald-300" },
      PREMIUM: { label: "Premium", className: "bg-yellow-100 text-yellow-800 border-yellow-300" },
    }
    const tierInfo = tierMap[tier] || { label: tier, className: "bg-gray-100 text-gray-800" }
    return (
      <Badge variant="outline" className={tierInfo.className}>
        {tierInfo.label}
      </Badge>
    )
  }

  const getCustomerName = (customer: Customer) => {
    if (customer.firstName || customer.lastName) {
      return `${customer.firstName || ""} ${customer.lastName || ""}`.trim()
    }
    return customer.email.split("@")[0]
  }

  const toggleSelectAll = () => {
    if (selectedCustomers.length === customers.length) {
      setSelectedCustomers([])
    } else {
      setSelectedCustomers(customers.map(c => c.id))
    }
  }

  const toggleSelectCustomer = (customerId: string) => {
    setSelectedCustomers(prev =>
      prev.includes(customerId)
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    )
  }

  const handleBulkDelete = async () => {
    const count = selectedCustomers.length
    if (!confirm(`האם אתה בטוח שברצונך למחוק ${count} לקוחות?`)) {
      return
    }

    setIsDeleting(true)
    try {
      for (const customerId of selectedCustomers) {
        await fetch(`/api/customers/${customerId}`, {
          method: 'DELETE',
        })
      }
      setSelectedCustomers([])
      fetchCustomers()
      toast({
        title: "הצלחה",
        description: `נמחקו ${count} לקוחות בהצלחה`,
      })
    } catch (error) {
      console.error('Error deleting customers:', error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה במחיקת הלקוחות",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteCustomer = async (customerId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק לקוח זה?')) {
      return
    }

    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchCustomers()
        toast({
          title: "הצלחה",
          description: "הלקוח נמחק בהצלחה",
        })
      } else {
        toast({
          title: "שגיאה",
          description: "אירעה שגיאה במחיקת הלקוח",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error deleting customer:', error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה במחיקת הלקוח",
        variant: "destructive",
      })
    }
  }

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault()

    // אם אין חנות נבחרת, נשתמש בחנות הראשונה
    const shopToUse = selectedShop || shops?.[0]
    if (!shopToUse) {
      toast({
        title: "שגיאה",
        description: "לא נמצאה חנות. אנא צור חנות תחילה.",
        variant: "destructive",
      })
      return
    }

    if (!newCustomer.email) {
      toast({
        title: "שגיאה",
        description: "אנא הזן אימייל",
        variant: "destructive",
      })
      return
    }

    setCreating(true)
    try {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...newCustomer,
          shopId: shopToUse.id,
        }),
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "הלקוח נוצר בהצלחה",
        })
        setDialogOpen(false)
        setNewCustomer({
          email: "",
          firstName: "",
          lastName: "",
          phone: "",
          tier: "REGULAR",
          isSubscribed: false,
        })
        fetchCustomers()
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "לא ניתן ליצור את הלקוח",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating customer:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה ביצירת הלקוח",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  // הצגת skeleton רק בזמן טעינה ראשונית
  if (loading) {
    return (
      <AppLayout title="לקוחות">
        <CustomersSkeleton />
      </AppLayout>
    )
  }

  return (
    <AppLayout title="לקוחות">
      <div className={`space-y-6 ${isMobile ? "pb-20" : ""}`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">לקוחות</h1>
            <p className="text-gray-600 mt-1">נהל ועקוב אחר כל הלקוחות שלך</p>
          </div>
          <div className="flex items-center gap-2">
            {selectedCustomers.length > 0 && (
              <Button
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={isDeleting}
              >
                <Trash2 className="w-4 h-4 ml-2" />
                מחק {selectedCustomers.length} נבחרו
              </Button>
            )}
            {isAdmin && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="prodify-gradient text-white">
                  <UserPlus className="w-4 h-4 ml-2" />
                  הוסף לקוח
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>הוסף לקוח חדש</DialogTitle>
                  <DialogDescription>
                    הוסף לקוח חדש למערכת באופן ידני
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateCustomer}>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="email">אימייל *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="example@email.com"
                        value={newCustomer.email}
                        onChange={(e) =>
                          setNewCustomer({ ...newCustomer, email: e.target.value })
                        }
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="firstName">שם פרטי</Label>
                        <Input
                          id="firstName"
                          type="text"
                          placeholder="שם פרטי"
                          value={newCustomer.firstName}
                          onChange={(e) =>
                            setNewCustomer({ ...newCustomer, firstName: e.target.value })
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="lastName">שם משפחה</Label>
                        <Input
                          id="lastName"
                          type="text"
                          placeholder="שם משפחה"
                          value={newCustomer.lastName}
                          onChange={(e) =>
                            setNewCustomer({ ...newCustomer, lastName: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="phone">טלפון</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="050-1234567"
                        value={newCustomer.phone}
                        onChange={(e) =>
                          setNewCustomer({ ...newCustomer, phone: e.target.value })
                        }
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="tier">רמת לקוח</Label>
                      <Select
                        value={newCustomer.tier}
                        onValueChange={(value: "REGULAR" | "VIP" | "PREMIUM") =>
                          setNewCustomer({ ...newCustomer, tier: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="REGULAR">רגיל</SelectItem>
                          <SelectItem value="VIP">VIP</SelectItem>
                          <SelectItem value="PREMIUM">Premium</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isSubscribed"
                        checked={newCustomer.isSubscribed}
                        onChange={(e) =>
                          setNewCustomer({ ...newCustomer, isSubscribed: e.target.checked })
                        }
                        className="w-4 h-4"
                      />
                      <Label htmlFor="isSubscribed" className="cursor-pointer">
                        מנוי לניוזלטר
                      </Label>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                      disabled={creating}
                    >
                      ביטול
                    </Button>
                    <Button
                      type="submit"
                      disabled={creating}
                      className="prodify-gradient text-white"
                    >
                      <UserPlus className="w-4 h-4 ml-2" />
                      {creating ? "יוצר..." : "צור לקוח"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            )}
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    placeholder="חפש לפי שם, אימייל או טלפון..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pr-10"
                  />
                </div>
                <Button type="submit" className="prodify-gradient text-white">
                  חפש
                </Button>
              </form>

              <Select value={tierFilter} onValueChange={setTierFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="רמת לקוח" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הלקוחות</SelectItem>
                  <SelectItem value="REGULAR">רגיל</SelectItem>
                  <SelectItem value="VIP">VIP</SelectItem>
                  <SelectItem value="PREMIUM">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Customers Table */}
        {customers.length === 0 ? (
          <Card>
            <CardContent className="p-0">
              <div className="text-center py-12">
                <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2 prodify-gradient-text">אין לקוחות</h3>
                <p className="text-gray-600 mb-4">עדיין לא נרשמו לקוחות בחנות שלך</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-right">
                        <Checkbox
                          checked={selectedCustomers.length === customers.length && customers.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        לקוח
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        אימייל
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        טלפון
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        רמה
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        הזמנות
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        סכום כולל
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        תאריך הצטרפות
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        פעולות
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {customers.map((customer) => (
                      <tr key={customer.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <Checkbox
                            checked={selectedCustomers.includes(customer.id)}
                            onCheckedChange={() => toggleSelectCustomer(customer.id)}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                              <Users className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {getCustomerName(customer)}
                              </div>
                              {customer.isSubscribed && (
                                <Badge variant="outline" className="text-xs mt-1 bg-green-50 text-green-700 border-green-300">
                                  מנוי
                                </Badge>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{customer.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">
                            {customer.phone || "-"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getTierBadge(customer.tier)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <ShoppingBag className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900">
                              {customer.orderCount}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-green-500" />
                            <span className="text-sm font-semibold text-gray-900">
                              ₪{customer.totalSpent.toFixed(2)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(customer.createdAt), "dd/MM/yyyy", { locale: he })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <DropdownMenu dir="rtl">
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => router.push(`/customers/${customer.id}`)}>
                                <Eye className="w-4 h-4 ml-2" />
                                צפה
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteCustomer(customer.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 ml-2" />
                                מחיקה
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {!loading && customers.length > 0 && totalPages > 1 && (
                <div className="px-6 py-4 border-t flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    עמוד {page} מתוך {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      קודם
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      הבא
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}

