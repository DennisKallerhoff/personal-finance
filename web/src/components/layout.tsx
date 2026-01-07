import { Link, Outlet, useLocation } from 'react-router'
import { useAuth } from '@/hooks/use-auth'

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
    { path: '/transactions', label: 'Transactions' },
    { path: '/import', label: 'Import' },
    { path: '/settings', label: 'Settings' },
  ]

  // Get user initials for avatar
  const userInitials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : 'U'

  return (
    <div className="min-h-screen flex flex-col">
      {/* Dark Header */}
      <header className="bg-secondary text-white sticky top-0 z-50 shadow-md">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo - Clickable */}
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <DollarIcon />
            <span className="font-heading font-bold text-2xl tracking-tight text-white">
              Haushaltsbuch
            </span>
          </Link>

          {/* Navigation - Right Aligned */}
          <div className="flex items-center gap-8">
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

            {/* User Avatar - Clickable */}
            <button
              onClick={signOut}
              className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm border-2 border-white/20 hover:border-white/40 hover:scale-105 transition-all cursor-pointer"
              title="Sign Out"
            >
              {userInitials}
            </button>
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
