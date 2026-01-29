import { useState, useEffect } from 'react'
import { PlusCircle, Trash2, Calendar, Save } from 'lucide-react'
import api from '../utils/api'
import { toast } from 'sonner'
import { format } from 'date-fns'

export default function ManualMatchManager() {
    const [matches, setMatches] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [showForm, setShowForm] = useState(false)

    // Form State
    const [league, setLeague] = useState('Manual League')
    const [homeTeam, setHomeTeam] = useState('')
    const [awayTeam, setAwayTeam] = useState('')
    const [date, setDate] = useState('')
    const [time, setTime] = useState('')
    
    // Odds
    const [homeOdds, setHomeOdds] = useState('')
    const [drawOdds, setDrawOdds] = useState('')
    const [awayOdds, setAwayOdds] = useState('')

    useEffect(() => {
        fetchMatches()
    }, [])

    const fetchMatches = async () => {
        setLoading(true)
        try {
            const res = await api.get('/admin/matches')
            if (Array.isArray(res.data)) {
                setMatches(res.data)
            } else {
                console.error('Invalid matches data:', res.data)
                setMatches([])
            }
        } catch (e) {
            toast.error('Failed to load matches')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this match?')) return
        try {
            await api.delete(`/admin/matches/${id}`)
            toast.success('Match deleted')
            fetchMatches()
        } catch (e) {
            toast.error('Delete failed')
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (!league || !homeTeam || !awayTeam || !date || !time || !homeOdds || !drawOdds || !awayOdds) {
            toast.error('Please fill all fields')
            return
        }

        const commenceTime = new Date(`${date}T${time}`).toISOString()

        try {
            await api.post('/admin/matches', {
                league_name: league,
                home_team: homeTeam,
                away_team: awayTeam,
                commence_time: commenceTime,
                home_odds: parseFloat(homeOdds),
                draw_odds: parseFloat(drawOdds),
                away_odds: parseFloat(awayOdds)
            })
            toast.success('Match created successfully')
            setShowForm(false)
            // Reset form
            setHomeTeam(''); setAwayTeam(''); setHomeOdds(''); setDrawOdds(''); setAwayOdds('')
            fetchMatches()
        } catch (e) {
            toast.error('Failed to create match')
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Manual Match Management</h2>
                <button 
                    onClick={() => setShowForm(!showForm)} 
                    className="bg-[#00E701] text-black px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-[#00c701] transition"
                >
                    <PlusCircle size={18} /> Add Match
                </button>
            </div>

            {/* Create Form */}
            {showForm && (
                <div className="bg-[#1a2c38] p-6 rounded-xl border border-gray-700 animate-in slide-in-from-top duration-300">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">League Name</label>
                                <input type="text" value={league} onChange={e => setLeague(e.target.value)} className="w-full bg-[#0f212e] border border-gray-700 rounded p-3 text-white focus:border-[#00E701] outline-none" placeholder="e.g. Premier League" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Date</label>
                                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-[#0f212e] border border-gray-700 rounded p-3 text-white focus:border-[#00E701] outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Time</label>
                                    <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full bg-[#0f212e] border border-gray-700 rounded p-3 text-white focus:border-[#00E701] outline-none" />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Home Team</label>
                                <input type="text" value={homeTeam} onChange={e => setHomeTeam(e.target.value)} className="w-full bg-[#0f212e] border border-gray-700 rounded p-3 text-white focus:border-[#00E701] outline-none" placeholder="Home Team Name" />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Away Team</label>
                                <input type="text" value={awayTeam} onChange={e => setAwayTeam(e.target.value)} className="w-full bg-[#0f212e] border border-gray-700 rounded p-3 text-white focus:border-[#00E701] outline-none" placeholder="Away Team Name" />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 bg-black/20 p-4 rounded-lg border border-gray-800">
                            <div>
                                <label className="block text-xs text-[#00E701] mb-1 font-bold text-center">Home Odds (1)</label>
                                <input type="number" step="0.01" value={homeOdds} onChange={e => setHomeOdds(e.target.value)} className="w-full bg-[#0f212e] border border-gray-700 rounded p-3 text-center text-white font-mono font-bold focus:border-[#00E701] outline-none" placeholder="1.50" />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1 font-bold text-center">Draw Odds (X)</label>
                                <input type="number" step="0.01" value={drawOdds} onChange={e => setDrawOdds(e.target.value)} className="w-full bg-[#0f212e] border border-gray-700 rounded p-3 text-center text-white font-mono font-bold focus:border-[#00E701] outline-none" placeholder="3.20" />
                            </div>
                            <div>
                                <label className="block text-xs text-[#00E701] mb-1 font-bold text-center">Away Odds (2)</label>
                                <input type="number" step="0.01" value={awayOdds} onChange={e => setAwayOdds(e.target.value)} className="w-full bg-[#0f212e] border border-gray-700 rounded p-3 text-center text-white font-mono font-bold focus:border-[#00E701] outline-none" placeholder="2.10" />
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button type="submit" className="bg-[#00E701] text-black px-6 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-[#00c701] shadow-lg shadow-green-500/20 transition">
                                <Save size={18} /> Create Match
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* List */}
            <div className="bg-[#1a2c38] rounded-xl border border-gray-800 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-black/20 text-gray-400 font-bold uppercase text-xs">
                        <tr>
                            <th className="p-4">Date</th>
                            <th className="p-4">League</th>
                            <th className="p-4">Match</th>
                            <th className="p-4 text-center">Odds</th>
                            <th className="p-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {matches.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-gray-500">No manual matches found</td>
                            </tr>
                        )}
                        {matches.map(m => (
                            <tr key={m.id} className="hover:bg-white/5 transition-colors">
                                <td className="p-4 text-gray-300">
                                    <div className="flex items-center gap-2">
                                        <Calendar size={14} className="text-gray-500" />
                                        {format(new Date(m.commence_time), 'dd/MM/yyyy HH:mm')}
                                    </div>
                                </td>
                                <td className="p-4 font-bold text-white">{m.league_name}</td>
                                <td className="p-4">
                                    <div className="text-white font-bold">{m.home_team}</div>
                                    <div className="text-xs text-gray-500">vs</div>
                                    <div className="text-white font-bold">{m.away_team}</div>
                                </td>
                                <td className="p-4">
                                    <div className="flex gap-2 justify-center">
                                        <span className="bg-[#0f212e] px-2 py-1 rounded text-[#00E701] font-mono font-bold text-xs border border-gray-700">{m.home_odds}</span>
                                        <span className="bg-[#0f212e] px-2 py-1 rounded text-gray-400 font-mono font-bold text-xs border border-gray-700">{m.draw_odds}</span>
                                        <span className="bg-[#0f212e] px-2 py-1 rounded text-[#00E701] font-mono font-bold text-xs border border-gray-700">{m.away_odds}</span>
                                    </div>
                                </td>
                                <td className="p-4 text-right">
                                    <button 
                                        onClick={() => handleDelete(m.id)}
                                        className="text-red-500 hover:text-red-400 p-2 hover:bg-red-500/10 rounded transition"
                                        title="Delete Match"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
