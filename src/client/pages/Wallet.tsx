import { useState, useEffect, useRef } from 'react'
import html2canvas from 'html2canvas'
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, Lock, RefreshCcw, Copy, CheckCircle2, Upload, AlertCircle, Settings, Download } from 'lucide-react'
import { toast } from 'sonner'
import { useUser } from '../context/UserContext'
import api from '../utils/api'
import { isValidCPF } from '../utils/validators'

export default function Wallet() {
  const { user, refreshUser } = useUser()
  const [walletInfo, setWalletInfo] = useState<any>(null)
  // Store rate in local state for immediate updates, though context also has it
  const [currentRate, setCurrentRate] = useState(5.85) 
  const [loading, setLoading] = useState(true)
  const [paymentMethod, setPaymentMethod] = useState<'usdt' | 'pix'>('pix')
  const [pixType, setPixType] = useState('CPF')
  const [pixKey, setPixKey] = useState('')
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit')
  const [step, setStep] = useState<'input' | 'payment' | 'success' | 'qrcode'>('input') // deposit flow
  const [pixQrCode, setPixQrCode] = useState('')
  const [pixCopyPaste, setPixCopyPaste] = useState('')
  
  // Forms
  const [amount, setAmount] = useState('')
  const [pin, setPin] = useState('')
  const [setupPin, setSetupPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [withdrawAddress, setWithdrawAddress] = useState('') // New state for withdraw address
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [proofPreview, setProofPreview] = useState('')
  const [processing, setProcessing] = useState(false)

  // Derived
  const usdtRate = currentRate || walletInfo?.rate || 5.85
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
          if(res.data.rate) setCurrentRate(res.data.rate)
      }).catch(console.error)
    } catch (e) {
      console.error(e)
    } finally {
      setTimeout(() => setLoading(false), 500)
    }
  }

  const handleDepositInit = async (e: React.FormEvent) => {
    e.preventDefault()
    if(!amount || parseFloat(amount) < 10) return toast.error('Mínimo R$ 10,00')
    
    if (paymentMethod === 'pix') {
        setProcessing(true)
        try {
            const res = await api.post('/vqpay/pay', {
                amount: parseFloat(amount),
                payment_method_id: 'PIX'
            })
            if (res.data.success) {
                if (res.data.qr_code) {
                    setPixQrCode(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(res.data.qr_code)}`)
                    setPixCopyPaste(res.data.qr_code)
                    setStep('qrcode')
                } else if (res.data.redirect_url) {
                    window.location.href = res.data.redirect_url
                } else {
                    toast.error('Erro: Resposta de pagamento inválida')
                }
            } else {
                toast.error('Erro ao iniciar pagamento PIX')
            }
        } catch (e: any) {
            toast.error(e.response?.data?.error || 'Erro ao processar PIX')
        } finally {
            setProcessing(false)
        }
    } else {
        setStep('payment')
    }
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

    const val = parseFloat(amount);
    if (isNaN(val) || val < 10) return toast.error('Mínimo R$ 10,00');
    if (val > currentBalance) return toast.error('Saldo insuficiente');

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

  const downloadQrCode = async () => {
      if (!pixQrCode) return
      
      try {
        const response = await fetch(pixQrCode);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `pix-payment-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Download failed:', error);
        toast.error('Erro ao baixar QR Code. Tente salvar manualmente.');
        window.open(pixQrCode, '_blank');
      }
  }

  const handleSetup = async (e: React.FormEvent) => {
      e.preventDefault()
      if (setupPin !== confirmPin) return toast.error('Os PINs não coincidem')
      
      setProcessing(true)
      try {
          await api.post('/wallet/setup', { pin: setupPin })
          toast.success('PIN configurado!')
          fetchData()
          refreshUser()
      } catch (e: any) {
          toast.error(e.response?.data?.error || 'Erro ao salvar')
      } finally {
          setProcessing(false)
      }
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
                              className="w-full bg-black/40 border border-white/10 rounded-lg py-3 px-4 text-white focus:border-primary outline-none tracking-widest text-center"
                              placeholder="******"
                              required
                          />
                      </div>
                      <div>
                          <label className="block text-xs text-textMuted mb-1.5">Confirmar PIN</label>
                          <input 
                              type="password" 
                              maxLength={6}
                              value={confirmPin}
                              onChange={e => setConfirmPin(e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-lg py-3 px-4 text-white focus:border-primary outline-none tracking-widest text-center"
                              placeholder="******"
                              required
                          />
                      </div>
                      <button 
                          type="submit" 
                          disabled={processing}
                          className="w-full bg-primary text-black font-bold py-3.5 rounded-lg hover:bg-primary/90 transition-colors"
                      >
                          {processing ? 'Salvando...' : 'Confirmar e Continuar'}
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
                        
                        {/* Method Selector */}
                        <div className="grid grid-cols-2 gap-2 mb-6">
                            <button
                                type="button"
                                onClick={() => setPaymentMethod('pix')}
                                className={`py-3 rounded-lg border flex flex-col items-center justify-center gap-1 transition ${
                                    paymentMethod === 'pix' 
                                    ? 'bg-green-500/10 border-green-500 text-green-500' 
                                    : 'bg-black/20 border-white/5 text-textMuted hover:bg-white/5'
                                }`}
                            >
                                <span className="font-bold">PIX</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setPaymentMethod('usdt')}
                                className={`py-3 rounded-lg border flex flex-col items-center justify-center gap-1 transition ${
                                    paymentMethod === 'usdt' 
                                    ? 'bg-primary/10 border-primary text-primary' 
                                    : 'bg-black/20 border-white/5 text-textMuted hover:bg-white/5'
                                }`}
                            >
                                <span className="font-bold">USDT</span>
                            </button>
                        </div>

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

                        <button type="submit" className="w-full bg-primary hover:bg-primaryHover text-black font-bold py-4 rounded-xl transition-all transform active:scale-[0.98] flex items-center justify-center gap-2">
                            {processing ? (
                                <>
                                    <RefreshCcw className="animate-spin" size={20} />
                                    <span>Processando...</span>
                                </>
                            ) : <span>Continuar para Pagamento</span>}
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

                {step === 'qrcode' && (
                    <div className="flex flex-col items-center justify-center py-6 animate-in zoom-in duration-300">
                        <h3 className="text-xl font-bold text-white mb-4">Pagamento via PIX</h3>
                        <div className="bg-white p-2 rounded-xl mb-4 relative group">
                            <img src={pixQrCode} alt="PIX QR Code" className="w-48 h-48" />
                            <button 
                                onClick={downloadQrCode}
                                className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-[#15222b] border border-white/20 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 hover:bg-black transition whitespace-nowrap z-10"
                            >
                                <Download size={14} /> Salvar Imagem
                            </button>
                        </div>
                        
                        <div className="w-full bg-[#15222b] border border-white/5 rounded-lg p-3 flex items-center justify-between gap-3 mb-6">
                            <div className="truncate text-xs font-mono text-textMuted flex-1 overflow-hidden">
                                {pixCopyPaste}
                            </div>
                            <button onClick={() => copyToClipboard(pixCopyPaste)} className="p-2 hover:bg-white/10 rounded-lg transition text-[#00E701]">
                                <Copy size={18} />
                            </button>
                        </div>

                        <div className="flex gap-3 w-full mt-3">
                            <button onClick={() => setStep('input')} className="flex-1 bg-surfaceHover text-white font-bold py-3.5 rounded-xl border border-white/10 hover:bg-white/10 transition">
                                Cancelar
                            </button>
                            <button onClick={() => {
                                setStep('success');
                                fetchData();
                                refreshUser();
                            }} className="flex-1 bg-[#00E701] hover:bg-[#00c001] text-black font-bold py-3.5 rounded-xl shadow-[0_0_20px_rgba(0,231,1,0.2)]">
                                Já Paguei
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
                <div className="grid grid-cols-2 gap-2 mb-6">
                    <button
                        type="button"
                        onClick={() => setPaymentMethod('pix')}
                        className={`py-3 rounded-lg border flex flex-col items-center justify-center gap-1 transition ${
                            paymentMethod === 'pix' 
                            ? 'bg-green-500/10 border-green-500 text-green-500' 
                            : 'bg-black/20 border-white/5 text-textMuted hover:bg-white/5'
                        }`}
                    >
                        <span className="font-bold">PIX</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setPaymentMethod('usdt')}
                        className={`py-3 rounded-lg border flex flex-col items-center justify-center gap-1 transition ${
                            paymentMethod === 'usdt' 
                            ? 'bg-primary/10 border-primary text-primary' 
                            : 'bg-black/20 border-white/5 text-textMuted hover:bg-white/5'
                        }`}
                    >
                        <span className="font-bold">USDT</span>
                    </button>
                </div>

                <form onSubmit={async (e) => {
                    if (paymentMethod === 'pix') {
                         e.preventDefault();
                         
                         const val = parseFloat(amount);
                         if (isNaN(val) || val < 10) return toast.error('Mínimo R$ 10,00');
                         if (val > currentBalance) return toast.error('Saldo insuficiente');

                         // Pre-validate CPF (Checksum)
                         if (pixType === 'CPF') {
                             const cleanCPF = pixKey.replace(/\D/g, '');
                             if (!isValidCPF(cleanCPF)) {
                                 return toast.error('CPF inválido. Verifique os dígitos.');
                             }
                         }

                         setProcessing(true);
                         try {
                              await api.post('/vqpay/settle', {
                                  amount: parseFloat(amount),
                                  pin,
                                  account_type: pixType,
                                  // Clean CPF/Phone keys (only digits) to avoid gateway errors
                                  account_key: pixType === 'CPF' || pixType === 'PHONE' ? pixKey.replace(/\D/g, '') : pixKey,
                                  document: pixType === 'CPF' ? pixKey.replace(/\D/g, '') : undefined
                              })
                              toast.success('Saque PIX solicitado!')
                              setAmount('')
                              setPin('')
                              fetchData()
                         } catch (err: any) {
                              toast.error(err.response?.data?.error || 'Erro Saque')
                         } finally {
                              setProcessing(false)
                         }
                    } else {
                         handleWithdraw(e)
                    }
                }} className="space-y-6">
                    
                    {paymentMethod === 'usdt' ? (
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
                    ) : (
                        <div className="space-y-4">
                             <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                <label className="block text-xs text-textMuted mb-2">Tipo de Chave PIX</label>
                                <select 
                                    value={pixType}
                                    onChange={e => setPixType(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-white focus:border-primary outline-none"
                                >
                                    <option value="CPF">CPF</option>
                                    <option value="PHONE">Celular</option>
                                    <option value="EMAIL">E-mail</option>
                                    <option value="CHAVE">Chave Aleatória</option>
                                </select>
                            </div>
                            <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                <label className="block text-xs text-textMuted mb-2">Chave PIX</label>
                                <input 
                                    type="text" 
                                    value={pixKey}
                                    onChange={e => {
                                        let val = e.target.value
                                        if (pixType === 'EMAIL') val = val.toLowerCase()
                                        // For CPF/Phone we clean on submit but showing valid chars is good
                                        setPixKey(val)
                                    }}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-white focus:border-primary outline-none"
                                    placeholder={
                                        pixType === 'CPF' ? '000.000.000-00 (11 dígitos)' : 
                                        pixType === 'PHONE' ? '(00) 00000-0000' : 
                                        pixType === 'EMAIL' ? 'seu@email.com' : 'Sua chave pix'
                                    }
                                    required
                                />
                                <div className="mt-1.5 text-[10px] text-textMuted">
                                    {pixType === 'CPF' && 'Digite apenas os 11 números do seu CPF.'}
                                    {pixType === 'PHONE' && 'Digite seu celular com DDD (11 dígitos) ou com código do país (55 + 11 dígitos).'}
                                    {pixType === 'EMAIL' && 'Digite seu endereço de e-mail (tudo minúsculo).'}
                                    {pixType === 'CHAVE' && 'Cole sua chave aleatória completa.'}
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs text-textMuted mb-2 uppercase font-bold">Valor do Saque (BRL)</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted font-bold">R$</span>
                            <input 
                                type="number" 
                                step="0.01"
                                min="10"
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
                        <span>Confirmar Saque</span>
                    </button>
                </form>
            </div>
        )}
      </div>
    </div>
  )
}
