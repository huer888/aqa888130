import { useEffect, useState } from 'react'
import api from '../utils/api'
import { Copy, Users, TrendingUp, Share2, Clipboard } from 'lucide-react'
import { toast } from 'sonner'

export default function Team() {
  const [stats, setStats] = useState({ member_count: 0, self_rebate: 0, team_override: 0, total_commission: 0 })
  const [inviteRate, setInviteRate] = useState(0.05) // 5%
  const [inviteLink, setInviteLink] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [maxRate, setMaxRate] = useState(0.07) // Default max

  useEffect(() => {
    fetchStats()
    fetchUserRate()
  }, [])

  const fetchStats = async () => {
    try {
      const res = await api.get('/team/stats')
      setStats(res.data)
    } catch (e) { console.error(e) }
  }

  const fetchUserRate = async () => {
      try {
          const res = await api.get('/user/me') 
          if(res.data) {
              const userMax = res.data.commission_rate
              const code = res.data.invite_code || res.data.uid || res.data.id
              
              setMaxRate(userMax)
              setInviteCode(code)
              
              // Set default slider: 2% gap if possible
              let initial = 0.05
              if (userMax <= 0.05) initial = Math.max(0.01, userMax - 0.01)
              setInviteRate(initial)
              
              // Initial link generation
              setInviteLink(`${window.location.origin}/register?ref=${code}&rate=${initial}`)
          }
      } catch (e) {}
  }

  // Update link whenever slider or code changes
  useEffect(() => {
     if(inviteCode) {
         setInviteLink(`${window.location.origin}/register?ref=${inviteCode}&rate=${inviteRate}`)
     }
  }, [inviteRate, inviteCode])

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink)
    toast.success('Link copiado!')
  }

  const copyCode = () => {
    navigator.clipboard.writeText(inviteCode.toString())
    toast.success('Código copiado!')
  }

  // Calculate percentage for display (e.g. 0.05 -> 5%)
  const ratePercent = Math.round(inviteRate * 100)
  const maxPercent = Math.round(Math.max(1, (maxRate - 0.01) * 100))
  const profitPercent = Math.round((maxRate - inviteRate) * 100)

  return (
    <div className="space-y-6">
      <div className="bg-surface rounded-xl p-6 shadow-lg border border-gray-800 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl"></div>

        <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
           <Users className="text-primary" size={20} />
           Painel de Equipe
        </h2>
        
        <div className="grid grid-cols-2 gap-4 text-center mb-4">
           <div className="bg-secondary rounded-lg p-4 border border-gray-700">
             <div className="text-3xl font-bold text-white mb-1">{stats.member_count}</div>
             <div className="text-[10px] text-textMuted uppercase font-bold tracking-wider">Membros Diretos</div>
           </div>
           <div className="bg-secondary rounded-lg p-4 border border-gray-700">
             <div className="text-3xl font-bold text-primary mb-1">R$ {Number(stats.total_commission || 0).toFixed(2)}</div>
             <div className="text-[10px] text-textMuted uppercase font-bold tracking-wider">Comissão Total</div>
           </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-center">
           <div className="bg-secondary/50 rounded-lg p-3 border border-gray-700 border-dashed">
             <div className="text-xl font-bold text-white mb-1">R$ {Number(stats.self_rebate || 0).toFixed(2)}</div>
             <div className="text-[10px] text-textMuted uppercase font-bold tracking-wider">Auto-Rebate</div>
           </div>
           <div className="bg-secondary/50 rounded-lg p-3 border border-gray-700 border-dashed">
             <div className="text-xl font-bold text-green-400 mb-1">R$ {Number(stats.team_override || 0).toFixed(2)}</div>
             <div className="text-[10px] text-textMuted uppercase font-bold tracking-wider">Lucro Equipe</div>
           </div>
        </div>
      </div>

      <div className="bg-surface p-6 rounded-xl shadow border border-gray-800">
         <h3 className="font-bold text-white mb-6 flex items-center gap-2">
            <Share2 className="text-primary" size={20} />
            Configurar Convite
         </h3>
         
         <div className="mb-8">
           <div className="flex justify-between items-end mb-4">
             <label className="text-xs font-bold text-textMuted uppercase">Comissão do Sub-agente</label>
             <span className="font-bold text-2xl text-primary">{ratePercent}%</span>
           </div>
           
           <input 
             type="range" 
             min="0.01" 
             max={Math.max(0.01, maxRate - 0.01)} 
             step="0.01"
             value={inviteRate}
             onChange={e => setInviteRate(parseFloat(e.target.value))}
             className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary hover:accent-primaryHover"
           />
           
           <div className="flex justify-between text-[10px] text-gray-500 mt-2 font-mono">
             <span>1% (Mínimo)</span>
             <span className="text-white bg-gray-700 px-2 py-0.5 rounded">Seu Lucro: <span className="text-green-400">{profitPercent}%</span></span>
             <span>{maxPercent}% (Máximo)</span>
           </div>
         </div>

         <div className="space-y-4">
            <div>
                <label className="text-xs font-bold text-textMuted uppercase mb-1 block">Link de Convite</label>
                <div className="flex gap-2">
                    <input 
                    readOnly 
                    value={inviteLink}
                    className="flex-1 bg-secondary border border-gray-700 rounded-lg px-3 py-3 text-xs text-gray-400 font-mono truncate focus:outline-none"
                    />
                    <button onClick={copyLink} className="bg-primary hover:bg-primaryHover text-slate-900 px-4 rounded-lg transition-colors flex items-center justify-center font-bold text-xs">
                    Copiar
                    </button>
                </div>
            </div>

            <div>
                <label className="text-xs font-bold text-textMuted uppercase mb-1 block">Código de Convite</label>
                <div className="flex gap-2">
                    <input 
                    readOnly 
                    value={inviteCode}
                    className="flex-1 bg-secondary border border-gray-700 rounded-lg px-3 py-3 text-lg font-bold text-white font-mono tracking-widest text-center focus:outline-none"
                    />
                    <button onClick={copyCode} className="bg-secondary hover:bg-surfaceHover border border-gray-600 text-white px-4 rounded-lg transition-colors flex items-center justify-center gap-2 font-bold text-xs">
                    <Clipboard size={16} /> Copiar
                    </button>
                </div>
            </div>
         </div>
      </div>
    </div>
  )
}
