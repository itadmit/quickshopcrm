"use client"

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  side?: "left" | "right"
  className?: string
}

const Sheet = ({ open, onOpenChange, children, side = "right", className }: SheetProps) => {
  const [isMounted, setIsMounted] = React.useState(false)
  const [isAnimating, setIsAnimating] = React.useState(false)
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  React.useEffect(() => {
    if (open) {
      // Clear any pending timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      setIsMounted(true)
      // Start animation after mount
      setTimeout(() => {
        setIsAnimating(true)
      }, 10)
      document.body.style.overflow = "hidden"
    } else {
      setIsAnimating(false)
      document.body.style.overflow = ""
      // Delay unmounting to allow animation to complete
      timeoutRef.current = setTimeout(() => {
        setIsMounted(false)
        timeoutRef.current = null
      }, 300)
    }
    return () => {
      document.body.style.overflow = ""
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [open])

  if (!open && !isMounted) return null

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          "fixed z-40 bg-black/10 backdrop-blur-sm transition-opacity duration-300",
          open && isAnimating ? "opacity-100" : "opacity-0"
        )}
        onClick={() => onOpenChange(false)}
        style={{
          top: '40px',
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />
      {/* Sheet */}
      <div
        className={cn(
          "fixed z-40 w-full max-w-lg bg-white shadow-xl transition-all duration-300 ease-out",
          side === "right" ? "right-0" : "left-0",
          open && isAnimating
            ? "translate-x-0 opacity-100" 
            : side === "right" 
              ? "translate-x-full opacity-0" 
              : "-translate-x-full opacity-0",
          className
        )}
        dir="rtl"
        style={{
          top: '40px',
          height: 'calc(100vh - 40px)',
        }}
      >
        {children}
      </div>
    </>
  )
}

const SheetContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    onClose?: () => void
  }
>(({ className, children, onClose, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex h-full flex-col", className)}
    {...props}
  >
    {onClose && (
      <button
        onClick={onClose}
        className="absolute left-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
      >
        <X className="h-4 w-4" />
        <span className="sr-only">סגור</span>
      </button>
    )}
    {children}
  </div>
))
SheetContent.displayName = "SheetContent"

const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col space-y-2 text-right sm:text-right p-6 border-b", className)}
    {...props}
  />
)
SheetHeader.displayName = "SheetHeader"

const SheetTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn("text-lg font-semibold text-gray-900", className)}
    {...props}
  />
))
SheetTitle.displayName = "SheetTitle"

const SheetDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-gray-500", className)}
    {...props}
  />
))
SheetDescription.displayName = "SheetDescription"

const SheetBody = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex-1 overflow-y-auto p-6", className)}
    {...props}
  />
)
SheetBody.displayName = "SheetBody"

const SheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 px-6 pt-6 pb-10 border-t", className)}
    {...props}
  />
)
SheetFooter.displayName = "SheetFooter"

export {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
}

