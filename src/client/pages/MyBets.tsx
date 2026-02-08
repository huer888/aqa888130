import { useEffect, useState } from 'react'
import api from '../utils/api'
import { Ticket } from 'lucide-react'
import ThermalTicket from '../components/ThermalTicket'

export default function MyBets() {
  const [bets, setBets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBet, setSelectedBet] = useState<any>(null)

  useEffect(() => {
    fetchBets()
  }, [])

  const fetchBets = async () => {
    try {
      const res = await api.get('/sports/my-bets')
      setBets(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-textMuted">Carregando histórico...</div>

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
        <Ticket className="text-primary" /> Meus Pedidos
      </h2>

      {bets.length === 0 ? (
        <div className="bg-surface rounded-xl p-8 text-center text-textMuted">
           Nenhuma aposta encontrada.
        </div>
      ) : (
        <div className="space-y-3">
          {bets.map(bet => {
            const matchInfo = typeof bet.match_info === 'string' ? JSON.parse(bet.match_info) : bet.match_info
            const isWin = bet.status === 'won'
            const isLoss = bet.status === 'lost'
            const isPending = bet.status === 'pending'
            
            return (
              <div 
                key={bet.id} 
                onClick={() => setSelectedBet({...bet, matchInfo})}
                className="bg-surface rounded-xl p-4 border border-gray-800 relative overflow-hidden cursor-pointer hover:border-primary/50 transition active:scale-95"
              >
                <div className={`absolute top-0 right-0 w-2 h-full ${isWin ? 'bg-primary' : isLoss ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                
                <div className="flex justify-between items-start mb-2 pr-4">
                   <div className="text-xs text-textMuted font-mono">{bet.ticket_id}</div>
                   <div className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                       isWin ? 'bg-primary/20 text-primary' : 
                       isLoss ? 'bg-red-500/20 text-red-500' : 
                       'bg-yellow-500/20 text-yellow-500'
                   }`}>
                      {isPending ? 'Pendente' : bet.status}
                   </div>
                </div>

                <div className="mb-3">
                   <div className="text-sm font-bold text-white">{matchInfo.home} vs {matchInfo.away}</div>
                   <div className="text-xs text-textMuted">{new Date(matchInfo.date).toLocaleString()}</div>
                </div>

                <div className="bg-secondary p-3 rounded-lg flex justify-between items-center mb-2">
                   <div className="text-xs">
                      <div className="text-textMuted">Seleção</div>
                      <div className="font-bold text-white text-sm">{bet.selection}</div>
                   </div>
                   <div className="text-right">
                      <div className="text-xs text-textMuted">Odds</div>
                      <div className="font-bold text-primary text-sm">@{bet.odds}</div>
                   </div>
                </div>

                <div className="flex justify-between items-center text-xs">
                   <div>
                      <span className="text-textMuted block">Aposta</span>
                      <span className="text-white font-bold">R$ {Number(bet.amount || 0).toFixed(2)}</span>
                   </div>
                   <div className="text-right">
                      <span className="text-textMuted block">Retorno Potencial</span>
                      <span className="text-primary font-bold">R$ {Number(bet.potential_payout || 0).toFixed(2)}</span>
                   </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {selectedBet && (
          <ThermalTicket 
            isOpen={!!selectedBet} 
            onClose={() => setSelectedBet(null)} 
            data={
                selectedBet.match_id === 'parlay' || selectedBet.matchInfo?.type === 'parlay' 
                ? {
                    ticketId: selectedBet.ticket_id,
                    amount: selectedBet.amount,
                    potentialPayout: selectedBet.potential_payout,
                    items: selectedBet.matchInfo?.legs ? selectedBet.matchInfo.legs.map((leg: any) => ({
                        matchInfo: leg.matchInfo, // Full object {home, away, date} (now saved by backend)
                        selection: leg.selection,
                        odds: leg.odds
                    })) : []
                }
                : {
                    ticketId: selectedBet.ticket_id,
                    matchInfo: selectedBet.matchInfo,
                    selection: selectedBet.selection,
                    odds: selectedBet.odds,
                    amount: selectedBet.amount,
                    potentialPayout: selectedBet.potential_payout
                }
            } 
          />
      )}
    </div>
  )
}
