"use client"

import React, { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Landmark, Terminal, Lock, Mail, ArrowRight, ShieldCheck, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import Link from "next/link"
import { AuthShowcase } from "@/components/AuthShowcase"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      toast.success("ACCESS GRANTED: Session Initialized")
      router.push('/')
      router.refresh()
    } catch (error: any) {
      toast.error(`ACCESS DENIED: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-[100dvh] w-full grid grid-cols-1 lg:grid-cols-12 bg-background relative overflow-x-hidden">
      {/* Background scanline effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-foreground/[0.02] to-transparent h-64 w-full animate-[scan_6s_linear_infinite] pointer-events-none" />
      
      {/* Left Side: Auth Form */}
      <div className="lg:col-span-5 flex items-center justify-center p-6 sm:p-12 min-h-[100dvh] lg:min-h-0 relative z-10 border-r border-border/40 bg-background/95">
        <div className="w-full max-w-md space-y-8 my-auto py-4">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-foreground flex items-center justify-center ledger-border rotate-45 group">
              <Landmark className="h-8 w-8 text-background -rotate-45" />
            </div>
            <div className="space-y-1">
              <h1 className="text-4xl font-bold tracking-[0.2em] uppercase leading-none">LEGER_OS</h1>
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Mainframe Authentication Required</p>
            </div>
          </div>

          <Card className="rounded-none border-border ledger-border bg-card shadow-2xl">
            <CardHeader className="border-b border-border pb-6">
              <div className="flex items-center gap-2 technical-label">
                <Terminal className="h-3.5 w-3.5" />
                <span>Login node // Initializing</span>
              </div>
            </CardHeader>
            <CardContent className="pt-8">
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="technical-label opacity-80">System Email</Label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="name@mainframe.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-10 rounded-none border-border/80 bg-secondary/20 focus:bg-background focus:border-foreground focus:ring-0 h-11 font-mono text-base sm:text-xs transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                     <Label htmlFor="password" title="password" className="technical-label opacity-80">Security Key</Label>
                     <Link href="#" className="text-[9px] font-mono uppercase text-muted-foreground hover:text-foreground underline decoration-dashed">Key Recovery</Link>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                    <Input 
                      id="password" 
                      type="password" 
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pl-10 rounded-none border-border/80 bg-secondary/20 focus:bg-background focus:border-foreground focus:ring-0 h-11 font-mono text-base sm:text-xs transition-all"
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full h-11 rounded-none bg-foreground text-background hover:bg-foreground/90 uppercase text-[10px] font-bold tracking-[0.2em] gap-2 active:scale-[0.98] transition-all mt-2"
                >
                  {isLoading ? "AUTHENTICATING..." : (
                    <>
                      Initialize Session <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-8 pt-6 border-t border-border/50 text-center space-y-4">
                 <p className="text-[10px] font-mono text-muted-foreground uppercase">Unregistered Hardware detected?</p>
                 <Link 
                   href="/signup" 
                   className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:text-foreground transition-colors group"
                 >
                   Create Mainframe ID <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                 </Link>
              </div>
            </CardContent>
          </Card>

          {/* Mobile-only Security Assurance Bar */}
          <div className="lg:hidden grid grid-cols-3 gap-0 border border-border/80 bg-card/50 divide-x divide-border/80 text-[9px] sm:text-[10px] text-muted-foreground font-bold tracking-wider text-center">
            <div className="p-2.5 flex items-center justify-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
              <span className="truncate">Bank-Grade</span>
            </div>
            <div className="p-2.5 flex items-center justify-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
              <span className="truncate">256-Bit</span>
            </div>
            <div className="p-2.5 flex items-center justify-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
              <span className="truncate">Cloud Sync</span>
            </div>
          </div>

          <div className="flex justify-between items-center px-4 opacity-30 italic font-mono text-[8px] uppercase tracking-tighter">
             <span>Sys_Build: 1.0.4.A</span>
             <span>Node: US_EAST_01</span>
             <span>Status: SECURE</span>
          </div>
        </div>
      </div>

      {/* Right Side: Telemetry Showcase */}
      <div className="hidden lg:flex lg:col-span-7 bg-secondary/15 relative z-10 items-center justify-center p-8 lg:p-14 overflow-y-auto">
        <AuthShowcase />
      </div>
    </main>
  )
}

