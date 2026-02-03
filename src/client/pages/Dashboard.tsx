import { useEffect, useState, useMemo, useRef } from 'react'
import api from '../utils/api'
import { formatBRL } from '../utils/formatters'
import ThermalTicket from '../components/ThermalTicket'
import SportAccordion from '../components/SportAccordion'
import { TrendingUp, ArrowRight, ChevronDown, ChevronUp, Calendar, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { format, isSameDay, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useUser } from '../context/UserContext'

// Brazil Time Helper (UTC-3)
function formatBrazilDate(isoString: string) {
    const date = new Date(isoString)
    const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
    const brazilTime = new Date(utc - (3 * 3600000));
    return brazilTime;
}

// Generate next 7 days in Brazil Time
function getNext7Days() {
    const today = new Date();
    // UTC-3 offset handling for day generation
    const utc = today.getTime() + (today.getTimezoneOffset() * 60000);
    const bzNow = new Date(utc - (3 * 3600000));
    
    const days = [];
    for(let i=0; i<7; i++) {
        const d = new Date(bzNow);
        d.setDate(bzNow.getDate() + i);
        days.push(d);
    }
    return days;
}

export default function Dashboard() {
  const [leagues, setLeagues] = useState<any[]>([])
  const [allMatches, setAllMatches] = useState<any[]>([]) 
  const [loading, setLoading] = useState(true)
  
  // New Bet Slip Logic
  const [betSlip, setBetSlip] = useState<any[]>([])
  const [isSlipOpen, setIsSlipOpen] = useState(false)
  const [amount, setAmount] = useState('')
  
  const [marketFilter, setMarketFilter] = useState('1x2')
  const [selectedDate, setSelectedDate] = useState<string>(format(getNext7Days()[0], 'yyyy-MM-dd')) // Default today
  
  const [ticketData, setTicketData] = useState<any>(null)
  const [showTicket, setShowTicket] = useState(false)
  const navigate = useNavigate()
  const { user } = useUser()

  // Helper to check auth and redirect
  const checkAuth = (e?: any) => {
    if (!localStorage.getItem('token')) {
        e?.preventDefault()
        e?.stopPropagation()
        navigate('/register')
        return false
    }
    return true
  }

  // Refs for Scroll Handling
  const marketScrollRef = useRef<HTMLDivElement>(null)
  const dateScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      const res = await api.get('/sports/events')
      if (res.data && Array.isArray(res.data)) {
        setLeagues(res.data)
        const matches = res.data.flatMap((l: any) => l.events.map((e: any) => ({
             ...e,
             league_name_display: l.name,
             league_country_display: l.country,
             rank: l.rank
        })))
        
        matches.sort((a: any, b: any) => new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime())
        setAllMatches(matches)
      } else {
        setLeagues([])
        setAllMatches([])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // Filter Matches by Selected Date & Remove Locked Matches
  const filteredMatches = useMemo(() => {
      const now = new Date().getTime();
      return allMatches.filter(match => {
          // Date Filter
          const bzDate = formatBrazilDate(match.commence_time)
          const dateKey = format(bzDate, 'yyyy-MM-dd')
          if (dateKey !== selectedDate) return false;

          // Lock Filter (Hide ended/locked matches)
          try {
              const start = new Date(match.commence_time).getTime();
              const diffMs = start - now;
              const isLocked = diffMs < 45 * 60 * 1000; 
              if (isLocked) return false;
          } catch(e) {}

          return true;
      })
  }, [allMatches, selectedDate])

  // Group by League
  const matchesByLeague = useMemo(() => {
      const groups: Record<string, any> = {};
      
      filteredMatches.forEach(match => {
          const key = match.league_id || match.league_name_display;
          if (!groups[key]) {
              groups[key] = {
                  id: match.league_id,
                  name: match.league_name_display,
                  country: match.league_country_display,
                  rank: match.rank || 0,
                  matches: []
              };
          }
          groups[key].matches.push(match);
      });

      // Sort by Rank DESC
      return Object.values(groups).sort((a: any, b: any) => b.rank - a.rank);
  }, [filteredMatches]);

  // --- Scroll Helpers ---
  const handleDateClick = (dateStr: string, index: number) => {
      setSelectedDate(dateStr)
      centerElement(dateScrollRef.current, index)
  }

  const centerElement = (container: HTMLDivElement | null, index: number) => {
      if (!container) return;
      const elements = container.children[0].children; // The inner flex container children
      if (elements[index]) {
          elements[index].scrollIntoView({
              behavior: 'smooth',
              block: 'nearest',
              inline: 'center'
          })
      }
  }

  const toggleBet = (event: any, outcome: any) => {
      // Auth Check
      if (!checkAuth()) return;

      const existingIndex = betSlip.findIndex(b => b.matchId === event.id);
      
      if (existingIndex >= 0 && betSlip[existingIndex].selection === (outcome.name === 'Draw' ? 'Empate' : outcome.name)) {
          setBetSlip(prev => prev.filter((_, i) => i !== existingIndex));
          return;
      }

      const newBet = {
          matchId: event.id,
          matchInfo: { 
            home: event.home_team, 
            away: event.away_team, 
            date: event.commence_time 
          },
          selection: outcome.name === 'Draw' ? 'Empate' : outcome.name,
          odds: outcome.price
      };

      if (existingIndex >= 0) {
          setBetSlip(prev => {
              const newSlip = [...prev];
              newSlip[existingIndex] = newBet;
              return newSlip;
          });
      } else {
          setBetSlip(prev => [...prev, newBet]);
      }
      
      if (betSlip.length === 0) setIsSlipOpen(true);
  }

  const removeBet = (index: number) => {
      setBetSlip(prev => prev.filter((_, i) => i !== index));
  }

  const confirmBet = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) < 1) {
      toast.error('Valor inválido')
      return
    }
    
    if (betSlip.length === 0) return;

    try {
      const payload = betSlip.length === 1 
        ? { ...betSlip[0], amount: Number(amount) }
        : { items: betSlip, amount: Number(amount) }

      const res = await api.post('/sports/bet', payload)
      
      setTicketData({
        items: betSlip,
        amount: Number(amount),
        ticketId: res.data.ticketId,
        potentialPayout: res.data.potentialPayout
      })
      
      setShowTicket(true)
      setBetSlip([])
      setAmount('')
      setIsSlipOpen(false)
    } catch (e: any) {
      const errorMsg = e.response?.data?.error || 'Falha ao apostar';
      
      // Friendly handling for common errors
      if (errorMsg.includes('Saldo insuficiente')) {
        toast.warning('Saldo insuficiente. Por favor, faça um depósito para continuar.')
      } else {
        toast.error(errorMsg)
      }
    }
  }

  const totalOdds = betSlip.reduce((acc, bet) => acc * bet.odds, 1);
  const potentialReturn = amount ? (Number(amount) * totalOdds).toFixed(2) : '0.00';
  const weekDays = getNext7Days();

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 text-textMuted">
       <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
       <div>Carregando mercados...</div>
    </div>
  )

  return (
    <div className="pb-24 space-y-4">
      {/* Motivational Banner */}
      <div 
        onClick={(e) => checkAuth(e) && navigate('/team')}
        className="mx-4 mt-4 bg-gradient-to-r from-[#00E701] to-[#00C701] rounded-xl p-5 flex items-center justify-between shadow-lg shadow-green-900/20 relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-transform"
      >
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
      
      {/* Date Navigation Tabs (Portuguese) */}
      <div className="px-4 overflow-x-auto no-scrollbar pb-2 border-b border-white/5" ref={dateScrollRef}>
          <div className="flex gap-4">
              {weekDays.map((date, idx) => {
                  const dateStr = format(date, 'yyyy-MM-dd')
                  const isSelected = selectedDate === dateStr
                  const displayDay = format(date, 'dd/MM')
                  // Portuguese Weekdays: Dom, Seg, Ter, Qua, Qui, Sex, Sáb
                  const displayWeek = idx === 0 ? 'HOJE' : format(date, 'EEE', { locale: ptBR }).replace('.', '').toUpperCase()
                  
                  return (
                      <button
                        key={dateStr}
                        onClick={() => handleDateClick(dateStr, idx)}
                        className={`flex flex-col items-center justify-center min-w-[50px] pb-2 transition-all relative ${isSelected ? 'text-[#00E701]' : 'text-textMuted hover:text-white'}`}
                      >
                          <span className="text-[10px] font-black tracking-wide mb-0.5">{displayWeek}</span>
                          <span className="text-xs font-medium opacity-80">{displayDay}</span>
                          {isSelected && <div className="absolute bottom-0 w-full h-0.5 bg-[#00E701] rounded-t-full shadow-[0_-2px_10px_rgba(0,231,1,0.5)]"></div>}
                      </button>
                  )
              })}
          </div>
      </div>

      {filteredMatches.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-16 text-textMuted gap-2">
              <Calendar size={32} className="opacity-20" />
              <div className="text-xs">Nenhum jogo disponível para esta data</div>
          </div>
      )}

      {/* Flat Match List -> Grouped List */}
      <div className="space-y-4 px-4">
          {matchesByLeague.map((group, index) => (
              <LeagueAccordion 
                  key={group.id} 
                  league={group} 
                  onBet={toggleBet} 
                  selectedBets={betSlip}
                  defaultOpen={index === 0} 
              />
          ))}
      </div>

      {/* Persistent Bet Slip Floating Bar */}
      {betSlip.length > 0 && !isSlipOpen && (
          <div className="fixed bottom-20 left-4 right-4 z-40 animate-in slide-in-from-bottom duration-300">
              <button 
                onClick={() => setIsSlipOpen(true)}
                className="w-full bg-[#00E701] text-slate-900 font-black py-3 rounded-xl shadow-xl shadow-green-500/20 flex justify-between items-center px-5"
              >
                  <div className="flex items-center gap-2">
                      <span className="bg-slate-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">
                          {betSlip.length}
                      </span>
                      <span>Boletim de Aposta</span>
                  </div>
                  <div className="text-sm">
                      Odd Total: <span className="text-lg">@{totalOdds.toFixed(2)}</span>
                  </div>
              </button>
          </div>
      )}

      {/* Bet Slip Drawer (Full) */}
      {isSlipOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-end backdrop-blur-sm" onClick={() => setIsSlipOpen(false)}>
          <div className="bg-surface w-full max-w-md mx-auto rounded-t-2xl p-6 animate-in slide-in-from-bottom duration-300 shadow-2xl border-t border-gray-700 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-4 shrink-0">
                <div className="flex items-center gap-2">
                   <div className="bg-[#00E701] text-slate-900 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                      {betSlip.length}
                   </div>
                   <h3 className="font-bold text-lg text-white">Boletim</h3>
                </div>
                <button onClick={() => setIsSlipOpen(false)} className="text-textMuted hover:text-white">
                    <ChevronDown />
                </button>
            </div>
            
            {/* Scrollable Bet List */}
            <div className="flex-1 overflow-y-auto min-h-0 space-y-2 mb-4 pr-1">
                {betSlip.map((bet, idx) => (
                    <div key={`${bet.matchId}-${idx}`} className="bg-[#1a2c38] p-3 rounded-lg flex justify-between items-center border border-white/5 relative group">
                        <div>
                            <div className="text-[10px] text-textMuted mb-0.5">{bet.matchInfo.home} vs {bet.matchInfo.away}</div>
                            <div className="font-bold text-[#00E701] text-sm">{bet.selection}</div>
                        </div>
                        <div className="font-black text-white text-lg pr-8">@{bet.odds.toFixed(2)}</div>
                        <button 
                            onClick={() => removeBet(idx)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500/50 hover:text-red-500 p-2"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Footer Input */}
            <div className="shrink-0 pt-2 border-t border-white/10">
                <div className="mb-4">
                    <label className="block text-xs text-textMuted mb-2 font-bold uppercase">Valor da Aposta (BRL)</label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted">R$</span>
                        <input 
                            type="number" 
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            className="w-full bg-background border border-gray-700 rounded-lg p-3 pl-10 text-xl font-bold text-white focus:border-[#00E701] focus:ring-1 focus:ring-[#00E701] outline-none transition-all"
                            placeholder="0.00"
                            autoFocus
                        />
                    </div>
                    <div className="flex justify-between mt-2 text-xs px-1">
                        <span className="text-textMuted">Retorno Potencial (@{totalOdds.toFixed(2)}):</span>
                        <span className="text-[#00E701] font-bold text-lg">
                            {formatBRL(amount ? Number(amount) * totalOdds : 0)}
                        </span>
                    </div>
                </div>
                
                <button onClick={confirmBet} className="w-full bg-[#00E701] hover:bg-[#00c701] text-slate-900 py-3.5 rounded-xl font-black text-lg shadow-lg shadow-green-500/20 transition flex items-center justify-center gap-2">
                    Apostar Agora <ArrowRight size={18} />
                </button>
            </div>
          </div>
        </div>
      )}

      <ThermalTicket isOpen={showTicket} onClose={() => setShowTicket(false)} data={ticketData} />
    </div>
  )
}

function LeagueAccordion({ league, onBet, selectedBets, defaultOpen = false }: { league: any, onBet: any, selectedBets: any[], defaultOpen?: boolean }) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="bg-[#15222b] rounded-xl overflow-hidden border border-white/5 shadow-sm">
            <div 
                className="flex justify-between items-center p-3 bg-[#1a2c38] cursor-pointer hover:bg-[#233542] transition-colors border-b border-white/5"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-3 overflow-hidden">
                    {/* Country Flag or Icon placeholder */}
                    <div className="w-1 h-5 rounded-full bg-[#00E701] shrink-0"></div>
                    <div className="flex flex-col min-w-0">
                        <span className="font-bold text-sm text-white leading-tight truncate">{league.name}</span>
                        <span className="text-[10px] text-textMuted uppercase truncate font-bold opacity-70">{league.country}</span>
                    </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[10px] bg-black/40 px-2 py-0.5 rounded text-white font-bold border border-white/5">
                        {league.matches.length}
                    </span>
                    {isOpen ? <ChevronUp size={16} className="text-textMuted" /> : <ChevronDown size={16} className="text-textMuted" />}
                </div>
            </div>

            {isOpen && (
                <div className="p-2 space-y-2 bg-[#0f1920]">
                    <SportAccordion matches={league.matches} onBet={onBet} selectedBets={selectedBets} />
                </div>
            )}
        </div>
    )
}
