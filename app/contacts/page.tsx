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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
  Users, 
  Search, 
  Eye, 
  Calendar, 
  ShoppingBag, 
  UserPlus, 
  MoreVertical, 
  Trash2,
  Mail,
  UserCheck,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Filter
} from "lucide-react"
import { format } from "date-fns"
import { he } from "date-fns/locale"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import { useShop } from "@/components/providers/ShopProvider"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

interface Contact {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  phone: string | null
  company: string | null
  notes: string | null
  tags: string[]
  emailMarketingConsent: boolean
  emailMarketingConsentAt: string | null
  createdAt: string
  categoryAssignments: Array<{
    id: string
    category: {
      id: string
      type: string
      name: string
      color: string | null
    }
  }>
  customer: {
    id: string
    totalSpent: number
    orderCount: number
    tier: string
  } | null
}

type ContactCategoryType = "CUSTOMER" | "CLUB_MEMBER" | "NEWSLETTER" | "CONTACT_FORM" | "all"

const CATEGORY_CONFIG: Record<ContactCategoryType, { label: string; icon: any; color: string }> = {
  all: { label: "הכל", icon: Users, color: "bg-gray-500" },
  CUSTOMER: { label: "לקוחות", icon: ShoppingBag, color: "bg-green-500" },
  CLUB_MEMBER: { label: "חברי מועדון", icon: UserCheck, color: "bg-blue-500" },
  NEWSLETTER: { label: "דיוור", icon: Mail, color: "bg-orange-500" },
  CONTACT_FORM: { label: "יצירת קשר", icon: MessageSquare, color: "bg-purple-500" },
}

