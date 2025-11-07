"use client"

import { useEffect, useState, createContext, useContext } from "react"
import {
  sendFacebookPixelEvent,
  sendGTMEvent,
  sendGAEvent,
  sendTikTokPixelEvent,
} from "@/lib/tracking-pixels"

interface TrackingPixel {
  id: string
  platform: string
  pixelId: string
  accessToken: string | null
  isActive: boolean
  events: string[]
}

interface TrackingContextType {
  trackEvent: (eventName: string, data?: any) => void
  pixels: TrackingPixel[]
}

const TrackingContext = createContext<TrackingContextType>({
  trackEvent: () => {},
  pixels: [],
})

export function useTracking() {
  return useContext(TrackingContext)
}

export function TrackingPixelProvider({
  children,
  shopSlug,
}: {
  children: React.ReactNode
  shopSlug: string
}) {
  const [pixels, setPixels] = useState<TrackingPixel[]>([])

  useEffect(() => {
    fetchPixels()
  }, [shopSlug])

  const fetchPixels = async () => {
    try {
      const response = await fetch(`/api/storefront/${shopSlug}/tracking-pixels`)
      if (response.ok) {
        const data = await response.json()
        setPixels(data)
        
        // טעינת כל הפיקסלים
        data.forEach((pixel: TrackingPixel) => {
          if (pixel.isActive) {
            loadPixel(pixel)
          }
        })
      }
    } catch (error) {
      console.error("Error fetching tracking pixels:", error)
    }
  }

  const loadPixel = (pixel: TrackingPixel) => {
    if (typeof window === "undefined") return

    switch (pixel.platform) {
      case "FACEBOOK":
        if (!(window as any).fbq) {
          loadFacebookPixel(pixel.pixelId)
        }
        break
      case "GOOGLE_TAG_MANAGER":
        if (!(window as any).dataLayer) {
          loadGTM(pixel.pixelId)
        }
        break
      case "GOOGLE_ANALYTICS":
        if (!(window as any).gtag) {
          loadGoogleAnalytics(pixel.pixelId)
        }
        break
      case "TIKTOK":
        if (!(window as any).ttq) {
          loadTikTokPixel(pixel.pixelId)
        }
        break
    }
  }

  const trackEvent = (eventName: string, data: any = {}) => {
    if (typeof window === "undefined") return

    // בדיקה אם יש פיקסלים עם access tokens (server-side tracking)
    const hasServerSidePixels = pixels.some(
      (pixel) =>
        pixel.isActive &&
        (pixel.platform === "FACEBOOK" ||
          pixel.platform === "GOOGLE_ANALYTICS" ||
          pixel.platform === "TIKTOK") &&
        pixel.accessToken
    )

    if (hasServerSidePixels) {
      // שליחה דרך endpoint מרכזי בשרת (קריאה אחת לכל הפלטפורמות)
      // שליחה async בלי לחכות לתשובה כדי לא לחסום את הקוד
      fetch(`/api/storefront/${shopSlug}/tracking-pixels/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event: eventName,
          data: {
            shop_slug: shopSlug,
            ...data,
          },
        }),
      })
        .then(async (response) => {
          if (!response.ok) {
            console.error("Error sending tracking event to server")
            // Fallback לשליחה ישירה מהדפדפן
            sendClientSideEvents(eventName, data)
          } else {
            const result = await response.json()
            // לוג לדיבוג (רק בפיתוח)
            if (process.env.NODE_ENV === "development") {
              console.log(`[Tracking] Event sent via server: ${eventName}`, result)
            }
            // אם יש פיקסלים בלי access token, נשלח אותם client-side
            if (result.shouldSendClientSide) {
              sendClientSideEvents(eventName, data, true) // true = רק פיקסלים בלי access token
            }
          }
        })
        .catch((error) => {
          console.error("Error sending tracking event:", error)
          // Fallback לשליחה ישירה מהדפדפן
          sendClientSideEvents(eventName, data)
        })
    } else {
      // שליחה ישירה מהדפדפן (client-side) - רק אם אין server-side tracking
      sendClientSideEvents(eventName, data)
    }
  }

  const sendClientSideEvents = (eventName: string, data: any = {}, onlyWithoutToken: boolean = false) => {
    // שליחה לכל הפיקסלים הפעילים ישירות מהדפדפן
    pixels.forEach((pixel) => {
      if (!pixel.isActive) return

      // אם onlyWithoutToken = true, נשלח רק לפיקסלים בלי access token
      if (onlyWithoutToken) {
        // GTM תמיד נשלח client-side
        if (pixel.platform === "GOOGLE_TAG_MANAGER") {
          // נמשיך לשליחה
        } else if (pixel.accessToken) {
          // יש access token, כבר נשלח דרך השרת
          return
        }
      }

      // בדיקה אם האירוע נכלל ברשימה (אם ריק = כל האירועים)
      if (pixel.events.length > 0 && !pixel.events.includes(eventName)) {
        return
      }

      const eventData = {
        event: eventName,
        shop_slug: shopSlug,
        ...data,
      }

      switch (pixel.platform) {
        case "FACEBOOK":
          sendFacebookPixelEvent(pixel.pixelId, eventData, pixel.accessToken || undefined)
          break
        case "GOOGLE_TAG_MANAGER":
          sendGTMEvent(pixel.pixelId, eventData)
          break
        case "GOOGLE_ANALYTICS":
          sendGAEvent(pixel.pixelId, eventData, pixel.accessToken || undefined)
          break
        case "TIKTOK":
          sendTikTokPixelEvent(pixel.pixelId, eventData, pixel.accessToken || undefined)
          break
      }
    })

    // לוג לדיבוג (רק בפיתוח)
    if (process.env.NODE_ENV === "development") {
      console.log(`[Tracking] Event sent via client: ${eventName}`, data)
    }
  }

  return (
    <TrackingContext.Provider value={{ trackEvent, pixels }}>
      {children}
    </TrackingContext.Provider>
  )
}

// פונקציות עזר לטעינת פיקסלים
function loadFacebookPixel(pixelId: string) {
  if (typeof window === "undefined") return
  const script = document.createElement("script")
  script.innerHTML = `
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${pixelId}');
    fbq('track', 'PageView');
  `
  document.head.appendChild(script)
}

function loadGTM(containerId: string) {
  if (typeof window === "undefined") return
  const script = document.createElement("script")
  script.innerHTML = `
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','${containerId}');
  `
  document.head.appendChild(script)
  if (!(window as any).dataLayer) {
    ;(window as any).dataLayer = []
  }
}

function loadGoogleAnalytics(measurementId: string) {
  if (typeof window === "undefined") return
  const script1 = document.createElement("script")
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
  script1.async = true
  document.head.appendChild(script1)

  const script2 = document.createElement("script")
  script2.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${measurementId}');
  `
  document.head.appendChild(script2)
}

function loadTikTokPixel(pixelId: string) {
  if (typeof window === "undefined") return
  const script = document.createElement("script")
  script.innerHTML = `
    !function (w, d, t) {
      w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
      ttq.load('${pixelId}');
      ttq.page();
    }(window, document, 'ttq');
  `
  document.head.appendChild(script)
}

