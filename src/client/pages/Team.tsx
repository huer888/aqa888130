import { useEffect, useState } from 'react'
import api from '../utils/api'
import { Copy, Users, TrendingUp, Share2, Clipboard } from 'lucide-react'
import { toast } from 'sonner'

export default function Team() {
  const [stats, setStats] = useState({ member_count: 0, self_rebate: 0, team_override: 0, total_commission: 0 })
  const [inviteRate, setInviteRate] = useState(0.05) // 5%
  const [inputRate, setInputRate] = useState('5') // For manual input
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
              
              // Special visual clamp for Master Account to match backend rule
              if (code === '888888') {
                  setMaxRate(Math.min(userMax, 0.06)) // Results in slider max of 0.05
              } else {
                  setMaxRate(userMax)
              }
              
              setInviteCode(code)
              
              // Set default slider: Always 1% gap (User Rate - 1%)
              // Ensure it's at least 1%
              const defaultSubRate = Math.max(0.01, userMax - 0.01)
              setInviteRate(defaultSubRate)
              setInputRate((defaultSubRate * 100).toFixed(0))
              
              // Initial link generation
              setInviteLink(`${window.location.origin}/register?ref=${code}&rate=${defaultSubRate}`)
          }
      } catch (e) {}
  }

  // Update link whenever slider or code changes
  useEffect(() => {
     if(inviteCode) {
         setInviteLink(`${window.location.origin}/register?ref=${inviteCode}&rate=${inviteRate}`)
     }
  }, [inviteRate, inviteCode])

  const handleRateBlur = () => {
      let val = parseFloat(inputRate) / 100
      if (isNaN(val)) val = 0.01
      
      // Force 1% gap
      const maxAllowed = Math.max(0.01, maxRate - 0.01)
      if (val > maxAllowed) {
          val = maxAllowed
          toast.warning(`Taxa máxima permitida: ${(maxAllowed * 100).toFixed(0)}% (Você deve manter 1% de lucro)`)
      }
      if (val < 0.01) val = 0.01
      
      setInviteRate(val)
      setInputRate((val * 100).toFixed(0))
  }

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink)
    toast.success('Link copiado!')
  }

  const copyCode = () => {
    navigator.clipboard.writeText(inviteCode.toString())
    toast.success('Código copiado!')
  }

  // Calculate percentage for display
  // Use inputRate for immediate feedback, fallback to inviteRate
  const inputValue = parseFloat(inputRate)
  const displayRate = isNaN(inputValue) ? 0 : inputValue
  
  // Calculate Max Limit (e.g. 7% -> Max 6%)
  // Ensure we compare apples to apples (percentages)
  const userMaxPercent = Math.round(maxRate * 100)
  const maxAllowedPercent = Math.max(1, userMaxPercent - 1)
  
  // Calculate Profit (User Max - Current Setting)
  const profitPercent = Math.max(0, userMaxPercent - displayRate)

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
             <label className="text-xs font-bold text-textMuted uppercase">Comissão do Sub-agente (%)</label>
             <span className="font-bold text-2xl text-primary">{displayRate}%</span>
           </div>
           
           <div className="flex gap-4 items-center">
               <input 
                 type="number"
                 value={inputRate}
                 onChange={e => setInputRate(e.target.value)}
                 onBlur={handleRateBlur}
                 className="flex-1 bg-secondary border border-gray-700 rounded-lg p-3 text-white font-bold text-center focus:border-primary outline-none"
                 placeholder="Ex: 5"
               />
               <span className="text-gray-500 font-bold">%</span>
           </div>
           
           <div className="flex justify-between text-[10px] text-gray-500 mt-2 font-mono">
             <span>1% (Mínimo)</span>
             <span className="text-white bg-gray-700 px-2 py-0.5 rounded">Seu Lucro: <span className="text-green-400">{profitPercent}%</span></span>
             <span>{maxAllowedPercent}% (Máximo)</span>
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
