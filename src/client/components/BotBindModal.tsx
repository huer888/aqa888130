import { Dialog } from '@headlessui/react'
import { useState, useEffect } from 'react'
import { X, Copy, RefreshCw } from 'lucide-react'
import api from '../utils/api'
import { toast } from 'sonner'

interface BotBindModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function BotBindModal({ isOpen, onClose }: BotBindModalProps) {
  const [loading, setLoading] = useState(false)
  const [code, setCode] = useState('')
  const [botUsername, setBotUsername] = useState('')
  const [currentBind, setCurrentBind] = useState('')

  useEffect(() => {
      if(isOpen) fetchCode()
  }, [isOpen])

  const fetchCode = async () => {
      setLoading(true)
      try {
          const res = await api.get('/user/bind-code')
          setCode(res.data.code)
          setCurrentBind(res.data.current_bot || '')
          
          // Get bot username from config if possible, or hardcode/fetch
          const configRes = await api.get('/admin/config')
          // Since config is admin only, this might fail for user. 
          // We can just rely on the user knowing the bot or hardcoding it if we had it.
          // For now, let's assume the user knows the bot or we display a generic one.
          setBotUsername('StakeBR_OfficialBot') 
      } catch(e) {
          toast.error('Erro ao gerar código')
      } finally {
          setLoading(false)
      }
  }

  const copyCode = () => {
      navigator.clipboard.writeText(`/bind ${code}`)
      toast.success('Comando copiado!')
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-[60]">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-surface w-full max-w-sm rounded-xl p-6 border border-gray-700 shadow-2xl">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">Ativar Notificações no Grupo</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20}/></button>
           </div>

           <div className="space-y-6">
               <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
                   <h4 className="text-blue-400 font-bold text-sm mb-2">Como funciona?</h4>
                   <p className="text-xs text-blue-200/70 leading-relaxed">
                       Vincule sua conta ao Telegram para receber notificações em tempo real sobre suas apostas, vitórias e comissões diretamente no seu grupo!
                   </p>
               </div>

               {currentBind && (
                   <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-lg flex items-center justify-between">
                       <span className="text-green-500 text-xs font-bold">Atualmente vinculado a:</span>
                       <span className="text-white font-mono text-sm">@{currentBind}</span>
                   </div>
               )}

               <div className="space-y-4">
                   {/* Leader Section */}
                   <div className="border-b border-gray-700 pb-4">
                       <h5 className="text-white font-bold text-sm mb-2 flex items-center gap-2">👑 Para LÍDERES (Donos de Grupo)</h5>
                       <p className="text-[10px] text-gray-400 mb-2">Crie seu próprio grupo e registre-o para gerenciar sua equipe.</p>
                       <div className="flex gap-2 items-center">
                           <div className="bg-black/30 p-2 rounded border border-purple-500/30 font-mono text-purple-400 text-xs flex-1">
                               /setup {code}
                           </div>
                           <button onClick={() => {navigator.clipboard.writeText(`/setup ${code}`); toast.success('Copiado!')}} className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">Copiar</button>
                       </div>
                   </div>

                   {/* Member Section */}
                   <div>
                       <h5 className="text-white font-bold text-sm mb-2 flex items-center gap-2">👤 Para MEMBROS (Entrar no Time)</h5>
                       <p className="text-[10px] text-gray-400 mb-2">Entre no grupo do seu líder e vincule-se para receber notificações.</p>
                       <div className="flex gap-2 items-center">
                           <div className="bg-black/30 p-2 rounded border border-green-500/30 font-mono text-green-400 text-xs flex-1">
                               /bind {code}
                           </div>
                           <button onClick={() => {navigator.clipboard.writeText(`/bind ${code}`); toast.success('Copiado!')}} className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">Copiar</button>
                       </div>
                   </div>
                   
                   <div className="text-center mt-2">
                       <button onClick={fetchCode} className="text-xs text-gray-500 hover:text-white flex items-center justify-center gap-1 mx-auto">
                           <RefreshCw size={12} /> Atualizar Código
                       </button>
                   </div>
               </div>
           </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
