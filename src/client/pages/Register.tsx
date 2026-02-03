// Register.tsx UI Update
import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../utils/api'
import Logo from '../components/Logo'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'

export default function Register() {
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [rate, setRate] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref) setInviteCode(ref)
    
    const r = searchParams.get('rate')
    if (r) setRate(r)
  }, [searchParams])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    // Validation (Portuguese)
    if (!name) return setError('Por favor, insira o nome de usuário')
    if (!email) return setError('Por favor, insira o e-mail')
    if (!password || password.length < 6) return setError('A senha deve ter no mínimo 6 caracteres')
    if (!inviteCode) return setError('O código de convite é obrigatório')

    try {
      const res = await api.post('/auth/register', { 
        email, 
        name,
        password, 
        inviteCode,
        rate
      })
      
      if (res.data.token) {
          localStorage.setItem('token', res.data.token)
          toast.success('Cadastro realizado! Você já está logado.')
          window.location.href = '/'
      } else {
          toast.success('Cadastro realizado com sucesso! Faça login.')
          navigate('/login')
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Erro ao registrar'
      setError(msg)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl"></div>

      <button onClick={() => navigate('/')} className="absolute top-6 left-6 text-textMuted hover:text-white flex items-center gap-2 z-20">
          <ArrowLeft size={20} /> Voltar
      </button>

      <div className="w-full max-w-sm relative z-10">
        <div className="flex flex-col items-center mb-6">
           <Logo size="xl" />
           <h1 className="text-2xl font-bold text-white tracking-tight mt-4">Criar Conta</h1>
           <p className="text-textMuted text-sm mt-1">Junte-se ao Stake Parceiros</p>
        </div>

        <div className="bg-surface p-8 rounded-2xl shadow-xl border border-gray-800">
          {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-6 text-sm text-center">{error}</div>}
          
          <form onSubmit={handleRegister} className="space-y-4" noValidate>
            <div>
              <label className="block text-xs font-bold text-textMuted uppercase mb-1.5">Nome de Usuário</label>
              <input 
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                className="input-field"
                placeholder="Ex: João Silva"
                required 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-textMuted uppercase mb-1.5">E-mail</label>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input-field"
                placeholder="seu@email.com"
                required 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-textMuted uppercase mb-1.5">Senha</label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
                required 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-textMuted uppercase mb-1.5">Código de Convite (Obrigatório)</label>
              <input 
                type="text" 
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value)}
                className="input-field bg-secondary/50"
                placeholder="Código do agente"
                required
              />
            </div>
            {rate && (
                <div className="text-xs bg-primary/10 text-primary p-2 rounded border border-primary/20 text-center font-bold">
                    Oferta Especial: {Number(rate) * 100}% de Comissão
                </div>
            )}
            
            <button type="submit" className="w-full btn-primary py-3 text-sm uppercase tracking-wide shadow-lg shadow-primary/10 mt-2">
              CRIAR CONTA
            </button>
          </form>
        </div>
        
        <p className="mt-8 text-center text-sm text-textMuted">
          Já tem conta? <Link to="/login" className="text-primary font-bold hover:underline">Entrar</Link>
        </p>
      </div>
    </div>
  )
}
