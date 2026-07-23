import { createClient } from "@/lib/supabase-server"
import { SystemConfigView } from "@/components/SystemConfigView"

export default async function SystemPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  return <SystemConfigView />
}
