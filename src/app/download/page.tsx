import { Metadata } from "next"
import { DownloadView } from "@/components/DownloadView"

export const metadata: Metadata = {
  title: "Download Android App // LEGER_OS",
  description: "Download the native LEGER_OS Android APK for real-time bank push notification ingestion and autonomous background expense sync.",
}

export default function DownloadPage() {
  return <DownloadView />
}
