import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../utils/api'
import Logo from '../components/Logo'
import { toast } from 'sonner'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if(!email) return toast.error('Por favor, informe seu e-mail')
    if(!password) return toast.error('Por favor, informe sua senha')

    try {
      const res = await api.post('/auth/login', { email, password })
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      window.location.href = '/' // Force reload to apply auth state
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao realizar login')
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
      <div className="absolute -top-20 -left-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl"></div>

      <div className="w-full max-w-sm relative z-10">
        <div className="flex flex-col items-center mb-8">
           <Logo size="xl" />
           <h1 className="text-3xl font-bold text-white tracking-tight mt-4">Stake Parceiros</h1>
           <p className="text-textMuted text-sm mt-2">Sistema de Gestão 6.0</p>
        </div>

        <div className="bg-surface p-8 rounded-2xl shadow-xl border border-gray-800">
          <h2 className="text-xl font-bold text-white mb-6 text-center">Bem-vindo de volta!</h2>
          
          <form onSubmit={handleLogin} className="space-y-5" noValidate>
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
            
            <button type="submit" className="w-full btn-primary py-3 text-sm uppercase tracking-wide shadow-lg shadow-primary/10 mt-2">
              ENTRAR
            </button>
          </form>
        </div>
        
        <p className="mt-8 text-center text-sm text-textMuted">
          Não tem uma conta? <Link to="/register" className="text-primary font-bold hover:underline">Cadastre-se</Link>
        </p>
      </div>
    </div>
  )
}
