import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router'
import { ProtectedRoute } from '@/components/protected-route'
import { Layout } from '@/components/layout'

// Eager load login (needed for unauthenticated users)
import Login from '@/pages/login'

// Lazy load protected routes for code splitting
const Home = lazy(() => import('@/pages/home'))
const Transactions = lazy(() => import('@/pages/transactions'))
const Import = lazy(() => import('@/pages/import'))
const Settings = lazy(() => import('@/pages/settings'))

function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <Layout />,
        children: [
          {
            path: '/',
            element: (
              <Suspense fallback={<PageLoader />}>
                <Home />
              </Suspense>
            ),
          },
          {
            path: '/transactions',
            element: (
              <Suspense fallback={<PageLoader />}>
                <Transactions />
              </Suspense>
            ),
          },
          {
            path: '/import',
            element: (
              <Suspense fallback={<PageLoader />}>
                <Import />
              </Suspense>
            ),
          },
          {
            path: '/settings',
            element: (
              <Suspense fallback={<PageLoader />}>
                <Settings />
              </Suspense>
            ),
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])