export default function ContactsPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { selectedShop, shops } = useShop()
  const { toast } = useToast()
  const isMobile = useMediaQuery("(max-width: 768px)")
  
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState<ContactCategoryType>("all")
  const [emailConsentFilter, setEmailConsentFilter] = useState<string>("all") // all, true, false
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  
  // State for add contact dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newContact, setNewContact] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    company: "",
    notes: "",
    tags: [] as string[],
    categoryTypes: [] as string[],
    emailMarketingConsent: false,
  })

  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN"

  useEffect(() => {
    // אתחול קטגוריות אם צריך
    initCategories()
    // טען אנשי קשר גם אם אין חנות נבחרת (יטען מכל החנויות)
    fetchContacts()
  }, [page, activeTab, emailConsentFilter, search, selectedShop])

  const initCategories = async () => {
    try {
      await fetch("/api/contacts/categories/init", {
        method: "POST",
      })
    } catch (error) {
      // לא נכשל אם כבר קיימות
      console.log("Categories already initialized or error:", error)
    }
  }

  const fetchContacts = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
      })
      
      // אם יש חנות נבחרת, הוסף אותה לפרמטרים
      if (selectedShop) {
        params.append("shopId", selectedShop?.id || "")
      }

      if (activeTab !== "all") {
        params.append("categoryType", activeTab)
      }
      if (search) {
        params.append("search", search)
      }
      if (emailConsentFilter !== "all") {
        params.append("emailMarketingConsent", emailConsentFilter)
      }

      const response = await fetch(`/api/contacts?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setContacts(data.contacts || [])
        setTotalPages(data.pagination?.totalPages || 1)
      }
    } catch (error) {
      console.error("Error fetching contacts:", error)
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לטעון את אנשי הקשר",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchContacts()
  }

  const getContactName = (contact: Contact) => {
    if (contact.firstName || contact.lastName) {
      return `${contact.firstName || ""} ${contact.lastName || ""}`.trim()
    }
    return contact.email.split("@")[0]
  }

  const getCategoryBadges = (contact: Contact) => {
    return contact.categoryAssignments.map((assignment: any) => {
      const category = assignment.category
      const config = CATEGORY_CONFIG[category.type as ContactCategoryType] || CATEGORY_CONFIG.all
      return (
        <Badge
          key={assignment.id}
          variant="outline"
          className="text-xs"
          style={{
            backgroundColor: category.color ? `${category.color}15` : undefined,
            borderColor: category.color || undefined,
            color: category.color || undefined,
          }}
        >
          {category.name}
        </Badge>
      )
    })
  }

  const toggleSelectAll = () => {
    if (selectedContacts.length === contacts.length) {
      setSelectedContacts([])
    } else {
      setSelectedContacts(contacts.map(c => c.id))
    }
  }

  const toggleSelectContact = (contactId: string) => {
    setSelectedContacts(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    )
  }

  const handleBulkDelete = async () => {
    const count = selectedContacts.length
    if (!confirm(`האם אתה בטוח שברצונך למחוק ${count} אנשי קשר?`)) {
      return
    }

    setIsDeleting(true)
    try {
      for (const contactId of selectedContacts) {
        await fetch(`/api/contacts/${contactId}`, {
          method: 'DELETE',
        })
      }
      setSelectedContacts([])
      fetchContacts()
      toast({
        title: "הצלחה",
        description: `נמחקו ${count} אנשי קשר בהצלחה`,
      })
    } catch (error) {
      console.error('Error deleting contacts:', error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה במחיקת אנשי הקשר",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק איש קשר זה?')) {
      return
    }

    try {
      const response = await fetch(`/api/contacts/${contactId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchContacts()
        toast({
          title: "הצלחה",
          description: "איש הקשר נמחק בהצלחה",
        })
      } else {
        toast({
          title: "שגיאה",
          description: "אירעה שגיאה במחיקת איש הקשר",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error deleting contact:', error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה במחיקת איש הקשר",
        variant: "destructive",
      })
    }
  }

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault()

    // אם אין חנות נבחרת, נשתמש בחנות הראשונה של המשתמש
    const shopToUse = selectedShop || shops[0]
    
    if (!shopToUse) {
      toast({
        title: "שגיאה",
        description: "לא נמצאה חנות. אנא צור חנות תחילה.",
        variant: "destructive",
      })
      return
    }

    if (!newContact.email) {
      toast({
        title: "שגיאה",
        description: "אנא הזן אימייל",
        variant: "destructive",
      })
      return
    }

    if (newContact.categoryTypes.length === 0) {
      toast({
        title: "שגיאה",
        description: "אנא בחר לפחות קטגוריה אחת",
        variant: "destructive",
      })
      return
    }

    setCreating(true)
    try {
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...newContact,
          shopId: shopToUse.id,
        }),
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "איש הקשר נוצר בהצלחה",
        })
        setDialogOpen(false)
        setNewContact({
          email: "",
          firstName: "",
          lastName: "",
          phone: "",
          company: "",
          notes: "",
          tags: [],
          categoryTypes: [],
          emailMarketingConsent: false,
        })
        fetchContacts()
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "לא ניתן ליצור את איש הקשר",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating contact:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה ביצירת איש הקשר",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value as ContactCategoryType)
    setPage(1)
  }

  // לא נציג הודעת "בחר חנות" - נטען את כל אנשי הקשר של החברה

  return (
    <AppLayout title="אנשי קשר">
      <div className={`space-y-6 ${isMobile ? "pb-20" : ""}`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">אנשי קשר</h1>
            <p className="text-gray-600 mt-1">נהל ועקוב אחר כל אנשי הקשר שלך</p>
          </div>
          <div className="flex items-center gap-2">
            {selectedContacts.length > 0 && (
              <Button
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={isDeleting}
              >
                <Trash2 className="w-4 h-4 ml-2" />
                מחק {selectedContacts.length} נבחרו
              </Button>
            )}
            {isAdmin && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="prodify-gradient text-white">
                    <UserPlus className="w-4 h-4 ml-2" />
                    הוסף איש קשר
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>הוסף איש קשר חדש</DialogTitle>
                    <DialogDescription>
                      הוסף איש קשר חדש למערכת
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateContact}>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="email">אימייל *</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="example@email.com"
                          value={newContact.email}
                          onChange={(e) =>
                            setNewContact({ ...newContact, email: e.target.value })
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
                            value={newContact.firstName}
                            onChange={(e) =>
                              setNewContact({ ...newContact, firstName: e.target.value })
                            }
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="lastName">שם משפחה</Label>
                          <Input
                            id="lastName"
                            type="text"
                            placeholder="שם משפחה"
                            value={newContact.lastName}
                            onChange={(e) =>
                              setNewContact({ ...newContact, lastName: e.target.value })
                            }
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="phone">טלפון</Label>
                          <Input
                            id="phone"
                            type="tel"
                            placeholder="050-1234567"
                            value={newContact.phone}
                            onChange={(e) =>
                              setNewContact({ ...newContact, phone: e.target.value })
                            }
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="company">חברה</Label>
                          <Input
                            id="company"
                            type="text"
                            placeholder="שם החברה"
                            value={newContact.company}
                            onChange={(e) =>
                              setNewContact({ ...newContact, company: e.target.value })
                            }
                          />
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label>קטגוריות *</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(CATEGORY_CONFIG)
                            .filter(([key]) => key !== "all")
                            .map(([key, config]) => {
                              const Icon = config.icon
                              return (
                                <div key={key} className="flex items-center gap-2">
                                  <Checkbox
                                    id={`category-${key}`}
                                    checked={newContact.categoryTypes.includes(key)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setNewContact({
                                          ...newContact,
                                          categoryTypes: [...newContact.categoryTypes, key],
                                        })
                                      } else {
                                        setNewContact({
                                          ...newContact,
                                          categoryTypes: newContact.categoryTypes.filter(
                                            (t) => t !== key
                                          ),
                                        })
                                      }
                                    }}
                                  />
                                  <Label
                                    htmlFor={`category-${key}`}
                                    className="cursor-pointer flex items-center gap-2"
                                  >
                                    <Icon className="w-4 h-4" />
                                    {config.label}
                                  </Label>
                                </div>
                              )
                            })}
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="notes">הערות</Label>
                        <textarea
                          id="notes"
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          value={newContact.notes}
                          onChange={(e) =>
                            setNewContact({ ...newContact, notes: e.target.value })
                          }
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="emailConsent"
                          checked={newContact.emailMarketingConsent}
                          onCheckedChange={(checked) =>
                            setNewContact({
                              ...newContact,
                              emailMarketingConsent: checked as boolean,
                            })
                          }
                        />
                        <Label htmlFor="emailConsent" className="cursor-pointer">
                          אישור דיוור
                        </Label>
                      </div>
                    </div>

                    <DialogFooter className="gap-2">
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
                        {creating ? "יוצר..." : "צור איש קשר"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-5">
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
              const Icon = config.icon
              return (
                <TabsTrigger key={key} value={key} className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{config.label}</span>
                </TabsTrigger>
              )
            })}
          </TabsList>

          {/* Filters */}
          <Card className="mt-4">
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

                <Select value={emailConsentFilter} onValueChange={setEmailConsentFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="אישור דיוור" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל אנשי הקשר</SelectItem>
                    <SelectItem value="true">עם אישור דיוור</SelectItem>
                    <SelectItem value="false">ללא אישור דיוור</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Contacts Table */}
          {loading ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-gray-600">טוען...</p>
              </CardContent>
            </Card>
          ) : contacts.length === 0 ? (
            <Card>
              <CardContent className="p-0">
                <div className="text-center py-12">
                  <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2 prodify-gradient-text">
                    אין אנשי קשר
                  </h3>
                  <p className="text-gray-600 mb-4">
                    עדיין לא נרשמו אנשי קשר בקטגוריה זו
                  </p>
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
                            checked={selectedContacts.length === contacts.length && contacts.length > 0}
                            onCheckedChange={toggleSelectAll}
                          />
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          איש קשר
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          אימייל
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          טלפון
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          קטגוריות
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          אישור דיוור
                        </th>
                        {activeTab === "CUSTOMER" && (
                          <>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              הזמנות
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              סכום כולל
                            </th>
                          </>
                        )}
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          תאריך הצטרפות
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          פעולות
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {contacts.map((contact: any) => (
                        <tr key={contact.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4">
                            <Checkbox
                              checked={selectedContacts.includes(contact.id)}
                              onCheckedChange={() => toggleSelectContact(contact.id)}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                                <Users className="w-5 h-5 text-emerald-600" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">
                                  {getContactName(contact)}
                                </div>
                                {contact.company && (
                                  <div className="text-xs text-gray-500">{contact.company}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{contact.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-600">
                              {contact.phone || "-"}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {getCategoryBadges(contact)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {contact.emailMarketingConsent ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                                <CheckCircle2 className="w-3 h-3 ml-1" />
                                מאושר
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                                <XCircle className="w-3 h-3 ml-1" />
                                לא מאושר
                              </Badge>
                            )}
                          </td>
                          {activeTab === "CUSTOMER" && contact.customer && (
                            <>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <ShoppingBag className="w-4 h-4 text-gray-400" />
                                  <span className="text-sm font-medium text-gray-900">
                                    {contact.customer.orderCount}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm font-semibold text-gray-900">
                                  ₪{contact.customer.totalSpent.toFixed(2)}
                                </span>
                              </td>
                            </>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Calendar className="w-4 h-4" />
                              {format(new Date(contact.createdAt), "dd/MM/yyyy", { locale: he })}
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
                                <DropdownMenuItem onClick={() => router.push(`/contacts/${contact.id}`)}>
                                  <Eye className="w-4 h-4 ml-2" />
                                  צפה
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteContact(contact.id)}
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
                {!loading && contacts.length > 0 && totalPages > 1 && (
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
        </Tabs>
      </div>
    </AppLayout>
  )
}

