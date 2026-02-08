import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import api from '../utils/api'

interface UserData {
  id: number
  email: string
  name: string
  balance: number
  commission_balance: number
  commission_rate: number
  payment_pin: string | null
  usdt_address: string | null
  role: string
  uid: string
}

interface WalletInfo {
    rate: number
    platform_address: string
}

interface UserContextType {
  user: UserData | null
  walletInfo: WalletInfo | null
  loading: boolean
  notifications: any[]
  refreshUser: () => Promise<void>
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null)
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    // Prevent fetching if no token (not logged in)
    if (!localStorage.getItem('token')) {
        setLoading(false)
        return
    }

    try {
      // 1. Fetch Basic User Info & Balance (Single Endpoint Preferred, but we combine results)
      // We will assume /wallet/balance returns updated balance
      // And /user/me returns profile
      // But to reduce requests, let's look at what we have.
      
      // Let's execute sequentially to reduce DB locking risk on SQLite if that's the issue
      // or Promise.all if the backend can handle it. User said "Internal Server Error" likely due to concurrency.
      // Let's try sequential for safety first.
      
      const meRes = await api.get('/user/me')
      // const balRes = await api.get('/wallet/balance') // Endpoint does not exist
      const infoRes = await api.get('/wallet/info')
      const notifRes = await api.get('/user/notifications')

      if (meRes.data && infoRes.data) {
          setUser({
              ...meRes.data,
              // Fix: Trust /user/me balance first, fallback to /wallet/info only if necessary
              // This prevents 0.00 overwrite if wallet info is partial
              balance: Number(meRes.data.balance ?? infoRes.data.balance ?? 0),
              commission_balance: Number(meRes.data.commission_balance ?? infoRes.data.commission_balance ?? 0),
              
              payment_pin: infoRes.data.has_pin ? '***' : null, 
              usdt_address: infoRes.data.usdt_address
          })
      }
      
      if (infoRes.data) {
          setWalletInfo({
              rate: infoRes.data.rate,
              platform_address: infoRes.data.platform_address
          })
      }

      if (notifRes.data) {
          setNotifications(notifRes.data)
      }

    } catch (e) {
      console.error('[UserContext] Sync Failed', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
    // Poll every 5s for realtime balance updates
    const interval = setInterval(fetchAll, 5000)
    return () => clearInterval(interval)
  }, [fetchAll])

  return (
    <UserContext.Provider value={{ user, walletInfo, loading, notifications, refreshUser: fetchAll }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
