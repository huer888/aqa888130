import { useEffect, useState } from 'react'
import api from '../utils/api'
import ThermalTicket from '../components/ThermalTicket'
import SportAccordion from '../components/SportAccordion'
import { TrendingUp, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

export default function Dashboard() {
  const [leagues, setLeagues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBet, setSelectedBet] = useState<any>(null)
  const [amount, setAmount] = useState('')
  const [ticketData, setTicketData] = useState<any>(null)
  const [showTicket, setShowTicket] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      const res = await api.get('/sports/events')
      if (res.data && Array.isArray(res.data)) {
        setLeagues(res.data)
      } else {
        setLeagues([])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleBetClick = (event: any, outcome: any) => {
    setSelectedBet({
      matchId: event.id,
      matchInfo: { 
        home: event.home_team, 
        away: event.away_team, 
        date: event.commence_time 
      },
      selection: outcome.name === 'Draw' ? 'Empate' : outcome.name,
      odds: outcome.price
    })
  }

  const confirmBet = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) < 1) {
      toast.error('Valor inválido')
      return
    }

    try {
      const res = await api.post('/sports/bet', {
        ...selectedBet,
        amount: Number(amount)
      })
      setTicketData({
        ...selectedBet,
        amount: Number(amount),
        ticketId: res.data.ticketId,
        potentialPayout: res.data.potentialPayout
      })
      setShowTicket(true)
      setSelectedBet(null)
      setAmount('')
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Falha ao apostar')
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 text-textMuted">
       <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
       <div>Carregando mercados...</div>
    </div>
  )

  return (
    <div className="pb-4 space-y-4">
      {/* Motivational Banner (Agent Focus) */}
      <div 
        onClick={() => navigate('/team')}
        className="mx-4 mt-4 bg-gradient-to-r from-[#00E701] to-[#00C701] rounded-xl p-5 flex items-center justify-between shadow-lg shadow-green-900/20 relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-transform"
      >
          {/* Decor */}
          <div className="absolute -right-4 -bottom-8 opacity-20 text-black transform rotate-12">
              <TrendingUp size={80} />
          </div>
          
          <div className="relative z-10 text-slate-900">
              <div className="font-black text-lg leading-tight w-2/3">
                  Junte-se à Stake e conquiste a liberdade financeira.
              </div>
              <div className="text-xs font-bold mt-2 flex items-center gap-1 opacity-80">
                  Marketing de Afiliados <ArrowRight size={12} />
              </div>
          </div>
      </div>

      {leagues.length === 0 && !loading && (
          <div className="text-center text-textMuted py-10">Nenhum jogo disponível</div>
      )}

      {/* League Accordions */}
      <div className="space-y-2">
          {leagues.map((league: any) => (
              <SportAccordion key={league.id} league={league.name} matches={league.events} onBet={handleBetClick} />
          ))}
      </div>

      {/* Bet Slip Drawer */}
      {selectedBet && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-end backdrop-blur-sm">
          <div className="bg-surface w-full max-w-md mx-auto rounded-t-2xl p-6 animate-in slide-in-from-bottom duration-300 shadow-2xl border-t border-gray-700">
            <div className="flex justify-between items-start mb-4 border-b border-gray-700 pb-4">
                <div>
                   <h3 className="font-bold text-lg text-white">Boletim de Aposta</h3>
                   <div className="text-xs text-textMuted mt-1">
                       {selectedBet.matchInfo.home} vs {selectedBet.matchInfo.away}
                   </div>
                </div>
                <div className="bg-[#1475e1] text-white px-3 py-1 rounded text-sm font-bold shadow-lg shadow-blue-500/20">
                    @{Number(selectedBet?.odds || 0).toFixed(2)}
                </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-xs text-textMuted mb-2 font-bold uppercase">Valor da Aposta (BRL)</label>
              <div className="relative">
                 <span className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted">R$</span>
                 <input 
                    type="number" 
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full bg-background border border-gray-700 rounded-lg p-4 pl-10 text-xl font-bold text-white focus:border-[#1475e1] focus:ring-1 focus:ring-[#1475e1] outline-none transition-all"
                    placeholder="0.00"
                    autoFocus
                 />
              </div>
              <div className="flex justify-between mt-3 text-xs px-1">
                 <span className="text-textMuted">Retorno Potencial:</span>
                 <span className="text-primary font-bold text-lg">
                    R$ {amount ? (Number(amount) * (selectedBet?.odds || 0)).toFixed(2) : '0.00'}
                 </span>
              </div>
            </div>
            
            <div className="flex gap-3">
               <button onClick={() => setSelectedBet(null)} className="flex-1 bg-surfaceHover hover:bg-gray-600 text-textMuted hover:text-white py-3 rounded-lg font-bold transition">
                 Cancelar
               </button>
               <button onClick={confirmBet} className="flex-[2] bg-primary hover:bg-primaryHover text-slate-900 py-3 rounded-lg font-bold shadow-lg shadow-primary/20 transition">
                 Confirmar Aposta
               </button>
            </div>
          </div>
        </div>
      )}

      <ThermalTicket isOpen={showTicket} onClose={() => setShowTicket(false)} data={ticketData} />
    </div>
  )
}
