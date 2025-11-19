"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface AutocompleteOption {
  value: string
  label: string
}

interface AutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSelect?: (option: AutocompleteOption) => void
  options: AutocompleteOption[]
  loading?: boolean
  placeholder?: string
  className?: string
  disabled?: boolean
  required?: boolean
  id?: string
}

export function Autocomplete({
  value,
  onChange,
  onSelect,
  options,
  loading = false,
  placeholder,
  className,
  disabled,
  required,
  id,
}: AutocompleteProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [highlightedIndex, setHighlightedIndex] = React.useState(0)
  const [isFocused, setIsFocused] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // סגירת הרשימה כשלוחצים מחוץ לקומפוננטה
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setIsFocused(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // פתיחת הרשימה רק כשיש פוקוס ואופציות
  React.useEffect(() => {
    if (isFocused && options.length > 0 && value.length > 1) {
      setIsOpen(true)
      setHighlightedIndex(0)
    } else if (!isFocused) {
      setIsOpen(false)
    }
  }, [options, value, isFocused])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
    setIsFocused(true)
  }

  const handleOptionClick = (option: AutocompleteOption) => {
    onChange(option.value)
    onSelect?.(option)
    setIsOpen(false)
    setIsFocused(false)
    inputRef.current?.blur()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || options.length === 0) return

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setHighlightedIndex((prev) => (prev + 1) % options.length)
        break
      case "ArrowUp":
        e.preventDefault()
        setHighlightedIndex((prev) => (prev - 1 + options.length) % options.length)
        break
      case "Enter":
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < options.length) {
          handleOptionClick(options[highlightedIndex])
        }
        break
      case "Escape":
        setIsOpen(false)
        break
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <Input
        ref={inputRef}
        id={id}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
        required={required}
        autoComplete="off"
      />
      
      {loading && (
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
        </div>
      )}

      {isOpen && options.length > 0 && !loading && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {options.map((option, index) => (
            <div
              key={option.value}
              className={cn(
                "px-4 py-2 cursor-pointer transition-colors",
                index === highlightedIndex
                  ? "bg-gray-100"
                  : "hover:bg-gray-50"
              )}
              onMouseDown={(e) => {
                e.preventDefault() // מונע blur מה-input
                handleOptionClick(option)
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

