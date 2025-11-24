"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Truck, 
  Plus, 
  Edit, 
  Trash2, 
  MoreVertical,
  Globe,
  AlertCircle,
  CheckCircle2,
  X
} from "lucide-react"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import { useShop } from "@/components/providers/ShopProvider"
import { Checkbox } from "@/components/ui/checkbox"

interface ShippingZone {
  id: string
  name: string
  countries: string[]
  rates: ShippingRate[]
}

interface ShippingRate {
  id: string
  name: string
  description?: string
  price: number | null // null = חינם
  type: "flat" | "weight" | "price"
  conditions?: {
    minWeight?: number
    maxWeight?: number | null
    minPrice?: number
    maxPrice?: number | null
  }
}

export default function ShippingSettingsPage() {
  const { toast } = useToast()
  const { selectedShop } = useShop()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Shipping Zones
  const [zones, setZones] = useState<ShippingZone[]>([])
  const [showZoneDialog, setShowZoneDialog] = useState(false)
  const [editingZone, setEditingZone] = useState<ShippingZone | null>(null)
  const [zoneForm, setZoneForm] = useState({
    name: "",
    countries: [] as string[],
  })
  const [countrySearch, setCountrySearch] = useState("")
  
  // Shipping Rates
  const [showRateDialog, setShowRateDialog] = useState(false)
  const [editingRate, setEditingRate] = useState<{ zoneId: string; rate: ShippingRate | null } | null>(null)
  const [rateForm, setRateForm] = useState({
    name: "",
    description: "",
    price: "",
    type: "flat" as "flat" | "weight" | "price",
    minWeight: "",
    maxWeight: "",
    minPrice: "",
    maxPrice: "",
  })
  
  // רשימת מדינות (דוגמה - ניתן להרחיב)
  const countries = [
    { code: "IL", name: "ישראל", flag: "🇮🇱" },
    { code: "US", name: "ארצות הברית", flag: "🇺🇸" },
    { code: "GB", name: "בריטניה", flag: "🇬🇧" },
    { code: "DE", name: "גרמניה", flag: "🇩🇪" },
    { code: "FR", name: "צרפת", flag: "🇫🇷" },
    { code: "IT", name: "איטליה", flag: "🇮🇹" },
    { code: "ES", name: "ספרד", flag: "🇪🇸" },
    { code: "AE", name: "איחוד האמירויות", flag: "🇦🇪" },
    { code: "AU", name: "אוסטרליה", flag: "🇦🇺" },
    { code: "AT", name: "אוסטריה", flag: "🇦🇹" },
    // ניתן להוסיף עוד...
  ]
  
  useEffect(() => {
    if (selectedShop?.id) {
      loadShippingSettings()
    }
  }, [selectedShop?.id])
  
  const loadShippingSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/shops/${selectedShop?.id}`)
      if (response.ok) {
        const data = await response.json()
        const settings = data.settings || {}
        
        // טעינת shipping zones
        if (settings.shippingZones) {
          setZones(settings.shippingZones)
        } else {
          // יצירת zones ברירת מחדל
          setZones([
            {
              id: "israel",
              name: "ישראל",
              countries: ["IL"],
              rates: [],
            },
            {
              id: "international",
              name: "בינלאומי",
              countries: countries.filter(c => c.code !== "IL").map(c => c.code),
              rates: [],
            },
          ])
        }
      }
    } catch (error) {
      console.error("Error loading shipping settings:", error)
      toast({
        title: "שגיאה",
        description: "לא ניתן לטעון את הגדרות המשלוחים",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }
  
  const handleCreateZone = () => {
    setEditingZone(null)
    setZoneForm({ name: "", countries: [] })
    setCountrySearch("")
    setShowZoneDialog(true)
  }
  
  const handleEditZone = (zone: ShippingZone) => {
    setEditingZone(zone)
    setZoneForm({ name: zone.name, countries: zone.countries })
    setCountrySearch("")
    setShowZoneDialog(true)
  }
  
  const handleDeleteZone = async (zoneId: string) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק את אזור המשלוח הזה?")) return
    
    const updatedZones = zones.filter(z => z.id !== zoneId)
    setZones(updatedZones)
    await saveZones(updatedZones)
  }
  
  const handleSaveZone = async () => {
    if (!zoneForm.name) {
      toast({
        title: "שגיאה",
        description: "נא להזין שם לאזור",
        variant: "destructive",
      })
      return
    }
    
    if (zoneForm.countries.length === 0) {
      toast({
        title: "שגיאה",
        description: "נא לבחור לפחות מדינה אחת",
        variant: "destructive",
      })
      return
    }
    
    let updatedZones: ShippingZone[]
    if (editingZone) {
      updatedZones = zones.map(z => 
        z.id === editingZone!.id 
          ? { ...z, name: zoneForm.name, countries: zoneForm.countries }
          : z
      )
    } else {
      const newZone: ShippingZone = {
        id: `zone-${Date.now()}`,
        name: zoneForm.name,
        countries: zoneForm.countries,
        rates: [],
      }
      updatedZones = [...zones, newZone]
    }
    
    setZones(updatedZones)
    setShowZoneDialog(false)
    await saveZones(updatedZones)
  }
  
  const handleCreateRate = (zoneId: string) => {
    setEditingRate({ zoneId, rate: null })
    setRateForm({
      name: "",
      description: "",
      price: "",
      type: "flat",
      minWeight: "",
      maxWeight: "",
      minPrice: "",
      maxPrice: "",
    })
    setShowRateDialog(true)
  }
  
  const handleEditRate = (zoneId: string, rate: ShippingRate) => {
    setEditingRate({ zoneId, rate })
    setRateForm({
      name: rate.name,
      description: rate.description || "",
      price: rate.price === null ? "" : rate.price.toString(),
      type: rate.type,
      minWeight: rate.conditions?.minWeight?.toString() || "",
      maxWeight: rate.conditions?.maxWeight?.toString() || "",
      minPrice: rate.conditions?.minPrice?.toString() || "",
      maxPrice: rate.conditions?.maxPrice?.toString() || "",
    })
    setShowRateDialog(true)
  }
  
  const handleDeleteRate = async (zoneId: string, rateId: string) => {
    const updatedZones = zones.map(z => 
      z.id === zoneId 
        ? { ...z, rates: z.rates.filter(r => r.id !== rateId) }
        : z
    )
    setZones(updatedZones)
    await saveZones(updatedZones)
  }
  
  const handleSaveRate = async () => {
    if (!editingRate) return
    
    if (!rateForm.name) {
      toast({
        title: "שגיאה",
        description: "נא להזין שם לתעריף",
        variant: "destructive",
      })
      return
    }
    
    const rate: ShippingRate = {
      id: editingRate.rate?.id || `rate-${Date.now()}`,
      name: rateForm.name,
      description: rateForm.description || undefined,
      price: rateForm.price === "" || rateForm.price === "0" ? null : parseFloat(rateForm.price),
      type: rateForm.type,
      conditions: rateForm.type !== "flat" ? {
        minWeight: rateForm.minWeight ? parseFloat(rateForm.minWeight) : undefined,
        maxWeight: rateForm.maxWeight ? parseFloat(rateForm.maxWeight) : undefined,
        minPrice: rateForm.minPrice ? parseFloat(rateForm.minPrice) : undefined,
        maxPrice: rateForm.maxPrice ? parseFloat(rateForm.maxPrice) : undefined,
      } : undefined,
    }
    
    const updatedZones = zones.map(z => 
      z.id === editingRate.zoneId
        ? {
            ...z,
            rates: editingRate.rate
              ? z.rates.map(r => r.id === editingRate.rate!.id ? rate : r)
              : [...z.rates, rate]
          }
        : z
    )
    
    setZones(updatedZones)
    setShowRateDialog(false)
    await saveZones(updatedZones)
  }
  
  const saveZones = async (zonesToSave?: ShippingZone[]) => {
    if (!selectedShop?.id) return
    
    const zonesToSaveFinal = zonesToSave || zones
    
    try {
      const response = await fetch(`/api/shops/${selectedShop.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            shippingZones: zonesToSaveFinal,
          },
        }),
      })
      
      if (!response.ok) {
        throw new Error("Failed to save")
      }
      
      toast({
        title: "הצלחה!",
        description: "אזורי המשלוח נשמרו",
      })
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "לא ניתן לשמור את אזורי המשלוח",
        variant: "destructive",
      })
    }
  }
  
  const toggleCountry = (countryCode: string) => {
    if (zoneForm.countries.includes(countryCode)) {
      setZoneForm({
        ...zoneForm,
        countries: zoneForm.countries.filter(c => c !== countryCode),
      })
    } else {
      setZoneForm({
        ...zoneForm,
        countries: [...zoneForm.countries, countryCode],
      })
    }
  }
  
  const filteredCountries = countries.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.code.toLowerCase().includes(countrySearch.toLowerCase())
  )
  
  if (loading) {
    return (
      <AppLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </AppLayout>
    )
  }
  
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">הגדרות משלוחים</h1>
          <p className="text-sm text-gray-500 mt-1">
            נהל את אזורי המשלוח ותעריפים
          </p>
        </div>
        
        {/* Shipping Zones */}
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>אזורי משלוח</CardTitle>
                <CardDescription>
                  הגדר אזורים ומחירים שונים למדינות שונות
                </CardDescription>
              </div>
              <Button onClick={handleCreateZone} size="sm">
                <Plus className="w-4 h-4 ml-2" />
                הוסף אזור משלוח
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {zones.map((zone) => {
                const zoneCountries = countries.filter(c => zone.countries.includes(c.code))
                const hasRates = zone.rates.length > 0
                
                return (
                  <div key={zone.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Globe className="w-5 h-5 text-gray-500" />
                        <div>
                          <h3 className="font-semibold">{zone.name}</h3>
                          <p className="text-sm text-gray-500">
                            {zoneCountries.length > 0 ? (
                              <>
                                {zoneCountries.slice(0, 3).map(c => c.name).join(", ")}
                                {zoneCountries.length > 3 && `, +${zoneCountries.length - 3} עוד`}
                              </>
                            ) : (
                              "לא נבחרו מדינות"
                            )}
                          </p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditZone(zone)}>
                            <Edit className="w-4 h-4 ml-2" />
                            ערוך
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteZone(zone.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 ml-2" />
                            מחק
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    {!hasRates && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-orange-600" />
                          <p className="text-sm text-orange-900">
                            אין תעריפים. לקוחות באזור זה לא יוכלו להשלים צ'ק אאוט.
                          </p>
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-3">
                      {zone.rates.map((rate) => (
                        <div key={rate.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{rate.name}</p>
                              {rate.price === null ? (
                                <Badge className="bg-green-100 text-green-700 border-green-200">
                                  חינם
                                </Badge>
                              ) : (
                                <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                                  ₪{rate.price.toFixed(2)}
                                </Badge>
                              )}
                            </div>
                            {rate.description && (
                              <p className="text-sm text-gray-600 mt-1">{rate.description}</p>
                            )}
                            {rate.conditions && (
                              <p className="text-xs text-gray-500 mt-1">
                                {rate.type === "price" && rate.conditions.minPrice && (
                                  <>הזמנות ₪{rate.conditions.minPrice.toFixed(2)}
                                  {rate.conditions.maxPrice ? `–₪${rate.conditions.maxPrice.toFixed(2)}` : " ומעלה"}</>
                                )}
                                {rate.type === "weight" && rate.conditions.minWeight && (
                                  <>משקל {rate.conditions.minWeight} ק"ג
                                  {rate.conditions.maxWeight ? `–${rate.conditions.maxWeight} ק"ג` : " ומעלה"}</>
                                )}
                              </p>
                            )}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditRate(zone.id, rate)}>
                                <Edit className="w-4 h-4 ml-2" />
                                ערוך
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteRate(zone.id, rate.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 ml-2" />
                                מחק
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ))}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCreateRate(zone.id)}
                      className="mt-4 w-full"
                    >
                      <Plus className="w-4 h-4 ml-2" />
                      הוסף תעריף
                    </Button>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
        
        {/* Create/Edit Zone Dialog */}
        <Dialog open={showZoneDialog} onOpenChange={setShowZoneDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingZone ? "ערוך אזור משלוח" : "צור אזור משלוח חדש"}
              </DialogTitle>
              <DialogDescription>
                לקוחות לא יראו את השם הזה
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="zone-name">שם האזור</Label>
                <Input
                  id="zone-name"
                  value={zoneForm.name}
                  onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
                  placeholder="למשל: Domestic, International"
                  className="mt-2"
                />
              </div>
              
              <div>
                <Label>מדינות ואזורים</Label>
                <div className="mt-2">
                  <Input
                    placeholder="חפש מדינות ואזורים..."
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    className="mb-3"
                  />
                  <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto p-2">
                    {filteredCountries.map((country) => (
                      <label
                        key={country.code}
                        className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <Checkbox
                          checked={zoneForm.countries.includes(country.code)}
                          onCheckedChange={() => toggleCountry(country.code)}
                        />
                        <span className="text-lg">{country.flag}</span>
                        <span className="text-sm flex-1">{country.name}</span>
                        {zoneForm.countries.includes(country.code) && (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        )}
                      </label>
                    ))}
                  </div>
                  {zoneForm.countries.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {zoneForm.countries.map((code) => {
                        const country = countries.find(c => c.code === code)
                        return country ? (
                          <Badge key={code} variant="outline" className="flex items-center gap-1">
                            {country.flag} {country.name}
                            <button
                              onClick={() => toggleCountry(code)}
                              className="ml-1 hover:text-red-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ) : null
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowZoneDialog(false)}>
                ביטול
              </Button>
              <Button onClick={handleSaveZone} className="prodify-gradient text-white border-0">
                שמור
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Create/Edit Rate Dialog */}
        <Dialog open={showRateDialog} onOpenChange={setShowRateDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingRate?.rate ? "ערוך תעריף" : "הוסף תעריף"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="rate-type">סוג תעריף</Label>
                <Select
                  value={rateForm.type}
                  onValueChange={(value: "flat" | "weight" | "price") => 
                    setRateForm({ ...rateForm, type: value })
                  }
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flat">תעריף קבוע</SelectItem>
                    <SelectItem value="weight">לפי משקל</SelectItem>
                    <SelectItem value="price">לפי מחיר הזמנה</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="rate-name">שם התעריף</Label>
                <Input
                  id="rate-name"
                  value={rateForm.name}
                  onChange={(e) => setRateForm({ ...rateForm, name: e.target.value })}
                  placeholder="למשל: משלוח סטנדרטי"
                  className="mt-2"
                />
              </div>
              
              <div>
                <Label htmlFor="rate-description">תיאור משלוח (אופציונלי)</Label>
                <Input
                  id="rate-description"
                  value={rateForm.description}
                  onChange={(e) => setRateForm({ ...rateForm, description: e.target.value })}
                  placeholder="למשל: משלוח לבית הלקוח (3-7 ימי עסקים)"
                  className="mt-2"
                />
              </div>
              
              <div>
                <Label htmlFor="rate-price">מחיר</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="rate-price"
                    type="number"
                    value={rateForm.price}
                    onChange={(e) => setRateForm({ ...rateForm, price: e.target.value })}
                    placeholder="0.00"
                    dir="ltr"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant={rateForm.price === "" || rateForm.price === "0" ? "default" : "outline"}
                    onClick={() => setRateForm({ ...rateForm, price: "" })}
                  >
                    חינם
                  </Button>
                </div>
              </div>
              
              {rateForm.type !== "flat" && (
                <div className="border-t pt-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRateForm({
                          ...rateForm,
                          minWeight: "",
                          maxWeight: "",
                          minPrice: "",
                          maxPrice: "",
                        })
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      הסר תנאים
                    </button>
                  </div>
                  
                  {rateForm.type === "weight" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="min-weight">משקל מינימלי (ק"ג)</Label>
                        <Input
                          id="min-weight"
                          type="number"
                          value={rateForm.minWeight}
                          onChange={(e) => setRateForm({ ...rateForm, minWeight: e.target.value })}
                          placeholder="0"
                          className="mt-2"
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <Label htmlFor="max-weight">משקל מקסימלי (ק"ג)</Label>
                        <Input
                          id="max-weight"
                          type="number"
                          value={rateForm.maxWeight}
                          onChange={(e) => setRateForm({ ...rateForm, maxWeight: e.target.value })}
                          placeholder="ללא הגבלה"
                          className="mt-2"
                          dir="ltr"
                        />
                      </div>
                    </div>
                  )}
                  
                  {rateForm.type === "price" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="min-price">מחיר מינימלי (₪)</Label>
                        <Input
                          id="min-price"
                          type="number"
                          value={rateForm.minPrice}
                          onChange={(e) => setRateForm({ ...rateForm, minPrice: e.target.value })}
                          placeholder="0"
                          className="mt-2"
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <Label htmlFor="max-price">מחיר מקסימלי (₪)</Label>
                        <Input
                          id="max-price"
                          type="number"
                          value={rateForm.maxPrice}
                          onChange={(e) => setRateForm({ ...rateForm, maxPrice: e.target.value })}
                          placeholder="ללא הגבלה"
                          className="mt-2"
                          dir="ltr"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <div className="border-t pt-4">
                <Label className="text-sm font-medium mb-2 block">תצוגה מקדימה בצ'ק אאוט</Label>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full border-2 border-blue-600 flex-shrink-0"></div>
                        <div className="flex-1">
                          <span className="text-sm font-medium block">{rateForm.name || "שם התעריף"}</span>
                          {rateForm.description && (
                            <p className="text-xs text-gray-600 mt-1">{rateForm.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="text-sm font-medium flex-shrink-0 mr-3">
                      {rateForm.price === "" || rateForm.price === "0" ? "חינם" : `₪${parseFloat(rateForm.price || "0").toFixed(2)}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRateDialog(false)}>
                ביטול
              </Button>
              <Button onClick={handleSaveRate} className="prodify-gradient text-white border-0">
                שמור
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  )
}

