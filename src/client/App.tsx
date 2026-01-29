import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { UserProvider } from './context/UserContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Wallet from './pages/Wallet'
import Team from './pages/Team'
import Profile from './pages/Profile'
import MyBets from './pages/MyBets'
import Transactions from './pages/Transactions'
import Certificates from './pages/Certificates'
import Admin from './pages/Admin'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <UserProvider>
      <Toaster richColors position="top-center" />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin" element={<Admin />} />
          
          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
             <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="my-bets" element={<MyBets />} />
                <Route path="transactions" element={<Transactions />} />
                <Route path="wallet" element={<Wallet />} />
                <Route path="team" element={<Team />} />
                <Route path="profile" element={<Profile />} />
                <Route path="certificates" element={<Certificates />} />
             </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </UserProvider>
  )
}

export default App
