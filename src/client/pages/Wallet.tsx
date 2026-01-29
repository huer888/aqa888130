import { useState, useEffect } from 'react'
import api from '../utils/api'
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, Lock, RefreshCcw, Copy, CheckCircle2, Upload, AlertCircle, Settings } from 'lucide-react'
import { toast } from 'sonner'
import { useUser } from '../context/UserContext'

export default function Wallet() {
  const { user, refreshUser } = useUser()
  const [walletInfo, setWalletInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit')
  const [step, setStep] = useState<'input' | 'payment' | 'success'>('input') // deposit flow
  
  // Forms
  const [amount, setAmount] = useState('')
  const [pin, setPin] = useState('')
  const [setupPin, setSetupPin] = useState('')
  const [setupAddress, setSetupAddress] = useState('')
  const [withdrawAddress, setWithdrawAddress] = useState('') // New state for withdraw address
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [proofPreview, setProofPreview] = useState('')
  const [processing, setProcessing] = useState(false)

  // Derived
  const usdtRate = walletInfo?.rate || 1
  const usdtAmount = amount ? (parseFloat(amount) / usdtRate).toFixed(2) : '0.00'
  const currentBalance = Number(user?.balance || 0)

  useEffect(() => {
    fetchData()
  }, [])

  // Sync address from user context when available
  useEffect(() => {
      if(user?.usdt_address) setWithdrawAddress(user.usdt_address)
  }, [user])

  const fetchData = async () => {
    try {
      // Fetch Info
      api.get('/wallet/info').then(res => {
          setWalletInfo(res.data)
      }).catch(console.error)
    } catch (e) {
      console.error(e)
    } finally {
      setTimeout(() => setLoading(false), 500)
    }
  }

  const handleDepositInit = (e: React.FormEvent) => {
    e.preventDefault()
    if(!amount || parseFloat(amount) < 10) return toast.error('Mínimo R$ 10,00')
    setStep('payment')
  }

  const handleProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0]
          setProofFile(file)
          const reader = new FileReader()
          reader.onloadend = () => setProofPreview(reader.result as string)
          reader.readAsDataURL(file)
      }
  }

  const handleDepositSubmit = async () => {
      if (!proofFile) {
          toast.error('O comprovante é obrigatório')
          return
      }
      setProcessing(true)
      try {
          let proofId = null
          if (proofFile) {
              const formData = new FormData()
              formData.append('file', proofFile)
              formData.append('type', 'deposit_proof')
              const upRes = await api.post('/upload', formData)
              proofId = upRes.data.id
          }

          await api.post('/wallet/deposit', {
              amount: parseFloat(amount),
              proof_id: proofId
          })
          setStep('success')
          fetchData()
          refreshUser()
      } catch (e) {
          toast.error('Erro ao enviar depósito')
      } finally {
          setProcessing(false)
      }
  }

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault()
    setProcessing(true)
    try {
      // 1. Update Address first (using the PIN provided for withdrawal)
      if (withdrawAddress && withdrawAddress !== walletInfo?.usdt_address) {
          await api.post('/wallet/setup', { pin, address: withdrawAddress })
      }

      // 2. Submit Withdraw
      await api.post('/wallet/withdraw', {
        amount: parseFloat(amount),
        pin
      })
      toast.success('Saque solicitado! Aguarde aprovação.')
      setAmount('')
      setPin('')
      fetchData()
      refreshUser()
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Falha ao solicitar saque')
    } finally {
      setProcessing(false)
    }
  }

  const handleSetup = async (e: React.FormEvent) => {
      e.preventDefault()
      setProcessing(true)
      try {
          await api.post('/wallet/setup', { pin: setupPin, address: setupAddress })
          toast.success('Configurações salvas!')
          fetchData()
      } catch (e: any) {
          toast.error(e.response?.data?.error || 'Erro ao salvar')
      } finally {
          setProcessing(false)
      }
  }

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text)
      toast.success('Copiado!')
  }

  if (loading) return <div className="p-8 text-center text-textMuted">Carregando carteira...</div>

  // Setup View (If no PIN set)
  if (walletInfo && !walletInfo.has_pin) {
      return (
          <div className="max-w-md mx-auto space-y-6">
              <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl flex items-center gap-3">
                  <AlertCircle className="text-yellow-500" />
                  <div className="text-sm text-yellow-200">
                      Antes de movimentar fundos, você precisa configurar sua segurança.
                  </div>
              </div>

              <div className="bg-surface rounded-xl p-6 border border-white/5">
                  <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <Settings className="text-primary" /> Configuração Inicial
                  </h2>
                  <form onSubmit={handleSetup} className="space-y-4">
                      <div>
                          <label className="block text-xs text-textMuted mb-1.5">Definir PIN de Transação (6 dígitos)</label>
                          <input 
                              type="password" 
                              maxLength={6}
                              value={setupPin}
                              onChange={e => setSetupPin(e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-lg py-3 px-4 text-white focus:border-primary outline-none"
                              placeholder="******"
                              required
                          />
                      </div>
                      <div>
                          <label className="block text-xs text-textMuted mb-1.5">Endereço USDT (TRC20) para Saques</label>
                          <input 
                              type="text" 
                              value={setupAddress}
                              onChange={e => setSetupAddress(e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-lg py-3 px-4 text-white focus:border-primary outline-none font-mono text-xs"
                              placeholder="T..."
                              required
                          />
                      </div>
                      <button 
                          type="submit" 
                          disabled={processing}
                          className="w-full bg-primary text-black font-bold py-3.5 rounded-lg hover:bg-primary/90 transition-colors"
                      >
                          {processing ? 'Salvando...' : 'Salvar e Continuar'}
                      </button>
                  </form>
              </div>
          </div>
      )
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Balance Card */}
      <div className="bg-gradient-to-br from-[#1a2c38] to-[#0f212e] rounded-2xl p-6 border border-gray-700 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-10 -mt-10 blur-3xl"></div>
        
        <div className="flex justify-between items-start relative z-10">
            <div>
                <div className="text-sm text-textMuted mb-1 flex items-center gap-2">
                    <WalletIcon size={16} /> Saldo Total
                </div>
                <div className="text-4xl font-black text-white tracking-tight">
                R$ {currentBalance.toFixed(2)}
                </div>
                <div className="text-xs text-textMuted mt-1">
                    ≈ {(currentBalance / usdtRate).toFixed(2)} USDT
                </div>
            </div>
            <div className="text-right">
                <div className="bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/5">
                    <div className="text-[10px] text-textMuted uppercase font-bold">Cotação Atual</div>
                    <div className="text-sm font-bold text-primary">1 USDT = R$ {Number(usdtRate).toFixed(2)}</div>
                </div>
            </div>
        </div>
      </div>

      {/* Action Tabs */}
      <div className="bg-surface rounded-xl p-1 grid grid-cols-2 gap-1 border border-white/5">
        <button
          onClick={() => { setActiveTab('deposit'); setStep('input'); setAmount(''); }}
          className={`py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'deposit' 
              ? 'bg-primary text-black shadow-lg shadow-primary/10' 
              : 'text-textMuted hover:text-white hover:bg-white/5'
          }`}
        >
          <ArrowDownLeft size={18} />
          Depositar
        </button>
        <button
          onClick={() => { setActiveTab('withdraw'); setAmount(''); }}
          className={`py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'withdraw' 
              ? 'bg-[#ff4d4d] text-white shadow-lg shadow-red-500/10' 
              : 'text-textMuted hover:text-white hover:bg-white/5'
          }`}
        >
          <ArrowUpRight size={18} />
          Sacar
        </button>
      </div>

      {/* Main Content Area */}
      <div className="bg-surface rounded-xl border border-white/5 overflow-hidden min-h-[400px]">
        
        {/* DEPOSIT FLOW */}
        {activeTab === 'deposit' && (
            <div className="p-6">
                {step === 'input' && (
                    <form onSubmit={handleDepositInit} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="text-center mb-6">
                            <h3 className="text-lg font-bold text-white">Quanto você quer depositar?</h3>
                            <p className="text-xs text-textMuted mt-1">Conversão automática para BRL ao entrar na plataforma</p>
                        </div>

                        <div>
                            <label className="block text-xs text-textMuted mb-2 uppercase font-bold">Valor em Reais (BRL)</label>
                            <div className="relative group">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted font-bold">R$</span>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    min="10"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    className="w-full bg-black/40 border border-gray-700 rounded-xl py-4 pl-12 pr-4 text-2xl font-bold text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all group-hover:border-gray-600"
                                    placeholder="0.00"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="bg-white/5 rounded-xl p-4 border border-white/5 flex justify-between items-center">
                            <span className="text-sm text-textMuted">Você envia (USDT):</span>
                            <span className="text-xl font-bold text-primary">{usdtAmount} <span className="text-xs font-normal">USDT</span></span>
                        </div>

                        <button type="submit" className="w-full bg-primary hover:bg-primaryHover text-black font-bold py-4 rounded-xl transition-all transform active:scale-[0.98]">
                            Continuar para Pagamento
                        </button>
                    </form>
                )}

                {step === 'payment' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="text-center">
                            <h3 className="text-lg font-bold text-white mb-1">Envie Pagamento USDT</h3>
                            <div className="inline-block bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full border border-primary/20">
                                Rede: TRC20 (Tron)
                            </div>
                        </div>

                        <div className="flex justify-center my-6">
                            <div className="bg-white p-2 rounded-xl">
                                <img 
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${walletInfo?.platform_address || 'TRC20'}`} 
                                    alt="QR Code" 
                                    className="rounded-lg w-40 h-40"
                                />
                            </div>
                        </div>

                        <div className="bg-black/40 rounded-xl p-4 border border-white/10 flex items-center justify-between gap-4">
                            <div className="truncate text-xs font-mono text-textMuted flex-1">
                                {walletInfo?.platform_address || 'Loading...'}
                            </div>
                            <button onClick={() => copyToClipboard(walletInfo?.platform_address || '')} className="p-2 hover:bg-white/10 rounded-lg transition text-primary">
                                <Copy size={18} />
                            </button>
                        </div>

                        <div className="bg-white/5 rounded-xl p-4 border border-white/5 flex justify-between items-center">
                            <span className="text-sm text-textMuted">Valor exato:</span>
                            <div className="flex items-center gap-2">
                                <span className="text-xl font-bold text-white">{usdtAmount} USDT</span>
                                <Copy size={14} className="text-textMuted cursor-pointer hover:text-white" onClick={() => copyToClipboard(usdtAmount)} />
                            </div>
                        </div>

                        {/* Upload Proof */}
                        <div className="border-t border-gray-800 pt-4">
                            <label className="block text-xs text-textMuted mb-2 uppercase font-bold">Comprovante (Opcional)</label>
                            <div className="flex items-center justify-center w-full">
                                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-700 border-dashed rounded-xl cursor-pointer bg-black/20 hover:bg-black/40 transition">
                                    {proofPreview ? (
                                        <img src={proofPreview} className="h-full object-contain rounded-lg" />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <Upload className="w-6 h-6 text-gray-500 mb-2" />
                                            <p className="text-xs text-gray-500">Clique para enviar imagem</p>
                                        </div>
                                    )}
                                    <input type="file" className="hidden" accept="image/*" onChange={handleProofUpload} />
                                </label>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setStep('input')} className="flex-1 bg-surfaceHover text-white font-bold py-3.5 rounded-xl">Voltar</button>
                            <button 
                                onClick={handleDepositSubmit} 
                                disabled={processing}
                                className="flex-[2] bg-primary text-black font-bold py-3.5 rounded-xl hover:bg-primaryHover disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {processing && <RefreshCcw className="animate-spin" size={18} />}
                                Já fiz o envio
                            </button>
                        </div>
                    </div>
                )}

                {step === 'success' && (
                    <div className="flex flex-col items-center justify-center py-10 text-center animate-in zoom-in duration-300">
                        <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-6">
                            <CheckCircle2 size={40} />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">Solicitação Recebida!</h3>
                        <p className="text-textMuted max-w-xs mx-auto mb-8">
                            Seu depósito de <strong>{usdtAmount} USDT</strong> está em análise. O saldo será creditado automaticamente após a confirmação na rede.
                        </p>
                        <button onClick={() => { setStep('input'); setAmount(''); }} className="bg-surfaceHover text-white px-8 py-3 rounded-xl font-bold border border-white/10 hover:border-white/20 transition">
                            Novo Depósito
                        </button>
                    </div>
                )}
            </div>
        )}

        {/* WITHDRAW FLOW */}
        {activeTab === 'withdraw' && (
            <div className="p-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <form onSubmit={handleWithdraw} className="space-y-6">
                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                        <div className="flex justify-between items-center text-sm mb-2">
                            <span className="text-textMuted">Carteira de Destino</span>
                            <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded">TRC20</span>
                        </div>
                        <input 
                            type="text" 
                            value={withdrawAddress}
                            onChange={e => setWithdrawAddress(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-white focus:border-primary outline-none font-mono text-xs"
                            placeholder="Cole seu endereço USDT (TRC20)"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-textMuted mb-2 uppercase font-bold">Valor do Saque (BRL)</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted font-bold">R$</span>
                            <input 
                                type="number" 
                                step="0.01"
                                min="10"
                                max={currentBalance}
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                className="w-full bg-black/40 border border-gray-700 rounded-xl py-4 pl-12 pr-4 text-2xl font-bold text-white focus:border-[#ff4d4d] focus:ring-1 focus:ring-[#ff4d4d] outline-none transition-all"
                                placeholder="0.00"
                            />
                        </div>
                        <div className="flex justify-between mt-2 px-1">
                            <span className="text-xs text-textMuted">Disponível: R$ {currentBalance.toFixed(2)}</span>
                            <span className="text-xs font-bold text-white">Receberá: ≈ {usdtAmount} USDT</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs text-textMuted mb-2 uppercase font-bold">PIN de Transação</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted" size={18} />
                            <input 
                                type="password" 
                                maxLength={6}
                                value={pin}
                                onChange={e => setPin(e.target.value)}
                                className="w-full bg-black/40 border border-gray-700 rounded-xl py-4 pl-12 pr-4 text-white focus:border-[#ff4d4d] outline-none transition-all tracking-widest"
                                placeholder="******"
                                autoComplete="new-password"
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={processing}
                        className="w-full bg-[#ff4d4d] hover:bg-red-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-red-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {processing && <RefreshCcw className="animate-spin" size={18} />}
                        Confirmar Saque
                    </button>
                </form>
            </div>
        )}
      </div>
    </div>
  )
}
