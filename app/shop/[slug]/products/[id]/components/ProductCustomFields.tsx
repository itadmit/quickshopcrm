"use client"

import { Card } from "@/components/ui/card"

interface CustomFieldValue {
  id: string
  value: string | null
  definition: {
    label: string
    type: string
    namespace: string
    key: string
  }
}

interface ProductCustomFieldsProps {
  customFieldValues?: CustomFieldValue[]
}

export function ProductCustomFields({ customFieldValues }: ProductCustomFieldsProps) {
  if (!customFieldValues || customFieldValues.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">פרטים נוספים</h3>
      <div className="space-y-3">
        {customFieldValues.map((field) => {
          if (!field.value) return null
          
          return (
            <div key={field.id} className="border-b border-gray-100 pb-3 last:border-0">
              <dt className="text-sm font-medium text-gray-600 mb-1">
                {field.definition.label}
              </dt>
              <dd className="text-base text-gray-900">
                {field.definition.type === 'CHECKBOX' ? (
                  field.value === 'true' ? '✓ כן' : '✗ לא'
                ) : field.definition.type === 'URL' ? (
                  <a 
                    href={field.value} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {field.value}
                  </a>
                ) : field.definition.type === 'COLOR' ? (
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-6 h-6 rounded border border-gray-300"
                      style={{ backgroundColor: field.value }}
                    />
                    <span>{field.value}</span>
                  </div>
                ) : field.definition.type === 'RICH_TEXT' ? (
                  <div 
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: field.value }}
                  />
                ) : (
                  <span className="whitespace-pre-wrap">{field.value}</span>
                )}
              </dd>
            </div>
          )
        })}
      </div>
    </div>
  )
}

