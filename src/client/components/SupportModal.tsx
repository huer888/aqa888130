import { Dialog } from '@headlessui/react'
import { useState } from 'react'
import { X, Send, MessageSquare, Copy, Headset } from 'lucide-react'
import { toast } from 'sonner'

interface SupportModalProps {
  isOpen: boolean
  onClose: () => void
  config: any
  uid: string
}

export default function SupportModal({ isOpen, onClose, config, uid }: SupportModalProps) {
  const copyUid = () => {
      navigator.clipboard.writeText(uid)
      toast.success('UID copiado!')
  }

  const openLink = (type: 'tg' | 'ws') => {
      const url = type === 'tg' ? config['support_tg'] : config['support_ws']
      if(!url) return toast.error('Link não configurado')
      
      // Auto-copy for convenience
      copyUid()
      
      window.open(url, '_blank')
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-[60]">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-surface w-full max-w-sm rounded-xl p-6 border border-gray-700 shadow-2xl">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Headset size={20} className="text-primary"/>
                  Suporte Online
              </h3>
              <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20}/></button>
           </div>

           <div className="text-center mb-6">
               <p className="text-textMuted text-sm mb-2">Por favor, informe seu UID ao iniciar o atendimento:</p>
               <div 
                   onClick={copyUid}
                   className="bg-background border border-gray-700 rounded p-2 font-mono text-lg font-bold text-primary tracking-widest flex items-center justify-center gap-2 cursor-pointer hover:bg-white/5 transition active:scale-95"
               >
                   {uid}
                   <Copy size={16} className="opacity-50" />
               </div>
           </div>

           <div className="grid grid-cols-2 gap-4">
               <button onClick={() => openLink('tg')} className="bg-[#0088cc] hover:bg-[#0088cc]/90 text-white p-4 rounded-xl flex flex-col items-center gap-2 transition">
                   <Send size={32} />
                   <span className="font-bold">Telegram</span>
               </button>
               <button onClick={() => openLink('ws')} className="bg-[#25D366] hover:bg-[#25D366]/90 text-white p-4 rounded-xl flex flex-col items-center gap-2 transition">
                   <MessageSquare size={32} />
                   <span className="font-bold">WhatsApp</span>
               </button>
           </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
