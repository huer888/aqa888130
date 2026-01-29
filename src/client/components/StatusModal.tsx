import { Dialog } from '@headlessui/react'
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
  type?: 'success' | 'error' | 'warning'
}

export default function StatusModal({ isOpen, onClose, title, message, type = 'success' }: ModalProps) {
  const colors = {
    success: 'text-primary',
    error: 'text-red-500',
    warning: 'text-yellow-500'
  }
  
  const Icon = type === 'success' ? CheckCircle2 : type === 'error' ? XCircle : AlertTriangle

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-[100]">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-surface w-full max-w-sm rounded-2xl p-6 border border-gray-700 shadow-2xl flex flex-col items-center text-center animate-in zoom-in duration-200">
           <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-opacity-10 ${type === 'success' ? 'bg-primary' : type === 'error' ? 'bg-red-500' : 'bg-yellow-500'}`}>
               <Icon size={40} className={colors[type]} />
           </div>
           
           <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
           <p className="text-sm text-textMuted mb-6 leading-relaxed">
               {message}
           </p>

           <button onClick={onClose} className="w-full bg-[#2a4453] hover:bg-[#365669] text-white py-3 rounded-xl font-bold transition">
               Fechar
           </button>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
