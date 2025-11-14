import { useToast as useOriginalToast } from "@/components/ui/use-toast"

/**
 * Hook מותאם אישית לטוסטים אופטימיים
 * כל הטוסטים יוגבלו ל-2 שניות כברירת מחדל
 */
export function useOptimisticToast() {
  const { toast: originalToast, ...rest } = useOriginalToast()

  const toast = (props: Parameters<typeof originalToast>[0]) => {
    return originalToast({
      ...props,
      duration: props.duration ?? 2000, // ברירת מחדל 2 שניות
    })
  }

  return { toast, ...rest }
}

