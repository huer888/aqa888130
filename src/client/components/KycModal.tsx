import { Dialog } from '@headlessui/react'
import { useState } from 'react'
import { Upload, X, Loader2 } from 'lucide-react'
import api from '../utils/api'
import { toast } from 'sonner'

interface KycModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function KycModal({ isOpen, onClose, onSuccess }: KycModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    cpf: ''
  })
  const [frontFile, setFrontFile] = useState<File | null>(null)
  const [backFile, setBackFile] = useState<File | null>(null)
  const [previews, setPreviews] = useState({ front: '', back: '' })

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>, type: 'front' | 'back') => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0]
          if (type === 'front') setFrontFile(file)
          else setBackFile(file)
          
          const reader = new FileReader()
          reader.onloadend = () => setPreviews(prev => ({ ...prev, [type]: reader.result as string }))
          reader.readAsDataURL(file)
      }
  }

  const compressImage = (file: File): Promise<File> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.readAsDataURL(file)
          reader.onload = (event) => {
              const img = new Image()
              img.src = event.target?.result as string
              img.onload = () => {
                  const canvas = document.createElement('canvas')
                  const MAX_WIDTH = 1024
                  const scaleSize = MAX_WIDTH / img.width
                  canvas.width = MAX_WIDTH
                  canvas.height = img.height * scaleSize
                  const ctx = canvas.getContext('2d')
                  ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)
                  canvas.toBlob((blob) => {
                      if (blob) {
                          resolve(new File([blob], file.name, { type: 'image/jpeg' }))
                      } else {
                          reject(new Error('Compression failed'))
                      }
                  }, 'image/jpeg', 0.7) // Compress to 70% quality
              }
          }
          reader.onerror = (error) => reject(error)
      })
  }

  const uploadImage = async (file: File, type: string) => {
      // Compress if > 1MB
      let fileToUpload = file
      if (file.size > 1024 * 1024) {
          try {
              toast.info('Comprimindo imagem...')
              fileToUpload = await compressImage(file)
          } catch (e) {
              console.error('Compression failed, using original', e)
          }
      }

      const fd = new FormData()
      formData.name && fd.append('userId', 'kyc_temp') 
      fd.append('file', fileToUpload)
      fd.append('type', `kyc_${type}`)
      const res = await api.post('/upload', fd)
      return res.data.url 
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if(!formData.name.trim()) return toast.error('Preencha o Nome Completo')
    if(!formData.cpf.trim()) return toast.error('Preencha o CPF / RG')
    if(!frontFile || !backFile) {
        toast.error('Envie as fotos do documento (Frente e Verso)')
        return
    }
    
    setLoading(true)
    try {
        // 1. Upload Images
        const frontUrl = await uploadImage(frontFile, 'front')
        const backUrl = await uploadImage(backFile, 'back')

        // 2. Submit Data
        await api.post('/user/kyc', {
            name: formData.name,
            cpf: formData.cpf,
            front: frontUrl,
            back: backUrl
        })
        
        toast.success('KYC Enviado com sucesso!')
        onSuccess()
        onClose()
    } catch (e) {
        toast.error('Falha ao enviar')
    } finally {
        setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-[60]">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-surface w-full max-w-sm rounded-xl p-6 border border-gray-700 shadow-2xl overflow-y-auto max-h-[90vh]">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">Verificação de Identidade</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20}/></button>
           </div>

           <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                 <label className="block text-xs font-bold text-textMuted uppercase mb-1.5">Nome Completo</label>
                 <input 
                   value={formData.name}
                   onChange={e => setFormData({...formData, name: e.target.value})}
                   className="input-field"
                   placeholder="Igual ao documento"
                 />
              </div>

              <div>
                 <label className="block text-xs font-bold text-textMuted uppercase mb-1.5">CPF / RG</label>
                 <input 
                   value={formData.cpf}
                   onChange={e => setFormData({...formData, cpf: e.target.value})}
                   className="input-field"
                   placeholder="000.000.000-00"
                 />
              </div>

              <div className="grid grid-cols-2 gap-3">
                  <div>
                      <label className="block text-xs font-bold text-textMuted uppercase mb-1.5">Frente</label>
                      <label className="block border-2 border-dashed border-gray-700 rounded-lg h-24 flex items-center justify-center hover:bg-secondary transition cursor-pointer overflow-hidden relative">
                         <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFile(e, 'front')} />
                         {previews.front ? (
                             <img src={previews.front} className="w-full h-full object-cover" />
                         ) : (
                             <Upload className="text-gray-500" size={20} />
                         )}
                      </label>
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-textMuted uppercase mb-1.5">Verso</label>
                      <label className="block border-2 border-dashed border-gray-700 rounded-lg h-24 flex items-center justify-center hover:bg-secondary transition cursor-pointer overflow-hidden relative">
                         <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFile(e, 'back')} />
                         {previews.back ? (
                             <img src={previews.back} className="w-full h-full object-cover" />
                         ) : (
                             <Upload className="text-gray-500" size={20} />
                         )}
                      </label>
                  </div>
              </div>

              <button disabled={loading} type="submit" className="btn-primary w-full mt-2 flex items-center justify-center gap-2">
                 {loading && <Loader2 size={16} className="animate-spin" />}
                 {loading ? 'Enviando...' : 'Enviar para Análise'}
              </button>
           </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
