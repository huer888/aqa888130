import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { Trophy, Wallet, Users, User, FileText, Bell, ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import Logo from './Logo'
import { useState, useEffect } from 'react'
import api from '../utils/api'
import NotificationModal from './NotificationModal'
import { useUser } from '../context/UserContext'

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, notifications } = useUser()
  const [showNotif, setShowNotif] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const checkAuth = (e?: any, path?: string) => {
      if (!localStorage.getItem('token')) {
          e?.preventDefault()
          navigate('/register')
          return false
      }
      if (path) navigate(path)
      return true
  }

  useEffect(() => {
      if(notifications) {
          const unread = notifications.filter((n: any) => !n.is_read).length
          setUnreadCount(unread)
      }
  }, [notifications])

  const handleOpenNotif = async () => {
      setShowNotif(true)
  }

  const navs = [
    { name: 'Esportes', path: '/', icon: Trophy },
    { name: 'Equipe', path: '/team', icon: Users },
    { name: 'Apostas', path: '/my-bets', icon: FileText },
    { name: 'Carteira', path: '/wallet', icon: Wallet },
    { name: 'Perfil', path: '/profile', icon: User },
  ]

  return (
    <div className="min-h-screen bg-background pb-24 max-w-md mx-auto relative shadow-2xl shadow-black font-sans text-text">
      {/* Header */}
      <header className="bg-[#1a2c38] px-4 py-3 sticky top-0 z-20 flex items-center justify-between border-b border-[#213743]">
        <div className="flex items-center gap-3">
           <Logo size="sm" />
           <div onClick={(e) => checkAuth(e, '/wallet')} className="flex items-center gap-2 bg-[#0f212e] rounded px-3 py-1.5 border border-gray-700 cursor-pointer hover:border-gray-500 transition-colors">
               <span className="text-xs font-bold text-white tracking-wide">{Number(user?.balance || 0).toFixed(2)} <span className="text-primary">R$</span></span>
               <ChevronDown size={12} className="text-textMuted" />
           </div>
        </div>
        
        <div className="flex items-center gap-3">
           <button onClick={(e) => checkAuth(e, '/wallet')} className="bg-[#1475e1] hover:bg-[#1475e1]/90 text-white px-4 py-1.5 rounded font-bold text-xs shadow-lg shadow-blue-900/20 transition-colors">
              Carteira
           </button>
           
           <button onClick={(e) => checkAuth(e) && handleOpenNotif()} className="relative text-textMuted hover:text-white transition-colors p-1">
              <Bell size={20} />
              {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#1a2c38]"></span>
              )}
           </button>
        </div>
      </header>
      
      <main className="p-0">
        <Outlet />
      </main>

      {/* Bottom Nav - Lower z-index than Bet Drawer */}
      <nav className="fixed bottom-0 max-w-md w-full bg-surface border-t border-gray-800 z-40 pb-safe">
           <div className="flex justify-between px-2">
             {navs.map((item) => (
               <button 
                 key={item.path} 
                 onClick={(e) => {
                     if (item.path === '/') navigate('/')
                     else checkAuth(e, item.path)
                 }}
                 className={clsx(
                   "flex flex-col items-center py-3 px-2 flex-1 transition-colors relative",
                   location.pathname === item.path ? "text-white" : "text-[#b1bad3] hover:text-white"
                 )}
               >
                 {location.pathname === item.path && (
                     <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-white rounded-b-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
                 )}
                 <item.icon size={20} strokeWidth={2.5} />
                 <span className="text-[10px] mt-1.5 font-bold tracking-wide">{item.name}</span>
               </button>
             ))}
           </div>
      </nav>

      <NotificationModal isOpen={showNotif} onClose={() => setShowNotif(false)} />
    </div>
  )
}
