"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { supabase } from "@/lib/supabase"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Landmark, Lock, User, Mail, ArrowRight, ArrowLeft, ShieldCheck, EyeOff } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { AuthShowcase } from "@/components/AuthShowcase"

const POP_CULTURE_CHARACTERS = [
  { name: "Joseph Cooper", email: "cooper@endurance.space" },
  { name: "Dovahkiin", email: "dragonborn@whiterun.nord" },
  { name: "TARS (Honesty: 90%)", email: "tars@gargantua.ai" },
  { name: "Geralt of Rivia", email: "geralt@kaer-morhen.witcher" },
  { name: "Arthur Morgan", email: "arthur@van-der-linde.gang" },
  { name: "Master Chief", email: "john-117@unsc.fleet" },
  { name: "Neo", email: "thomas.anderson@zion.matrix" },
  { name: "Kratos", email: "ghost.of.sparta@midgard.realm" },
  { name: "Jarl Balgruuf", email: "balgruuf@dragonsreach.gov" },
  { name: "Gandalf the Grey", email: "mithrandir@middle-earth.org" },
  { name: "Johnny Silverhand", email: "samurai@nightcity.io" },
  { name: "Commander Shepard", email: "shepard@normandy.alliance" },
  { name: "Joel Miller", email: "joel@fireflies.outpost" },
  { name: "Ellie Williams", email: "ellie@jackson.safe" },
  { name: "Gordon Freeman", email: "freeman@blackmesa.gov" },
  { name: "Solid Snake", email: "snake@foxhound.unit" },
  { name: "Ezio Auditore", email: "ezio@assassini.firenze" },
  { name: "Maximus Meridius", email: "maximus@rome.gladiator" },
  { name: "Marty McFly", email: "marty@hillvalley.1985" },
  { name: "Bruce Wayne", email: "bruce@wayne-enterprises.com" },
  { name: "Dom Cobb", email: "cobb@inception.extract" },
  { name: "Paarthurnax", email: "paarthurnax@monahven.sky" },
  { name: "John Marston", email: "marston@beechers-hope.rdr" },
  { name: "Dr. Amelia Brand", email: "brand@edmunds-planet.org" },
  { name: "Rick Deckard", email: "deckard@lapd.bladerunner" },
  { name: "Officer K", email: "kd6-3.7@wallace-corp.ai" },
  { name: "Tyler Durden", email: "tyler@paper-street.soap" },
  { name: "Morpheus", email: "morpheus@nebuchadnezzar.ship" },
  { name: "Han Solo", email: "solo@millennium-falcon.hyper" },
  { name: "Obi-Wan Kenobi", email: "kenobi@jedi-high-council.rep" },
  { name: "Luke Skywalker", email: "skywalker@tatooine.moisture" },
  { name: "Ranni the Witch", email: "ranni@carian-manor.moon" },
  { name: "Courier Six", email: "courier@mojave-express.vegas" },
  { name: "Vault Dweller", email: "dweller@vault-101.overseer" },
  { name: "Booker DeWitt", email: "dewitt@columbia.sky" },
  { name: "Andrew Ryan", email: "ryan@rapture.underwater" },
  { name: "Yennefer of Vengerberg", email: "yennefer@vengerberg.lodge" },
  { name: "Ciri of Cintra", email: "zireael@elder-blood.world" },
  { name: "Jules Winnfield", email: "jules@bad-mother.diner" },
  { name: "Vincent Vega", email: "vincent@marcellus-wallace.la" },
  { name: "Aragorn Elessar", email: "strider@gondor.king" },
  { name: "Legolas Greenleaf", email: "legolas@woodland.realm" },
  { name: "Frodo Baggins", email: "frodo@shire.bag-end" },
  { name: "Doc Emmett Brown", email: "doc.brown@flux-capacitor.time" },
  { name: "Tony Stark", email: "stark@avengers.tower" },
  { name: "Big Boss", email: "boss@msf.outer-heaven" },
  { name: "Murph Cooper", email: "murph@quantum-gravity.nasa" },
  { name: "M'aiq the Liar", email: "maiq@tells-the-truth.tamriel" },
  { name: "Isaac Clarke", email: "clarke@usg-ishimura.cec" },
  { name: "Trevor Philips", email: "trevor@industries.blaine" }
]

