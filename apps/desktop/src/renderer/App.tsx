import { useEffect, useState, lazy, Suspense } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Onboarding } from './components/Onboarding'

// Lazy load pages để giảm bundle ban đầu
const ProfilesPage = lazy(() => import('./pages/profiles/ProfilesPage').then(m => ({ default: m.ProfilesPage })))
const AutomationPage = lazy(() => import('./pages/automation/AutomationPage').then(m => ({ default: m.AutomationPage })))
const ResourcesPage = lazy(() => import('./pages/resources/ResourcesPage').then(m => ({ default: m.ResourcesPage })))
const MarketplacePage = lazy(() => import('./pages/marketplace/MarketplacePage').then(m => ({ default: m.MarketplacePage })))
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage').then(m => ({ default: m.SettingsPage })))
const AuthPage = lazy(() => import('./pages/auth/AuthPage').then(m => ({ default: m.AuthPage })))

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
    </div>
  )
}

export function App() {
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    window.api.getSetting('onboarding.completed').then((val) => {
      if (!val) setShowOnboarding(true)
      setReady(true)
    }).catch(() => setReady(true))
  }, [])

  const handleOnboardingComplete = () => {
    window.api.setSetting('onboarding.completed', 'true')
    setShowOnboarding(false)
  }

  if (!ready) return null
  if (showOnboarding) return <Onboarding onComplete={handleOnboardingComplete} />

  return (
    <HashRouter>
      <Layout>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Navigate to="/profiles" replace />} />
            <Route path="/profiles" element={<ProfilesPage />} />
            <Route path="/automation" element={<AutomationPage />} />
            <Route path="/resources" element={<ResourcesPage />} />
            <Route path="/marketplace" element={<MarketplacePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/account" element={<AuthPage />} />
          </Routes>
        </Suspense>
      </Layout>
    </HashRouter>
  )
}
