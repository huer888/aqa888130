import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShieldCheck, UserCheck, FileText, Lock, Headset, LogOut, ChevronRight, Ticket, History, Loader2, CheckCircle, Wallet, Camera } from 'lucide-react'
import api from '../utils/api'
import KycModal from '../components/KycModal'
import SecurityCenter from '../components/SecurityCenter'
import SupportModal from '../components/SupportModal'
import { useUser } from '../context/UserContext'
import { toast } from 'sonner'

export default function Profile() {
  const { user, refreshUser } = useUser()
  const [showKyc, setShowKyc] = useState(false)
  const [showSecurity, setShowSecurity] = useState<'password' | 'pin' | null>(null)
  const [showSupport, setShowSupport] = useState(false)
  const [totalCommission, setTotalCommission] = useState(0) // Add total commission
  const [config, setConfig] = useState<any>({})
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchConfig()
    fetchStats()
  }, [])

  const fetchConfig = async () => {
      try {
          const res = await api.get('/admin/config') 
          setConfig(res.data || {}) 
      } catch (e) {
          setConfig({
              support_tg: 'https://t.me/stakebr_support',
              support_ws: 'https://wa.me/5511999999999'
          })
      }
  }

  const fetchStats = async () => {
      try {
          const teamRes = await api.get('/team/stats')
          if(teamRes.data) setTotalCommission(teamRes.data.total_commission)
      } catch (e) { console.error(e) }
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0]
          setUploadingAvatar(true)
          try {
              const fd = new FormData()
              fd.append('file', file)
              fd.append('type', 'avatar')
              const res = await api.post('/upload', fd)
              
              await api.post('/user/avatar', { url: res.data.url })
              toast.success('Avatar atualizado!')
              refreshUser()
          } catch(e) {
              toast.error('Erro ao atualizar avatar')
          } finally {
              setUploadingAvatar(false)
          }
      }
  }

  const MenuLink = ({ icon: Icon, title, subtitle, onClick, danger = false }: any) => (
    <button onClick={onClick} className="w-full flex items-center p-4 bg-surface border-b border-gray-800 hover:bg-surfaceHover transition text-left group first:rounded-t-xl last:rounded-b-xl last:border-0 active:scale-[0.99] duration-100">
      <div className={`p-2 rounded-lg mr-4 ${danger ? 'bg-red-500/10 text-red-500' : 'bg-secondary text-textMuted group-hover:text-primary transition-colors'}`}>
        <Icon size={20} />
      </div>
      <div className="flex-1">
        <div className={`font-medium text-sm ${danger ? 'text-red-500' : 'text-white'}`}>{title}</div>
        {subtitle && <div className="text-xs text-textMuted mt-0.5">{subtitle}</div>}
      </div>
      {!danger && <ChevronRight size={16} className="text-gray-600 group-hover:text-white transition-colors" />}
    </button>
  )

  // Skeleton Loader
  if (!user) {
      return (
          <div className="space-y-6 animate-pulse p-4">
              <div className="bg-surface p-6 rounded-xl h-32 w-full"></div>
              <div className="grid grid-cols-2 gap-3">
                  <div className="bg-surface h-20 rounded-xl"></div>
                  <div className="bg-surface h-20 rounded-xl"></div>
              </div>
              <div className="bg-surface h-16 rounded-xl"></div>
              <div className="bg-surface h-40 rounded-xl"></div>
          </div>
      )
  }

  return (
    <div className="space-y-6 pb-8">
      {user && (
         <>
         <div className="bg-surface p-6 rounded-xl shadow-lg border border-gray-800 flex items-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
               <UserCheck size={80} />
            </div>
            
            <div className="relative mr-4">
                <div className="w-16 h-16 rounded-full overflow-hidden shadow-lg shadow-primary/20 ring-2 ring-surface ring-offset-2 ring-offset-primary/50 bg-[#15222b] flex items-center justify-center">
                   {user.avatar_url ? (
                       <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                   ) : (
                       <UserCheck size={32} className="text-gray-500" />
                   )}
                </div>
                <label className="absolute -bottom-1 -right-1 bg-primary text-slate-900 p-1.5 rounded-full cursor-pointer shadow-lg hover:scale-110 transition active:scale-95">
                    <Camera size={12} />
                    <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} disabled={uploadingAvatar} />
                </label>
            </div>

            <div>
               <div className="font-bold text-lg text-white">{user.name || 'Agente'}</div>
               <div className="text-sm text-textMuted">{user.email}</div>
               <div className="flex items-center gap-2 mt-2">
                   <span className="text-[10px] bg-secondary border border-gray-700 text-gray-400 px-2 py-0.5 rounded font-mono">
                     UID: {user.uid || user.id}
                   </span>
                   <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded font-bold uppercase">
                     Nível {((user.commission_rate || 0) * 100).toFixed(0)}%
                   </span>
               </div>
            </div>
         </div>

         {/* Balance Cards for Profile */}
         <div className="grid grid-cols-2 gap-3 min-h-[5rem]">
             <div className="bg-surface p-4 rounded-xl border border-gray-800 shadow-sm">
                 <div className="text-xs text-textMuted uppercase font-bold mb-1">Saldo Total</div>
                 <div className="text-xl font-bold text-white flex items-center gap-2">
                     R$ {Number(user.balance || 0).toFixed(2)}
                 </div>
             </div>
             <div className="bg-surface p-4 rounded-xl border border-gray-800 shadow-sm">
                 <div className="text-xs text-textMuted uppercase font-bold mb-1">Total Comissões</div>
                 <div className="text-xl font-bold text-primary flex items-center gap-2">
                     R$ {Number(totalCommission || 0).toFixed(2)}
                 </div>
             </div>
         </div>
         </>
      )}

      {/* KYC Banner */}
      {user && (
        <div className={`border p-4 rounded-xl flex items-center justify-between transition-all min-h-[4.5rem] ${
            user.kyc_status === 'verified' 
            ? 'bg-green-500/5 border-green-500/20' 
            : user.kyc_status === 'pending'
            ? 'bg-yellow-500/5 border-yellow-500/20'
            : 'bg-red-500/5 border-red-500/20'
        }`}>
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${
                    user.kyc_status === 'verified' ? 'bg-green-500/20 text-green-500' :
                    user.kyc_status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                    'bg-red-500/20 text-red-500'
                }`}>
                {user.kyc_status === 'verified' ? <CheckCircle size={20} /> : <ShieldCheck size={20} />}
                </div>
                <div>
                <div className={`font-bold text-sm ${
                    user.kyc_status === 'verified' ? 'text-green-400' :
                    user.kyc_status === 'pending' ? 'text-yellow-400' :
                    'text-red-400'
                }`}>
                    {user.kyc_status === 'verified' ? 'Identidade Verificada' : user.kyc_status === 'rejected' ? 'Verificação Recusada' : 'Verificar Identidade'}
                </div>
                <div className={`text-[10px] uppercase font-bold tracking-wider ${
                    user.kyc_status === 'verified' ? 'text-green-300/70' :
                    user.kyc_status === 'pending' ? 'text-yellow-300/70' :
                    'text-red-300/70'
                }`}>
                    {user.kyc_status === 'verified' ? 'Aprovado' : user.kyc_status === 'pending' ? 'Em Análise' : user.kyc_status === 'rejected' ? 'Tente Novamente' : 'Não verificado'}
                </div>
                </div>
            </div>
            
            {(user.kyc_status === 'unverified' || user.kyc_status === 'rejected') && (
                <button 
                    onClick={() => setShowKyc(true)}
                    className="text-xs bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-lg shadow-red-500/20 flex items-center gap-2"
                >
                    {user.kyc_status === 'rejected' ? 'Reenviar' : 'Verificar'}
                </button>
            )}
        </div>
      )}

      <KycModal 
        isOpen={showKyc} 
        onClose={() => setShowKyc(false)} 
        onSuccess={() => { refreshUser(); }} 
      />

      {showSecurity && (
          <SecurityCenter 
            isOpen={!!showSecurity}
            onClose={() => setShowSecurity(null)}
            initialTab={showSecurity as any}
          />
      )}

      {user && (
          <SupportModal 
            isOpen={showSupport}
            onClose={() => setShowSupport(false)}
            config={config} // Pass real config
            uid={user.uid || user.id}
          />
      )}

      <div className="rounded-xl overflow-hidden shadow-lg border border-gray-800">
        <MenuLink 
           icon={Ticket} 
           title="Histórico de Apostas" 
           subtitle="Meus Pedidos"
           onClick={() => navigate('/my-bets')}
        />
        <MenuLink 
           icon={History} 
           title="Histórico de Transações" 
           subtitle="Depósitos e Saques"
           onClick={() => navigate('/transactions')}
        />
      </div>

      <div className="rounded-xl overflow-hidden shadow-lg border border-gray-800">
        <MenuLink 
           icon={FileText} 
           title="Certificados da Plataforma" 
           subtitle="Licença e Contrato"
           onClick={() => navigate('/certificates')}
        />
        <MenuLink 
           icon={Lock} 
           title="Centro de Segurança" 
           subtitle="Senha e PIN"
           onClick={() => setShowSecurity('password')}
        />
        <MenuLink 
           icon={Headset} 
           title="Suporte Online" 
           subtitle="Telegram / WhatsApp"
           onClick={() => setShowSupport(true)}
        />
      </div>

      <button onClick={() => {
        localStorage.removeItem('token')
        window.location.href = '/login'
      }} className="w-full flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/80 text-gray-400 hover:text-white py-4 rounded-xl font-bold transition-colors border border-gray-800 shadow-lg">
         <LogOut size={18} /> Sair da Conta
      </button>
      
      <div className="text-center text-[10px] text-gray-700 font-mono opacity-50">
         Stake.BR v6.3 • 2026
      </div>
    </div>
  )
}
