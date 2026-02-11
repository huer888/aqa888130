import { useNavigate } from 'react-router-dom'
import { ArrowLeft, FileCheck, ShieldCheck, CheckCircle2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import api from '../utils/api'

export default function Certificates() {
  const navigate = useNavigate()
  
  return (
    <div className="min-h-screen bg-background p-4 space-y-8 pb-10">
      <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="bg-surface p-2 rounded-full text-textMuted hover:text-white transition">
              <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold text-white">Legalidade & Certificações</h1>
      </div>

      {/* --- 1. LICENÇA DE OPERAÇÃO (LICENSE) --- */}
      <div className="bg-surface rounded-xl border border-gray-800 shadow-xl overflow-hidden">
          <div className="bg-[#1a2c38] p-4 border-b border-gray-700 flex items-center gap-3">
              <div className="bg-green-500/10 p-2 rounded-full text-green-500">
                  <ShieldCheck size={24} />
              </div>
              <div>
                  <h2 className="text-lg font-bold text-white">Licença Federal</h2>
                  <div className="text-[10px] text-green-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                      Autorizado pelo Ministério da Fazenda
                  </div>
              </div>
          </div>
          
          <div className="p-6">
              <p className="text-xs text-gray-400 mb-6 leading-relaxed">
                  A plataforma opera em total conformidade com a Lei nº 14.790/2023. Abaixo, o registro oficial na Secretaria de Prêmios e Apostas (SPA).
              </p>

              {/* RECREATED TABLE (High Quality) */}
              <div className="bg-white rounded-lg overflow-hidden text-black shadow-inner">
                  <div className="bg-[#001529] text-white p-3 text-[10px] font-bold uppercase tracking-wider text-center border-b border-gray-600">
                      Relação de Operadores Autorizados - SPA/MF
                  </div>
                  <table className="w-full text-[9px] md:text-[10px] text-left">
                      <thead className="bg-gray-100 text-gray-600 border-b border-gray-300">
                          <tr>
                              <th className="p-2 font-bold">Portaria</th>
                              <th className="p-2 font-bold">Empresa</th>
                              <th className="p-2 font-bold">CNPJ</th>
                              <th className="p-2 font-bold text-center">Status</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                          <tr className="opacity-50 grayscale">
                              <td className="p-2">SPA/MF nº 262</td>
                              <td className="p-2">JOGO PRINCIPAL LTDA</td>
                              <td className="p-2">56.302.709/0001-04</td>
                              <td className="p-2 text-center">Ativo</td>
                          </tr>
                          {/* HIGHLIGHTED ROW FOR STAKE */}
                          <tr className="bg-blue-50/80 border-l-4 border-blue-600">
                              <td className="p-2 font-bold text-blue-800">SPA/MF nº 263</td>
                              <td className="p-2 font-bold">STAKE BRAZIL LTDA</td>
                              <td className="p-2 font-mono">56.525.936/0001-90</td>
                              <td className="p-2 text-center">
                                  <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold border border-green-200">AUTORIZADO</span>
                              </td>
                          </tr>
                          <tr className="opacity-50 grayscale">
                              <td className="p-2">SPA/MF nº 264</td>
                              <td className="p-2">OLAVIR LTDA</td>
                              <td className="p-2">56.873.267/0001-48</td>
                              <td className="p-2 text-center">Ativo</td>
                          </tr>
                      </tbody>
                  </table>
                  <div className="bg-gray-50 p-2 text-[8px] text-gray-500 text-center border-t border-gray-200">
                      Fonte: Diário Oficial da União (D.O.U) - Atualizado em Fev/2025
                  </div>
              </div>
          </div>
      </div>

      {/* --- 2. CONTRATO DE AGENCIAMENTO (AGENCY CONTRACT) --- */}
      <div className="bg-surface rounded-xl border border-gray-800 shadow-xl overflow-hidden">
          <div className="bg-[#1a2c38] p-4 border-b border-gray-700 flex items-center gap-3">
              <div className="bg-blue-500/10 p-2 rounded-full text-blue-500">
                  <FileCheck size={24} />
              </div>
              <div>
                  <h2 className="text-lg font-bold text-white">Contrato de Agenciamento</h2>
                  <div className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">
                      Documento Oficial de Parceria
                  </div>
              </div>
          </div>

          <div className="p-4 md:p-8 bg-[#0f1923]">
              <div className="flex justify-center">
                  <img 
                      src="/assets/certificate_auth.png" 
                      alt="Certificado de Autorização" 
                      className="w-full max-w-2xl shadow-2xl rounded-sm"
                  />
              </div>
          </div>
      </div>
    </div>
  )
}
