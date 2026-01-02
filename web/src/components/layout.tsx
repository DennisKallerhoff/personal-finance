import { Link, Outlet, useLocation } from 'react-router'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'

export function Layout() {
  const { signOut } = useAuth()
  const location = useLocation()

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/transactions', label: 'Transactions' },
    { path: '/import', label: 'Import' },
    { path: '/settings', label: 'Settings' },
  ]

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <span className="font-semibold">Haushaltsbuch</span>
            <div className="flex gap-4">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`text-sm ${
                    location.pathname === item.path
                      ? 'text-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            Logout
          </Button>
        </div>
      </nav>
      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
