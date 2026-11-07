import { useEffect } from "react"
import {
  BrowserRouter,
  Route,
  Routes,
  useLocation,
} from "react-router-dom"

import { Layout } from "@/components/Layout"
import { EventDetailPage } from "@/pages/EventDetailPage"
import { EventsPage } from "@/pages/EventsPage"
import { LandingPage } from "@/pages/LandingPage"
import { LoginPage } from "@/pages/LoginPage"
import { NotFoundPage } from "@/pages/NotFoundPage"
import { OrganizerPage } from "@/pages/OrganizerPage"
import { SignupPage } from "@/pages/SignupPage"

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])

  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Layout>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/:id" element={<EventDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/organizer" element={<OrganizerPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
