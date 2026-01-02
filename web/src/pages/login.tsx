import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'

// Validate redirect path to prevent open redirect attacks
function isValidRedirect(path: string): boolean {
  if (!path.startsWith('/')) return false
  if (path.startsWith('//')) return false
  if (path.match(/^[/\\]*[a-z]+:/i)) return false
  return true
}

// Sanitize Supabase errors to avoid exposing system info
function sanitizeAuthError(message: string): string {
  if (message.includes('Invalid login credentials')) {
    return 'Invalid email or password'
  }
  if (message.includes('Email not confirmed')) {
    return 'Please confirm your email address'
  }
  if (message.includes('rate limit')) {
    return 'Too many attempts. Please try again later.'
  }
  if (message.includes('already registered')) {
    return 'An account with this email already exists'
  }
  return 'Unable to sign in. Please try again.'
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  // Validate and sanitize redirect path
  const requestedPath = location.state?.from?.pathname || '/'
  const redirectTo = isValidRedirect(requestedPath) ? requestedPath : '/'

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate(redirectTo, { replace: true })
    }
  }, [user, navigate, redirectTo])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(sanitizeAuthError(error.message))
      setLoading(false)
    } else {
      navigate(redirectTo, { replace: true })
    }
  }

  if (user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{isSignUp ? 'Create Account' : 'Login'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Login'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-primary underline"
            >
              {isSignUp ? 'Login' : 'Sign Up'}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
