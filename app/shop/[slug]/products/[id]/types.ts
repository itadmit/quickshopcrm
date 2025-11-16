export type GalleryLayout = "standard" | "right-side" | "left-side" | "masonry" | "fixed"

export interface Product {
  id: string
  name: string
  description: string | null
  price: number
  comparePrice: number | null
  sku?: string | null
  images: string[]
  availability: string
  inventoryQty: number
  seoTitle?: string | null
  seoDescription?: string | null
  variants?: Array<{
    id: string
    name: string
    price: number | null
    sku?: string | null
    inventoryQty: number
    option1Value?: string | null
    option2Value?: string | null
    option3Value?: string | null
  }>
  options?: Array<{
    id: string
    name: string
    values: Array<{ id: string; label: string; metadata?: any }> | string[]
  }>
}

export interface ProductAddon {
  id: string
  name: string
  type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TEXT_INPUT" | "CHECKBOX"
  required: boolean
  values: Array<{
    id: string
    label: string
    price: number
  }>
}

export interface Bundle {
  id: string
  name: string
  description: string | null
  price: number
  comparePrice: number | null
  image: string | null
  isActive: boolean
  products: Array<{
    productId: string
    quantity: number
    position: number
    product: {
      id: string
      name: string
      price: number
      images: string[]
    }
  }>
}

export interface ProductPageClientProps {
  slug: string
  productId: string
  shop: any
  product: Product
  reviews: any[]
  averageRating: number
  totalReviews: number
  relatedProducts: any[]
  galleryLayout: GalleryLayout
  productPageLayout: { elements: any[] } | null
  theme: any
  navigation: any
  isAdmin: boolean
  autoOpenCart: boolean
  productAddons?: any[]
  bundles?: Bundle[]
}

