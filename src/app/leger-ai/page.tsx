import { createClient } from "@/lib/supabase-server"
import { Brain } from "lucide-react"
import { ClientTrigger } from "./ClientTrigger"

export const dynamic = "force-dynamic"

export default async function LegerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  return (
    <div className="mx-auto max-w-[1500px] p-4 md:p-8 space-y-8 md:space-y-12 pb-24 text-foreground w-full flex flex-col items-center justify-center min-h-[70vh] relative">
      {/* Cyber OS background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(128,128,128,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(128,128,128,0.02)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      <div className="max-w-md w-full border border-border bg-card p-8 md:p-12 text-center space-y-6 shadow-2xl relative rounded-xl overflow-hidden">
        {/* Glowing aura */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-foreground/[0.02] dark:bg-emerald-500/[0.02] blur-2xl rounded-full pointer-events-none" />
        
        <div className="mx-auto w-12 h-12 bg-secondary flex items-center justify-center border border-border rounded-lg relative z-10">
          <Brain className="h-6 w-6 text-foreground animate-pulse" />
        </div>
        
        <div className="space-y-2 relative z-10">
          <h2 className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground">LEGER_AI // Central mainframes</h2>
          <h1 className="text-xl font-bold uppercase tracking-widest text-foreground font-sans">Neural Bridge Upgraded</h1>
        </div>

        <p className="text-xs text-muted-foreground font-sans leading-relaxed relative z-10">
          The Leger AI terminal is now a global, floating assistant node. It is context-aware and accessible from the bottom-right corner of any page.
        </p>

        <ClientTrigger />
      </div>
    </div>
  )
}
