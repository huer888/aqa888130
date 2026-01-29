import { Dialog } from '@headlessui/react'
import { useState, useEffect } from 'react'
import { X, Bell, CheckCheck, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import api from '../utils/api'
import { useUser } from '../context/UserContext'
import { toast } from 'sonner'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function NotificationModal({ isOpen, onClose }: Props) {
  const { refreshUser } = useUser()
  const [notifs, setNotifs] = useState<any[]>([])
  const [expanded, setExpanded] = useState<number | null>(null)

  useEffect(() => {
    if(isOpen) load()
  }, [isOpen])

  const load = async () => {
      try {
          const res = await api.get('/user/notifications')
          setNotifs(res.data)
      } catch(e) {}
  }

  const handleRead = async (n: any) => {
      if (expanded === n.id) {
          setExpanded(null)
          return
      }
      setExpanded(n.id)
      
      if (!n.is_read) {
          try {
              await api.post(`/user/notifications/${n.id}/read`)
              setNotifs(prev => prev.map(item => item.id === n.id ? { ...item, is_read: 1 } : item))
              refreshUser() // Update global counter
          } catch(e) {}
      }
  }

  const handleMarkAllRead = async () => {
      try {
          await api.post('/user/notifications/read-all')
          setNotifs(prev => prev.map(item => ({ ...item, is_read: 1 })))
          refreshUser()
      } catch(e) {}
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-[80]">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <Dialog.Panel className="w-screen max-w-sm bg-surface shadow-xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-gray-800">
           <div className="flex justify-between items-center p-4 border-b border-gray-800 bg-[#15222b]">
              <h3 className="font-bold text-white flex items-center gap-2">
                  <Bell size={18} className="text-primary"/> Notificações
              </h3>
              <div className="flex items-center gap-3">
                  {notifs.length > 0 && (
                      <>
                        <button onClick={handleMarkAllRead} className="text-gray-400 hover:text-white" title="Marcar todas como lidas">
                            <CheckCheck size={18} />
                        </button>
                      </>
                  )}
                  <button onClick={onClose} className="text-gray-400 hover:text-white ml-2"><X size={20}/></button>
              </div>
           </div>

           <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface">
               {notifs.length === 0 ? (
                   <div className="flex flex-col items-center justify-center h-64 text-textMuted text-sm">
                       <Bell size={40} className="mb-4 opacity-20" />
                       <p>Sem novas notificações</p>
                   </div>
               ) : (
                   notifs.map(n => (
                       <div 
                           key={n.id} 
                           onClick={() => handleRead(n)}
                           className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
                               n.is_read 
                               ? 'bg-transparent border-gray-800 hover:bg-white/5' 
                               : 'bg-[#1a2c38] border-gray-700 hover:border-gray-600'
                           }`}
                       >
                           {!n.is_read && (
                               <div className="absolute top-4 right-4 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                           )}
                           
                           <div className="flex justify-between items-start mb-1 pr-4">
                               <div className={`text-sm font-bold ${n.is_read ? 'text-gray-400' : 'text-white'}`}>
                                   {n.title}
                               </div>
                           </div>
                           
                           <div className={`text-xs leading-relaxed transition-all ${expanded === n.id ? 'text-gray-300' : 'text-gray-500 line-clamp-2'}`}>
                               {n.message}
                           </div>

                           <div className="flex justify-between items-center mt-3 pt-3 border-t border-dashed border-gray-800/50">
                               <div className="text-[10px] text-gray-600 font-mono">
                                   {new Date(n.created_at).toLocaleString()}
                               </div>
                               <div className="text-gray-600">
                                   {expanded === n.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                               </div>
                           </div>
                       </div>
                   ))
               )}
           </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
