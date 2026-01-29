import { useEffect, useState } from 'react'
import api from '../utils/api'
import { History, ArrowDownLeft, ArrowUpRight } from 'lucide-react'

export default function Transactions() {
  const [txs, setTxs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTxs()
  }, [])

  const fetchTxs = async () => {
    try {
      const res = await api.get('/wallet/transactions')
      setTxs(res.data)
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
        <History className="text-primary" /> Histórico de Transações
      </h2>

      {txs.length === 0 ? (
        <div className="bg-surface rounded-xl p-8 text-center text-textMuted">
           Nenhuma transação encontrada.
        </div>
      ) : (
        <div className="space-y-3">
          {txs.map(tx => {
            const isIn = ['deposit', 'commission', 'payout'].includes(tx.type)
            
            return (
              <div key={tx.id} className="bg-surface rounded-xl p-4 border border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className={`p-2 rounded-full ${isIn ? 'bg-primary/20 text-primary' : 'bg-red-500/20 text-red-500'}`}>
                      {isIn ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                   </div>
                   <div>
                      <div className="text-sm font-bold text-white capitalize">{tx.type === 'bet' ? 'Aposta' : tx.type === 'deposit' ? 'Depósito' : tx.type === 'withdraw' ? 'Saque' : 'Comissão'}</div>
                      <div className="text-[10px] text-textMuted">{new Date(tx.created_at).toLocaleString()}</div>
                   </div>
                </div>
                
                <div className="text-right">
                   <div className={`font-bold ${isIn ? 'text-primary' : 'text-white'}`}>
                      {isIn ? '+' : '-'} R$ {Number(tx.amount || 0).toFixed(2)}
                   </div>
                   <div className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded inline-block mt-1 ${
                       tx.status === 'completed' ? 'bg-green-500/20 text-green-500' :
                       tx.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                       'bg-red-500/20 text-red-500'
                   }`}>
                      {tx.status}
                   </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
