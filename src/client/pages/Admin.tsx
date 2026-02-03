import { useEffect, useState } from 'react'
import api from '../utils/api'
import { LayoutDashboard, Wallet, Users, Settings, LogOut, RefreshCw, ExternalLink, Copy, Bell, Send, CheckCircle, XCircle, PlusCircle, MinusCircle, Mail, Eye, Trash2, Lock, Unlock, Upload, Gamepad2, BarChart3 } from 'lucide-react'
import { Dialog } from '@headlessui/react'
import { toast } from 'sonner'
import ConfirmModal from '../components/ConfirmModal'
import ManualMatchManager from '../components/ManualMatchManager'

export default function Admin() {
  const [auth, setAuth] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [tab, setTab] = useState('overview') 
  
  const [orders, setOrders] = useState<any[]>([])
  const [txs, setTxs] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [config, setConfig] = useState<any>({})
  const [stats, setStats] = useState<{total: number, daily: any[]}>({total: 0, daily: []})
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const [notifTarget, setNotifTarget] = useState('') 
  const [notifTitle, setNotifTitle] = useState('')
  const [notifMsg, setNotifMsg] = useState('')

  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [balanceModal, setBalanceModal] = useState<{show: boolean, id: number | null, type: 'add'|'deduct'}>({show: false, id: null, type: 'add'})
  const [balanceAmount, setBalanceAmount] = useState('')
  
  const [confirmState, setConfirm] = useState<{
      show: boolean, 
      title: string, 
      msg: string, 
      action: () => void,
      danger?: boolean
  }>({show: false, title: '', msg: '', action: () => {}})

  useEffect(() => {
      const token = localStorage.getItem('token')
      const isAdmin = localStorage.getItem('admin_auth')
      if(token && isAdmin) {
          setAuth(true)
          api.get('/admin/config').catch(() => {
              setAuth(false)
              localStorage.removeItem('token')
              localStorage.removeItem('admin_auth')
          })
      }
  }, [])

  useEffect(() => {
    if(auth) loadData()
  }, [tab, auth])

  const checkAuth = async () => {
      if (!username || !password) return toast.error('请输入账号和密码')
      
      try {
          const res = await api.post('/auth/login', { 
              email: username, 
              password: password 
          })

          if (res.data.user.role !== 'admin') {
              toast.error('该账号无管理员权限')
              return
          }

          localStorage.setItem('token', res.data.token)
          setAuth(true)
          localStorage.setItem('admin_auth', 'true')
          toast.success('登录成功')
      } catch (e: any) {
          console.error(e)
          toast.error(e.response?.data?.error || '账号或密码错误')
      }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      if (tab === 'overview') {
          const res = await api.get('/admin/stats/visits')
          setStats(res.data)
      }
      if (tab === 'orders') {
        const res = await api.get('/admin/orders')
        setOrders(res.data)
      } 
      if (tab === 'finance') {
        const res = await api.get(`/admin/transactions?search=${searchTerm}`)
        setTxs(res.data)
      } 
      if (tab === 'users') {
        const res = await api.get(`/admin/users?search=${searchTerm}`)
        setUsers(res.data)
      } 
      if (tab === 'settings') {
        const res = await api.get('/admin/config')
        setConfig(res.data)
      }
    } catch (e: any) { 
        console.error(e)
        if (e.response && e.response.status === 401) {
            setAuth(false)
            localStorage.removeItem('admin_auth')
            toast.error('登录已过期，请重新登录')
        }
    } finally { setLoading(false) }
  }

  const [editingAddress, setEditingAddress] = useState<{id: number, addr: string} | null>(null)

  const saveAddress = async () => {
      if(!editingAddress) return
      try {
          await api.post(`/admin/transaction/${editingAddress.id}/address`, { address: editingAddress.addr })
          toast.success('地址更新成功')
          setEditingAddress(null)
          loadData()
      } catch(e) { toast.error('失败') }
  }

  const sendNotification = async () => {
      if(!notifTitle || !notifMsg) return toast.warning('请填写标题和内容')
      const target = notifTarget ? `用户 ${notifTarget}` : '所有用户'
      
      setConfirm({
          show: true,
          title: '发送通知',
          msg: `确认发送给 ${target}？`,
          action: async () => {
              try {
                  await api.post('/admin/notify', { 
                      target_uid: notifTarget || null,
                      title: notifTitle,
                      message: notifMsg
                  })
                  toast.success('发送成功')
                  setNotifTitle(''); setNotifMsg('')
              } catch(e) { toast.error('发送失败') }
          }
      })
  }

  const approveTx = async (id: number) => {
    setConfirm({
        show: true, 
        title: '放行交易', 
        msg: '确认资金已到账/已转出？此操作将立即更新用户余额或完成提现。',
        action: async () => {
            try { await api.post(`/admin/transaction/${id}/approve`); toast.success('已放行'); loadData() } catch (e) { toast.error('操作失败') }
        }
    })
  }

  const rejectTx = async (id: number) => {
      setConfirm({
          show: true,
          title: '拒绝交易',
          msg: '确认拒绝？用户将被通知联系客服。',
          danger: true,
          action: async () => {
              try {
                  await api.post(`/admin/transaction/${id}/reject`, { reason: 'Entre em contato com o suporte' })
                  toast.success('已拒绝')
                  loadData()
              } catch(e) { toast.error('失败') }
          }
      })
  }

  const requestSettle = (id: number, outcome: string) => {
      setConfirm({
          show: true,
          title: '手动结算',
          msg: `确认结果为: ${outcome}?`,
          action: async () => {
              try { await api.post(`/admin/bet/${id}/settle`, { outcome }); toast.success('结算成功'); loadData() } catch (e) { toast.error('失败') }
          }
      })
  }

  const viewProof = async (proofId: number) => {
      if (!proofId) return toast.error('无凭证')
      setPreviewImage(`/api/image/${proofId}`) 
  }

  const updateRate = async (id: number, rate: number) => {
      try { await api.post(`/admin/user/${id}/rate`, { rate }); toast.success('更新成功'); } catch (e) { toast.error('失败') }
  }

  const saveConfig = async (key: string, value: string) => {
      try { await api.post('/admin/config', { key, value }); toast.success('保存成功') } catch (e) { toast.error('失败') }
  }

  const uploadCert = async (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0]
          try {
              const fd = new FormData()
              fd.append('file', file)
              fd.append('type', 'certificate')
              const res = await api.post('/upload', fd)
              await saveConfig(key, res.data.url)
          } catch(e) { toast.error('上传失败') }
      }
  }

  const handleBalance = async () => {
      if(!balanceAmount) return
      try {
          await api.post(`/admin/user/${balanceModal.id}/balance`, { amount: Number(balanceAmount), type: balanceModal.type })
          toast.success('余额更新成功'); setBalanceModal({...balanceModal, show: false}); loadData()
      } catch(e) { toast.error('失败') }
  }

  const resetPassword = (id: number, email: string) => {
      setConfirm({
          show: true,
          title: '重置登录密码',
          msg: `确认将用户 ${email} 的密码重置为 "123456"？`,
          danger: true,
          action: async () => {
              try { await api.post(`/admin/user/${id}/reset-password`); toast.success('已重置'); } catch(e) { toast.error('失败') }
          }
      })
  }

  const resetPin = (id: number, email: string) => {
      setConfirm({
          show: true,
          title: '重置支付密码',
          msg: `确认清除用户 ${email} 的支付密码？用户将可以重新设置。`,
          danger: true,
          action: async () => {
              try { await api.post(`/admin/user/${id}/reset-pin`); toast.success('已重置'); } catch(e) { toast.error('失败') }
          }
      })
  }

  const toggleStatus = async (id: number, currentStatus: string) => {
      try {
          const res = await api.post(`/admin/user/${id}/toggle-status`)
          toast.success(res.data.status === 'frozen' ? '用户已冻结' : '用户已激活')
          loadData()
      } catch(e) { toast.error('失败') }
  }

  const deleteUser = (id: number, email: string) => {
      setConfirm({
          show: true,
          title: '删除用户',
          msg: `危险操作：确认永久删除用户 ${email}？此操作不可恢复。`,
          danger: true,
          action: async () => {
              try { await api.delete(`/admin/user/${id}`); toast.success('已删除'); loadData() } catch(e) { toast.error('失败') }
          }
      })
  }

  const [kycReview, setKycReview] = useState<{show: boolean, data: any}>({show: false, data: null})
  const [userProfile, setUserProfile] = useState<{show: boolean, data: any}>({show: false, data: null})

  const viewUser = async (id: number) => {
      try {
          const res = await api.get(`/admin/user/${id}`)
          setUserProfile({ show: true, data: res.data })
      } catch(e) { toast.error('Erro ao carregar') }
  }

  const reviewKyc = async (id: number) => {
      try {
          const res = await api.get(`/admin/user/${id}`)
          // console.log('KYC Data:', res.data)
          setKycReview({ show: true, data: res.data })
      } catch(e) { 
          console.error(e)
          toast.error('Erro ao carregar dados. Imagem pode ser muito grande.') 
      }
  }

  const approveKyc = async () => {
      if(!kycReview.data) return
      try {
          await api.post(`/admin/user/${kycReview.data.id}/kyc`, { status: 'verified' })
          toast.success('KYC Aprovado')
          setKycReview({ show: false, data: null })
          loadData()
      } catch(e) { toast.error('Erro') }
  }

  const rejectKyc = () => {
      if(!kycReview.data) return
      setConfirm({
          show: true,
          title: '拒绝KYC',
          msg: '确认拒绝？用户将被通知联系客服。',
          danger: true,
          action: async () => {
              try {
                  await api.post(`/admin/user/${kycReview.data.id}/kyc`, { status: 'rejected', reason: 'Entre em contato com o suporte' })
                  toast.success('已拒绝')
                  setKycReview({ show: false, data: null })
                  loadData()
              } catch(e) { toast.error('错误') }
          }
      })
  }

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
              <SidebarItem id="matches" icon={Gamepad2} label="赛事管理" />
              <SidebarItem id="orders" icon={LayoutDashboard} label="注单管理" />
              <SidebarItem id="finance" icon={Wallet} label="财务审核" />
              <SidebarItem id="users" icon={Users} label="用户列表" />
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-[#1a2c38] p-6 rounded-xl border border-gray-800 shadow-lg">
                          <div className="flex items-center gap-4 mb-2">
                              <div className="p-3 bg-blue-500/20 text-blue-500 rounded-lg"><BarChart3 size={24}/></div>
                              <h3 className="text-gray-400 font-bold">总访问量</h3>
                          </div>
                          <div className="text-3xl font-black text-white">{stats.total.toLocaleString()}</div>
                          <div className="text-xs text-gray-500 mt-2">历史累计访问次数</div>
                      </div>
                  </div>

                  <div className="bg-[#1a2c38] rounded-xl border border-gray-800 overflow-hidden">
                      <div className="p-6 border-b border-gray-800"><h3 className="font-bold text-lg">每日访问趋势 (最近30天)</h3></div>
                      <div className="p-6">
                          {stats.daily.length > 0 ? (
                              <div className="space-y-3">
                                  {stats.daily.map((day: any) => (
                                      <div key={day.date} className="flex items-center gap-4">
                                          <div className="w-24 text-sm text-gray-400 font-mono">{day.date}</div>
                                          <div className="flex-1 h-8 bg-black/30 rounded-full overflow-hidden relative">
                                              <div 
                                                  className="h-full bg-blue-500/50 flex items-center px-3 text-xs font-bold text-white transition-all duration-500" 
                                                  style={{width: `${Math.max(5, (day.count / Math.max(...stats.daily.map((d:any)=>d.count))) * 100)}%`}}
                                              >
                                                  {day.count}
                                              </div>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          ) : <div className="text-gray-500 text-center py-8">暂无数据</div>}
                      </div>
                  </div>
              </div>
          )}

          {tab === 'matches' && <ManualMatchManager />}
          
          {tab === 'orders' && (
              <div className="bg-[#1a2c38] rounded-xl border border-gray-800 overflow-hidden">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-black/20 text-gray-400 font-bold uppercase text-xs">
                          <tr><th className="p-4">注单号</th><th className="p-4">用户</th><th className="p-4">内容</th><th className="p-4">赔率</th><th className="p-4">金额</th><th className="p-4">状态</th><th className="p-4">操作</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                          {orders.map(o => (
                              <tr key={o.id} className="hover:bg-white/5">
                                  <td className="p-4 font-mono">{o.ticket_id}</td>
                                  <td className="p-4">{o.email}<br/><span className="text-xs text-gray-500">UID: {o.uid}</span></td>
                                  <td className="p-4">{JSON.parse(o.match_info).home} vs {JSON.parse(o.match_info).away}<br/><span className="text-[#00E701]">{o.selection}</span></td>
                                  <td className="p-4">@{o.odds}</td>
                                  <td className="p-4">R$ {o.amount}</td>
                                  <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold uppercase ${o.status==='pending'?'bg-yellow-500/20 text-yellow-500':o.status==='won'?'bg-green-500/20 text-green-500':'bg-red-500/20 text-red-500'}`}>{o.status}</span></td>
                                  <td className="p-4">
                                      {o.status === 'pending' && (
                                          <div className="flex gap-2">
                                              <button onClick={()=>requestSettle(o.id, 'won')} className="text-green-500 hover:underline">赢</button>
                                              <button onClick={()=>requestSettle(o.id, 'lost')} className="text-red-500 hover:underline">输</button>
                                              <button onClick={()=>requestSettle(o.id, 'void')} className="text-gray-500 hover:underline">退</button>
                                          </div>
                                      )}
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          )}

          {tab === 'finance' && (
              <div className="bg-[#1a2c38] rounded-xl border border-gray-800 overflow-hidden">
                  {/* Exchange Rate Setting Card */}
                  <div className="p-6 border-b border-gray-800 bg-[#15222b]">
                      <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase">汇率设置 (USDT/BRL)</h3>
                      <div className="flex items-end gap-4">
                          <div className="flex-1 max-w-xs">
                              <label className="text-xs text-gray-500 block mb-1">当前汇率 (1 USDT = ? BRL)</label>
                              <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">R$</span>
                                  <input 
                                      type="number" 
                                      step="0.01" 
                                      defaultValue={config.usdt_brl_rate || 5.85} 
                                      key={config.usdt_brl_rate} // Force re-render on update
                                      id="exchange_rate_input"
                                      className="w-full bg-[#0f212e] border border-gray-700 rounded-lg py-2 pl-8 pr-4 text-white font-mono text-lg font-bold focus:border-[#00E701] outline-none"
                                  />
                              </div>
                          </div>
                          <button 
                              onClick={async () => {
                                  const val = (document.getElementById('exchange_rate_input') as HTMLInputElement).value
                                  try {
                                      await api.post('/admin/config/rate', { rate: val })
                                      toast.success('汇率更新成功')
                                      loadData()
                                  } catch(e) { toast.error('更新失败') }
                              }}
                              className="bg-[#00E701] text-black px-6 py-2.5 rounded-lg font-bold hover:bg-[#00c001] transition"
                          >
                              更新汇率
                          </button>
                          
                          <button 
                              onClick={async () => {
                                  const btn = document.getElementById('btn_sync_rate') as HTMLButtonElement
                                  if(btn) btn.disabled = true;
                                  const toastId = toast.loading('正在同步实时汇率...')
                                  try {
                                      const res = await api.post('/admin/config/rate/sync')
                                      toast.dismiss(toastId)
                                      toast.success(`同步成功: R$ ${res.data.rate}`)
                                      // Update input
                                      const input = document.getElementById('exchange_rate_input') as HTMLInputElement
                                      if(input) input.value = res.data.rate;
                                      
                                      // Trigger reload
                                      loadData()
                                  } catch(e) { 
                                      toast.dismiss(toastId)
                                      toast.error('同步失败: API不可用') 
                                  } finally {
                                      if(btn) btn.disabled = false;
                                  }
                              }}
                              id="btn_sync_rate"
                              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-blue-500 transition flex items-center gap-2 disabled:opacity-50"
                          >
                              <RefreshCw size={18} /> 同步实时
                          </button>
                          
                          <div className="text-xs text-gray-500 pb-2">
                              * 此汇率实时影响所有充值和提现计算。
                          </div>
                      </div>
                  </div>

                  <div className="p-4 border-b border-gray-800">
                      <input 
                          type="text" 
                          placeholder="搜索 UID / 邮箱..." 
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && loadData()}
                          className="bg-[#0f212e] border border-gray-700 rounded px-4 py-2 w-64 text-sm text-white"
                      />
                      <button onClick={loadData} className="ml-2 bg-[#00E701] text-black px-4 py-2 rounded text-sm font-bold">搜索</button>
                  </div>
                  <table className="w-full text-sm text-left">
                      <thead className="bg-black/20 text-gray-400 font-bold uppercase text-xs">
                          <tr><th className="p-4">用户</th><th className="p-4">类型</th><th className="p-4">金额 (BRL)</th><th className="p-4">USDT / 详情</th><th className="p-4">状态</th><th className="p-4">操作</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                          {txs.map(tx => (
                              <tr key={tx.id} className="hover:bg-white/5">
                                  <td className="p-4">{tx.name}<br/><span className="text-xs text-gray-500">UID: {tx.uid}</span></td>
                                  <td className="p-4 uppercase font-bold text-xs">{tx.type === 'deposit' ? '充值' : tx.type === 'withdraw' ? '提现' : tx.type}</td>
                                  <td className="p-4 font-bold text-white">R$ {Number(tx.amount || 0).toFixed(2)}</td>
                                  <td className="p-4">
                                      {tx.usdt_amount && (
                                          <div className="text-[#00E701] font-mono text-xs mb-1">
                                              {tx.type === 'deposit' ? '+' : '-'}{Number(tx.usdt_amount || 0).toFixed(2)} USDT
                                          </div>
                                      )}
                                      <div className="text-xs text-gray-400 max-w-xs break-all">
                                          {tx.note}
                                          {tx.type === 'withdraw' && (
                                              <div className="text-gray-500 mt-1 flex items-center gap-1">
                                                  {editingAddress?.id === tx.id ? (
                                                      <div className="flex gap-1">
                                                          <input 
                                                              className="bg-black border border-gray-600 rounded px-1 w-32"
                                                              value={editingAddress.addr}
                                                              onChange={e => setEditingAddress({...editingAddress, addr: e.target.value})}
                                                          />
                                                          <button onClick={saveAddress} className="text-green-500">保存</button>
                                                          <button onClick={()=>setEditingAddress(null)} className="text-gray-500">取消</button>
                                                      </div>
                                                  ) : (
                                                      <>
                                                          地址: {tx.wallet_address || '无'}
                                                          {tx.status === 'pending' && <button onClick={()=>setEditingAddress({id: tx.id, addr: tx.wallet_address || ''})} className="text-blue-400 hover:text-white">✏️</button>}
                                                      </>
                                                  )}
                                              </div>
                                          )}
                                      </div>
                                  </td>
                                  <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold uppercase ${tx.status==='completed'?'bg-green-500/20 text-green-500':tx.status==='pending'?'bg-yellow-500/20 text-yellow-500':'bg-red-500/20 text-red-500'}`}>{tx.status}</span></td>
                                  <td className="p-4">
                                      {tx.status === 'pending' && (
                                          <div className="flex gap-2">
                                              <button onClick={()=>approveTx(tx.id)} className="text-green-500 hover:underline flex items-center gap-1"><CheckCircle size={14}/> 通过</button>
                                              <button onClick={()=>rejectTx(tx.id)} className="text-red-500 hover:underline flex items-center gap-1"><XCircle size={14}/> 拒绝</button>
                                              {tx.proof_image_id && <button onClick={()=>viewProof(tx.proof_image_id)} className="text-blue-400 hover:underline flex items-center gap-1"><Eye size={14}/> 凭证</button>}
                                          </div>
                                      )}
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          )}

          {tab === 'users' && (
              <div className="bg-[#1a2c38] rounded-xl border border-gray-800 overflow-hidden">
                  <div className="p-4 border-b border-gray-800">
                      <input 
                          type="text" 
                          placeholder="搜索 UID / 邮箱 / 姓名..." 
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && loadData()}
                          className="bg-[#0f212e] border border-gray-700 rounded px-4 py-2 w-64 text-sm text-white"
                      />
                      <button onClick={loadData} className="ml-2 bg-[#00E701] text-black px-4 py-2 rounded text-sm font-bold">搜索</button>
                  </div>
                  <table className="w-full text-sm text-left">
                      <thead className="bg-black/20 text-gray-400 font-bold uppercase text-xs">
                          <tr><th className="p-4">UID</th><th className="p-4">用户</th><th className="p-4">费率</th><th className="p-4">余额</th><th className="p-4">KYC</th><th className="p-4">状态</th><th className="p-4">操作</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                          {users.map(u => (
                              <tr key={u.id} className="hover:bg-white/5">
                                  <td className="p-4 font-mono text-blue-400">{u.uid}</td>
                                  <td className="p-4">{u.email}</td>
                                  <td className="p-4"><input type="number" step="0.01" defaultValue={u.commission_rate} onBlur={(e)=>updateRate(u.id, parseFloat(e.target.value))} className="bg-[#0f212e] border border-gray-700 w-16 text-center rounded"/></td>
                                  <td className="p-4 font-mono text-[#00E701]">R$ {Number(u.balance || 0).toFixed(2)}</td>
                                  <td className="p-4"><span className={`px-2 py-0.5 rounded text-xs ${u.kyc_status==='verified'?'bg-green-500/20 text-green-500':'bg-gray-700 text-gray-400'}`}>{u.kyc_status}</span></td>
                                  <td className="p-4"><span className={`px-2 py-0.5 rounded text-xs ${u.status==='frozen'?'bg-red-500/20 text-red-500':'bg-green-500/20 text-green-500'}`}>{u.status === 'frozen' ? '冻结' : '正常'}</span></td>
                                  <td className="p-4">
                                      <div className="flex gap-2 items-center">
                                          <button onClick={()=>setBalanceModal({show:true, id: u.id, type: 'add'})} className="bg-gray-700 p-1 rounded hover:bg-gray-600" title="增加余额"><PlusCircle size={14}/></button>
                                          <button onClick={()=>setBalanceModal({show:true, id: u.id, type: 'deduct'})} className="bg-gray-700 p-1 rounded hover:bg-gray-600" title="扣除余额"><MinusCircle size={14}/></button>
                                          
                                          <div className="h-4 w-px bg-gray-700 mx-1"></div>
                                          
                                          <button onClick={()=>toggleStatus(u.id, u.status)} className={`p-1 rounded ${u.status === 'frozen' ? 'text-green-500 hover:bg-green-500/10' : 'text-orange-500 hover:bg-orange-500/10'}`} title={u.status === 'frozen' ? '解冻' : '冻结'}>
                                              {u.status === 'frozen' ? <Unlock size={14}/> : <Lock size={14}/>}
                                          </button>
                                          <button onClick={()=>deleteUser(u.id, u.email)} className="p-1 rounded text-red-500 hover:bg-red-500/10" title="删除用户">
                                              <Trash2 size={14}/>
                                          </button>

                                          <div className="h-4 w-px bg-gray-700 mx-1"></div>
                                          
                                          <button onClick={()=>resetPassword(u.id, u.email)} className="text-xs text-yellow-500 hover:text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded">重置密码</button>
                                          <button onClick={()=>resetPin(u.id, u.email)} className="text-xs text-blue-500 hover:text-blue-400 bg-blue-500/10 px-2 py-1 rounded">重置PIN</button>
                                          <button onClick={()=>viewUser(u.id)} className="text-xs text-white bg-gray-600 px-2 py-1 rounded ml-2">详情</button>

                                          {u.kyc_status === 'pending' && <button onClick={()=>reviewKyc(u.id)} className="text-xs bg-purple-600 hover:bg-purple-500 px-2 py-1 rounded ml-2">审核KYC</button>}
                                      </div>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          )}

          {tab === 'settings' && (
              <div className="bg-[#1a2c38] p-8 rounded-xl border border-gray-800 max-w-2xl space-y-6">
                  <h3 className="text-lg font-bold">基本配置</h3>
                  {[
                      {k: 'deposit_address', l: 'USDT 充值地址'},
                      {k: 'support_tg', l: 'Telegram 链接'},
                      {k: 'support_ws', l: 'WhatsApp 链接'},
                      {k: 'odds_api_key', l: '赛事 API Key'}
                  ].map(f => (
                      <div key={f.k}><label className="text-xs text-gray-400 block mb-1">{f.l}</label><div className="flex gap-2"><input id={f.k} defaultValue={config[f.k]} className="flex-1 bg-[#0f212e] border border-gray-700 rounded p-2"/><button onClick={()=>saveConfig(f.k, (document.getElementById(f.k) as HTMLInputElement).value)} className="bg-[#00E701] text-black px-4 rounded font-bold">保存</button></div></div>
                  ))}
                  
                  <div className="pt-6 border-t border-gray-700">
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Mail size={20}/> 邮件服务 (Resend)</h3>
                      <div className="space-y-4">
                          <div><label className="text-xs text-gray-400 block mb-1">Resend API Key</label><div className="flex gap-2"><input id="resend_key" defaultValue={config['resend_api_key']} className="flex-1 bg-[#0f212e] border border-gray-700 rounded p-2" type="password"/><button onClick={()=>saveConfig('resend_api_key', (document.getElementById('resend_key') as HTMLInputElement).value)} className="bg-[#00E701] text-black px-4 rounded font-bold">保存</button></div></div>
                          <div><label className="text-xs text-gray-400 block mb-1">注册邮件模板 (HTML)</label><textarea id="tpl_reg" defaultValue={config['email_template_register']} className="w-full bg-[#0f212e] border border-gray-700 rounded p-2 h-20" placeholder="Use {code} placeholder"/><button onClick={()=>saveConfig('email_template_register', (document.getElementById('tpl_reg') as HTMLInputElement).value)} className="bg-[#00E701] text-black px-4 py-1 rounded font-bold mt-2 w-full">保存模板</button></div>
                      </div>
                  </div>

                  <div className="pt-6 border-t border-gray-700">
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Upload size={20}/> 平台证书</h3>
                      <div className="grid grid-cols-2 gap-4">
                          <div className="bg-black/20 p-4 rounded-lg border border-gray-700">
                              <label className="text-xs text-gray-400 block mb-2">运营执照 (License)</label>
                              {config['cert_license'] ? (
                                  <img src={config['cert_license']} className="h-32 object-contain mb-2 rounded border border-gray-700"/>
                              ) : <div className="h-32 flex items-center justify-center text-gray-600 text-xs border border-dashed border-gray-700 rounded mb-2">未上传</div>}
                              <label className="block bg-gray-700 hover:bg-gray-600 text-white text-center py-2 rounded cursor-pointer text-xs font-bold">
                                  上传执照
                                  <input type="file" className="hidden" accept="image/*" onChange={(e)=>uploadCert(e, 'cert_license')}/>
                              </label>
                          </div>
                          <div className="bg-black/20 p-4 rounded-lg border border-gray-700">
                              <label className="text-xs text-gray-400 block mb-2">代理合同 (Contract)</label>
                              {config['cert_contract'] ? (
                                  <img src={config['cert_contract']} className="h-32 object-contain mb-2 rounded border border-gray-700"/>
                              ) : <div className="h-32 flex items-center justify-center text-gray-600 text-xs border border-dashed border-gray-700 rounded mb-2">未上传</div>}
                              <label className="block bg-gray-700 hover:bg-gray-600 text-white text-center py-2 rounded cursor-pointer text-xs font-bold">
                                  上传合同
                                  <input type="file" className="hidden" accept="image/*" onChange={(e)=>uploadCert(e, 'cert_contract')}/>
                              </label>
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {tab === 'notify' && (
              <div className="bg-[#1a2c38] p-8 rounded-xl border border-gray-800 max-w-2xl space-y-4">
                  <div><label className="text-xs text-gray-400 block mb-1">UID (留空群发)</label><input value={notifTarget} onChange={e=>setNotifTarget(e.target.value)} className="w-full bg-[#0f212e] border border-gray-700 rounded p-2"/></div>
                  <div><label className="text-xs text-gray-400 block mb-1">标题</label><input value={notifTitle} onChange={e=>setNotifTitle(e.target.value)} className="w-full bg-[#0f212e] border border-gray-700 rounded p-2"/></div>
                  <div><label className="text-xs text-gray-400 block mb-1">内容</label><textarea value={notifMsg} onChange={e=>setNotifMsg(e.target.value)} rows={4} className="w-full bg-[#0f212e] border border-gray-700 rounded p-2"/></div>
                  <button onClick={sendNotification} className="w-full bg-[#00E701] text-black font-bold py-3 rounded flex items-center justify-center gap-2"><Send size={18}/> 发送</button>
              </div>
          )}

          {/* Dialogs */}
          <Dialog open={!!previewImage} onClose={()=>setPreviewImage(null)} className="relative z-[100]">
              <div className="fixed inset-0 bg-black/90 backdrop-blur-sm"/><div className="fixed inset-0 flex items-center justify-center p-4" onClick={()=>setPreviewImage(null)}><Dialog.Panel><img src={previewImage!} className="max-h-[80vh] rounded-lg"/></Dialog.Panel></div>
          </Dialog>

          <Dialog open={balanceModal.show} onClose={()=>setBalanceModal({...balanceModal, show: false})} className="relative z-[100]">
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm"/><div className="fixed inset-0 flex items-center justify-center p-4"><Dialog.Panel className="bg-[#1a2c38] p-6 rounded-xl w-full max-w-sm border border-gray-700"><h3 className="text-lg font-bold mb-4">{balanceModal.type==='add'?'增加':'扣除'}余额</h3><input type="number" value={balanceAmount} onChange={e=>setBalanceAmount(e.target.value)} className="w-full bg-[#0f212e] border-gray-700 rounded p-2 mb-4 text-center text-xl" autoFocus/><div className="flex gap-2"><button onClick={()=>setBalanceModal({...balanceModal, show:false})} className="flex-1 bg-gray-700 py-2 rounded">取消</button><button onClick={handleBalance} className="flex-1 bg-[#00E701] text-black py-2 rounded font-bold">确认</button></div></Dialog.Panel></div>
          </Dialog>

          <Dialog open={userProfile.show} onClose={()=>setUserProfile({...userProfile, show: false})} className="relative z-[100]">
              <div className="fixed inset-0 bg-black/90 backdrop-blur-sm"/>
              <div className="fixed inset-0 flex items-center justify-center p-4">
                  <Dialog.Panel className="bg-[#1a2c38] p-6 rounded-xl w-full max-w-2xl border border-gray-700 max-h-[90vh] overflow-y-auto">
                      <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
                          <h3 className="text-xl font-bold text-white">用户资料</h3>
                          <button onClick={()=>setUserProfile({...userProfile, show: false})}><XCircle className="text-gray-400 hover:text-white"/></button>
                      </div>
                      
                      {userProfile.data && (
                          <div className="space-y-6">
                              <div className="grid grid-cols-2 gap-4">
                                  <div className="bg-black/20 p-4 rounded-lg">
                                      <div className="text-xs text-gray-400">姓名</div>
                                      <div className="text-lg font-bold">{userProfile.data.name || '-'}</div>
                                  </div>
                                  <div className="bg-black/20 p-4 rounded-lg">
                                      <div className="text-xs text-gray-400">邮箱</div>
                                      <div className="text-lg font-bold">{userProfile.data.email}</div>
                                  </div>
                                  <div className="bg-black/20 p-4 rounded-lg">
                                      <div className="text-xs text-gray-400">当前余额</div>
                                      <div className="text-xl font-bold text-[#00E701]">R$ {Number(userProfile.data.balance).toFixed(2)}</div>
                                  </div>
                                  <div className="bg-black/20 p-4 rounded-lg">
                                      <div className="text-xs text-gray-400">KYC状态</div>
                                      <div className={`text-lg font-bold uppercase ${userProfile.data.kyc_status==='verified'?'text-green-500':'text-gray-400'}`}>{userProfile.data.kyc_status}</div>
                                  </div>
                              </div>

                              <div className="border-t border-gray-700 pt-4">
                                  <h4 className="font-bold mb-3 text-gray-300">财务汇总</h4>
                                  <div className="grid grid-cols-3 gap-3">
                                      <div className="bg-blue-500/10 p-3 rounded border border-blue-500/20">
                                          <div className="text-xs text-blue-400">总充值</div>
                                          <div className="text-lg font-bold text-blue-300">R$ {Number(userProfile.data.stats?.total_deposits || 0).toFixed(2)}</div>
                                      </div>
                                      <div className="bg-red-500/10 p-3 rounded border border-red-500/20">
                                          <div className="text-xs text-red-400">总提现</div>
                                          <div className="text-lg font-bold text-red-300">R$ {Number(userProfile.data.stats?.total_withdrawals || 0).toFixed(2)}</div>
                                      </div>
                                      <div className="bg-purple-500/10 p-3 rounded border border-purple-500/20">
                                          <div className="text-xs text-purple-400">总投注</div>
                                          <div className="text-lg font-bold text-purple-300">R$ {Number(userProfile.data.stats?.total_bets || 0).toFixed(2)}</div>
                                      </div>
                                  </div>
                              </div>

                              <div className="border-t border-gray-700 pt-4">
                                  <h4 className="font-bold mb-3 text-gray-300">团队关系</h4>
                                  <div className="grid grid-cols-2 gap-4">
                                      <div className="bg-black/20 p-4 rounded-lg">
                                          <div className="text-xs text-gray-400 mb-1">上级用户 (Upline)</div>
                                          {userProfile.data.upline_uid ? (
                                              <div className="font-mono text-[#00E701] font-bold">{userProfile.data.upline_uid}</div>
                                          ) : <div className="text-gray-500 italic">无上级</div>}
                                      </div>
                                      <div className="bg-black/20 p-4 rounded-lg">
                                          <div className="text-xs text-gray-400 mb-1">下级团队 (Direct Downline)</div>
                                          <div className="font-bold text-xl">{userProfile.data.downline_uids?.length || 0} <span className="text-sm text-gray-500 font-normal">人</span></div>
                                      </div>
                                  </div>
                                  
                                  {userProfile.data.downline_uids && userProfile.data.downline_uids.length > 0 && (
                                      <div className="mt-3 bg-black/20 p-3 rounded-lg max-h-32 overflow-y-auto">
                                          <div className="text-xs text-gray-500 mb-2">下级 UID 列表:</div>
                                          <div className="flex flex-wrap gap-2">
                                              {userProfile.data.downline_uids.map((uid: string) => (
                                                  <span key={uid} className="bg-gray-700 px-2 py-1 rounded text-xs font-mono">{uid}</span>
                                              ))}
                                          </div>
                                      </div>
                                  )}
                              </div>

                              {userProfile.data.real_name && (
                                  <div className="border-t border-gray-700 pt-4">
                                      <h4 className="font-bold mb-3 text-gray-300">KYC数据</h4>
                                      <div className="flex gap-4 items-center bg-black/20 p-3 rounded-lg">
                                          <div>
                                              <div className="text-xs text-gray-400">真实姓名</div>
                                              <div className="font-bold">{userProfile.data.real_name}</div>
                                          </div>
                                          <div className="h-8 w-px bg-gray-700"></div>
                                          <div>
                                              <div className="text-xs text-gray-400">CPF</div>
                                              <div className="font-bold">{userProfile.data.cpf}</div>
                                          </div>
                                          <div className="ml-auto">
                                              <button 
                                                  onClick={()=>{
                                                      setKycReview({show: true, data: userProfile.data})
                                                      setUserProfile({...userProfile, show: false})
                                                  }}
                                                  className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-3 py-2 rounded font-bold"
                                              >
                                                  查看证件
                                              </button>
                                          </div>
                                      </div>
                                  </div>
                              )}
                          </div>
                      )}
                  </Dialog.Panel>
              </div>
          </Dialog>

          {/* KYC Review Dialog */}
          <Dialog open={kycReview.show} onClose={()=>setKycReview({...kycReview, show: false})} className="relative z-[100]">
              <div className="fixed inset-0 bg-black/90 backdrop-blur-sm"/>
              <div className="fixed inset-0 flex items-center justify-center p-4">
                  <Dialog.Panel className="bg-[#1a2c38] p-6 rounded-xl w-full max-w-4xl border border-gray-700 max-h-[90vh] overflow-y-auto">
                      <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
                          <h3 className="text-xl font-bold text-white">审核 KYC</h3>
                          <button onClick={()=>setKycReview({...kycReview, show: false})}><XCircle className="text-gray-400 hover:text-white"/></button>
                      </div>

                      {kycReview.data && (
                          <div className="space-y-6">
                              <div className="grid grid-cols-2 gap-6">
                                  <div className="bg-black/20 p-4 rounded-lg">
                                      <div className="text-xs text-gray-400 mb-1">真实姓名</div>
                                      <div className="text-xl font-bold">{kycReview.data.real_name || '未填'}</div>
                                  </div>
                                  <div className="bg-black/20 p-4 rounded-lg">
                                      <div className="text-xs text-gray-400 mb-1">CPF / 证件号</div>
                                      <div className="text-xl font-bold font-mono">{kycReview.data.cpf || '未填'}</div>
                                  </div>
                              </div>

                          <div className="grid grid-cols-2 gap-4">
                                  <div>
                                      <div className="text-xs text-gray-400 mb-2">证件正面</div>
                                      {kycReview.data.kyc_image_front ? (
                                          <img 
                                              src={kycReview.data.kyc_image_front} 
                                              className="w-full rounded border border-gray-700 cursor-pointer hover:opacity-80 transition"
                                              onClick={() => setPreviewImage(kycReview.data.kyc_image_front)}
                                          />
                                      ) : <div className="h-32 flex items-center justify-center border border-dashed border-gray-700 rounded text-gray-500 text-xs">未上传</div>}
                                  </div>
                                  <div>
                                      <div className="text-xs text-gray-400 mb-2">证件背面</div>
                                      {kycReview.data.kyc_image_back ? (
                                          <img 
                                              src={kycReview.data.kyc_image_back} 
                                              className="w-full rounded border border-gray-700 cursor-pointer hover:opacity-80 transition"
                                              onClick={() => setPreviewImage(kycReview.data.kyc_image_back)}
                                          />
                                      ) : <div className="h-32 flex items-center justify-center border border-dashed border-gray-700 rounded text-gray-500 text-xs">未上传</div>}
                                  </div>
                              </div>

                              <div className="flex gap-4 pt-4 border-t border-gray-700">
                                  <button onClick={rejectKyc} className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 py-3 rounded-lg font-bold transition">拒绝 KYC</button>
                                  <button onClick={approveKyc} className="flex-1 bg-[#00E701] hover:bg-[#00c001] text-black py-3 rounded-lg font-bold transition shadow-[0_0_20px_rgba(0,231,1,0.3)]">通过审核</button>
                              </div>
                          </div>
                      )}
                  </Dialog.Panel>
              </div>
          </Dialog>

          <ConfirmModal isOpen={confirmState.show} onClose={()=>setConfirm({...confirmState, show:false})} onConfirm={confirmState.action} title={confirmState.title} message={confirmState.msg} danger={confirmState.danger}/>
      </main>
    </div>
  )
}
