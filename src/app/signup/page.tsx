"use client"

import React, { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Landmark, Lock, User, Mail, ArrowRight, ShieldCheck, EyeOff } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { AuthShowcase } from "@/components/AuthShowcase"

function GoogleIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  )
}

export default function SignupPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const router = useRouter()

  const handleGoogleSignup = async () => {
    setIsGoogleLoading(true)
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : ""
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback`,
        },
      })
      if (error) throw error
    } catch (error: any) {
      toast.error(error.message || "Failed to initialize Google Sign-Up")
      setIsGoogleLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: fullName
          }
        }
      })

      if (error) throw error

      toast.success("Account created! Welcome to LEGER_OS")
      router.push('/')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to create account")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-[100dvh] w-full grid grid-cols-1 lg:grid-cols-12 bg-background relative overflow-x-hidden">
      {/* Background scanline effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-foreground/[0.02] to-transparent h-64 w-full animate-[scan_6s_linear_infinite] pointer-events-none" />
      
      {/* Left Side: Auth Form */}
      <div className="lg:col-span-5 flex items-center justify-center p-6 sm:p-12 min-h-[100dvh] lg:min-h-[100dvh] relative z-10 border-r border-border/40 bg-background/95">
        <div className="w-full max-w-md space-y-6 my-auto py-4">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-14 h-14 bg-foreground flex items-center justify-center ledger-border rotate-45 group shadow-lg">
              <Landmark className="h-7 w-7 text-background -rotate-45" />
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-[0.2em] uppercase leading-none">LEGER_OS</h1>
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Personal Finance Mainframe</p>
            </div>
          </div>

          <Card className="rounded-none border-border ledger-border bg-card shadow-2xl">
            <CardHeader className="border-b border-border pb-4 pt-5 px-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">
                  Create Your Account
                </span>
                <span className="text-[9px] font-mono uppercase bg-secondary px-2 py-0.5 border border-border text-foreground font-bold">
                  Free Tier Included
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="fullname" className="text-[10px] font-mono uppercase text-muted-foreground font-bold">Full Name</Label>
                  <div className="relative group">
                    <User className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                    <Input 
                      id="fullname" 
                      placeholder="Alex Mercer"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="pl-10 rounded-none border-border/80 bg-secondary/20 focus:bg-background focus:border-foreground focus:ring-0 h-11 font-mono text-base sm:text-xs transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-[10px] font-mono uppercase text-muted-foreground font-bold">Email Address</Label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="name@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-10 rounded-none border-border/80 bg-secondary/20 focus:bg-background focus:border-foreground focus:ring-0 h-11 font-mono text-base sm:text-xs transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" title="password" className="text-[10px] font-mono uppercase text-muted-foreground font-bold">Password</Label>
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
                  disabled={isLoading || isGoogleLoading}
                  className="w-full h-11 rounded-none bg-foreground text-background hover:bg-foreground/90 uppercase text-xs font-bold tracking-widest gap-2 cursor-pointer transition-all mt-1"
                >
                  {isLoading ? "Creating Account..." : (
                    <>
                      Register Workspace <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </Button>
              </form>

              {/* Age Gate & Legal Agreement Notice */}
              <p className="text-[10px] font-mono text-muted-foreground/80 text-center leading-relaxed">
                By registering, you confirm you are at least 18 years old and agree to the{" "}
                <Link href="/terms" className="text-foreground underline hover:text-foreground/80">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-foreground underline hover:text-foreground/80">
                  Privacy Policy
                </Link>.
              </p>

              {/* Clean Line Divider */}
              <div className="h-px bg-border/50" />

              {/* Google 1-Tap OAuth Button */}
              <Button
                type="button"
                onClick={handleGoogleSignup}
                disabled={isGoogleLoading || isLoading}
                className="w-full h-11 rounded-none bg-secondary/50 hover:bg-secondary border border-border text-foreground font-mono text-xs uppercase font-bold tracking-wider cursor-pointer shadow-sm flex items-center justify-center gap-2.5 transition-all hover:border-foreground/50"
              >
                <GoogleIcon />
                <span>{isGoogleLoading ? "Connecting..." : "Sign Up with Google"}</span>
              </Button>

              <div className="pt-2 border-t border-border/40 text-center space-y-1.5">
                 <p className="text-[10px] font-mono text-muted-foreground uppercase">Already have an account?</p>
                 <Link 
                   href="/login" 
                   className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground hover:underline"
                 >
                   Sign In to Account <ArrowRight className="h-3 w-3" />
                 </Link>
              </div>
            </CardContent>
          </Card>

          {/* Real Privacy & Security Guarantees */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-center gap-2 text-[9px] sm:text-[10px] font-mono text-muted-foreground/70 uppercase tracking-wider select-none py-1 text-center">
              <span className="flex items-center gap-1"><Lock className="h-3 w-3 text-muted-foreground/60 shrink-0" /> 256-Bit SSL</span>
              <span className="text-border">·</span>
              <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-muted-foreground/60 shrink-0" /> Zero Bank Passwords</span>
              <span className="text-border">·</span>
              <span className="flex items-center gap-1"><EyeOff className="h-3 w-3 text-muted-foreground/60 shrink-0" /> Private Data</span>
            </div>

            <div className="flex items-center justify-center gap-3 text-[9px] font-mono text-muted-foreground/60 uppercase">
              <Link href="/terms" className="hover:text-foreground underline">Terms</Link>
              <span>·</span>
              <Link href="/privacy" className="hover:text-foreground underline">Privacy</Link>
            </div>
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
