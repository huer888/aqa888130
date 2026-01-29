import { useState } from 'react'
import { ChevronDown, Clock, Trophy, Target, Shield } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import TeamLogo from './TeamLogo'

interface Outcome {
  name: string
  price: number
}

interface Match {
  id: string
  home_team: string
  away_team: string
  commence_time: string
  outcomes: Outcome[]
  markets?: {
    h2h?: Outcome[]
    totals?: Outcome[]
    double_chance?: Outcome[]
  }
}

interface Props {
  league: string
  matches: Match[]
  onBet: (match: Match, outcome: Outcome) => void
}

type MarketType = 'h2h' | 'totals' | 'double_chance'

export default function SportAccordion({ league, matches, onBet }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [marketType, setMarketType] = useState<MarketType>('h2h')

  // Ensure matches is always an array
  const safeMatches = Array.isArray(matches) ? matches : []
  // Ensure league is a string
  const leagueName = typeof league === 'string' ? league : 'Campeonato'

  const handleBetClick = (match: Match, selectionName: string, odds: number) => {
      if(!localStorage.getItem('token')) {
          toast.error('Faça login para apostar')
          return
      }
      onBet(match, { name: selectionName, price: odds })
  }

  const formatDate = (dateStr: string) => {
      try {
          const date = new Date(dateStr)
          const today = new Date()
          const isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth()
          const time = format(date, 'HH:mm')
          const day = format(date, 'dd/MM', { locale: ptBR })
          return isToday ? `Hoje ${time}` : `${day} ${time}`
      } catch (e) {
          return ''
      }
  }

  if (safeMatches.length === 0) return null

  return (
    <div className="mb-2 bg-surface rounded-lg overflow-hidden border border-white/5 shadow-sm">
      {/* Header */}
      <div className="bg-[#1a2c38]">
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#233542] transition-colors"
          >
            <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-primary font-bold text-[10px]">
                    {leagueName.substring(0, 2).toUpperCase()}
                </div>
                <span className="font-bold text-white text-xs uppercase tracking-wide text-left">{leagueName.replace('Brazil - ', '')}</span>
            </div>
            <ChevronDown 
                size={16} 
                className={`text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
            />
          </button>
          
          {/* Market Tabs (Only visible when open) */}
          {isOpen && (
              <div className="flex px-2 pb-2 gap-1 overflow-x-auto no-scrollbar">
                  <MarketTab 
                    active={marketType === 'h2h'} 
                    onClick={() => setMarketType('h2h')} 
                    label="Resultado" 
                    icon={<Trophy size={12} />}
                  />
                  <MarketTab 
                    active={marketType === 'totals'} 
                    onClick={() => setMarketType('totals')} 
                    label="Gols (2.5)" 
                    icon={<Target size={12} />}
                  />
                  <MarketTab 
                    active={marketType === 'double_chance'} 
                    onClick={() => setMarketType('double_chance')} 
                    label="Dupla Chance" 
                    icon={<Shield size={12} />}
                  />
              </div>
          )}
      </div>

      {/* Matches */}
      <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="divide-y divide-gray-800">
            {safeMatches.map(match => {
                const markets = match.markets || {}
                
                // Render based on marketType
                let buttons = null

                if (marketType === 'h2h') {
                    // Fallback to old outcomes if markets structure missing
                    const h2h = markets.h2h || match.outcomes || []
                    const home = h2h.find(o => o.name === match.home_team)?.price || 1.00
                    const draw = h2h.find(o => o.name === 'Draw')?.price || 1.00
                    const away = h2h.find(o => o.name === match.away_team)?.price || 1.00

                    buttons = (
                        <>
                             <BetButton label="1" odds={home} onClick={() => handleBetClick(match, match.home_team, home)} />
                             <BetButton label="X" odds={draw} onClick={() => handleBetClick(match, 'Draw', draw)} />
                             <BetButton label="2" odds={away} onClick={() => handleBetClick(match, match.away_team, away)} />
                        </>
                    )
                } else if (marketType === 'totals') {
                    const totals = markets.totals || []
                    const over = totals.find(o => o.name.includes('Over'))?.price || 1.00
                    const under = totals.find(o => o.name.includes('Under'))?.price || 1.00
                    
                    if (totals.length === 0) {
                        buttons = <div className="text-[10px] text-textMuted w-full text-center py-2">Indisponível</div>
                    } else {
                        buttons = (
                            <>
                                <BetButton label="Mais 2.5" odds={over} onClick={() => handleBetClick(match, 'Over 2.5', over)} />
                                <BetButton label="Menos 2.5" odds={under} onClick={() => handleBetClick(match, 'Under 2.5', under)} />
                            </>
                        )
                    }
                } else if (marketType === 'double_chance') {
                     const dc = markets.double_chance || []
                     const x1 = dc.find(o => o.name === '1X')?.price || 1.00
                     const x12 = dc.find(o => o.name === '12')?.price || 1.00
                     const x2 = dc.find(o => o.name === 'X2')?.price || 1.00

                     if (dc.length === 0) {
                        buttons = <div className="text-[10px] text-textMuted w-full text-center py-2">Indisponível</div>
                     } else {
                         buttons = (
                            <>
                                <BetButton label="1X" odds={x1} onClick={() => handleBetClick(match, '1X', x1)} />
                                <BetButton label="12" odds={x12} onClick={() => handleBetClick(match, '12', x12)} />
                                <BetButton label="X2" odds={x2} onClick={() => handleBetClick(match, 'X2', x2)} />
                            </>
                         )
                     }
                }

                return (
                    <div key={match.id} className="px-4 py-3 hover:bg-white/5 transition-colors">
                        <div className="flex flex-col md:flex-row gap-3 justify-between items-center">
                            
                            <div className="flex-1 w-full">
                                <div className="flex items-center gap-2 text-[10px] text-textMuted mb-2">
                                    <Clock size={10} />
                                    <span>{formatDate(match.commence_time)}</span>
                                </div>
                                
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <TeamLogo name={match.home_team} size={16} />
                                            <span className="font-bold text-white text-xs">{match.home_team}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <TeamLogo name={match.away_team} size={16} />
                                            <span className="font-bold text-white text-xs">{match.away_team}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-1.5 w-full md:w-auto mt-2 md:mt-0 min-w-[200px]">
                                {buttons}
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
      </div>
    </div>
  )
}

function MarketTab({ active, onClick, label, icon }: { active: boolean, onClick: () => void, label: string, icon: any }) {
    return (
        <button 
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${
                active 
                ? 'bg-primary text-black border-primary' 
                : 'bg-white/5 text-textMuted border-white/10 hover:bg-white/10'
            }`}
        >
            {icon}
            {label}
        </button>
    )
}

function BetButton({ label, odds, onClick }: { label: string, odds: number, onClick: () => void }) {
    return (
        <button 
            onClick={onClick}
            className="flex-1 md:w-20 bg-[#213743] hover:bg-[#2b4250] active:scale-95 transition-all p-1.5 rounded-md flex flex-col items-center justify-center border border-transparent hover:border-gray-600 group shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] hover:shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"
        >
            <span className="text-[10px] text-textMuted group-hover:text-gray-300 font-medium mb-0.5 whitespace-nowrap">{label}</span>
            <span className="text-[#00E701] font-bold text-xs tracking-wide drop-shadow-sm">{odds.toFixed(2)}</span>
        </button>
    )
}
