interface CheckoutHeaderProps {
  shopName: string
  shopLogo?: string | null
}

export function CheckoutHeader({ shopName, shopLogo }: CheckoutHeaderProps) {
  return (
    <div className="border-b bg-white">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {shopLogo && (
              <img
                src={shopLogo}
                alt={shopName}
                className="h-10 w-10 object-contain"
              />
            )}
            <h1 className="text-xl font-bold">{shopName}</h1>
          </div>
          <div className="text-sm text-gray-500">תשלום מאובטח</div>
        </div>
      </div>
    </div>
  )
}
