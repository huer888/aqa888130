import { useNavigate } from 'react-router-dom'
import { ArrowLeft, FileCheck } from 'lucide-react'
import { useState, useEffect } from 'react'
import api from '../utils/api'

export default function Certificates() {
  const navigate = useNavigate()
  const [config, setConfig] = useState<any>({})

  useEffect(() => {
      api.get('/admin/config').then(res => setConfig(res.data)).catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="bg-surface p-2 rounded-full text-textMuted hover:text-white transition">
              <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold text-white">Certificados da Plataforma</h1>
      </div>

      <div className="bg-surface rounded-xl p-6 border border-gray-800 shadow-lg text-center space-y-4">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
              <FileCheck size={40} />
          </div>
          <h2 className="text-lg font-bold text-white">Licença de Operação</h2>
          <p className="text-xs text-textMuted leading-relaxed">
              A Stake.BR é operada sob licença oficial de jogos de Curaçao (No. 8048/JAZ), garantindo conformidade total com as normas internacionais de apostas esportivas e jogos online.
          </p>
          <div className="h-64 bg-black/20 rounded-lg flex items-center justify-center border border-dashed border-gray-700 overflow-hidden">
              {config['cert_license'] ? (
                  <img src={config['cert_license']} className="w-full h-full object-contain" />
              ) : <span className="text-textMuted text-xs">[Imagem da Licença]</span>}
          </div>
      </div>

      <div className="bg-surface rounded-xl p-6 border border-gray-800 shadow-lg text-center space-y-4">
          <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto text-blue-500">
              <FileCheck size={40} />
          </div>
          <h2 className="text-lg font-bold text-white">Contrato de Agenciamento</h2>
          <p className="text-xs text-textMuted leading-relaxed">
              Documento oficial que regulamenta a parceria entre a plataforma e seus afiliados, estabelecendo direitos, deveres e a estrutura de comissionamento.
          </p>
          <div className="h-64 bg-black/20 rounded-lg flex items-center justify-center border border-dashed border-gray-700 overflow-hidden">
              {config['cert_contract'] ? (
                  <img src={config['cert_contract']} className="w-full h-full object-contain" />
              ) : <span className="text-textMuted text-xs">[Imagem do Contrato]</span>}
          </div>
      </div>
    </div>
  )
}
