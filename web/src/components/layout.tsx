import { Link, Outlet, useLocation } from 'react-router'
import { useAuth } from '@/hooks/use-auth'
import { ChevronDown } from 'lucide-react'

function DollarIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-primary"
    >
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}

export function Layout() {
  const { user, signOut } = useAuth()
  const location = useLocation()

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/transactions', label: 'Transactions' },
    { path: '/import', label: 'Import' },
    { path: '/settings', label: 'Settings' },
  ]

  // Get user initials for avatar
  const userInitials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : 'U'

  const userName = user?.email
    ? user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1)
    : 'User'

  return (
    <div className="min-h-screen flex flex-col">
      {/* Dark Header */}
      <header className="bg-secondary text-white sticky top-0 z-50 shadow-md">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <DollarIcon />
            <span className="font-heading font-bold text-2xl tracking-tight text-white">
              Haushaltsbuch
            </span>
          </div>

          {/* Navigation */}
          <nav>
            <ul className="flex gap-8">
              {navItems.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`text-[15px] font-medium py-2 transition-all border-b-2 ${
                      location.pathname === item.path
                        ? 'text-primary border-primary'
                        : 'text-[#a3a3a3] border-transparent hover:text-primary hover:border-primary'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* User Menu */}
          <div className="flex items-center gap-4 pl-8 border-l border-white/10">
            <button
              onClick={signOut}
              className="flex items-center gap-2 text-[#a3a3a3] text-sm font-semibold hover:text-white transition-colors"
            >
              {userName}
              <ChevronDown size={16} />
            </button>
            <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm border-2 border-white/20">
              {userInitials}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
