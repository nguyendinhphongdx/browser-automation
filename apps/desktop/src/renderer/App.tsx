import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProfilesPage } from './pages/profiles/ProfilesPage'
import { AutomationPage } from './pages/automation/AutomationPage'
import { ResourcesPage } from './pages/resources/ResourcesPage'
import { MarketplacePage } from './pages/marketplace/MarketplacePage'
import { SettingsPage } from './pages/settings/SettingsPage'

export function App() {
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
        </Routes>
      </Layout>
    </HashRouter>
  )
}
