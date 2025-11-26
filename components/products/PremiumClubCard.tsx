"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Crown } from "lucide-react"

interface PremiumClubCardProps {
  exclusiveToTier?: string[]
  onExclusiveToTierChange?: (tiers: string[]) => void
  shopId: string
}

export function PremiumClubCard({
  exclusiveToTier = [],
  onExclusiveToTierChange,
  shopId,
}: PremiumClubCardProps) {
  const [availableTiers, setAvailableTiers] = useState<Array<{ slug: string; name: string }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTiers()
  }, [shopId])

  const fetchTiers = async () => {
    if (!shopId) {
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`/api/plugins/premium-club/config?shopId=${shopId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.config?.tiers) {
          setAvailableTiers(
            data.config.tiers.map((tier: any) => ({
              slug: tier.slug,
              name: tier.name,
            }))
          )
        }
      }
    } catch (error) {
      console.error("Error fetching tiers:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleTierToggle = (tierSlug: string, checked: boolean) => {
    if (!onExclusiveToTierChange) return
    
    if (checked) {
      onExclusiveToTierChange([...exclusiveToTier, tierSlug])
    } else {
      onExclusiveToTierChange(exclusiveToTier.filter((t) => t !== tierSlug))
    }
  }

  if (loading || availableTiers.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="w-5 h-5" />
          מועדון פרימיום
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>מוצר בלעדי לרמות</Label>
          <p className="text-xs text-gray-500">
            בחר את הרמות שיש להן גישה למוצר זה. אם לא תבחר כלום, המוצר זמין לכולם.
          </p>
          <div className="space-y-2 mt-3">
            {availableTiers.map((tier) => (
              <div key={tier.slug} className="flex items-center gap-2">
                <Checkbox
                  id={`tier-${tier.slug}`}
                  checked={exclusiveToTier.includes(tier.slug)}
                  onCheckedChange={(checked) =>
                    handleTierToggle(tier.slug, checked as boolean)
                  }
                />
                <Label
                  htmlFor={`tier-${tier.slug}`}
                  className="cursor-pointer text-sm"
                >
                  {tier.name}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
