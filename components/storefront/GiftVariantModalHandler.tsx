"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { GiftProductModal } from "./GiftProductModal"
import { useCart } from "@/hooks/useCart"

interface GiftVariantModalHandlerProps {
  customerId?: string | null
  onCartOpen?: () => void
}

export function GiftVariantModalHandler({ customerId, onCartOpen }: GiftVariantModalHandlerProps) {
  const params = useParams()
  const slug = params.slug as string
  const [giftProduct, setGiftProduct] = useState<any>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [giftDiscountId, setGiftDiscountId] = useState<string | null>(null)
  const [giftTitle, setGiftTitle] = useState<string>("קבלת מתנה")
  const { refetch } = useCart(slug, customerId)

  useEffect(() => {
    const handleOpenGiftVariantModal = async (event: CustomEvent) => {
      const { productId, discountId, title } = event.detail
      
      try {
        // טעינת המוצר המתנה מה-API
        const response = await fetch(`/api/storefront/${slug}/products/${productId}`)
        if (!response.ok) {
          throw new Error('Failed to load gift product')
        }
        
        const product = await response.json()
        setGiftProduct(product)
        setGiftDiscountId(discountId)
        if (title) setGiftTitle(title)
        setIsOpen(true)
      } catch (error) {
        console.error('Error loading gift product:', error)
      }
    }

    window.addEventListener('openGiftVariantModal', handleOpenGiftVariantModal as EventListener)

    return () => {
      window.removeEventListener('openGiftVariantModal', handleOpenGiftVariantModal as EventListener)
    }
  }, [slug])

  const handleSuccess = async () => {
    // רענון העגלה
    await refetch()
    
    // סגירת המודל
    setIsOpen(false)
    setGiftProduct(null)
    setGiftDiscountId(null)
    setGiftTitle("קבלת מתנה")

    // פתיחת עגלה אם צריך
    if (onCartOpen) {
      setTimeout(() => {
        onCartOpen()
      }, 300)
    }
  }

  if (!giftProduct || !giftDiscountId) return null

  return (
    <GiftProductModal
      isOpen={isOpen}
      onClose={() => {
        setIsOpen(false)
        setGiftProduct(null)
        setGiftDiscountId(null)
        setGiftTitle("קבלת מתנה")
      }}
      product={giftProduct}
      slug={slug}
      customerId={customerId}
      onSuccess={handleSuccess}
      autoOpenCart={false}
      onCartOpen={onCartOpen}
      giftDiscountId={giftDiscountId}
      giftTitle={giftTitle}
    />
  )
}

