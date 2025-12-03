"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Crown,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  GripVertical,
  CheckCircle2,
} from "lucide-react"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import { useShop } from "@/components/providers/ShopProvider"
import { useMediaQuery } from "@/hooks/useMediaQuery"

interface PremiumClubTier {
  slug: string
  name: string
  color: string
  priority: number
  minSpent?: number | null
  minOrders?: number | null
  discount?: {
    type: "PERCENTAGE" | "FIXED"
    value: number
  } | null
  benefits: {
    freeShipping?: boolean
    earlyAccess?: boolean
    exclusiveProducts?: boolean
    birthdayGift?: boolean
    pointsMultiplier?: number | null
  }
}

interface PremiumClubConfig {
  enabled: boolean
  tiers: PremiumClubTier[]
  benefits: {
    freeShippingThreshold?: number | null
    birthdayDiscount?: {
      enabled: boolean
      value: number
      type: "PERCENTAGE" | "FIXED"
    } | null
    earlyAccessToSales?: boolean
    exclusiveProductsAccess?: boolean
    vipSupport?: boolean
    monthlyGift?: boolean
  }
  notifications: {
    tierUpgradeEmail: boolean
    tierUpgradeSMS: boolean
  }
}

export default function PremiumClubPage() {
  const { data: session } = useSession()
  const { selectedShop } = useShop()
  const { toast } = useToast()
  const isMobile = useMediaQuery("(max-width: 768px)")

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState<PremiumClubConfig>({
    enabled: false,
    tiers: [],
    benefits: {},
    notifications: {
      tierUpgradeEmail: true,
      tierUpgradeSMS: false,
    },
  })

  const [tierDialogOpen, setTierDialogOpen] = useState(false)
  const [editingTier, setEditingTier] = useState<PremiumClubTier | null>(null)
  const [tierForm, setTierForm] = useState<PremiumClubTier>({
    slug: "",
    name: "",
    color: "#C0C0C0",
    priority: 1,
    minSpent: null,
    minOrders: null,
    discount: null,
    benefits: {},
  })

  useEffect(() => {
    if (selectedShop) {
      fetchConfig()
    }
  }, [selectedShop])

  const fetchConfig = async () => {
    if (!selectedShop) return

    try {
      setLoading(true)
      const response = await fetch(`/api/plugins/premium-club/config?shopId=${selectedShop?.id || ""}`)
      if (response.ok) {
        const data = await response.json()
        if (data.config) {
          setConfig(data.config)
        }
      }
    } catch (error) {
      console.error("Error fetching config:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!selectedShop) return

    setSaving(true)
    try {
      const response = await fetch(`/api/plugins/premium-club/config`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ config, shopId: selectedShop?.id || "" }),
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "הגדרות מועדון פרימיום נשמרו בהצלחה",
        })
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "לא ניתן לשמור את ההגדרות",
        variant: "destructive",
      })
    }
  } catch (error) {
    console.error("Error saving config:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בשמירת ההגדרות",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleAddTier = () => {
    setEditingTier(null)
    setTierForm({
      slug: "",
      name: "",
      color: "#C0C0C0",
      priority: config.tiers.length + 1,
      minSpent: null,
      minOrders: null,
      discount: null,
      benefits: {},
    })
    setTierDialogOpen(true)
  }

  const handleEditTier = (tier: PremiumClubTier) => {
    setEditingTier(tier)
    setTierForm({ ...tier })
    setTierDialogOpen(true)
  }

  const handleDeleteTier = (slug: string) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק רמה זו?")) return

    setConfig({
      ...config,
      tiers: config.tiers.filter((t: any) => t.slug !== slug),
    })
  }

  const handleSaveTier = () => {
    // Validation
    if (!tierForm.slug || !tierForm.name) {
      toast({
        title: "שגיאה",
        description: "אנא מלא שם וזיהוי לרמה",
        variant: "destructive",
      })
      return
    }

    // בדיקת slug תקין (רק אותיות, מספרים ומקפים)
    if (!/^[a-z0-9-]+$/.test(tierForm.slug)) {
      toast({
        title: "שגיאה",
        description: "זיהוי יכול להכיל רק אותיות קטנות, מספרים ומקפים",
        variant: "destructive",
      })
      return
    }

    // בדיקה אם slug כבר קיים (אם לא עורכים)
    if (!editingTier && config.tiers.some((t: any) => t.slug === tierForm.slug)) {
      toast({
        title: "שגיאה",
        description: "זיהוי זה כבר קיים",
        variant: "destructive",
      })
      return
    }

    // בדיקה שיש לפחות דרישה אחת (סכום או הזמנות)
    if (!tierForm.minSpent && !tierForm.minOrders) {
      toast({
        title: "אזהרה",
        description: "רמה ללא דרישות תתאים לכל הלקוחות. האם להמשיך?",
        variant: "destructive",
      })
      // אפשר להמשיך - זה בסדר
    }

    const updatedTiers = editingTier
      ? config.tiers.map((t: any) => (t.slug === editingTier.slug ? tierForm : t))
      : [...config.tiers, tierForm]

    // מיון לפי priority
    updatedTiers.sort((a, b) => a.priority - b.priority)

    setConfig({
      ...config,
      tiers: updatedTiers,
    })

    setTierDialogOpen(false)
    setEditingTier(null)
  }

  if (!selectedShop) {
    return (
      <AppLayout title="חברי מועדון פרימיום">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-600">אנא בחר חנות כדי להגדיר את מועדון הפרימיום</p>
          </CardContent>
        </Card>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="חברי מועדון פרימיום">
      <div className={`space-y-6 ${isMobile ? "pb-20" : ""}`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Crown className="w-8 h-8 text-yellow-500" />
              חברי מועדון פרימיום
            </h1>
            <p className="text-gray-600 mt-1">
              הגדר רמות חברות, הנחות והטבות מותאמות אישית
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="enabled">הפעל מועדון פרימיום</Label>
              <Switch
                id="enabled"
                checked={config.enabled}
                onCheckedChange={(checked) =>
                  setConfig({ ...config, enabled: checked })
                }
              />
            </div>
            <Button onClick={handleSave} disabled={saving} className="prodify-gradient text-white">
              <Save className="w-4 h-4 ml-2" />
              {saving ? "שומר..." : "שמור הגדרות"}
            </Button>
          </div>
        </div>

        {/* Tiers Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>רמות חברות</CardTitle>
                <CardDescription>
                  הגדר רמות שונות עם דרישות, הנחות והטבות
                </CardDescription>
              </div>
              <Button onClick={handleAddTier} variant="outline">
                <Plus className="w-4 h-4 ml-2" />
                הוסף רמה
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {config.tiers.length === 0 ? (
              <div className="text-center py-12">
                <Crown className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">אין רמות מוגדרות</h3>
                <p className="text-gray-600 mb-4">
                  הוסף רמה ראשונה כדי להתחיל את מועדון הפרימיום
                </p>
                <Button onClick={handleAddTier}>
                  <Plus className="w-4 h-4 ml-2" />
                  הוסף רמה ראשונה
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>שם רמה</TableHead>
                    <TableHead>עדיפות</TableHead>
                    <TableHead>דרישות</TableHead>
                    <TableHead>הנחה</TableHead>
                    <TableHead>הטבות</TableHead>
                    <TableHead className="text-left">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {config.tiers
                    .sort((a, b) => a.priority - b.priority)
                    .map((tier: any) => (
                      <TableRow key={tier.slug}>
                        <TableCell>
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: tier.color }}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{tier.name}</div>
                          <div className="text-sm text-gray-500">{tier.slug}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{tier.priority}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {tier.minSpent && <div>₪{tier.minSpent.toLocaleString()}</div>}
                            {tier.minOrders && (
                              <div>{tier.minOrders} הזמנות</div>
                            )}
                            {!tier.minSpent && !tier.minOrders && (
                              <span className="text-gray-400">ללא דרישות</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {tier.discount ? (
                            <Badge className="bg-green-100 text-green-800">
                              {tier.discount.type === "PERCENTAGE"
                                ? `${tier.discount.value}%`
                                : `₪${tier.discount.value}`}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">ללא הנחה</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {tier.benefits.freeShipping && (
                              <Badge variant="outline" className="text-xs">
                                משלוח חינם
                              </Badge>
                            )}
                            {tier.benefits.earlyAccess && (
                              <Badge variant="outline" className="text-xs">
                                גישה מוקדמת
                              </Badge>
                            )}
                            {tier.benefits.exclusiveProducts && (
                              <Badge variant="outline" className="text-xs">
                                מוצרים בלעדיים
                              </Badge>
                            )}
                            {tier.benefits.birthdayGift && (
                              <Badge variant="outline" className="text-xs">
                                מתנת יום הולדת
                              </Badge>
                            )}
                            {tier.benefits.pointsMultiplier && (
                              <Badge variant="outline" className="text-xs">
                                x{tier.benefits.pointsMultiplier} נקודות
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditTier(tier)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTier(tier.slug)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* General Benefits */}
        <Card>
          <CardHeader>
            <CardTitle>הטבות כלליות</CardTitle>
            <CardDescription>הגדרות הטבות שפועלות על כל הרמות</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>משלוח חינם</Label>
                <p className="text-sm text-gray-500">סף מינימלי למשלוח חינם</p>
              </div>
              <Input
                type="number"
                value={config.benefits.freeShippingThreshold || ""}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    benefits: {
                      ...config.benefits,
                      freeShippingThreshold: e.target.value
                        ? parseFloat(e.target.value)
                        : null,
                    },
                  })
                }
                placeholder="200"
                className="w-32"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>הנחת יום הולדת</Label>
                <p className="text-sm text-gray-500">הנחה אוטומטית ביום ההולדת</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={config.benefits.birthdayDiscount?.enabled || false}
                  onCheckedChange={(checked) =>
                    setConfig({
                      ...config,
                      benefits: {
                        ...config.benefits,
                        birthdayDiscount: {
                          enabled: checked,
                          value: config.benefits.birthdayDiscount?.value || 20,
                          type: config.benefits.birthdayDiscount?.type || "PERCENTAGE",
                        },
                      },
                    })
                  }
                />
                {config.benefits.birthdayDiscount?.enabled && (
                  <div className="flex items-center gap-2">
                    <Select
                      value={config.benefits.birthdayDiscount.type}
                      onValueChange={(value: "PERCENTAGE" | "FIXED") =>
                        setConfig({
                          ...config,
                          benefits: {
                            ...config.benefits,
                            birthdayDiscount: {
                              ...config.benefits.birthdayDiscount!,
                              type: value,
                            },
                          },
                        })
                      }
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PERCENTAGE">אחוז</SelectItem>
                        <SelectItem value="FIXED">סכום</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      value={config.benefits.birthdayDiscount.value}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          benefits: {
                            ...config.benefits,
                            birthdayDiscount: {
                              ...config.benefits.birthdayDiscount!,
                              value: parseFloat(e.target.value) || 0,
                            },
                          },
                        })
                      }
                      className="w-24"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>גישה מוקדמת למבצעים</Label>
                <p className="text-sm text-gray-500">גישה למבצעים לפני כולם</p>
              </div>
              <Switch
                checked={config.benefits.earlyAccessToSales || false}
                onCheckedChange={(checked) =>
                  setConfig({
                    ...config,
                    benefits: {
                      ...config.benefits,
                      earlyAccessToSales: checked,
                    },
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>מוצרים בלעדיים</Label>
                <p className="text-sm text-gray-500">גישה למוצרים בלעדיים</p>
              </div>
              <Switch
                checked={config.benefits.exclusiveProductsAccess || false}
                onCheckedChange={(checked) =>
                  setConfig({
                    ...config,
                    benefits: {
                      ...config.benefits,
                      exclusiveProductsAccess: checked,
                    },
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>תמיכה VIP</Label>
                <p className="text-sm text-gray-500">שירות לקוחות מועדף</p>
              </div>
              <Switch
                checked={config.benefits.vipSupport || false}
                onCheckedChange={(checked) =>
                  setConfig({
                    ...config,
                    benefits: {
                      ...config.benefits,
                      vipSupport: checked,
                    },
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>מתנה חודשית</Label>
                <p className="text-sm text-gray-500">מתנה חודשית לרמות גבוהות</p>
              </div>
              <Switch
                checked={(config.benefits as any)?.monthlyGift || false}
                onCheckedChange={(checked) =>
                  setConfig({
                    ...config,
                    benefits: {
                      ...config.benefits,
                      monthlyGift: checked,
                    },
                  })
                }
              />
            </div>

            {/* הנחת יום הולדת */}
            <div className="border-t pt-4 mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>הנחת יום הולדת</Label>
                  <p className="text-sm text-gray-500">הנחה אוטומטית ביום ההולדת</p>
                </div>
                <Switch
                  checked={config.benefits?.birthdayDiscount?.enabled || false}
                  onCheckedChange={(checked) =>
                    setConfig({
                      ...config,
                      benefits: {
                        ...config.benefits,
                        birthdayDiscount: {
                          ...(config.benefits?.birthdayDiscount || {}),
                          enabled: checked,
                          type: config.benefits?.birthdayDiscount?.type || 'PERCENTAGE',
                          value: config.benefits?.birthdayDiscount?.value || 10,
                        },
                      },
                    })
                  }
                />
              </div>
              
              {config.benefits?.birthdayDiscount?.enabled && (
                <div className="grid grid-cols-2 gap-4 pl-4 border-r-2 border-gray-200">
                  <div>
                    <Label>סוג הנחה</Label>
                    <Select
                      value={config.benefits.birthdayDiscount.type || 'PERCENTAGE'}
                      onValueChange={(value) =>
                        setConfig({
                          ...config,
                          benefits: {
                            ...config.benefits,
                            birthdayDiscount: {
                              ...config.benefits.birthdayDiscount,
                              type: value as 'PERCENTAGE' | 'FIXED',
                              enabled: config.benefits.birthdayDiscount?.enabled ?? true,
                              value: config.benefits.birthdayDiscount?.value ?? 0,
                            },
                          },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PERCENTAGE">אחוז</SelectItem>
                        <SelectItem value="FIXED">סכום קבוע</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>
                      {config.benefits.birthdayDiscount.type === 'PERCENTAGE' ? 'אחוז הנחה' : 'סכום הנחה'}
                    </Label>
                    <Input
                      type="number"
                      value={config.benefits.birthdayDiscount.value || 10}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          benefits: {
                            ...config.benefits,
                            birthdayDiscount: {
                              ...config.benefits.birthdayDiscount,
                              value: parseFloat(e.target.value) || 0,
                              enabled: config.benefits.birthdayDiscount?.enabled ?? true,
                              type: config.benefits.birthdayDiscount?.type || 'PERCENTAGE',
                            },
                          },
                        })
                      }
                      min="0"
                      max={config.benefits.birthdayDiscount.type === 'PERCENTAGE' ? '100' : undefined}
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>התראות</CardTitle>
            <CardDescription>הגדר איך להודיע ללקוחות על שינויים ברמה</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>אימייל עלייה ברמה</Label>
                <p className="text-sm text-gray-500">שלח אימייל כשהלקוח עולה ברמה</p>
              </div>
              <Switch
                checked={config.notifications.tierUpgradeEmail}
                onCheckedChange={(checked) =>
                  setConfig({
                    ...config,
                    notifications: {
                      ...config.notifications,
                      tierUpgradeEmail: checked,
                    },
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>SMS עלייה ברמה</Label>
                <p className="text-sm text-gray-500">שלח SMS כשהלקוח עולה ברמה</p>
              </div>
              <Switch
                checked={config.notifications.tierUpgradeSMS}
                onCheckedChange={(checked) =>
                  setConfig({
                    ...config,
                    notifications: {
                      ...config.notifications,
                      tierUpgradeSMS: checked,
                    },
                  })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Tier Dialog */}
        <Dialog open={tierDialogOpen} onOpenChange={setTierDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTier ? "ערוך רמה" : "הוסף רמה חדשה"}
              </DialogTitle>
              <DialogDescription>
                הגדר את כל הפרטים של הרמה: שם, דרישות, הנחות והטבות
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tier-slug">זיהוי (slug) *</Label>
                  <Input
                    id="tier-slug"
                    value={tierForm.slug}
                    onChange={(e) =>
                      setTierForm({ ...tierForm, slug: e.target.value.toLowerCase() })
                    }
                    placeholder="silver"
                    disabled={!!editingTier}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    זיהוי ייחודי (לא ניתן לשנות אחרי יצירה)
                  </p>
                </div>
                <div>
                  <Label htmlFor="tier-name">שם רמה *</Label>
                  <Input
                    id="tier-name"
                    value={tierForm.name}
                    onChange={(e) => setTierForm({ ...tierForm, name: e.target.value })}
                    placeholder="כסף"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tier-color">צבע</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id="tier-color"
                      type="color"
                      value={tierForm.color}
                      onChange={(e) => setTierForm({ ...tierForm, color: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      value={tierForm.color}
                      onChange={(e) => setTierForm({ ...tierForm, color: e.target.value })}
                      placeholder="#C0C0C0"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="tier-priority">עדיפות</Label>
                  <Input
                    id="tier-priority"
                    type="number"
                    value={tierForm.priority}
                    onChange={(e) =>
                      setTierForm({ ...tierForm, priority: parseInt(e.target.value) || 1 })
                    }
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    מספר נמוך יותר = רמה גבוהה יותר
                  </p>
                </div>
              </div>

              {/* Requirements */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">דרישות לרמה</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tier-min-spent">סכום מינימלי (₪)</Label>
                    <Input
                      id="tier-min-spent"
                      type="number"
                      value={tierForm.minSpent || ""}
                      onChange={(e) =>
                        setTierForm({
                          ...tierForm,
                          minSpent: e.target.value ? parseFloat(e.target.value) : null,
                        })
                      }
                      placeholder="500"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tier-min-orders">מספר הזמנות מינימלי</Label>
                    <Input
                      id="tier-min-orders"
                      type="number"
                      value={tierForm.minOrders || ""}
                      onChange={(e) =>
                        setTierForm({
                          ...tierForm,
                          minOrders: e.target.value ? parseInt(e.target.value) : null,
                        })
                      }
                      placeholder="3"
                      className="mt-1"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  ניתן להגדיר סכום או מספר הזמנות (או שניהם)
                </p>
              </div>

              {/* Discount */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">הנחה</h3>
                <div className="flex items-center gap-2 mb-2">
                  <Switch
                    checked={!!tierForm.discount}
                    onCheckedChange={(checked) =>
                      setTierForm({
                        ...tierForm,
                        discount: checked
                          ? { type: "PERCENTAGE", value: 5 }
                          : null,
                      })
                    }
                  />
                  <Label>הפעל הנחה לרמה זו</Label>
                </div>
                {tierForm.discount && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>סוג הנחה</Label>
                      <Select
                        value={tierForm.discount.type}
                        onValueChange={(value: "PERCENTAGE" | "FIXED") =>
                          setTierForm({
                            ...tierForm,
                            discount: {
                              ...tierForm.discount!,
                              type: value,
                            },
                          })
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PERCENTAGE">אחוז</SelectItem>
                          <SelectItem value="FIXED">סכום קבוע</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>
                        {tierForm.discount.type === "PERCENTAGE" ? "אחוז הנחה" : "סכום הנחה (₪)"}
                      </Label>
                      <Input
                        type="number"
                        value={tierForm.discount.value}
                        onChange={(e) =>
                          setTierForm({
                            ...tierForm,
                            discount: {
                              ...tierForm.discount!,
                              value: parseFloat(e.target.value) || 0,
                            },
                          })
                        }
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Benefits */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">הטבות</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>משלוח חינם</Label>
                    <Switch
                      checked={tierForm.benefits.freeShipping || false}
                      onCheckedChange={(checked) =>
                        setTierForm({
                          ...tierForm,
                          benefits: { ...tierForm.benefits, freeShipping: checked },
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>גישה מוקדמת למבצעים</Label>
                    <Switch
                      checked={tierForm.benefits.earlyAccess || false}
                      onCheckedChange={(checked) =>
                        setTierForm({
                          ...tierForm,
                          benefits: { ...tierForm.benefits, earlyAccess: checked },
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>מוצרים בלעדיים</Label>
                    <Switch
                      checked={tierForm.benefits.exclusiveProducts || false}
                      onCheckedChange={(checked) =>
                        setTierForm({
                          ...tierForm,
                          benefits: { ...tierForm.benefits, exclusiveProducts: checked },
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>מתנת יום הולדת</Label>
                    <Switch
                      checked={tierForm.benefits.birthdayGift || false}
                      onCheckedChange={(checked) =>
                        setTierForm({
                          ...tierForm,
                          benefits: { ...tierForm.benefits, birthdayGift: checked },
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>מתנה חודשית</Label>
                      <p className="text-xs text-gray-500">מתנה חודשית לרמה זו</p>
                    </div>
                    <Switch
                      checked={(tierForm.benefits as any)?.monthlyGift?.enabled || false}
                      onCheckedChange={(checked) =>
                        setTierForm({
                          ...tierForm,
                          benefits: {
                            ...tierForm.benefits,
                            ...((tierForm.benefits as any).monthlyGift ? {
                              monthlyGift: {
                                ...((tierForm.benefits as any)?.monthlyGift || {}),
                                enabled: checked,
                                type: (tierForm.benefits as any)?.monthlyGift?.type || 'DISCOUNT_CODE',
                                value: (tierForm.benefits as any)?.monthlyGift?.value || 10,
                                discountType: (tierForm.benefits as any)?.monthlyGift?.discountType || 'PERCENTAGE',
                              },
                            } : {}),
                          } as any,
                        })
                      }
                    />
                  </div>
                  {(tierForm.benefits as any)?.monthlyGift?.enabled && (
                    <div className="grid grid-cols-2 gap-4 pl-4 border-r-2 border-gray-200">
                      <div>
                        <Label>סוג מתנה</Label>
                        <Select
                          value={(tierForm.benefits as any)?.monthlyGift.type || 'DISCOUNT_CODE'}
                          onValueChange={(value) =>
                            setTierForm({
                              ...tierForm,
                              benefits: {
                                ...tierForm.benefits,
                                monthlyGift: {
                                  ...(tierForm.benefits as any)?.monthlyGift,
                                  type: value as 'DISCOUNT_CODE' | 'FREE_PRODUCT' | 'STORE_CREDIT',
                                },
                              } as any,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DISCOUNT_CODE">קוד הנחה</SelectItem>
                            <SelectItem value="FREE_PRODUCT">מוצר חינם</SelectItem>
                            <SelectItem value="STORE_CREDIT">קרדיט בחנות</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {(tierForm.benefits as any)?.monthlyGift.type === 'DISCOUNT_CODE' && (
                        <>
                          <div>
                            <Label>סוג הנחה</Label>
                            <Select
                              value={(tierForm.benefits as any)?.monthlyGift.discountType || 'PERCENTAGE'}
                              onValueChange={(value) =>
                                setTierForm({
                                  ...tierForm,
                                  benefits: {
                                    ...tierForm.benefits,
                                    monthlyGift: {
                                      ...(tierForm.benefits as any)?.monthlyGift,
                                      discountType: value as 'PERCENTAGE' | 'FIXED',
                                    },
                                  } as any,
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="PERCENTAGE">אחוז</SelectItem>
                                <SelectItem value="FIXED">סכום קבוע</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>
                              {(tierForm.benefits as any)?.monthlyGift.discountType === 'PERCENTAGE' ? 'אחוז הנחה' : 'סכום הנחה'}
                            </Label>
                            <Input
                              type="number"
                              value={(tierForm.benefits as any)?.monthlyGift.value || 10}
                              onChange={(e) =>
                                setTierForm({
                                  ...tierForm,
                                  benefits: {
                                    ...tierForm.benefits,
                                    monthlyGift: {
                                      ...(tierForm.benefits as any)?.monthlyGift,
                                      value: parseFloat(e.target.value) || 0,
                                    },
                                  } as any,
                                })
                              }
                              min="0"
                              max={(tierForm.benefits as any)?.monthlyGift.discountType === 'PERCENTAGE' ? '100' : undefined}
                            />
                          </div>
                        </>
                      )}
                      {(tierForm.benefits as any)?.monthlyGift.type === 'STORE_CREDIT' && (
                        <div>
                          <Label>סכום קרדיט (₪)</Label>
                          <Input
                            type="number"
                            value={(tierForm.benefits as any)?.monthlyGift.value || 50}
                            onChange={(e) =>
                              setTierForm({
                                ...tierForm,
                                benefits: {
                                  ...tierForm.benefits,
                                  monthlyGift: {
                                    ...(tierForm.benefits as any)?.monthlyGift,
                                    value: parseFloat(e.target.value) || 0,
                                  },
                                } as any,
                              })
                            }
                            min="0"
                          />
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>צבירת נקודות</Label>
                      <p className="text-xs text-gray-500">צבירת נקודות על רכישות</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={!!tierForm.benefits.pointsMultiplier}
                        onCheckedChange={(checked) =>
                          setTierForm({
                            ...tierForm,
                            benefits: {
                              ...tierForm.benefits,
                              pointsMultiplier: checked ? 1.2 : null,
                            },
                          })
                        }
                      />
                      {tierForm.benefits.pointsMultiplier && (
                        <Input
                          type="number"
                          step="0.1"
                          value={tierForm.benefits.pointsMultiplier}
                          onChange={(e) =>
                            setTierForm({
                              ...tierForm,
                              benefits: {
                                ...tierForm.benefits,
                                pointsMultiplier: parseFloat(e.target.value) || 1,
                              },
                            })
                          }
                          className="w-24"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setTierDialogOpen(false)}>
                <X className="w-4 h-4 ml-2" />
                ביטול
              </Button>
              <Button onClick={handleSaveTier} className="prodify-gradient text-white">
                <Save className="w-4 h-4 ml-2" />
                שמור רמה
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  )
}

