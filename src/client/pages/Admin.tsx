import { useEffect, useState } from 'react'
import api from '../utils/api'
import { LayoutDashboard, Wallet, Users, Settings, LogOut, RefreshCw, ExternalLink, Copy, Bell, Send, CheckCircle, XCircle, PlusCircle, MinusCircle, Mail, Eye, Trash2, Lock, Unlock, Upload, Gamepad2, BarChart3, Gavel, MessageSquare } from 'lucide-react'
import { Dialog } from '@headlessui/react'
import { toast } from 'sonner'
import ConfirmModal from '../components/ConfirmModal'
import ManualMatchManager from '../components/ManualMatchManager'

// --- COMPONENT: Manual Settlement Panel ---
function ManualSettlementPanel() {
    const [matches, setMatches] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [settleModal, setSettleModal] = useState<{show: boolean, match: any}>({show: false, match: null})
    const [scores, setScores] = useState({ home: '', away: '', homeHT: '', awayHT: '', htFtOverride: '' })

    useEffect(() => { loadMatches() }, [])

    const loadMatches = async () => {
        setLoading(true)
        try {
            const res = await api.get('/admin/settle/pending')
            setMatches(res.data)
        } catch(e) { toast.error('Falha ao carregar jogos pendentes') }
        finally { setLoading(false) }
    }

    const handleSettle = async () => {
        if(!settleModal.match) return
        if(scores.home === '' || scores.away === '') return toast.error('Digite o Placar Final')
        
        try {
            const res = await api.post(`/admin/settle/match/${settleModal.match.id}`, {
                home: scores.home,
                away: scores.away,
                homeHT: scores.homeHT,
                awayHT: scores.awayHT,
                htFtOverride: scores.htFtOverride
            })
            if(res.data.success) {
                toast.success(`Liquidado com Sucesso! Processadas ${res.data.settled} apostas, pagamentos R$ ${res.data.payout}`)
                setSettleModal({show: false, match: null})
                setScores({home: '', away: '', homeHT: '', awayHT: ''})
                loadMatches()
            }
        } catch(e: any) {
            toast.error(e.response?.data?.error || 'Falha ao liquidar')
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Gavel className="text-primary" /> Jogos Pendentes
                </h2>
                <button onClick={loadMatches} className="bg-secondary px-4 py-2 rounded text-sm hover:bg-surfaceHover">Atualizar</button>
            </div>

            {loading ? <div className="text-center py-8 text-gray-500">Carregando...</div> : (
                <div className="bg-[#1a2c38] rounded-xl border border-gray-800 overflow-hidden">
                    {matches.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <CheckCircle size={48} className="mx-auto mb-4 opacity-20" />
                            <p>Nenhum jogo pendente</p>
                            <p className="text-xs mt-2">Apenas jogos com apostas aparecem aqui.</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-black/20 text-gray-400 font-bold uppercase text-xs">
                                <tr>
                                    <th className="p-4">ID do Jogo</th>
                                    <th className="p-4">Liga</th>
                                    <th className="p-4">Times</th>
                                    <th className="p-4">Hora</th>
                                    <th className="p-4 text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {matches.map(m => (
                                    <tr key={m.id} className="hover:bg-white/5">
                                        <td className="p-4 font-mono text-xs text-gray-500">{m.id}</td>
                                        <td className="p-4 text-gray-300">{m.league}</td>
                                        <td className="p-4 font-bold text-white">
                                            {m.home} <span className="text-gray-500 mx-2">vs</span> {m.away}
                                        </td>
                                        <td className="p-4 text-gray-400 text-xs">
                                            {m.time ? new Date(m.time).toLocaleString() : 'Parlay Leg'}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button 
                                                onClick={() => setSettleModal({show: true, match: m})}
                                                className="bg-primary hover:bg-primaryHover text-black font-bold px-4 py-1.5 rounded text-xs transition"
                                            >
                                                Definir Placar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            <Dialog open={settleModal.show} onClose={() => setSettleModal({show: false, match: null})} className="relative z-[100]">
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm" />
                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <Dialog.Panel className="bg-[#1a2c38] p-6 rounded-xl w-full max-w-md border border-gray-700 shadow-2xl">
                        <Dialog.Title className="text-lg font-bold text-white mb-6 text-center border-b border-gray-700 pb-4">
                            输入比赛结果
                        </Dialog.Title>
                        
                        {settleModal.match && (
                            <div className="space-y-6">
                                <div className="flex justify-between text-sm font-bold text-gray-400 px-2">
                                    <span className="flex-1 text-center truncate">{settleModal.match.home}</span>
                                    <span className="w-10"></span>
                                    <span className="flex-1 text-center truncate">{settleModal.match.away}</span>
                                </div>

                                <div>
                                    <label className="block text-xs text-center text-[#00E701] mb-2 uppercase font-bold">全场比分 (FT)</label>
                                    <div className="flex items-center justify-between gap-4">
                                        <input type="number" className="w-full h-14 bg-black/40 border border-gray-600 rounded-lg text-center text-2xl font-bold text-white focus:border-[#00E701] outline-none" value={scores.home} onChange={e => setScores({...scores, home: e.target.value})} placeholder="0" />
                                        <span className="text-gray-600 font-bold text-xl">:</span>
                                        <input type="number" className="w-full h-14 bg-black/40 border border-gray-600 rounded-lg text-center text-2xl font-bold text-white focus:border-[#00E701] outline-none" value={scores.away} onChange={e => setScores({...scores, away: e.target.value})} placeholder="0" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs text-center text-gray-500 mb-2 uppercase font-bold">半场比分 (HT)</label>
                                    <div className="flex items-center justify-between gap-4">
                                        <input type="number" className="w-full h-10 bg-black/20 border border-gray-700 rounded-lg text-center text-lg text-gray-300 focus:border-gray-500 outline-none" value={scores.homeHT} onChange={e => setScores({...scores, homeHT: e.target.value})} placeholder="0" />
                                        <span className="text-gray-600 font-bold text-lg">:</span>
                                        <input type="number" className="w-full h-10 bg-black/20 border border-gray-700 rounded-lg text-center text-lg text-gray-300 focus:border-gray-500 outline-none" value={scores.awayHT} onChange={e => setScores({...scores, awayHT: e.target.value})} placeholder="0" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs text-center text-blue-400 mb-2 uppercase font-bold">HT/FT 结果 (可选 / 覆盖)</label>
                                    <input type="text" className="w-full h-10 bg-black/20 border border-blue-500/30 rounded-lg text-center text-lg text-blue-300 focus:border-blue-500 outline-none uppercase placeholder:text-gray-600" value={scores.htFtOverride} onChange={e => setScores({...scores, htFtOverride: e.target.value.toUpperCase()})} placeholder="例: 1/X" />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button onClick={() => setSettleModal({show: false, match: null})} className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold transition">取消</button>
                                    <button onClick={handleSettle} className="flex-1 py-3 bg-primary hover:bg-primaryHover text-black rounded-lg font-bold transition shadow-lg shadow-primary/20">确认结算</button>
                                </div>
                            </div>
                        )}
                    </Dialog.Panel>
                </div>
            </Dialog>
        </div>
    )
}

// Pagination Component
const Pagination = ({ page, lastPage, setPage }: any) => {
    return (
        <div className="flex justify-between items-center p-4 border-t border-gray-800 bg-[#15222b]">
            <span className="text-xs text-gray-500">Page {page} of {lastPage || 1}</span>
            <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 bg-gray-700 rounded text-xs text-white disabled:opacity-50 hover:bg-gray-600">Previous</button>
                <button disabled={page >= lastPage} onClick={() => setPage(page + 1)} className="px-3 py-1 bg-gray-700 rounded text-xs text-white disabled:opacity-50 hover:bg-gray-600">Next</button>
            </div>
        </div>
    )
}

const getStatusColor = (status: string) => {
    switch(status) {
        case 'completed': return 'bg-green-500/20 text-green-500'
        case 'won': return 'bg-green-500/20 text-green-500'
        case 'pending': return 'bg-yellow-500/20 text-yellow-500'
        default: return 'bg-red-500/20 text-red-500'
    }
}

export default function Admin() {
  const [auth, setAuth] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [tab, setTab] = useState('overview') 
  
  const [data, setData] = useState<any>({ data: [], total: 0, page: 1, last_page: 1 })
  const [page, setPage] = useState(1) 
  
  const [orders, setOrders] = useState<any[]>([])
  const [txs, setTxs] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([]) // New State for Groups
  const [config, setConfig] = useState<any>({ bot_buttons: '[]', bot_welcome: '' })
  const [stats, setStats] = useState<{total: number, daily: any[]}>({total: 0, daily: []})
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const [notifTarget, setNotifTarget] = useState('') 
  const [notifTitle, setNotifTitle] = useState('')
  const [notifMsg, setNotifMsg] = useState('')

  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [balanceModal, setBalanceModal] = useState<{show: boolean, id: number | null, type: 'add'|'deduct'}>({show: false, id: null, type: 'add'})
  const [balanceAmount, setBalanceAmount] = useState('')
  
  const [confirmState, setConfirm] = useState<{show: boolean, title: string, msg: string, action: () => void, danger?: boolean}>({show: false, title: '', msg: '', action: () => {}})

  useEffect(() => {
      const token = localStorage.getItem('token')
      const isAdmin = localStorage.getItem('admin_auth')
      if(token && isAdmin) {
          setAuth(true)
          api.get('/admin/config').catch(() => { setAuth(false); localStorage.removeItem('token') })
      }
  }, [])

  useEffect(() => {
    if(auth && tab !== 'overview' && tab !== 'settings') loadData()
  }, [page, auth, tab])

  const checkAuth = async () => {
      if (!username || !password) return toast.error('请输入账号和密码')
      try {
          const res = await api.post('/auth/login', { email: username, password: password })
          if (res.data.user.role !== 'admin') { toast.error('该账号无管理员权限'); return }
          localStorage.setItem('token', res.data.token)
          setAuth(true)
          localStorage.setItem('admin_auth', 'true')
          toast.success('登录成功')
      } catch (e: any) { toast.error(e.response?.data?.error || '账号或密码错误') }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      if (tab === 'overview') {
          const res = await api.get('/admin/stats/visits')
          setStats(res.data)
      }
      if (tab === 'orders') {
        const res = await api.get(`/admin/orders?page=${page}&limit=30`)
        setData(res.data)
        setOrders(res.data.data)
      } 
      if (tab === 'finance') {
        const res = await api.get(`/admin/transactions?search=${searchTerm}&page=${page}&limit=30`)
        setData(res.data)
        setTxs(res.data.data)
      } 
      if (tab === 'users') {
        const res = await api.get(`/admin/users?search=${searchTerm}&page=${page}&limit=30`)
        setData(res.data)
        setUsers(res.data.data)
      } 
      if (tab === 'groups') {
        const res = await api.get('/admin/groups')
        setGroups(res.data)
      }
      if (tab === 'bot') {
        const res = await api.get('/admin/bot-config')
        setConfig(res.data)
      }
      if (tab === 'settings') {
        const res = await api.get('/admin/config')
        setConfig(res.data)
      }
    } catch (e: any) { 
        if (e.response && e.response.status === 401) { setAuth(false); localStorage.removeItem('admin_auth') }
    } finally { setLoading(false) }
  }

  const [editingAddress, setEditingAddress] = useState<{id: number, addr: string} | null>(null)

  const saveAddress = async () => {
      if(!editingAddress) return
      try { await api.post(`/admin/transaction/${editingAddress.id}/address`, { address: editingAddress.addr }); toast.success('地址更新成功'); setEditingAddress(null); loadData() } catch(e) { toast.error('失败') }
  }

  const sendNotification = async () => {
      if(!notifTitle || !notifMsg) return toast.warning('请填写标题和内容')
      setConfirm({
          show: true, title: '发送通知', msg: `确认发送？`,
          action: async () => {
              try { await api.post('/admin/notify', { target_uid: notifTarget || null, title: notifTitle, message: notifMsg }); toast.success('发送成功'); setNotifTitle(''); setNotifMsg('') } catch(e) { toast.error('发送失败') }
          }
      })
  }

  const approveTx = async (id: number) => {
    setConfirm({ show: true, title: '放行交易', msg: '确认资金已到账？', action: async () => { try { await api.post(`/admin/transaction/${id}/approve`); toast.success('已放行'); loadData() } catch (e) { toast.error('操作失败') } } })
  }

  const rejectTx = async (id: number) => {
      setConfirm({ show: true, title: '拒绝交易', msg: '确认拒绝？', danger: true, action: async () => { try { await api.post(`/admin/transaction/${id}/reject`, { reason: 'Suporte' }); toast.success('已拒绝'); loadData() } catch(e) { toast.error('失败') } } })
  }

  const requestSettle = (id: number, outcome: string) => {
      setConfirm({ show: true, title: '手动结算', msg: `确认结果为: ${outcome}?`, action: async () => { try { await api.post(`/admin/bet/${id}/settle`, { outcome }); toast.success('结算成功'); loadData() } catch (e) { toast.error('失败') } } })
  }

  const viewProof = async (proofId: number) => { if (!proofId) return; setPreviewImage(`/api/image/${proofId}`) }
  const updateRate = async (id: number, rate: number) => { try { await api.post(`/admin/user/${id}/rate`, { rate }); toast.success('更新成功'); } catch (e) {} }
  
  const saveConfig = async (key: string, value: string) => {
      if (key.startsWith('bot_') || key.startsWith('tpl_')) {
          try { await api.post('/admin/bot-config', { [key]: value }); toast.success('保存成功') } catch (e: any) { toast.error('保存失败') }
      } else {
          try { await api.post('/admin/config', { key, value }); toast.success('保存成功') } catch (e) { toast.error('失败') }
      }
  }

  const uploadCert = async (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
      if (e.target.files && e.target.files[0]) {
          const fd = new FormData(); fd.append('file', e.target.files[0]); fd.append('type', 'certificate')
          try { const res = await api.post('/upload', fd); await saveConfig(key, res.data.url) } catch(e) { toast.error('上传失败') }
      }
  }

  const handleBalance = async () => {
      if(!balanceAmount) return
      try { await api.post(`/admin/user/${balanceModal.id}/balance`, { amount: Number(balanceAmount), type: balanceModal.type }); toast.success('更新成功'); setBalanceModal({...balanceModal, show: false}); loadData() } catch(e) {}
  }

  const resetPassword = (id: number) => { setConfirm({ show: true, title: '重置密码', msg: '确认重置？', danger: true, action: async () => { try { await api.post(`/admin/user/${id}/reset-password`); toast.success('已重置') } catch(e) {} } }) }
  const resetPin = (id: number) => { setConfirm({ show: true, title: '重置PIN', msg: '确认重置？', danger: true, action: async () => { try { await api.post(`/admin/user/${id}/reset-pin`); toast.success('已重置') } catch(e) {} } }) }
  const toggleStatus = async (id: number) => { try { await api.post(`/admin/user/${id}/toggle-status`); toast.success('状态已更改'); loadData() } catch(e) {} }
  const deleteUser = (id: number) => { setConfirm({ show: true, title: '删除用户', msg: '确认删除？', danger: true, action: async () => { try { await api.delete(`/admin/user/${id}`); toast.success('已删除'); loadData() } catch(e) {} } }) }

  const [kycReview, setKycReview] = useState<{show: boolean, data: any}>({show: false, data: null})
  const [userProfile, setUserProfile] = useState<{show: boolean, data: any}>({show: false, data: null})

  const unbindUser = (id: number, type: 'owner' | 'member') => {
      setConfirm({
          show: true,
          title: '解绑 TG 身份',
          msg: `确认解绑该用户的 ${type === 'owner' ? '群主' : '群员'} 身份？此操作不可逆。`,
          danger: true,
          action: async () => {
              try {
                  await api.post(`/admin/user/${id}/unbind`, { type });
                  toast.success('解绑成功');
                  loadData();
              } catch (e) {
                  toast.error('解绑失败');
              }
          }
      })
  }

  const viewUser = async (id: number) => { try { const res = await api.get(`/admin/user/${id}`); setUserProfile({ show: true, data: res.data }) } catch(e) {} }
  const reviewKyc = async (id: number) => { try { const res = await api.get(`/admin/user/${id}`); setKycReview({ show: true, data: res.data }) } catch(e) {} }
  const approveKyc = async () => { try { await api.post(`/admin/user/${kycReview.data.id}/kyc`, { status: 'verified' }); toast.success('Approved'); setKycReview({show:false, data:null}); loadData() } catch(e) {} }
  const rejectKyc = () => { setConfirm({ show: true, title: 'Reject KYC', msg: 'Confirm?', danger: true, action: async () => { await api.post(`/admin/user/${kycReview.data.id}/kyc`, { status: 'rejected' }); toast.success('Rejected'); setKycReview({show:false, data:null}); loadData() } }) }

  if (!auth) return (
      <div className="min-h-screen bg-[#0f212e] flex items-center justify-center">
          <div className="bg-[#1a2c38] p-8 rounded-xl shadow-2xl w-full max-w-sm border border-gray-700">
              <h2 className="text-xl font-bold text-white mb-6 text-center">后台管理</h2>
              <input type="text" value={username} onChange={e=>setUsername(e.target.value)} className="w-full bg-[#0f212e] border border-gray-700 rounded p-3 text-white mb-3" placeholder="账号" />
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full bg-[#0f212e] border border-gray-700 rounded p-3 text-white mb-6" placeholder="密码" />
              <button onClick={checkAuth} className="w-full bg-[#00E701] text-black font-bold py-3 rounded">登录</button>
          </div>
      </div>
  )

  const SidebarItem = ({ id, icon: Icon, label }: any) => (
      <button onClick={() => setTab(id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${tab === id ? 'bg-[#00E701] text-black font-bold' : 'text-gray-400 hover:text-white'}`}>
          <Icon size={20} /> {label}
      </button>
  )

  return (
    <div className="min-h-screen bg-[#0f212e] text-white flex font-sans">
      <aside className="w-64 bg-[#1a2c38] border-r border-gray-800 flex flex-col fixed h-full z-10">
          <div className="p-6 border-b border-gray-800"><h1 className="text-xl font-black italic">Stake <span className="text-[#00E701]">Parceiros</span></h1></div>
          <nav className="flex-1 p-4 space-y-2">
              <SidebarItem id="overview" icon={BarChart3} label="数据概览" />
              <SidebarItem id="settle" icon={CheckCircle} label="赛事结算" /> 
              <SidebarItem id="orders" icon={LayoutDashboard} label="注单管理" />
              <SidebarItem id="finance" icon={Wallet} label="财务审核" />
              <SidebarItem id="users" icon={Users} label="用户列表" />
              <SidebarItem id="groups" icon={Users} label="群组管理" />
              <SidebarItem id="bot" icon={MessageSquare} label="机器人管理" />
              <SidebarItem id="settings" icon={Settings} label="系统配置" />
              <SidebarItem id="notify" icon={Bell} label="消息通知" />
          </nav>
          <div className="p-4 border-t border-gray-800">
              <button onClick={() => {setAuth(false); localStorage.removeItem('admin_auth')}} className="flex items-center gap-2 text-red-500 font-bold"><LogOut size={16} /> 退出</button>
          </div>
      </aside>

      <main className="ml-64 flex-1 p-8 overflow-y-auto">
          {tab === 'overview' && (
              <div className="space-y-6">
                  <div className="bg-[#1a2c38] p-6 rounded-xl border border-gray-800 shadow-lg">
                      <div className="flex items-center gap-4 mb-2">
                          <div className="p-3 bg-blue-500/20 text-blue-500 rounded-lg"><BarChart3 size={24}/></div>
                          <h3 className="text-gray-400 font-bold">总访问量</h3>
                      </div>
                      <div className="text-3xl font-black text-white">{stats.total.toLocaleString()}</div>
                  </div>
              </div>
          )}

          {tab === 'settle' && <ManualSettlementPanel />}
          
          {tab === 'bot' && (
              <div className="bg-[#1a2c38] p-8 rounded-xl border border-gray-800 space-y-8">
                  <h3 className="text-xl font-bold border-b border-gray-700 pb-4">机器人配置</h3>
                  <div className="space-y-6">
                      <h4 className="text-lg font-bold text-[#00E701] flex items-center gap-2">
                          <MessageSquare size={20} /> 1. 私聊管理
                      </h4>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">欢迎语</label>
                          <textarea className="w-full bg-[#0f212e] border border-gray-700 rounded p-3 text-white h-32 font-mono text-sm" value={config.bot_welcome || ''} onChange={(e) => setConfig({...config, bot_welcome: e.target.value})} />
                          <button onClick={() => saveConfig('bot_welcome', config.bot_welcome)} className="mt-2 bg-blue-600 px-4 py-1.5 rounded text-xs font-bold text-white">保存</button>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">按钮配置 (JSON)</label>
                          <textarea className="w-full bg-[#0f212e] border border-gray-700 rounded p-3 text-white h-64 font-mono text-xs" value={typeof config.bot_buttons === 'string' ? config.bot_buttons : JSON.stringify(config.bot_buttons, null, 2)} onChange={(e) => setConfig({...config, bot_buttons: e.target.value})} />
                          <button onClick={() => saveConfig('bot_buttons', config.bot_buttons)} className="mt-2 bg-blue-600 px-4 py-1.5 rounded text-xs font-bold text-white">保存</button>
                      </div>
                  </div>
                  <hr className="border-gray-700" />
                  <div className="space-y-6">
                      <h4 className="text-lg font-bold text-[#00E701] flex items-center gap-2">
                          <Bell size={20} /> 2. 群聊通知模板
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {[
                              { k: 'tpl_bet', label: '新下注 (New Bet)', vars: '{uid}, {amount}, {potential}, {commission}' },
                              { k: 'tpl_win', label: '中奖 (Win)', vars: '{uid}, {profit}, {odds}' },
                              { k: 'tpl_deposit', label: '充值成功 (Deposit)', vars: '{uid}, {amount}' },
                              { k: 'tpl_withdraw', label: '提现成功 (Withdraw)', vars: '{uid}, {amount}' },
                              { k: 'tpl_downline_deposit', label: '下级充值 (Downline Dep)', vars: '{uid}, {amount}' },
                              { k: 'tpl_downline_withdraw', label: '下级提现 (Downline Wth)', vars: '{uid}, {amount}' },
                              { k: 'tpl_downline_bet', label: '下级下注 (Downline Bet)', vars: '{member_uid}, {source_uid}, {amount}, {commission}' },
                              { k: 'tpl_invite_l1', label: '一级拉新 (Direct Invite L1)', vars: '{source_uid}, {member_total_downline}' },
                              { k: 'tpl_invite_l2', label: '二级拉新 (Indirect Invite L2)', vars: '{member_uid}, {source_uid}' },
                              { k: 'tpl_downline_win', label: '下级中奖 (Downline Win)', vars: '{member_uid}, {source_uid}, {profit}' }
                          ].map(tpl => (
                              <div key={tpl.k} className="bg-[#0f212e] p-4 rounded-xl border border-gray-700">
                                  <div className="flex justify-between items-center mb-2">
                                      <label className="text-sm font-bold text-white">{tpl.label}</label>
                                      <span className="text-[10px] text-gray-500 font-mono">Vars: {tpl.vars}</span>
                                  </div>
                                  <textarea className="w-full bg-black/30 border border-gray-600 rounded p-2 text-gray-300 h-32 font-mono text-xs" value={config[tpl.k] || ''} onChange={(e) => setConfig({...config, [tpl.k]: e.target.value})} />
                                  <div className="flex justify-end mt-2"><button onClick={() => saveConfig(tpl.k, config[tpl.k])} className="bg-primary/20 hover:bg-primary/30 text-primary px-3 py-1 rounded text-xs font-bold">保存</button></div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          )}

          {tab === 'orders' && (
              <div className="bg-[#1a2c38] rounded-xl border border-gray-800 overflow-hidden">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-black/20 text-gray-400 font-bold uppercase text-xs">
                          <tr><th className="p-4">注单号</th><th className="p-4">用户</th><th className="p-4">详情</th><th className="p-4">赔率</th><th className="p-4">金额</th><th className="p-4">状态</th><th className="p-4">操作</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                          {orders.map(o => (
                              <tr key={o.id} className="hover:bg-white/5">
                                  <td className="p-4 font-mono text-xs">{o.ticket_id}</td>
                                  <td className="p-4">{o.email}</td>
                                  <td className="p-4 text-xs">
                                      {(() => {
                                          try {
                                              const info = JSON.parse(o.match_info);
                                              if (o.match_id === 'parlay' && info.legs) {
                                                  return (
                                                      <div className="space-y-1">
                                                          <div className="font-bold text-purple-400">PARLAY ({info.legs.length} Legs)</div>
                                                          {info.legs.map((leg: any, idx: number) => (
                                                              <div key={idx} className="border-l-2 border-gray-600 pl-2">
                                                                  <div className="text-gray-300">{leg.match}</div>
                                                                  <div className="text-[#00E701]">{leg.selection} @{leg.odds}</div>
                                                              </div>
                                                          ))}
                                                      </div>
                                                  )
                                              }
                                              return (
                                                  <div>
                                                      <div className="text-gray-300 font-bold">{info.home} vs {info.away}</div>
                                                      <div className="text-gray-500 text-[10px]">{info.league}</div>
                                                      <div className="text-[#00E701] mt-1 font-bold text-sm">
                                                          {o.selection} <span className="text-gray-500 font-normal">({info.market || '1x2'})</span>
                                                      </div>
                                                  </div>
                                              )
                                          } catch(e) { return <span>-</span> }
                                      })()}
                                  </td>
                                  <td className="p-4 font-bold text-white">@{Number(o.odds).toFixed(2)}</td>
                                  <td className="p-4 font-mono">R$ {Number(o.amount).toFixed(2)}</td>
                                  <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold uppercase ${getStatusColor(o.status)}`}>{o.status}</span></td>
                                  <td className="p-4">
                                      {o.status === 'pending' && (
                                          <div className="flex gap-2">
                                              <button onClick={()=>requestSettle(o.id, 'won')} className="text-green-500 hover:bg-green-500/10 px-2 py-1 rounded text-xs font-bold">赢</button>
                                              <button onClick={()=>requestSettle(o.id, 'lost')} className="text-red-500 hover:bg-red-500/10 px-2 py-1 rounded text-xs font-bold">输</button>
                                          </div>
                                      )}
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
                  <Pagination page={data.page} lastPage={data.last_page} setPage={setPage} />
              </div>
          )}

          {tab === 'finance' && (
              <div className="bg-[#1a2c38] rounded-xl border border-gray-800 overflow-hidden">
                  <div className="p-4 border-b border-gray-800">
                      <h3 className="font-bold">财务审核</h3>
                  </div>
                  <table className="w-full text-sm text-left">
                      <thead className="bg-black/20 text-gray-400 font-bold uppercase text-xs">
                          <tr><th className="p-4">UID</th><th className="p-4">用户</th><th className="p-4">类型</th><th className="p-4">金额</th><th className="p-4">状态</th><th className="p-4">操作</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                          {txs.map(tx => (
                              <tr key={tx.id} className="hover:bg-white/5">
                                  <td className="p-4 font-mono text-blue-400">{tx.uid}</td>
                                  <td className="p-4">{tx.name || tx.email}</td>
                                  <td className="p-4 uppercase">{tx.type}</td>
                                  <td className="p-4 font-bold text-white">R$ {Number(tx.amount).toFixed(2)}</td>
                                  <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold uppercase ${getStatusColor(tx.status)}`}>{tx.status}</span></td>
                                  <td className="p-4">
                                      {tx.status === 'pending' && (
                                          <div className="flex gap-2">
                                              <button onClick={()=>approveTx(tx.id)} className="text-green-500 hover:underline">通过</button>
                                              <button onClick={()=>rejectTx(tx.id)} className="text-red-500 hover:underline">拒绝</button>
                                          </div>
                                      )}
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
                  <Pagination page={data.page} lastPage={data.last_page} setPage={setPage} />
              </div>
          )}

          {tab === 'groups' && (
              <div className="bg-[#1a2c38] rounded-xl border border-gray-800 overflow-hidden">
                  <div className="p-4 border-b border-gray-800">
                      <h3 className="font-bold">群组管理 (Group Management)</h3>
                  </div>
                  <table className="w-full text-sm text-left">
                      <thead className="bg-black/20 text-gray-400 font-bold uppercase text-xs">
                          <tr>
                              <th className="p-4">Group ID</th>
                              <th className="p-4">Owner (群主)</th>
                              <th className="p-4 text-center">成员数</th>
                              <th className="p-4 text-right">总充值</th>
                              <th className="p-4 text-right">总流水 (Bets)</th>
                              <th className="p-4 text-right">总佣金</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                          {groups.map(g => (
                              <tr key={g.group_id} className="hover:bg-white/5">
                                  <td className="p-4 font-mono text-xs text-gray-500">{g.group_id}</td>
                                  <td className="p-4">
                                      <div className="font-bold text-white">{g.owner_username ? `@${g.owner_username}` : 'Unknown'}</div>
                                      <div className="text-xs text-gray-500 font-mono">UID: {g.owner_uid}</div>
                                  </td>
                                  <td className="p-4 text-center font-bold text-blue-400">{g.member_count}</td>
                                  <td className="p-4 text-right font-mono text-green-400">R$ {Number(g.total_deposit).toFixed(2)}</td>
                                  <td className="p-4 text-right font-mono text-white">R$ {Number(g.total_bet).toFixed(2)}</td>
                                  <td className="p-4 text-right font-mono text-yellow-400">R$ {Number(g.total_commission).toFixed(2)}</td>
                              </tr>
                          ))}
                          {groups.length === 0 && (
                              <tr>
                                  <td colSpan={6} className="p-8 text-center text-gray-500">暂无群组数据</td>
                              </tr>
                          )}
                      </tbody>
                  </table>
              </div>
          )}

          {tab === 'notify' && (
              <div className="space-y-6">
                  <div className="bg-[#1a2c38] p-8 rounded-xl border border-gray-800 space-y-6">
                      <h3 className="text-xl font-bold border-b border-gray-700 pb-4">站内通知 (Internal Notification)</h3>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">接收用户 (UID)</label>
                          <input type="text" className="w-full bg-[#0f212e] border border-gray-700 rounded p-3 text-white placeholder:text-gray-600" placeholder="留空则发送给所有人 (Broadcast)" value={notifTarget} onChange={e => setNotifTarget(e.target.value)} />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">标题</label>
                          <input type="text" className="w-full bg-[#0f212e] border border-gray-700 rounded p-3 text-white" value={notifTitle} onChange={e => setNotifTitle(e.target.value)} />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">内容</label>
                          <textarea className="w-full bg-[#0f212e] border border-gray-700 rounded p-3 text-white h-32" value={notifMsg} onChange={e => setNotifMsg(e.target.value)} />
                      </div>
                      <div className="flex justify-end">
                          <button onClick={sendNotification} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-lg shadow-lg shadow-blue-900/20 flex items-center gap-2">
                              <Send size={18} /> 发送通知
                          </button>
                      </div>
                  </div>
              </div>
          )}
          {tab === 'users' && (
              <div className="bg-[#1a2c38] rounded-xl border border-gray-800 overflow-hidden">
                  <div className="p-4 border-b border-gray-800">
                      <input type="text" placeholder="搜索 UID / 邮箱 / 姓名..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadData()} className="bg-[#0f212e] border border-gray-700 rounded px-4 py-2 w-64 text-sm text-white" />
                      <button onClick={loadData} className="ml-2 bg-[#00E701] text-black px-4 py-2 rounded text-sm font-bold">搜索</button>
                  </div>
                  <table className="w-full text-sm text-left">
                      <thead className="bg-black/20 text-gray-400 font-bold uppercase text-xs">
                          <tr><th className="p-4">UID</th><th className="p-4">用户</th><th className="p-4">上级 (Upline)</th><th className="p-4">IP信息</th><th className="p-4">费率</th><th className="p-4">余额</th><th className="p-4">TG</th><th className="p-4">KYC</th><th className="p-4">状态</th><th className="p-4">操作</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                          {users.map(u => (
                              <tr key={u.id} className="hover:bg-white/5">
                                  <td className="p-4 font-mono text-blue-400">{u.uid}</td>
                                  <td className="p-4">{u.email}</td>
                                  <td className="p-4 font-mono text-xs text-gray-400">
                                      {u.parent_uid ? (
                                          <div>
                                              <div>UID: {u.parent_uid}</div>
                                              <div>Code: {u.parent_code}</div>
                                          </div>
                                      ) : <span className="opacity-30">-</span>}
                                  </td>
                                  <td className="p-4 text-xs font-mono text-gray-400">
                                      <div>Reg: {u.ip_address || '-'}</div>
                                      <div>Last: {u.last_login_ip || '-'}</div>
                                  </td>
                                  <td className="p-4"><input type="number" step="0.01" defaultValue={u.commission_rate} onBlur={(e)=>updateRate(u.id, parseFloat(e.target.value))} className="bg-[#0f212e] border border-gray-700 w-16 text-center rounded"/></td>
                                  <td className="p-4 font-mono text-[#00E701]">R$ {Number(u.balance || 0).toFixed(2)}</td>
                                  <td className="p-4 text-xs">
                                      <div className="flex flex-col gap-1">
                                          {u.telegram_username && (
                                              <div className="text-blue-400 font-bold mb-1">@{u.telegram_username}</div>
                                          )}
                                          {u.telegram_group_id ? (
                                              <div className="flex items-center gap-1 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 w-fit">
                                                  <span className="text-blue-400 font-bold">Membro</span>
                                                  <button onClick={() => unbindUser(u.id, 'member')} className="text-gray-500 hover:text-red-500 ml-1" title="解绑群员"><XCircle size={12}/></button>
                                              </div>
                                          ) : <span className="text-gray-600 opacity-50">-</span>}
                                          
                                          {u.owned_group_id ? (
                                              <div className="flex items-center gap-1 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 w-fit">
                                                  <span className="text-purple-400 font-bold">Líder</span>
                                                  <button onClick={() => unbindUser(u.id, 'owner')} className="text-gray-500 hover:text-red-500 ml-1" title="解绑群主"><XCircle size={12}/></button>
                                              </div>
                                          ) : null}
                                      </div>
                                  </td>
                                  <td className="p-4"><span className={`px-2 py-0.5 rounded text-xs ${u.kyc_status==='verified'?'bg-green-500/20 text-green-500':'bg-gray-700 text-gray-400'}`}>{u.kyc_status}</span></td>
                                  <td className="p-4"><span className={`px-2 py-0.5 rounded text-xs ${u.status==='frozen'?'bg-red-500/20 text-red-500':'bg-green-500/20 text-green-500'}`}>{u.status === 'frozen' ? '冻结' : '正常'}</span></td>
                                  <td className="p-4">
                                      <div className="flex gap-2 items-center">
                                          <button onClick={()=>setBalanceModal({show:true, id: u.id, type: 'add'})} className="bg-gray-700 p-1 rounded hover:bg-gray-600" title="增加余额"><PlusCircle size={14}/></button>
                                          <button onClick={()=>setBalanceModal({show:true, id: u.id, type: 'deduct'})} className="bg-gray-700 p-1 rounded hover:bg-gray-600" title="扣除余额"><MinusCircle size={14}/></button>
                                          
                                          <div className="h-4 w-px bg-gray-700 mx-1"></div>
                                          
                                          <button onClick={()=>toggleStatus(u.id)} className={`p-1 rounded ${u.status === 'frozen' ? 'text-green-500 hover:bg-green-500/10' : 'text-orange-500 hover:bg-orange-500/10'}`} title={u.status === 'frozen' ? '解冻' : '冻结'}>
                                              {u.status === 'frozen' ? <Unlock size={14}/> : <Lock size={14}/>}
                                          </button>
                                          <button onClick={()=>deleteUser(u.id)} className="p-1 rounded text-red-500 hover:bg-red-500/10" title="删除用户">
                                              <Trash2 size={14}/>
                                          </button>

                                          <div className="h-4 w-px bg-gray-700 mx-1"></div>
                                          
                                          <button onClick={()=>resetPassword(u.id)} className="text-xs text-yellow-500 hover:text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded">重置密码</button>
                                          <button onClick={()=>resetPin(u.id)} className="text-xs text-blue-500 hover:text-blue-400 bg-blue-500/10 px-2 py-1 rounded">重置PIN</button>
                                          <button onClick={()=>viewUser(u.id)} className="text-xs text-white bg-gray-600 px-2 py-1 rounded ml-2">详情</button>

                                          {u.kyc_status === 'pending' && <button onClick={()=>reviewKyc(u.id)} className="text-xs bg-purple-600 hover:bg-purple-500 px-2 py-1 rounded ml-2">审核KYC</button>}
                                      </div>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
                  <Pagination page={data.page} lastPage={data.last_page} setPage={setPage} />
              </div>
          )}

          {tab === 'settings' && (
              <div className="bg-[#1a2c38] p-8 rounded-xl border border-gray-800 max-w-2xl space-y-6">
                  <h3 className="text-lg font-bold border-b border-gray-700 pb-4">基本配置</h3>
                  
                  <div className="space-y-6">
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">欢迎消息 (Welcome Message)</label>
                          <div className="flex gap-2">
                              <textarea 
                                  className="w-full bg-[#0f212e] border border-gray-700 rounded p-3 text-white h-24"
                                  value={config.welcome_message || ''}
                                  onChange={(e) => setConfig({...config, welcome_message: e.target.value})}
                                  placeholder="Bem-vindo ao Stake.BR..."
                              />
                              <button onClick={() => saveConfig('welcome_message', config.welcome_message)} className="bg-blue-600 px-4 rounded text-xs font-bold text-white hover:bg-blue-500">保存</button>
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">TRC20 充值地址</label>
                          <div className="flex gap-2">
                              <input 
                                  type="text"
                                  className="w-full bg-[#0f212e] border border-gray-700 rounded p-3 text-white font-mono"
                                  value={config.deposit_address || ''}
                                  onChange={(e) => setConfig({...config, deposit_address: e.target.value})}
                                  placeholder="T9yD14Nj9..."
                              />
                              <button onClick={() => saveConfig('deposit_address', config.deposit_address)} className="bg-blue-600 px-4 rounded text-xs font-bold text-white hover:bg-blue-500">保存</button>
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Telegram 客服链接</label>
                          <div className="flex gap-2">
                              <input 
                                  type="text"
                                  className="w-full bg-[#0f212e] border border-gray-700 rounded p-3 text-white"
                                  value={config.support_tg || ''}
                                  onChange={(e) => setConfig({...config, support_tg: e.target.value})}
                                  placeholder="https://t.me/..."
                              />
                              <button onClick={() => saveConfig('support_tg', config.support_tg)} className="bg-blue-600 px-4 rounded text-xs font-bold text-white hover:bg-blue-500">保存</button>
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">管理员机器人密钥 (Admin Bot Token)</label>
                          <div className="flex gap-2">
                              <input 
                                  type="text"
                                  className="w-full bg-[#0f212e] border border-gray-700 rounded p-3 text-white font-mono"
                                  value={config.admin_bot_token || ''}
                                  onChange={(e) => setConfig({...config, admin_bot_token: e.target.value})}
                                  placeholder="7728..."
                              />
                              <button onClick={() => saveConfig('admin_bot_token', config.admin_bot_token)} className="bg-blue-600 px-4 rounded text-xs font-bold text-white hover:bg-blue-500">保存</button>
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">管理员通知群组 ID (Admin Group ID)</label>
                          <div className="flex gap-2">
                              <input 
                                  type="text"
                                  className="w-full bg-[#0f212e] border border-gray-700 rounded p-3 text-white font-mono"
                                  value={config.admin_chat_id || ''}
                                  onChange={(e) => setConfig({...config, admin_chat_id: e.target.value})}
                                  placeholder="-100..."
                              />
                              <button onClick={() => saveConfig('admin_chat_id', config.admin_chat_id)} className="bg-blue-600 px-4 rounded text-xs font-bold text-white hover:bg-blue-500">保存</button>
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bot Token (客服/群通知)</label>
                          <div className="flex gap-2">
                              <input 
                                  type="text"
                                  className="w-full bg-[#0f212e] border border-gray-700 rounded p-3 text-white font-mono"
                                  value={config.bot_token || ''}
                                  onChange={(e) => setConfig({...config, bot_token: e.target.value})}
                                  placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                              />
                              <button onClick={() => saveConfig('bot_token', config.bot_token)} className="bg-blue-600 px-4 rounded text-xs font-bold text-white hover:bg-blue-500">保存</button>
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">终极管理员群组 ID (用于转发客服消息)</label>
                          <div className="flex gap-2">
                              <input 
                                  type="text"
                                  className="w-full bg-[#0f212e] border border-gray-700 rounded p-3 text-white font-mono"
                                  value={config.support_admin_group || ''}
                                  onChange={(e) => setConfig({...config, support_admin_group: e.target.value})}
                                  placeholder="-1001234567890"
                              />
                              <button onClick={() => saveConfig('support_admin_group', config.support_admin_group)} className="bg-blue-600 px-4 rounded text-xs font-bold text-white hover:bg-blue-500">保存</button>
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">平台证书图片</label>
                          <div className="flex items-center gap-4">
                              <input type="file" onChange={(e) => uploadCert(e, 'platform_cert')} className="text-sm text-gray-500"/>
                              {config.platform_cert && <a href={config.platform_cert} target="_blank" className="text-blue-400 text-xs underline">查看现有证书</a>}
                          </div>
                      </div>
                  </div>
              </div>
          )}

          <ConfirmModal isOpen={confirmState.show} onClose={()=>setConfirm({...confirmState, show:false})} onConfirm={confirmState.action} title={confirmState.title} message={confirmState.msg} danger={confirmState.danger}/>
          
          <Dialog open={balanceModal.show} onClose={()=>setBalanceModal({...balanceModal, show: false})} className="relative z-[100]">
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm"/><div className="fixed inset-0 flex items-center justify-center p-4"><Dialog.Panel className="bg-[#1a2c38] p-6 rounded-xl w-full max-w-sm border border-gray-700"><h3 className="text-lg font-bold mb-4">{balanceModal.type==='add'?'增加':'扣除'}余额</h3><input type="number" value={balanceAmount} onChange={e=>setBalanceAmount(e.target.value)} className="w-full bg-[#0f212e] border-gray-700 rounded p-2 mb-4 text-center text-xl" autoFocus/><div className="flex gap-2"><button onClick={()=>setBalanceModal({...balanceModal, show:false})} className="flex-1 bg-gray-700 py-2 rounded">取消</button><button onClick={handleBalance} className="flex-1 bg-[#00E701] text-black py-2 rounded font-bold">确认</button></div></Dialog.Panel></div>
          </Dialog>

          <Dialog open={userProfile.show} onClose={()=>setUserProfile({...userProfile, show: false})} className="relative z-[100]">
              <div className="fixed inset-0 bg-black/90 backdrop-blur-sm"/>
              <div className="fixed inset-0 flex items-center justify-center p-4">
                  <Dialog.Panel className="bg-[#1a2c38] p-6 rounded-xl w-full max-w-2xl border border-gray-700 max-h-[90vh] overflow-y-auto">
                      {userProfile.data && (
                        <div className="space-y-6">
                            <h3 className="text-xl font-bold text-white border-b border-gray-700 pb-4">用户详情: {userProfile.data.email}</h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>UID: <span className="text-white font-mono">{userProfile.data.uid}</span></div>
                                <div>Saldo: <span className="text-[#00E701] font-bold">R$ {Number(userProfile.data.balance).toFixed(2)}</span></div>
                                <div>Taxa: <span className="text-white">{Number(userProfile.data.commission_rate * 100).toFixed(0)}%</span></div>
                                <div>IP Registro: <span className="text-gray-400">{userProfile.data.ip_address}</span></div>
                            </div>
                            <div className="bg-black/20 p-4 rounded-lg space-y-2">
                                <h4 className="font-bold text-gray-400 text-xs uppercase">财务统计</h4>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="bg-green-500/10 p-2 rounded"><div className="text-xs text-green-500">总存款</div><div className="font-bold text-white">R$ {userProfile.data.stats?.total_deposits?.toFixed(2) || '0.00'}</div></div>
                                    <div className="bg-red-500/10 p-2 rounded"><div className="text-xs text-red-500">总提现</div><div className="font-bold text-white">R$ {userProfile.data.stats?.total_withdrawals?.toFixed(2) || '0.00'}</div></div>
                                    <div className="bg-blue-500/10 p-2 rounded"><div className="text-xs text-blue-500">总投注</div><div className="font-bold text-white">R$ {userProfile.data.stats?.total_bets?.toFixed(2) || '0.00'}</div></div>
                                </div>
                            </div>
                            <button onClick={() => setUserProfile({ ...userProfile, show: false })} className="w-full bg-gray-700 hover:bg-gray-600 py-3 rounded text-white font-bold transition">关闭</button>
                        </div>
                    )}
                  </Dialog.Panel>
              </div>
          </Dialog>

          <Dialog open={kycReview.show} onClose={()=>setKycReview({...kycReview, show: false})} className="relative z-[100]">
              <div className="fixed inset-0 bg-black/90 backdrop-blur-sm"/>
              <div className="fixed inset-0 flex items-center justify-center p-4">
                  <Dialog.Panel className="bg-[#1a2c38] p-6 rounded-xl w-full max-w-4xl border border-gray-700 max-h-[90vh] overflow-y-auto">
                      {kycReview.data && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center border-b border-gray-700 pb-4">
                                <h3 className="text-xl font-bold text-white">审核实名认证</h3>
                                <button onClick={() => setKycReview({ ...kycReview, show: false })} className="text-gray-400 hover:text-white"><XCircle size={24} /></button>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div><div className="text-xs text-gray-500 uppercase font-bold mb-1">姓名</div><div className="text-lg font-bold text-white">{kycReview.data.real_name}</div></div>
                                <div><div className="text-xs text-gray-500 uppercase font-bold mb-1">CPF</div><div className="text-lg font-bold text-white">{kycReview.data.cpf}</div></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><div className="text-xs text-gray-500 uppercase font-bold mb-2">正面照片</div><img src={kycReview.data.kyc_image_front} alt="Front" className="w-full rounded-lg border border-gray-700 cursor-pointer hover:opacity-80" onClick={()=>setPreviewImage(kycReview.data.kyc_image_front)} /></div>
                                <div><div className="text-xs text-gray-500 uppercase font-bold mb-2">背面照片</div><img src={kycReview.data.kyc_image_back} alt="Back" className="w-full rounded-lg border border-gray-700 cursor-pointer hover:opacity-80" onClick={()=>setPreviewImage(kycReview.data.kyc_image_back)} /></div>
                            </div>
                            <div className="flex gap-4 pt-4 border-t border-gray-700">
                                <button onClick={rejectKyc} className="flex-1 bg-red-500/10 text-red-500 hover:bg-red-500/20 py-3 rounded-lg font-bold transition">拒绝</button>
                                <button onClick={approveKyc} className="flex-1 bg-green-500 hover:bg-green-400 text-black py-3 rounded-lg font-bold transition shadow-lg shadow-green-500/20">批准通过</button>
                            </div>
                        </div>
                    )}
                  </Dialog.Panel>
              </div>
          </Dialog>

          <Dialog open={!!previewImage} onClose={()=>setPreviewImage(null)} className="relative z-[100]">
              <div className="fixed inset-0 bg-black/90 backdrop-blur-sm"/><div className="fixed inset-0 flex items-center justify-center p-4" onClick={()=>setPreviewImage(null)}><Dialog.Panel><img src={previewImage!} className="max-h-[80vh] rounded-lg"/></Dialog.Panel></div>
          </Dialog>
      </main>
    </div>
  )
}
