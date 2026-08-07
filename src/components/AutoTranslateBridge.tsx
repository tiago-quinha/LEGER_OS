"use client"

import { useEffect } from "react"
import { useSystem } from "@/lib/SystemContext"

declare global {
  interface Window {
    googleTranslateElementInit?: () => void
    google?: any
  }
}

export function AutoTranslateBridge() {
  const { language } = useSystem()

  // Target 2-letter lang code: 'pt', 'es', 'de', 'fr', 'en'
  const targetLang = (language || "en-US").split("-")[0].toLowerCase()

  useEffect(() => {
    // 1. Inject hidden Google Translate container if missing
    if (!document.getElementById("google_translate_element")) {
      const div = document.createElement("div")
      div.id = "google_translate_element"
      div.style.display = "none"
      document.body.appendChild(div)
    }

    // 2. Hide Google Translate top banner & toolbar styling with global CSS
    if (!document.getElementById("gt-override-style")) {
      const style = document.createElement("style")
      style.id = "gt-override-style"
      style.innerHTML = `
        .goog-te-banner-frame { display: none !important; }
        .goog-te-balloon-frame { display: none !important; }
        #goog-gt-tt { display: none !important; visibility: hidden !important; }
        body { top: 0px !important; position: static !important; }
        .goog-text-highlight { background-color: transparent !important; box-shadow: none !important; }
        font { background-color: transparent !important; box-shadow: none !important; }
      `
      document.head.appendChild(style)
    }

    // 3. Define global init callback
    window.googleTranslateElementInit = () => {
      if (window.google && window.google.translate) {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "en",
            includedLanguages: "en,pt,es,de,fr,it",
            autoDisplay: false,
            layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
          },
          "google_translate_element"
        )
      }
    }

    // 4. Load Google Translate script if not loaded
    if (!document.getElementById("google-translate-script")) {
      const script = document.createElement("script")
      script.id = "google-translate-script"
      script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
      script.async = true
      document.body.appendChild(script)
    }

    // 5. Function to set Google Translate cookie and trigger translation
    const triggerTranslation = (langCode: string) => {
      const currentCookie = document.cookie
        .split("; ")
        .find((row) => row.startsWith("googtrans="))

      const targetCookieVal = `/en/${langCode}`

      // Set cookie for Google Translate
      document.cookie = `googtrans=${targetCookieVal}; path=/; domain=${window.location.hostname}`
      document.cookie = `googtrans=${targetCookieVal}; path=/`

      // Programmatically change select element if initialized
      const selectEl = document.querySelector(".goog-te-combo") as HTMLSelectElement | null
      if (selectEl) {
        selectEl.value = langCode
        selectEl.dispatchEvent(new Event("change"))
      }
    }

    if (targetLang && targetLang !== "en") {
      const timer = setTimeout(() => {
        triggerTranslation(targetLang)
      }, 800)
      return () => clearTimeout(timer)
    } else if (targetLang === "en") {
      // Revert to English
      document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}`
      const selectEl = document.querySelector(".goog-te-combo") as HTMLSelectElement | null
      if (selectEl) {
        selectEl.value = "en"
        selectEl.dispatchEvent(new Event("change"))
      }
    }
  }, [targetLang])

  return null
}
