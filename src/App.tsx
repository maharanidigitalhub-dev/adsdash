// src/App.tsx
// ─────────────────────────────────────────────────────────────
// Ganti App.tsx lama kamu dengan file ini.
// Pastikan sudah install: npm install react-router-dom
// ─────────────────────────────────────────────────────────────
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { UnauthorizedPage } from './pages/UnauthorizedPage'
import { UserManagementPage } from './pages/UserManagementPage'

// Import halaman dashboard lama kamu di sini, misalnya:
// import { Dashboard } from './pages/Dashboard'

// Placeholder sementara untuk halaman dashboard yang sudah ada
function DashboardPlaceholder() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500 text-sm">
        Ganti komponen ini dengan Dashboard yang sudah ada
      </p>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Root → redirect ke dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Protected: semua role yang sudah login */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPlaceholder />
                {/* Ganti dengan komponen Dashboard asli kamu */}
              </ProtectedRoute>
            }
          />

          {/* Protected: hanya superadmin */}
          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={['superadmin']}>
                <UserManagementPage />
              </ProtectedRoute>
            }
          />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
