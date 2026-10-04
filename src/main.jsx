import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import './melo.css'
import Melophobia from './Melophobia.jsx'

function LegacyRoomRedirect() {
  const { code } = useParams()
  return <Navigate to={`/room/${code}`} replace />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Legacy /melophobia routes smoothly redirected to professional root paths */}
        <Route path="/melophobia" element={<Navigate to="/" replace />} />
        <Route path="/melophobia/create" element={<Navigate to="/create" replace />} />
        <Route path="/melophobia/:code" element={<LegacyRoomRedirect />} />

        {/* Primary App Handler */}
        <Route path="/*" element={<Melophobia />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
