import { Dialog } from '@headlessui/react'
import { useState } from 'react'
import { X, Lock, CreditCard } from 'lucide-react'
import api from '../utils/api'

interface SecurityModalProps {
  isOpen: boolean
  onClose: () => void
  type: 'password' | 'pin'
}

export default function SecurityModal({ isOpen, onClose, type }: SecurityModalProps) {
  const [val1, setVal1] = useState('')
  const [val2, setVal2] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (val1 !== val2) return alert('Não confere')
    
    setLoading(true)
    // Simulate API call
    setTimeout(() => {
        setLoading(false)
        alert('Atualizado com sucesso!')
        onClose()
    }, 1000)
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-[60]">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-surface w-full max-w-sm rounded-xl p-6 border border-gray-700 shadow-2xl">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  {type === 'password' ? <Lock size={20} className="text-primary"/> : <CreditCard size={20} className="text-primary"/>}
                  {type === 'password' ? 'Alterar Senha' : 'Senha de Pagamento'}
              </h3>
              <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20}/></button>
           </div>

           <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                 <label className="block text-xs font-bold text-textMuted uppercase mb-1.5">
                     {type === 'password' ? 'Nova Senha' : 'Novo PIN (6 dígitos)'}
                 </label>
                 <input 
                   type={type === 'password' ? 'password' : 'tel'}
                   maxLength={type === 'pin' ? 6 : undefined}
                   required
                   value={val1}
                   onChange={e => setVal1(e.target.value)}
                   className="input-field"
                 />
              </div>
              <div>
                 <label className="block text-xs font-bold text-textMuted uppercase mb-1.5">
                     Confirmar
                 </label>
                 <input 
                   type={type === 'password' ? 'password' : 'tel'}
                   maxLength={type === 'pin' ? 6 : undefined}
                   required
                   value={val2}
                   onChange={e => setVal2(e.target.value)}
                   className="input-field"
                 />
              </div>

              <button disabled={loading} type="submit" className="btn-primary w-full mt-4">
                 {loading ? 'Salvando...' : 'Salvar'}
              </button>
           </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