function getWavePath(y: number, variant: 0 | 1 | 2) {
  if (variant === 1) {
    return `M-350,${y + 15} C-100,${y - 20} 150,${y + 25} 450,${y + 55} C700,${y + 45} 900,${y - 20} 1150,${y - 55} C1350,${y - 45} 1500,${y - 10} 1750,${y + 25} C1950,${y + 15} 2270,${y - 15}`
  }
  if (variant === 2) {
    return `M-350,${y - 10} C-100,${y + 30} 150,${y - 30} 450,${y + 20} C700,${y - 15} 900,${y - 50} 1150,${y - 20} C1350,${y + 25} 1500,${y + 40} 1750,${y - 20} C1950,${y - 30} 2270,${y + 25}`
  }
  return `M-350,${y - 20} C-100,${y - 45} 150,${y + 50} 450,${y + 40} C700,${y + 30} 900,${y - 45} 1150,${y - 40} C1350,${y - 35} 1500,${y + 15} 1750,${y} C1950,${y - 25} 2270,${y + 10}`
}

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

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false)
  
  // Login Form State
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  
  // Sign Up Form State
  const [signUpName, setSignUpName] = useState("")
  const [signUpEmail, setSignUpEmail] = useState("")
  const [signUpPassword, setSignUpPassword] = useState("")

  // Typewriter Placeholder Effect for 50 Pop-Culture Legends (Synchronized Name + Email)
  const [charIndex, setCharIndex] = useState(() => Math.floor(Math.random() * POP_CULTURE_CHARACTERS.length))
  const [nameText, setNameText] = useState("")
  const [emailText, setEmailText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const currentCharacter = POP_CULTURE_CHARACTERS[charIndex]
    const targetName = currentCharacter.name
    const targetEmail = currentCharacter.email

    const speed = isDeleting ? 28 : 60
    const timer = setTimeout(() => {
      if (!isDeleting) {
        const isNameDone = nameText.length >= targetName.length
        const isEmailDone = emailText.length >= targetEmail.length

        if (!isNameDone || !isEmailDone) {
          if (!isNameDone) setNameText(targetName.slice(0, nameText.length + 1))
          if (!isEmailDone) setEmailText(targetEmail.slice(0, emailText.length + 1))
        } else {
          setTimeout(() => setIsDeleting(true), 2400)
        }
      } else {
        const isNameEmpty = nameText.length === 0
        const isEmailEmpty = emailText.length === 0

        if (!isNameEmpty || !isEmailEmpty) {
          if (!isNameEmpty) setNameText(targetName.slice(0, nameText.length - 1))
          if (!isEmailEmpty) setEmailText(targetEmail.slice(0, emailText.length - 1))
        } else {
          setIsDeleting(false)
          // Pick a random next character that is distinct from the current one
          setCharIndex((prev) => {
            let next
            do {
              next = Math.floor(Math.random() * POP_CULTURE_CHARACTERS.length)
            } while (next === prev && POP_CULTURE_CHARACTERS.length > 1)
            return next
          })
        }
      }
    }, speed)

    return () => clearTimeout(timer)
  }, [nameText, emailText, isDeleting, charIndex])

  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const router = useRouter()

  const handleGoogleAuth = async () => {
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
      toast.error(error.message || "Failed to initialize Google Sign-In")
      setIsGoogleLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      })
      if (error) throw error
      toast.success("Welcome back to LEGER_OS")
      window.location.href = '/'
    } catch (error: any) {
      toast.error(error.message || "Invalid credentials")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signUp({
        email: signUpEmail,
        password: signUpPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: signUpName
          }
        }
      })
      if (error) throw error
      toast.success("Account created! Welcome to LEGER_OS")
      window.location.href = '/'
    } catch (error: any) {
      toast.error(error.message || "Failed to create account")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main 
      className="min-h-[100dvh] lg:h-screen lg:max-h-screen w-full grid grid-cols-1 lg:grid-cols-12 bg-[#050507] relative overflow-x-hidden lg:overflow-hidden select-none"
    >
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" viewBox="0 0 1920 1080">
          <defs>
            <linearGradient id="emerald-bright" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(16,185,129,0)" />
              <stop offset="20%" stopColor="rgba(16,185,129,0.5)" />
              <stop offset="50%" stopColor="rgba(52,211,153,0.75)" />
              <stop offset="80%" stopColor="rgba(16,185,129,0.4)" />
              <stop offset="100%" stopColor="rgba(16,185,129,0)" />
            </linearGradient>
            <linearGradient id="emerald-mid" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(16,185,129,0)" />
              <stop offset="25%" stopColor="rgba(52,211,153,0.45)" />
              <stop offset="50%" stopColor="rgba(255,255,255,0.4)" />
              <stop offset="75%" stopColor="rgba(52,211,153,0.4)" />
              <stop offset="100%" stopColor="rgba(16,185,129,0)" />
            </linearGradient>
          </defs>

          {/* Autonomous individual financial wave morphing (peaks and troughs shift organically) */}
          <g>
            {/* Line 1: y~70 — Upper reference line (dashed grid) */}
            <motion.path 
              animate={{ 
                d: [
                  getWavePath(70, 0),
                  getWavePath(70, 1),
                  getWavePath(70, 2),
                  getWavePath(70, 0)
                ] 
              }}
              transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
              fill="none" 
              stroke="rgba(255,255,255,0.18)" 
              strokeWidth="0.8" 
              strokeDasharray="5 5" 
            />

            {/* Line 2: y~210 — Upper-Middle Emerald Green Trajectory (Vibrant Glow) */}
            <motion.path 
              animate={{ 
                d: [
                  getWavePath(210, 1),
                  getWavePath(210, 2),
                  getWavePath(210, 0),
                  getWavePath(210, 1)
                ] 
              }}
              transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
              fill="none" 
              stroke="url(#emerald-bright)" 
              strokeWidth="2.4" 
              className="drop-shadow-[0_0_12px_rgba(16,185,129,0.35)]" 
            />

            {/* Line 3: y~350 — Upper forecast prediction (dashed emerald) */}
            <motion.path 
              animate={{ 
                d: [
                  getWavePath(350, 2),
                  getWavePath(350, 0),
                  getWavePath(350, 1),
                  getWavePath(350, 2)
                ] 
              }}
              transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
              fill="none" 
              stroke="rgba(52,211,153,0.35)" 
              strokeWidth="1" 
              strokeDasharray="4 4" 
            />

            {/* Line 4: y~490 — Mid-upper baseline (dashed grid) */}
            <motion.path 
              animate={{ 
                d: [
                  getWavePath(490, 0),
                  getWavePath(490, 2),
                  getWavePath(490, 1),
                  getWavePath(490, 0)
                ] 
              }}
              transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
              fill="none" 
              stroke="rgba(255,255,255,0.16)" 
              strokeWidth="0.75" 
              strokeDasharray="3 3" 
            />

            {/* Line 5: y~630 — Primary cash flow curve (emerald gradient glow) */}
            <motion.path 
              animate={{ 
                d: [
                  getWavePath(630, 1),
                  getWavePath(630, 0),
                  getWavePath(630, 2),
                  getWavePath(630, 1)
                ] 
              }}
              transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
              fill="none" 
              stroke="url(#emerald-mid)" 
              strokeWidth="2" 
              className="drop-shadow-[0_0_8px_rgba(16,185,129,0.25)]" 
            />

            {/* Line 6: y~770 — Prediction projection line (dashed emerald) */}
            <motion.path 
              animate={{ 
                d: [
                  getWavePath(770, 2),
                  getWavePath(770, 1),
                  getWavePath(770, 0),
                  getWavePath(770, 2)
                ] 
              }}
              transition={{ duration: 17, repeat: Infinity, ease: "easeInOut" }}
              fill="none" 
              stroke="rgba(16,185,129,0.6)" 
              strokeWidth="1.5" 
              strokeDasharray="5 5" 
              className="drop-shadow-[0_0_6px_rgba(16,185,129,0.2)]" 
            />

            {/* Line 7: y~900 — Hero financial trend curve (solid emerald bright glow) */}
            <motion.path 
              animate={{ 
                d: [
                  getWavePath(900, 0),
                  getWavePath(900, 1),
                  getWavePath(900, 2),
                  getWavePath(900, 0)
                ] 
              }}
              transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
              fill="none" 
              stroke="url(#emerald-bright)" 
              strokeWidth="2.8" 
              className="drop-shadow-[0_0_12px_rgba(16,185,129,0.35)]" 
            />

            {/* Line 8: y~990 — Lower prediction baseline (dashed emerald) */}
            <motion.path 
              animate={{ 
                d: [
                  getWavePath(990, 1),
                  getWavePath(990, 2),
                  getWavePath(990, 0),
                  getWavePath(990, 1)
                ] 
              }}
              transition={{ duration: 19, repeat: Infinity, ease: "easeInOut" }}
              fill="none" 
              stroke="rgba(52,211,153,0.38)" 
              strokeWidth="1.2" 
              strokeDasharray="4 4" 
            />
          </g>
        </svg>
      </div>

      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.09)_0%,rgba(255,255,255,0.06)_30%,transparent_75%)] pointer-events-none blur-3xl z-0" />

      <div className="fixed bottom-0 inset-x-0 w-full h-[620px] [perspective:550px] pointer-events-none overflow-hidden flex justify-center z-0">
        <div 
          className="w-[480%] h-full origin-bottom [transform:rotateX(68deg)] bg-[linear-gradient(to_right,rgba(255,255,255,0.24)_1.2px,transparent_1.2px),linear-gradient(to_bottom,rgba(255,255,255,0.24)_1.2px,transparent_1.2px)] bg-[size:48px_48px] [mask-image:linear-gradient(to_top,rgba(0,0,0,1)_0%,rgba(0,0,0,0.85)_25%,rgba(0,0,0,0.5)_50%,rgba(0,0,0,0.2)_70%,rgba(0,0,0,0.06)_85%,transparent_100%)]" 
        />
      </div>

      {/* Left Side: Auth Form (Ultra-Translucent Light Frosted Glass Container) */}
      <div className="lg:col-span-5 flex items-center justify-center p-4 sm:p-6 lg:p-6 xl:p-8 min-h-[100dvh] lg:min-h-0 lg:h-full overflow-y-auto lg:overflow-hidden relative z-10 border-r border-white/[0.08] bg-gradient-to-b from-white/[0.03] via-black/10 to-black/20 backdrop-blur-sm shadow-[15px_0_40px_rgba(0,0,0,0.35)]">
        {/* Crisp Glass Border Highlight */}
        <div className="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-white/15 via-emerald-500/20 to-transparent pointer-events-none" />
        
        {/* Subtle Top Sheen Highlight */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

        {/* Ambient Card Spotlight Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/[0.02] rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="w-full max-w-sm xl:max-w-md space-y-4 sm:space-y-5 my-auto py-2 relative z-10">
          {/* Logo & Mainframe Eyebrow (Prominent Scale) */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-13 h-13 sm:w-14 sm:h-14 bg-foreground flex items-center justify-center ledger-border rotate-45 group shadow-2xl transition-transform hover:rotate-90 duration-500 cursor-default">
              <Landmark className="h-6 w-6 sm:h-7 sm:w-7 text-background -rotate-45 group-hover:-rotate-90 transition-transform duration-500" />
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-[0.25em] uppercase leading-none text-foreground">
                LEGER_OS
              </h1>
              <p className="text-[10px] sm:text-xs font-mono text-muted-foreground uppercase tracking-[0.25em] font-medium">
                Personal Finance Mainframe
              </p>
            </div>
          </div>

          {/* 3D FLIP CARD CONTAINER (Tightened Proportional Dimensions) */}
          <div className="relative w-full h-[390px] [perspective:1200px]">
            <motion.div
              className="relative w-full h-full"
              initial={false}
              animate={{ rotateY: isSignUp ? 180 : 0 }}
              transition={{ duration: 0.55, ease: [0.23, 1, 0.32, 1] }}
              style={{ transformStyle: "preserve-3d" }}
            >
              {/* FRONT FACE: SIGN IN */}
              <div
                className="absolute inset-0 w-full h-full [backface-visibility:hidden] [-webkit-backface-visibility:hidden]"
                style={{ backfaceVisibility: "hidden" }}
              >
                <Card className="rounded-none border-border/80 ledger-border bg-card/80 backdrop-blur-md shadow-2xl p-0 gap-0 h-full flex flex-col justify-between overflow-hidden">
                  <div className="h-10 border-b border-border/80 px-5 flex items-center justify-between m-0 shrink-0 select-none bg-card/40">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">
                      Sign In to Workspace
                    </span>
                    <span className="text-[9px] font-mono uppercase bg-secondary/80 px-2 py-0.5 border border-border/60 text-foreground font-bold">
                      256-Bit SSL
                    </span>
                  </div>
                  
                  <CardContent className="px-5 py-3 flex-1 flex flex-col justify-center gap-0">
                    <form onSubmit={handleLogin} className="space-y-2">
                      <div className="space-y-0.5">
                        <Label htmlFor="login-email" className="text-[10px] font-mono uppercase text-muted-foreground font-bold">Email Address</Label>
                        <div className="relative group">
                          <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                          <Input 
                            id="login-email" 
                            type="email" 
                            placeholder={emailText || " "}
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            required
                            tabIndex={isSignUp ? -1 : 0}
                            className="pl-10 rounded-none border-border/80 bg-secondary/20 focus:bg-background focus:border-foreground focus:ring-0 h-8.5 font-mono text-xs transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex justify-between items-center">
                           <Label htmlFor="login-password" title="password" className="text-[10px] font-mono uppercase text-muted-foreground font-bold">Password</Label>
                           <button 
                             type="button"
                             onClick={async () => {
                               if (!loginEmail) {
                                 toast.info("Please enter your email address first, then click Forgot Password.")
                                 return
                               }
                               try {
                                 const { error } = await supabase.auth.resetPasswordForEmail(loginEmail, {
                                   redirectTo: `${window.location.origin}/auth/confirm?type=recovery`
                                 })
                                 if (error) throw error
                                 toast.success("Password reset instructions sent to your email.")
                               } catch (err: any) {
                                 toast.error(err.message || "Failed to dispatch password reset.")
                               }
                             }}
                             tabIndex={isSignUp ? -1 : 0}
                             className="text-[9px] font-mono uppercase text-muted-foreground hover:text-foreground underline decoration-dashed cursor-pointer"
                           >
                             Forgot Password?
                           </button>
                        </div>
                        <div className="relative group">
                          <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                          <Input 
                            id="login-password" 
                            type="password" 
                            placeholder="••••••••"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            required
                            tabIndex={isSignUp ? -1 : 0}
                            className="pl-10 rounded-none border-border/80 bg-secondary/20 focus:bg-background focus:border-foreground focus:ring-0 h-8.5 font-mono text-xs transition-all"
                          />
                        </div>
                      </div>

                      <Button 
                        type="submit" 
                        disabled={isLoading || isGoogleLoading}
                        tabIndex={isSignUp ? -1 : 0}
                        className="w-full h-8.5 rounded-none bg-foreground text-background hover:bg-foreground/90 uppercase text-xs font-bold tracking-widest gap-2 cursor-pointer transition-all mt-0.5"
                      >
                        {isLoading ? "Signing In..." : (
                          <>
                            Sign In to Account <ArrowRight className="h-3.5 w-3.5" />
                          </>
                        )}
                      </Button>
                    </form>

                    {/* Technical OR Divider - 100% Symmetrical Spacing */}
                    <div className="relative flex items-center justify-center py-2.5 my-0.5">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border/60" />
                      </div>
                      <span className="relative bg-card px-2 text-[9px] uppercase font-mono text-muted-foreground font-bold tracking-widest leading-none select-none">
                        OR
                      </span>
                    </div>

                    {/* Google 1-Tap OAuth Button */}
                    <Button
                      type="button"
                      onClick={handleGoogleAuth}
                      disabled={isGoogleLoading || isLoading}
                      tabIndex={isSignUp ? -1 : 0}
                      className="w-full h-8.5 rounded-none bg-secondary/50 hover:bg-secondary border border-border text-foreground font-mono text-xs uppercase font-bold tracking-wider cursor-pointer shadow-sm flex items-center justify-center gap-2.5 transition-all hover:border-foreground/50"
                    >
                      <GoogleIcon />
                      <span>{isGoogleLoading ? "Connecting..." : "Continue with Google"}</span>
                    </Button>
                  </CardContent>

                  {/* Anchored Footer Bar (Stacked Vertically) */}
                  <div className="py-2 px-5 border-t border-border/50 bg-secondary/15 shrink-0 text-center flex flex-col items-center justify-center space-y-0.5">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase">
                      Don't have an account?
                    </span>
                    <button 
                      type="button"
                      onClick={() => setIsSignUp(true)}
                      tabIndex={isSignUp ? -1 : 0}
                      className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-foreground hover:underline cursor-pointer"
                    >
                      <span>Create Account</span>
                      <ArrowRight className="h-3 w-3 text-emerald-500" />
                    </button>
                  </div>
                </Card>
              </div>

              {/* BACK FACE: SIGN UP */}
              <div
                className="absolute inset-0 w-full h-full [backface-visibility:hidden] [-webkit-backface-visibility:hidden] [transform:rotateY(180deg)]"
                style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
              >
                <Card className="rounded-none border-border ledger-border bg-card shadow-2xl p-0 gap-0 h-full flex flex-col justify-between overflow-hidden">
                  <div className="h-10 border-b border-border px-5 flex items-center justify-between m-0 shrink-0 select-none">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">
                      Create Your Account
                    </span>
                  </div>
                  
                  <CardContent className="px-5 py-3 space-y-2 flex-1 flex flex-col justify-center">
                    <form onSubmit={handleSignUp} className="space-y-1.5">
                      <div className="space-y-0.5">
                        <Label htmlFor="signup-name" className="text-[10px] font-mono uppercase text-muted-foreground font-bold">Full Name</Label>
                        <div className="relative group">
                          <User className="absolute left-3 top-2 h-4 w-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                          <Input 
                            id="signup-name" 
                            placeholder={nameText || " "}
                            value={signUpName}
                            onChange={(e) => setSignUpName(e.target.value)}
                            required
                            tabIndex={!isSignUp ? -1 : 0}
                            className="pl-10 rounded-none border-border/80 bg-secondary/20 focus:bg-background focus:border-foreground focus:ring-0 h-8 font-mono text-xs transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-0.5">
                        <Label htmlFor="signup-email" className="text-[10px] font-mono uppercase text-muted-foreground font-bold">Email Address</Label>
                        <div className="relative group">
                          <Mail className="absolute left-3 top-2 h-4 w-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                          <Input 
                            id="signup-email" 
                            type="email" 
                            placeholder={emailText || " "}
                            value={signUpEmail}
                            onChange={(e) => setSignUpEmail(e.target.value)}
                            required
                            tabIndex={!isSignUp ? -1 : 0}
                            className="pl-10 rounded-none border-border/80 bg-secondary/20 focus:bg-background focus:border-foreground focus:ring-0 h-8 font-mono text-xs transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-0.5">
                        <Label htmlFor="signup-password" title="password" className="text-[10px] font-mono uppercase text-muted-foreground font-bold">Password</Label>
                        <div className="relative group">
                          <Lock className="absolute left-3 top-2 h-4 w-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                          <Input 
                            id="signup-password" 
                            type="password" 
                            placeholder="••••••••"
                            value={signUpPassword}
                            onChange={(e) => setSignUpPassword(e.target.value)}
                            required
                            tabIndex={!isSignUp ? -1 : 0}
                            className="pl-10 rounded-none border-border/80 bg-secondary/20 focus:bg-background focus:border-foreground focus:ring-0 h-8 font-mono text-xs transition-all"
                          />
                        </div>
                      </div>

                      <Button 
                        type="submit" 
                        disabled={isLoading || isGoogleLoading}
                        tabIndex={!isSignUp ? -1 : 0}
                        className="w-full h-8 rounded-none bg-foreground text-background hover:bg-foreground/90 uppercase text-xs font-bold tracking-widest gap-2 cursor-pointer transition-all mt-0.5"
                      >
                        {isLoading ? "Creating Account..." : (
                          <>
                            Register Workspace <ArrowRight className="h-3.5 w-3.5" />
                          </>
                        )}
                      </Button>
                    </form>

                    {/* Google 1-Tap OAuth Button */}
                    <Button
                      type="button"
                      onClick={handleGoogleAuth}
                      disabled={isGoogleLoading || isLoading}
                      tabIndex={!isSignUp ? -1 : 0}
                      className="w-full h-8 rounded-none bg-secondary/50 hover:bg-secondary border border-border text-foreground font-mono text-xs uppercase font-bold tracking-wider cursor-pointer shadow-sm flex items-center justify-center gap-2.5 transition-all hover:border-foreground/50"
                    >
                      <GoogleIcon />
                      <span>{isGoogleLoading ? "Connecting..." : "Sign Up with Google"}</span>
                    </Button>

                    {/* Age Gate & Legal Agreement Notice */}
                    <p className="text-[9px] font-mono text-muted-foreground/75 text-center leading-tight">
                      By registering, you confirm you are 18+ and agree to the{" "}
                      <Link href="/terms" className="text-foreground underline hover:text-foreground/80">
                        Terms
                      </Link>{" "}
                      and{" "}
                      <Link href="/privacy" className="text-foreground underline hover:text-foreground/80">
                        Privacy
                      </Link>.
                    </p>
                  </CardContent>

                  {/* Anchored Footer Bar */}
                  <div className="py-2 px-5 border-t border-border/50 bg-secondary/15 shrink-0 text-center flex items-center justify-center">
                    <button 
                      type="button"
                      onClick={() => setIsSignUp(false)}
                      tabIndex={!isSignUp ? -1 : 0}
                      className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-foreground hover:underline cursor-pointer"
                    >
                      <ArrowLeft className="h-3 w-3 text-emerald-500" />
                      <span>Sign In to Account</span>
                    </button>
                  </div>
                </Card>
              </div>
            </motion.div>
          </div>

          {/* Real Privacy & Security Guarantees */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-center gap-2 text-[9px] sm:text-[10px] font-mono text-muted-foreground/70 uppercase tracking-wider select-none py-0.5 text-center">
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
      <div className="hidden lg:flex lg:col-span-7 bg-transparent relative z-10 items-center justify-center p-4 lg:p-6 xl:p-8 h-full overflow-hidden">
        <AuthShowcase />
      </div>
    </main>
  )
}
