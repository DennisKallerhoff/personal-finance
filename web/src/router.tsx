import { createBrowserRouter, Navigate } from 'react-router'
import { ProtectedRoute } from '@/components/protected-route'
import { Layout } from '@/components/layout'
import Login from '@/pages/login'
import Home from '@/pages/home'
import Transactions from '@/pages/transactions'
import Import from '@/pages/import'
import Settings from '@/pages/settings'

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
          { path: '/', element: <Home /> },
          { path: '/transactions', element: <Transactions /> },
          { path: '/import', element: <Import /> },
          { path: '/settings', element: <Settings /> },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])
