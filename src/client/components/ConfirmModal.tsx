import { Dialog } from '@headlessui/react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}

export default function ConfirmModal({ 
  isOpen, onClose, onConfirm, title, message, 
  confirmText = 'Confirmar', cancelText = 'Cancelar', danger = false 
}: Props) {
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-[100]">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-[#1a2c38] w-full max-w-sm rounded-xl p-6 border border-gray-700 shadow-2xl animate-in zoom-in duration-200">
           <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 bg-opacity-10 mx-auto ${danger ? 'bg-red-500 text-red-500' : 'bg-yellow-500 text-yellow-500'}`}>
               <AlertTriangle size={28} />
           </div>
           
           <h3 className="text-lg font-bold text-white mb-2 text-center">{title}</h3>
           <p className="text-sm text-gray-400 mb-6 text-center leading-relaxed">
               {message}
           </p>

           <div className="flex gap-3">
               <button onClick={onClose} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-lg font-bold transition">
                   {cancelText}
               </button>
               <button 
                onClick={() => { onConfirm(); onClose(); }} 
                className={`flex-1 text-white py-2.5 rounded-lg font-bold transition ${danger ? 'bg-red-600 hover:bg-red-500' : 'bg-[#00E701] hover:bg-[#00c701] text-black'}`}
               >
                   {confirmText}
               </button>
           </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
