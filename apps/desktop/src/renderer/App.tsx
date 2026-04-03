import { useEffect, useState } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Onboarding } from './components/Onboarding'
import { ProfilesPage } from './pages/profiles/ProfilesPage'
import { AutomationPage } from './pages/automation/AutomationPage'
import { ResourcesPage } from './pages/resources/ResourcesPage'
import { MarketplacePage } from './pages/marketplace/MarketplacePage'
import { SettingsPage } from './pages/settings/SettingsPage'
import { AuthPage } from './pages/auth/AuthPage'

export function App() {
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Kiểm tra đã xem onboarding chưa
    window.api.getSetting('onboarding.completed').then((val) => {
      if (!val) {
        setShowOnboarding(true)
      }
      setReady(true)
    }).catch(() => setReady(true))
  }, [])

  const handleOnboardingComplete = () => {
    window.api.setSetting('onboarding.completed', 'true')
    setShowOnboarding(false)
  }

  if (!ready) return null

  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />
  }

  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/profiles" replace />} />
          <Route path="/profiles" element={<ProfilesPage />} />
          <Route path="/automation" element={<AutomationPage />} />
          <Route path="/resources" element={<ResourcesPage />} />
          <Route path="/marketplace" element={<MarketplacePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/account" element={<AuthPage />} />
        </Routes>
      </Layout>
    </HashRouter>
  )
}
