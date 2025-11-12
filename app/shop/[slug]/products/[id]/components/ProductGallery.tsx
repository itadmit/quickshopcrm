"use client"

import { Package, ChevronLeft, ChevronRight } from "lucide-react"
import { Product, GalleryLayout } from "../types"

interface ProductGalleryProps {
  product: Product
  selectedImage: number
  onImageSelect: (index: number) => void
  galleryLayout: GalleryLayout
  theme: any
}

export function ProductGallery({
  product,
  selectedImage,
  onImageSelect,
  galleryLayout,
  theme,
}: ProductGalleryProps) {
  const getAspectRatioClass = () => {
    const ratio = theme?.productImageRatio || "9:16"
    switch (ratio) {
      case "1:1":
        return "aspect-square"
      case "3:4":
        return "aspect-[3/4]"
      case "9:16":
        return "aspect-[9/16]"
      default:
        return "aspect-square"
    }
  }

  const getImageBorderRadius = () => {
    const radius = theme?.productImageBorderRadius || 8
    return `${radius}px`
  }

  const getDiscountBadgeColor = () => {
    const color = theme?.productDiscountBadgeColor || "red"
    const colorMap: Record<string, string> = {
      red: "bg-red-500",
      green: "bg-green-500",
      blue: "bg-blue-500",
      orange: "bg-orange-500",
      black: "bg-black",
      white: "bg-white text-black",
      transparent: "bg-transparent",
    }
    return colorMap[color] || colorMap.red
  }

  const getGalleryArrowColor = () => {
    const color = theme?.productGalleryArrowsColor || "white"
    return color === "white" ? "text-white" : "text-black"
  }

  if (!product || !product.images || product.images.length === 0) {
    return (
      <div className={`${getAspectRatioClass()} bg-gray-100 rounded-lg flex items-center justify-center`} style={{ borderRadius: getImageBorderRadius() }}>
        <Package className="w-32 h-32 text-gray-400" />
      </div>
    )
  }

  const borderRadius = getImageBorderRadius()
  const showArrows = theme?.productShowGalleryArrows !== false
  const arrowColor = getGalleryArrowColor()

  switch (galleryLayout) {
    case "standard":
      return (
        <div className="space-y-4">
          <div className={`${getAspectRatioClass()} overflow-hidden bg-gray-100 relative`} style={{ borderRadius }}>
            <img
              src={product.images[selectedImage]}
              alt={product.seoTitle || product.name}
              className="w-full h-full object-cover"
            />
            {theme?.productShowDiscountBadge && product.comparePrice && product.comparePrice > product.price && (
              <div className={`absolute top-2 right-2 ${getDiscountBadgeColor()} px-2 py-1 text-xs font-bold ${theme?.productDiscountBadgeRounded ? 'rounded' : ''}`}>
                {Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)}%
              </div>
            )}
            {product.images.length > 1 && showArrows && (
              <>
                <button
                  onClick={() => onImageSelect(selectedImage > 0 ? selectedImage - 1 : product.images.length - 1)}
                  className={`absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 rounded-full p-2 ${arrowColor} transition-all`}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => onImageSelect(selectedImage < product.images.length - 1 ? selectedImage + 1 : 0)}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 rounded-full p-2 ${arrowColor} transition-all`}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
          {product.images.length > 1 && (theme?.productShowMobileThumbs !== false || (typeof window !== 'undefined' && window.innerWidth >= 1024)) && (
            <div className="grid grid-cols-4 gap-2">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => onImageSelect(index)}
                  className={`${getAspectRatioClass()} overflow-hidden border-2 transition-all`}
                  style={{
                    borderRadius,
                    borderColor: selectedImage === index ? theme.primaryColor : "#e5e7eb",
                  }}
                >
                  <img
                    src={image}
                    alt={`${product.seoTitle || product.name} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )

    case "right-side":
      return (
        <div className="flex gap-4">
          <div className="flex-1">
            <div className={`${getAspectRatioClass()} overflow-hidden bg-gray-100 relative`} style={{ borderRadius }}>
              <img
                src={product.images[selectedImage]}
                alt={product.seoTitle || product.name}
                className="w-full h-full object-cover"
              />
              {theme?.productShowDiscountBadge && product.comparePrice && product.comparePrice > product.price && (
                <div className={`absolute top-2 right-2 ${getDiscountBadgeColor()} px-2 py-1 text-xs font-bold ${theme?.productDiscountBadgeRounded ? 'rounded' : ''}`}>
                  {Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)}%
                </div>
              )}
            </div>
          </div>
          {product.images.length > 1 && (
            <div className="flex flex-col gap-2 w-20">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => onImageSelect(index)}
                  className={`${getAspectRatioClass()} overflow-hidden border-2 transition-all`}
                  style={{
                    borderRadius,
                    borderColor: selectedImage === index ? theme.primaryColor : "#e5e7eb",
                  }}
                >
                  <img
                    src={image}
                    alt={`${product.seoTitle || product.name} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )

    case "left-side":
      return (
        <div className="flex gap-4">
          {product.images.length > 1 && (
            <div className="flex flex-col gap-2 w-20">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => onImageSelect(index)}
                  className={`${getAspectRatioClass()} overflow-hidden border-2 transition-all`}
                  style={{
                    borderRadius,
                    borderColor: selectedImage === index ? theme.primaryColor : "#e5e7eb",
                  }}
                >
                  <img
                    src={image}
                    alt={`${product.seoTitle || product.name} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
          <div className="flex-1">
            <div className={`${getAspectRatioClass()} overflow-hidden bg-gray-100 relative`} style={{ borderRadius }}>
              <img
                src={product.images[selectedImage]}
                alt={product.seoTitle || product.name}
                className="w-full h-full object-cover"
              />
              {theme?.productShowDiscountBadge && product.comparePrice && product.comparePrice > product.price && (
                <div className={`absolute top-2 right-2 ${getDiscountBadgeColor()} px-2 py-1 text-xs font-bold ${theme?.productDiscountBadgeRounded ? 'rounded' : ''}`}>
                  {Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)}%
                </div>
              )}
            </div>
          </div>
        </div>
      )

    case "masonry":
      return (
        <>
          <div className="hidden lg:block space-y-2">
            {product.images.map((image, index) => {
              const isLarge = index % 3 === 0
              if (isLarge) {
                return (
                  <div key={index} className="w-full">
                    <div className={`${getAspectRatioClass()} overflow-hidden bg-gray-100`} style={{ borderRadius }}>
                      <img
                        src={image}
                        alt={`${product.seoTitle || product.name} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )
              } else {
                const groupIndex = Math.floor((index - 1) / 3)
                const positionInGroup = (index - 1) % 3
                if (positionInGroup === 0) {
                  const nextImage = product.images[index + 1]
                  return (
                    <div key={index} className="grid grid-cols-2 gap-2">
                      <div className={`${getAspectRatioClass()} overflow-hidden bg-gray-100`} style={{ borderRadius }}>
                        <img
                          src={image}
                          alt={`${product.seoTitle || product.name} ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {nextImage && (
                        <div className={`${getAspectRatioClass()} overflow-hidden bg-gray-100`} style={{ borderRadius }}>
                          <img
                            src={nextImage}
                            alt={`${product.seoTitle || product.name} ${index + 2}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  )
                }
                return null
              }
            })}
          </div>
          <div className="lg:hidden flex overflow-x-auto snap-x snap-mandatory scrollbar-hide bg-white -mx-4 px-4">
            {product.images.map((image, index) => (
              <div 
                key={index} 
                className="flex-shrink-0 snap-center"
                style={{ 
                  width: 'calc(100vw - 2rem - 5px)',
                  marginRight: index < product.images.length - 1 ? '5px' : '0'
                }}
              >
                <div className={`${getAspectRatioClass()} overflow-hidden bg-gray-100`} style={{ borderRadius }}>
                  <img
                    src={image}
                    alt={`${product.seoTitle || product.name} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )

    case "fixed":
      return (
        <>
          <div className="hidden lg:block space-y-4">
            {product.images.map((image, index) => (
              <div key={index} className={`${getAspectRatioClass()} overflow-hidden bg-gray-100`} style={{ borderRadius }}>
                <img
                  src={image}
                  alt={`${product.seoTitle || product.name} ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
          <div className="lg:hidden flex overflow-x-auto snap-x snap-mandatory scrollbar-hide">
            {product.images.map((image, index) => (
              <div key={index} className="flex-shrink-0 w-full snap-center">
                <div className={`${getAspectRatioClass()} overflow-hidden bg-gray-100`} style={{ borderRadius }}>
                  <img
                    src={image}
                    alt={`${product.seoTitle || product.name} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )

    default:
      return null
  }
}

