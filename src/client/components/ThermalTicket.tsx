import { Dialog } from '@headlessui/react'
import { Download, Share2, CheckCircle2 } from 'lucide-react'
import html2canvas from 'html2canvas'
import { useRef } from 'react'
import Logo from './Logo'
import { toast } from 'sonner'

interface TicketProps {
  isOpen: boolean
  onClose: () => void
  data: any
}

export default function ThermalTicket({ isOpen, onClose, data }: TicketProps) {
  if (!data) return null
  const ticketRef = useRef<HTMLDivElement>(null)

  const handleDownload = async () => {
    if (!ticketRef.current) return
    try {
      const canvas = await html2canvas(ticketRef.current, {
        backgroundColor: '#0f212e',
        scale: 3
      })
      const link = document.createElement('a')
      link.download = `BetMasterBR-Bet-${data.ticketId || 'bet'}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (e) {
      toast.error('Erro ao baixar imagem')
    }
  }

  const matchInfo = typeof data.matchInfo === 'string' ? JSON.parse(data.matchInfo) : data.matchInfo

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-[70]">
      <div className="fixed inset-0 bg-black/90 backdrop-blur-md" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-sm flex flex-col items-center animate-in zoom-in duration-300">
           
           {/* Dark Ticket Card */}
           <div ref={ticketRef} className="w-full bg-[#213743] rounded-2xl overflow-hidden shadow-2xl mb-6 border border-gray-700 relative">
             {/* Header */}
             <div className="bg-[#1a2c38] p-6 text-center border-b border-gray-700 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-primary/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                <div className="flex justify-center mb-2">
                    <Logo size="md" />
                </div>
                <div className="text-white font-bold text-lg tracking-wide">Aposta Confirmada</div>
                <div className="text-primary text-xs font-bold uppercase tracking-widest mt-1 flex items-center justify-center gap-1">
                    <CheckCircle2 size={12} /> Sucesso
                </div>
             </div>

             {/* Content */}
             <div className="p-6 space-y-6">
                 {/* Match Info */}
                 <div className="text-center">
                     <div className="text-xs text-textMuted font-bold uppercase mb-2">Evento</div>
                     <div className="text-white font-bold text-lg leading-tight">{matchInfo.home}</div>
                     <div className="text-xs text-gray-500 my-1">vs</div>
                     <div className="text-white font-bold text-lg leading-tight">{matchInfo.away}</div>
                     <div className="text-[10px] text-gray-500 mt-2 bg-black/20 inline-block px-2 py-1 rounded">
                         {new Date(matchInfo.date || new Date()).toLocaleString()}
                     </div>
                 </div>

                 <div className="h-px bg-gray-700 w-full"></div>

                 {/* Selection Info */}
                 <div className="flex justify-between items-center bg-[#0f212e] p-4 rounded-xl border border-gray-700/50">
                     <div>
                         <div className="text-xs text-textMuted mb-1">Sua Seleção</div>
                         <div className="text-white font-bold text-lg">{data.selection}</div>
                         <div className="text-xs text-gray-500">Vencedor da Partida</div>
                     </div>
                     <div className="text-right">
                         <div className="text-xs text-textMuted mb-1">Odds</div>
                         <div className="text-primary font-bold text-2xl">@{Number(data.odds || 0).toFixed(2)}</div>
                     </div>
                 </div>

                 {/* Financials */}
                 <div className="grid grid-cols-2 gap-4">
                     <div className="bg-white/5 p-3 rounded-lg text-center">
                         <div className="text-[10px] text-textMuted uppercase font-bold mb-1">Aposta</div>
                         <div className="text-white font-bold">R$ {Number(data.amount || 0).toFixed(2)}</div>
                     </div>
                     <div className="bg-primary/10 p-3 rounded-lg text-center border border-primary/20">
                         <div className="text-[10px] text-primary uppercase font-bold mb-1">Retorno Potencial</div>
                         <div className="text-primary font-bold">R$ {Number(data.potentialPayout || 0).toFixed(2)}</div>
                     </div>
                 </div>

                 {/* ID & Footer */}
                 <div className="text-center pt-2">
                     <div className="text-[10px] text-gray-600 font-mono mb-1">ID da Aposta</div>
                     <div className="text-xs text-textMuted font-mono tracking-wider select-all">{data.ticketId}</div>
                 </div>
             </div>

             {/* Decorative bottom bar */}
             <div className="h-2 w-full bg-gradient-to-r from-[#213743] via-primary to-[#213743]"></div>
           </div>
           
           <div className="flex gap-3 w-full">
             <button onClick={onClose} className="flex-1 bg-surface hover:bg-surfaceHover text-white py-3.5 rounded-xl font-bold border border-gray-700 transition">
               Fechar
             </button>
             <button onClick={handleDownload} className="flex-[2] bg-primary hover:bg-primaryHover text-slate-900 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition">
               <Download size={20} /> Salvar Comprovante
             </button>
           </div>

        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
