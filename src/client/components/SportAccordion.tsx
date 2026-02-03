import { useState } from 'react'
import { Clock, ChevronUp } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import TeamLogo from './TeamLogo'
import { cleanLeagueName } from '../utils/formatters'

interface Outcome {
  id?: string
  name: string
  price: number
}

interface Market {
    id: string
    name: string
    outcomes: Outcome[]
}

interface Match {
  id: string
  home_team: string
  away_team: string
  commence_time: string
  league_name_display?: string
  league_country_display?: string
  outcomes: Outcome[]
  markets?: Record<string, Market>
}

interface Props {
  matches: Match[]
  onBet: (match: Match, outcome: Outcome) => void
  marketFilter?: string // Kept for prop compat, but ignored in UI logic mostly
  league?: string
  selectedBets?: any[]
}

export default function SportAccordion({ matches, onBet, selectedBets = [] }: Props) {
  const safeMatches = Array.isArray(matches) ? matches : []
  
  if (safeMatches.length === 0) return null

  return (
    <div className="space-y-3">
        {safeMatches.map(match => (
            <MatchCard 
                key={match.id} 
                match={match} 
                onBet={onBet} 
                selectedBets={selectedBets} 
            />
        ))}
    </div>
  )
}

function MatchCard({ match, onBet, selectedBets = [] }: { match: Match, onBet: (m: Match, o: Outcome) => void, selectedBets: any[] }) {
    const [isExpanded, setIsExpanded] = useState(false)
    const outcomes = match.outcomes || []
    const markets = match.markets || {}
    const isAlgo = (match as any).is_algo;
    
    // Check if this match has any selection in slip
    const matchBets = selectedBets.filter(b => b.matchId === match.id);
    
    const isSelected = (outcomeName: string) => {
        // Normalize names for comparison (Draw/Empate)
        return matchBets.some(b => b.selection === (outcomeName === 'Draw' ? 'Empate' : outcomeName));
    }

    const handleBetClick = (selectionName: string, odds: number) => {
        if(!localStorage.getItem('token')) {
            toast.error('Faça login para apostar')
            return
        }
        onBet(match, { name: selectionName, price: odds })
    }

    // Helper for buttons
    const renderButton = (o: Outcome | undefined, labelOverride?: string) => {
        if (!o) return <div className="flex-1"></div>;
        const label = labelOverride || o.name;
        const selected = isSelected(label);
        return (
            <BetButton 
                key={o.id || label}
                label={label}
                odds={o.price}
                onClick={() => handleBetClick(label, o.price)}
                compact
                selected={selected}
            />
        )
    }

    const formatTime = (dateStr: string) => {
        try {
            const date = new Date(dateStr)
            const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
            const brazilDate = new Date(utc - (3 * 3600000));
            return format(brazilDate, 'HH:mm')
        } catch (e) {
            return '--:--'
        }
    }

    // Check if match is starting soon (< 60 mins)
    const isStartingSoon = () => {
        try {
            const now = new Date();
            const start = new Date(match.commence_time);
            const diffMs = start.getTime() - now.getTime();
            // If started or starting in less than 45 mins, lock odds
            return diffMs < 45 * 60 * 1000;
        } catch(e) { return false; }
    }

    const locked = isStartingSoon();

    // Main 1x2 Outcomes for the card
    const homeOutcome = outcomes.find(o => o.name === match.home_team) || outcomes[0]
    const drawOutcome = outcomes.find(o => o.name === 'Draw') || outcomes[1]
    const awayOutcome = outcomes.find(o => o.name === match.away_team) || outcomes[2]

    return (
        <div className="bg-surface rounded-xl overflow-hidden border border-white/5 shadow-sm relative group">
            {isAlgo && <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-500/50 rounded-bl-md z-10" title="Odds geradas automaticamente"></div>}

            <div className="flex flex-col p-3 gap-3 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setIsExpanded(!isExpanded)}>
                
                {/* Top Row: League & Time */}
                <div className="flex justify-between items-center text-[10px] text-textMuted border-b border-white/5 pb-2">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-3 rounded-full bg-[#00E701]"></div>
                        <span className="font-bold uppercase tracking-wider truncate max-w-[200px]">
                            {cleanLeagueName(match.league_name_display || 'League', match.league_country_display)}
                        </span>
                    </div>
                    <div className={`font-bold ${locked ? 'text-red-500' : 'text-white'}`}>
                        {formatTime(match.commence_time)}
                    </div>
                </div>

                {/* Middle Row: Teams (Larger) */}
                <div className="flex justify-between items-center px-1">
                    <div className="flex items-center gap-3">
                        <TeamLogo name={match.home_team} size={24} />
                        <span className="font-bold text-gray-100 text-sm truncate max-w-[120px]">{match.home_team}</span>
                    </div>
                    <span className="text-textMuted text-xs font-bold">vs</span>
                    <div className="flex items-center gap-3 flex-row-reverse">
                        <TeamLogo name={match.away_team} size={24} />
                        <span className="font-bold text-gray-100 text-sm truncate max-w-[120px] text-right">{match.away_team}</span>
                    </div>
                </div>

                {/* Bottom Row: 1x2 Buttons + More Button */}
                <div className="flex gap-2 h-[42px]" onClick={e => e.stopPropagation()}>
                    {locked ? (
                        <div className="w-full flex items-center justify-center bg-[#15222b] rounded text-red-400 font-bold text-xs uppercase">
                            Apostas Encerradas
                        </div>
                    ) : (
                        <>
                            {renderButton(homeOutcome, '1')}
                            {renderButton(drawOutcome, 'X')}
                            {renderButton(awayOutcome, '2')}
                            <button 
                                onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                                className={`flex-1 bg-[#1a2c38] hover:bg-[#233542] text-textMuted rounded flex flex-col items-center justify-center border border-transparent hover:border-gray-600 transition-all active:scale-95 ${isExpanded ? 'border-[#00E701]/50 text-[#00E701]' : ''}`}
                            >
                                <span className="text-[9px] font-bold mb-0.5">Mais</span>
                                <span className="text-[10px] font-black">+Opções</span>
                            </button>
                        </>
                    )}
                </div>

            </div>

            {/* Expanded Area - Full Width */}
            {isExpanded && !locked && (
                <div className="bg-[#15222b] border-t border-white/5 px-3 py-4 animate-in slide-in-from-top-1 duration-200" onClick={e => e.stopPropagation()}>
                    
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             {/* Double Chance */}
                             {markets['dc'] && (
                                <div>
                                    <div className="text-[10px] text-textMuted mb-1.5 font-bold uppercase">Dupla Chance</div>
                                    <div className="grid grid-cols-3 gap-1.5">
                                        {markets['dc'].outcomes.slice(0, 3).map((o: Outcome) => 
                                            renderButton(o, (o.name || '').replace('Draw', 'X').replace('/', ''))
                                        )}
                                    </div>
                                </div>
                             )}
                             
                             {/* BTS & OU */}
                             <div className="space-y-4">
                                 {markets['bts'] && (
                                    <div>
                                        <div className="text-[10px] text-textMuted mb-1.5 font-bold uppercase">Ambos Marcam</div>
                                        <div className="grid grid-cols-2 gap-1.5">
                                            {markets['bts'].outcomes.map((o: Outcome) => 
                                                renderButton(o, o.name === 'Yes' ? 'Sim' : 'Não')
                                            )}
                                        </div>
                                    </div>
                                 )}
                                 {(markets['ou_2.5'] || markets['ou_main']) && (
                                    <div>
                                        <div className="text-[10px] text-textMuted mb-1.5 font-bold uppercase">{(markets['ou_2.5'] || markets['ou_main']).name}</div>
                                        <div className="grid grid-cols-2 gap-1.5">
                                            {(markets['ou_2.5'] || markets['ou_main']).outcomes.map((o: Outcome) => renderButton(o))}
                                        </div>
                                    </div>
                                 )}
                             </div>
                        </div>

                        {/* Correct Score Grid */}
                        {markets['cs'] && (
                            <div>
                                <div className="text-[10px] text-textMuted mb-1.5 font-bold uppercase">Placar Correto</div>
                                <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
                                    {markets['cs'].outcomes.map((o: Outcome) => renderButton(o))}
                                </div>
                            </div>
                        )}

                        {/* HT/FT Grid */}
                        {markets['htft'] && (
                            <div>
                                <div className="text-[10px] text-textMuted mb-1.5 font-bold uppercase">Intervalo / Final</div>
                                <div className="grid grid-cols-3 gap-1.5">
                                    {markets['htft'].outcomes.slice(0, 9).map((o: Outcome) => renderButton(o))}
                                </div>
                            </div>
                        )}

                        {/* Total Goals */}
                        {markets['tg'] && (
                            <div>
                                <div className="text-[10px] text-textMuted mb-1.5 font-bold uppercase">Total de Gols</div>
                                <div className="grid grid-cols-4 gap-1.5">
                                    {markets['tg'].outcomes.slice(0, 4).map((o: Outcome) => renderButton(o))}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <button 
                        onClick={() => setIsExpanded(false)}
                        className="w-full mt-4 flex items-center justify-center gap-1 text-[10px] text-textMuted hover:text-white py-2 bg-white/5 rounded hover:bg-white/10 transition-colors"
                    >
                        <ChevronUp size={12} /> Recolher Opções
                    </button>
                </div>
            )}
        </div>
    )
}

function BetButton({ label, odds, onClick, compact, selected }: { label: string, odds: number, onClick: () => void, compact?: boolean, selected?: boolean }) {
    // Force Hide 1.01
    const displayOdds = odds <= 1.01 ? '-' : odds.toFixed(2);
    const disabled = odds <= 1.01;

    return (
        <button 
            onClick={disabled ? undefined : onClick}
            disabled={disabled}
            className={`flex-1 transition-all rounded flex flex-col items-center justify-center border group shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)] min-h-[42px] ${selected ? 'bg-[#00E701] border-[#00E701] shadow-[0_0_10px_rgba(0,231,1,0.3)]' : (disabled ? 'bg-[#15222b] border-transparent opacity-50 cursor-not-allowed' : 'bg-[#213743] hover:bg-[#2b4250] border-transparent hover:border-gray-600 active:scale-95')}`}
        >
            <span className={`font-bold leading-none mb-0.5 truncate max-w-full px-0.5 ${selected ? 'text-slate-900 text-[11px]' : 'text-gray-400 group-hover:text-gray-200 text-[10px]'}`}>{label}</span>
            <span className={`font-black leading-none ${selected ? 'text-slate-900 text-[12px]' : 'text-[#00E701] text-[13px]'}`}>{displayOdds}</span>
        </button>
    )
}
