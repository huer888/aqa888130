import { Dialog } from '@headlessui/react'
import { useState, useEffect } from 'react'
import { X, Lock, CreditCard, User, AlertCircle, CheckCircle2 } from 'lucide-react'
import api from '../utils/api'
import { toast } from 'sonner'
import { useUser } from '../context/UserContext'

interface Props {
  isOpen: boolean
  onClose: () => void
  initialTab?: 'password' | 'pin' | 'profile'
}

export default function SecurityCenter({ isOpen, onClose, initialTab = 'password' }: Props) {
  const { user, refreshUser } = useUser()
  const [activeTab, setActiveTab] = useState(initialTab)
  
  // Forms
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  const [oldPin, setOldPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  
  const [loading, setLoading] = useState(false)

  // Methods removed per request
  
  const handlePasswordChange = async (e: React.FormEvent) => {
      e.preventDefault()
      if (newPassword !== confirmPassword) return toast.error('As senhas não coincidem')
      if (newPassword.length < 6) return toast.error('A senha deve ter no mínimo 6 caracteres')
      
      setLoading(true)
      try {
          await api.post('/user/change-password', { oldPassword, newPassword })
          toast.success('Senha de login alterada com sucesso!')
          setOldPassword('')
          setNewPassword('')
          setConfirmPassword('')
          onClose()
      } catch (e: any) {
          toast.error(e.response?.data?.error || 'Erro ao alterar senha')
      } finally {
          setLoading(false)
      }
  }

  const handlePinChange = async (e: React.FormEvent) => {
      e.preventDefault()
      if (newPin !== confirmPin) return toast.error('Os PINs não coincidem')
      if (newPin.length !== 6) return toast.error('O PIN deve ter 6 números')
      
      setLoading(true)
      try {
          await api.post('/user/change-pin', { oldPin, newPin })
          toast.success('PIN de pagamento atualizado!')
          setOldPin('')
          setNewPin('')
          setConfirmPin('')
          refreshUser() // Update context to know user has_pin
          onClose()
      } catch (e: any) {
          toast.error(e.response?.data?.error || 'Erro ao atualizar PIN')
      } finally {
          setLoading(false)
      }
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-[60]">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-surface w-full max-w-lg rounded-2xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
           {/* Header */}
           <div className="bg-[#1a2c38] p-4 flex justify-between items-center border-b border-gray-700">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShieldCheckIcon /> Centro de Segurança
              </h3>
              <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition">
                  <X size={20}/>
              </button>
           </div>

           <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
               {/* Sidebar */}
               <div className="w-full md:w-1/3 bg-[#15222b] border-b md:border-b-0 md:border-r border-gray-700 p-2 flex md:flex-col gap-2 overflow-x-auto">
                   <TabButton 
                        active={activeTab === 'password'} 
                        onClick={() => setActiveTab('password')} 
                        icon={<Lock size={18} />} 
                        label="Senha de Login" 
                   />
                   <TabButton 
                        active={activeTab === 'pin'} 
                        onClick={() => setActiveTab('pin')} 
                        icon={<CreditCard size={18} />} 
                        label="Senha de Pagamento" 
                   />
               </div>

               {/* Content */}
               <div className="flex-1 p-6 overflow-y-auto bg-surface">
                   
                   {/* LOGIN PASSWORD TAB */}
                   {activeTab === 'password' && (
                       <form onSubmit={handlePasswordChange} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                           <h4 className="font-bold text-white mb-4">Alterar Senha de Login</h4>
                           
                           <div>
                               <label className="text-xs text-textMuted font-bold uppercase mb-1 block">Senha Atual</label>
                               <input 
                                   type="password" 
                                   value={oldPassword}
                                   onChange={e => setOldPassword(e.target.value)}
                                   className="input-field"
                                   placeholder="Digite sua senha atual"
                                   required
                               />
                           </div>
                           <div>
                               <label className="text-xs text-textMuted font-bold uppercase mb-1 block">Nova Senha</label>
                               <input 
                                   type="password" 
                                   value={newPassword}
                                   onChange={e => setNewPassword(e.target.value)}
                                   className="input-field"
                                   placeholder="Mínimo 6 caracteres"
                                   required
                               />
                           </div>
                           <div>
                               <label className="text-xs text-textMuted font-bold uppercase mb-1 block">Confirmar Nova Senha</label>
                               <input 
                                   type="password" 
                                   value={confirmPassword}
                                   onChange={e => setConfirmPassword(e.target.value)}
                                   className="input-field"
                                   placeholder="Repita a nova senha"
                                   required
                               />
                           </div>

                           <button disabled={loading} type="submit" className="btn-primary w-full py-3 mt-4">
                               {loading ? 'Salvando...' : 'Atualizar Senha'}
                           </button>
                       </form>
                   )}

                   {/* PIN TAB */}
                   {activeTab === 'pin' && (
                       <form onSubmit={handlePinChange} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                           <h4 className="font-bold text-white mb-2">Senha de Pagamento (PIN)</h4>
                           <p className="text-xs text-textMuted mb-6">Necessária para realizar saques e movimentações financeiras.</p>
                           
                           {/* Only show Old PIN input if user HAS a pin set (check context) */}
                           {user?.payment_pin && (
                               <div>
                                   <label className="text-xs text-textMuted font-bold uppercase mb-1 block">PIN Atual</label>
                                   <input 
                                       type="password" 
                                       maxLength={6}
                                       value={oldPin}
                                       onChange={e => setOldPin(e.target.value)}
                                       className="input-field tracking-widest text-center text-lg"
                                       placeholder="******"
                                       required
                                   />
                               </div>
                           )}

                           {!user?.payment_pin && (
                               <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg flex items-start gap-2 mb-4">
                                   <AlertCircle className="text-yellow-500 shrink-0" size={16} />
                                   <p className="text-xs text-yellow-200">Você ainda não definiu um PIN. Crie um agora para proteger seus fundos.</p>
                               </div>
                           )}

                           <div>
                               <label className="text-xs text-textMuted font-bold uppercase mb-1 block">Novo PIN (6 Números)</label>
                               <input 
                                   type="password" 
                                   maxLength={6}
                                   value={newPin}
                                   onChange={e => setNewPin(e.target.value)}
                                   className="input-field tracking-widest text-center text-lg"
                                   placeholder="******"
                                   required
                               />
                           </div>
                           <div>
                               <label className="text-xs text-textMuted font-bold uppercase mb-1 block">Confirmar Novo PIN</label>
                               <input 
                                   type="password" 
                                   maxLength={6}
                                   value={confirmPin}
                                   onChange={e => setConfirmPin(e.target.value)}
                                   className="input-field tracking-widest text-center text-lg"
                                   placeholder="******"
                                   required
                               />
                           </div>

                           <button disabled={loading} type="submit" className="btn-primary w-full py-3 mt-4">
                               {loading ? 'Salvando...' : 'Definir PIN'}
                           </button>
                       </form>
                   )}
               </div>
           </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}

function TabButton({ active, onClick, icon, label }: any) {
    return (
        <button 
            onClick={onClick}
            className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-all ${
                active 
                ? 'bg-primary text-slate-900 font-bold shadow-lg shadow-primary/20' 
                : 'text-textMuted hover:text-white hover:bg-white/5'
            }`}
        >
            {icon}
            {label}
        </button>
    )
}

function InfoRow({ label, value, copyable }: any) {
    const copy = () => {
        navigator.clipboard.writeText(value)
        toast.success('Copiado!')
    }
    return (
        <div className="flex justify-between items-center py-2 border-b border-gray-800 last:border-0">
            <span className="text-sm text-textMuted">{label}</span>
            <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{value}</span>
                {copyable && (
                    <button onClick={copy} className="text-primary hover:text-white transition p-1">
                        <CheckCircle2 size={14} />
                    </button>
                )}
            </div>
        </div>
    )
}

function ShieldCheckIcon() {
    return (
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
            <Lock size={16} />
        </div>
    )
}
