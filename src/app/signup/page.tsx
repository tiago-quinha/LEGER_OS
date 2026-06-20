"use client"

import React, { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Landmark, Terminal, Lock, User, Mail, ArrowRight, UserPlus, Fingerprint } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import Link from "next/link"

export default function SignupPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [fullName, setFullName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      // 1. Auth Sign Up
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            full_name: fullName
          }
        }
      })

      if (error) throw error

      // Profile is now created automatically via the database trigger on_auth_user_created

      toast.success("ID CREATED: Welcome to LEGER_OS")
      router.push('/')
      router.refresh()
    } catch (error: any) {
      toast.error(`REGISTRATION FAILED: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background relative overflow-hidden">
      {/* Background scanline effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-foreground/[0.02] to-transparent h-64 w-full animate-[scan_6s_linear_infinite] pointer-events-none" />
      
      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-foreground flex items-center justify-center ledger-border rotate-45 group">
            <Landmark className="h-8 w-8 text-background -rotate-45" />
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-[0.2em] uppercase leading-none">LEGER_OS</h1>
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Global Node Registration</p>
          </div>
        </div>

        <Card className="rounded-none border-border ledger-border bg-white shadow-2xl">
          <CardHeader className="border-b border-border pb-6">
            <div className="flex items-center gap-2 technical-label">
              <UserPlus className="h-3.5 w-3.5" />
              <span>Registration node // Syncing</span>
            </div>
          </CardHeader>
          <CardContent className="pt-8">
            <form onSubmit={handleSignup} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="technical-label opacity-60">ID Tag</Label>
                    <div className="relative group">
                      <Fingerprint className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                      <Input 
                        id="username" 
                        placeholder="user_v4"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        className="pl-10 rounded-none border-border focus:border-foreground focus:ring-0 h-11 font-mono text-xs"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fullname" className="technical-label opacity-60">Full Name</Label>
                    <div className="relative group">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                      <Input 
                        id="fullname" 
                        placeholder="Legal Name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        className="pl-10 rounded-none border-border focus:border-foreground focus:ring-0 h-11 font-mono text-xs"
                      />
                    </div>
                  </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="technical-label opacity-60">System Email</Label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="name@mainframe.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 rounded-none border-border focus:border-foreground focus:ring-0 h-11 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" title="password" className="technical-label opacity-60">Security Key</Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10 rounded-none border-border focus:border-foreground focus:ring-0 h-11 font-mono text-xs"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full h-12 rounded-none bg-foreground text-background hover:bg-foreground/90 uppercase text-[10px] font-bold tracking-[0.2em] gap-2 mt-4"
              >
                {isLoading ? "GENERATING ID..." : (
                  <>
                    Confirm Registration <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-border/50 text-center space-y-4">
               <p className="text-[10px] font-mono text-muted-foreground uppercase">Already have clearance?</p>
               <Link 
                 href="/login" 
                 className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:text-foreground transition-colors group"
               >
                 Back to Login Node <Terminal className="h-3.5 w-3.5" />
               </Link>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between items-center px-4 opacity-30 italic font-mono text-[8px] uppercase tracking-tighter">
           <span>Terms: ACCEPTED</span>
           <span>Privacy: SECURED</span>
           <span>Connection: ENCRYPTED</span>
        </div>
      </div>
    </div>
  )
}
