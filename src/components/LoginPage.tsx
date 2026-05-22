'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { LogIn } from 'lucide-react'
import { IntelliGendaLogo } from '@/components/IntelliGendaLogo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useAppStore } from '@/lib/store'

export function LoginPage() {
  const login = useAppStore((s) => s.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleQuickLogin = async (quickEmail: string, quickPassword: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: quickEmail, password: quickPassword }),
      })
      const data = await res.json()
      if (res.ok) {
        login(data.user)
      } else {
        setError(data.error || 'Errore di login')
      }
    } catch {
      setError('Errore di connessione')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Inserisci email e password')
      return
    }
    await handleQuickLogin(email, password)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <IntelliGendaLogo size="xl" showText={false} className="text-stone-900" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">IntelliGenda</h1>
          <p className="text-muted-foreground mt-1">Prenota il tuo appuntamento</p>
        </div>

        {/* Quick login buttons */}
        <Card className="rounded-2xl shadow-sm border-0 shadow-black/5">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full h-12 text-base rounded-xl justify-start gap-3"
                onClick={() => handleQuickLogin('admin@demo.it', 'admin')}
                disabled={loading}
              >
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                  M
                </div>
                <div className="text-left">
                  <div className="font-medium">Accedi come Admin</div>
                  <div className="text-xs text-muted-foreground">Mario Rossi</div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="w-full h-12 text-base rounded-xl justify-start gap-3"
                onClick={() => handleQuickLogin('luca@email.it', 'client')}
                disabled={loading}
              >
                <div className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-sm font-medium">
                  L
                </div>
                <div className="text-left">
                  <div className="font-medium">Accedi come Luca</div>
                  <div className="text-xs text-muted-foreground">Cliente</div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="w-full h-12 text-base rounded-xl justify-start gap-3"
                onClick={() => handleQuickLogin('anna@email.it', 'client')}
                disabled={loading}
              >
                <div className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-sm font-medium">
                  A
                </div>
                <div className="text-left">
                  <div className="font-medium">Accedi come Anna</div>
                  <div className="text-xs text-muted-foreground">Cliente</div>
                </div>
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">oppure</span>
              </div>
            </div>

            {/* Manual login form */}
            <form onSubmit={handleLogin} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@esempio.it"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button
                type="submit"
                className="w-full h-11 rounded-xl"
                disabled={loading}
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="h-4 w-4 mr-2" />
                    Accedi
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
