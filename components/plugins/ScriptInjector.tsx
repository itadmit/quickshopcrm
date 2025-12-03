"use client"

import { useEffect } from "react"

interface ScriptPlugin {
  id: string
  slug: string
  scriptUrl?: string | null
  scriptContent?: string | null
  injectLocation?: "HEAD" | "BODY_START" | "BODY_END" | null
  config?: any
  isActive: boolean
}

interface ScriptInjectorProps {
  shopId?: string
  companyId?: string
  location: "HEAD" | "BODY_START" | "BODY_END"
}

export function ScriptInjector({ shopId, companyId, location }: ScriptInjectorProps) {
  useEffect(() => {
    const loadScripts = async () => {
      try {
        const params = new URLSearchParams()
        if (shopId) {
          params.append("shopId", shopId)
        }
        if (companyId) {
          params.append("companyId", companyId)
        }

        const response = await fetch(`/api/plugins/active?${params}`)
        if (!response.ok) return

        const plugins: ScriptPlugin[] = await response.json()

        // סינון רק תוספי SCRIPT שפעילים ומותקנים
        const scriptPlugins = plugins.filter(
          (plugin) =>
            plugin.isActive &&
            (plugin.scriptUrl || plugin.scriptContent) &&
            plugin.injectLocation === location
        )

        // הזרקת כל הסקריפטים
        scriptPlugins.forEach((plugin: any) => {
          if (plugin.scriptUrl) {
            // טעינת סקריפט חיצוני
            const script = document.createElement("script")
            script.src = plugin.scriptUrl
            script.async = true
            script.defer = true

            // הוספת config אם יש
            if (plugin.config) {
              script.setAttribute("data-config", JSON.stringify(plugin.config))
            }

            // בדיקה שהסקריפט לא כבר קיים
            const existingScript = document.querySelector(
              `script[src="${plugin.scriptUrl}"]`
            )
            if (!existingScript) {
              document[location === "HEAD" ? "head" : "body"].appendChild(script)
            }
          } else if (plugin.scriptContent) {
            // הזרקת סקריפט inline
            // החלפת משתנים בתבנית (אם יש)
            let processedContent = plugin.scriptContent

            if (plugin.config) {
              // החלפת משתנים בתבנית
              Object.keys(plugin.config).forEach((key: any) => {
                const value = plugin.config[key]
                processedContent = processedContent.replace(
                  new RegExp(`{{${key}}}`, "g"),
                  String(value)
                )
              })
            }

            // יצירת script tag
            const script = document.createElement("script")
            script.textContent = processedContent
            script.setAttribute("data-plugin-id", plugin.id)
            script.setAttribute("data-plugin-slug", plugin.slug)

            // בדיקה שהסקריפט לא כבר קיים
            const existingScript = document.querySelector(
              `script[data-plugin-id="${plugin.id}"]`
            )
            if (!existingScript) {
              document[location === "HEAD" ? "head" : "body"].appendChild(script)
            }
          }
        })
      } catch (error) {
        console.error("Error loading plugin scripts:", error)
      }
    }

    loadScripts()

    // ניקוי בעת unmount
    return () => {
      // הסרת סקריפטים שהוזרקו (רק inline scripts)
      const injectedScripts = document.querySelectorAll(
        `script[data-plugin-id]`
      )
      injectedScripts.forEach((script: any) => {
        if (script.parentNode) {
          script.parentNode.removeChild(script)
        }
      })
    }
  }, [shopId, companyId, location])

  return null // Component זה לא מציג כלום
}

