import { useEffect, useRef, useState } from 'react'
import { FileText, Image, Upload, Trash2, ExternalLink, AlertCircle, Loader2, Receipt } from 'lucide-react'
import api from '../services/api'

interface Invoice {
  id: string
  label: string | null
  invoiceDate: string | null
  amount: number | null
  filename: string
  mimeType: string
  size: number
  createdAt: string
  uploadedBy: { id: string; email: string; role: string } | null
}

interface Props {
  vehicleId: string
  canUpload: boolean
  canDelete: boolean
  userRole: 'DRIVER' | 'DEALER' | 'BRAND'
  userId?: string
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

export default function Invoices({ vehicleId, canUpload, canDelete, userRole, userId }: Props) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const [label, setLabel] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('')
  const [amount, setAmount] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [drag, setDrag] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    try {
      const res = await api.get<Invoice[]>(`/invoices/vehicle/${vehicleId}`)
      setInvoices(res.data)
    } catch {
      setError('Impossible de charger les factures.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [vehicleId])

  function pickFile(picked: File | null | undefined) {
    if (!picked) return
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
    if (!allowed.includes(picked.type)) {
      setError('Format non supporté. Utilisez JPG, PNG, WebP ou PDF.')
      return
    }
    if (picked.size > 10 * 1024 * 1024) {
      setError('Fichier trop lourd (max 10 Mo).')
      return
    }
    setError(null)
    setFile(picked)
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setUploading(true)
    setError(null)

    const form = new FormData()
    form.append('file', file)
    if (label) form.append('label', label)
    if (invoiceDate) form.append('invoiceDate', invoiceDate)
    if (amount) form.append('amount', amount)

    try {
      await api.post(`/invoices/vehicle/${vehicleId}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setFile(null)
      setLabel('')
      setInvoiceDate('')
      setAmount('')
      setShowForm(false)
      load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? "Erreur lors de l'upload.")
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette facture ?')) return
    try {
      await api.delete(`/invoices/${id}`)
      setInvoices(inv => inv.filter(i => i.id !== id))
    } catch {
      setError('Impossible de supprimer.')
    }
  }

  async function openFile(invoice: Invoice) {
    try {
      const res = await api.get(`/invoices/${invoice.id}/file`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data], { type: invoice.mimeType }))
      const a = document.createElement('a')
      a.href = url
      if (invoice.mimeType === 'application/pdf') {
        a.target = '_blank'
        a.rel = 'noopener'
      } else {
        a.download = invoice.filename
      }
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch {
      setError("Impossible d'ouvrir ce fichier.")
    }
  }

  return (
    <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt size={18} className="text-[var(--color-primary)]" />
          <h3 className="font-semibold text-[var(--color-text-primary)]">Factures</h3>
          {invoices.length > 0 && (
            <span className="text-xs bg-gray-100 text-[var(--color-text-secondary)] px-2 py-0.5 rounded-full">
              {invoices.length}
            </span>
          )}
        </div>
        {canUpload && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Upload size={14} />
            Ajouter
          </button>
        )}
      </div>

      {showForm && (
        <div className="p-5 border-b border-[var(--color-border)] bg-gray-50">
          <form onSubmit={handleUpload} className="space-y-4">
            <div
              className={`relative border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer ${
                drag ? 'border-[var(--color-primary)] bg-green-50' : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'
              }`}
              onDragOver={e => { e.preventDefault(); setDrag(true) }}
              onDragLeave={() => setDrag(false)}
              onDrop={e => { e.preventDefault(); setDrag(false); pickFile(e.dataTransfer.files[0]) }}
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.heic,.pdf"
                className="hidden"
                onChange={e => pickFile(e.target.files?.[0])}
              />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  {file.type === 'application/pdf'
                    ? <FileText size={28} className="text-red-500" />
                    : <Image size={28} className="text-green-600" />
                  }
                  <div className="text-left">
                    <p className="text-sm font-medium text-[var(--color-text-primary)] truncate max-w-xs">{file.name}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">{formatBytes(file.size)}</p>
                  </div>
                </div>
              ) : (
                <div>
                  <Upload size={24} className="mx-auto text-[var(--color-text-secondary)] mb-2" />
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">
                    Glissez un fichier ou <span style={{ color: 'var(--color-primary)' }}>parcourir</span>
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">PDF, JPG, PNG, WebP — max 10 Mo</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1">Libellé</label>
                <input
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  placeholder="Ex : Vidange + filtre à huile"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1">Date de la facture</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={e => setInvoiceDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1">Montant (€)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="149.90"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle size={12} /> {error}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowForm(false); setFile(null); setError(null) }}
                className="flex-1 py-2 rounded-lg border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-secondary)] hover:bg-gray-100 transition"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={uploading || !file}
                className="flex-1 py-2 rounded-lg text-sm font-medium text-white transition disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {uploading ? <><Loader2 size={14} className="animate-spin" /> Envoi…</> : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-[var(--color-text-secondary)] text-sm">Chargement…</div>
      ) : invoices.length === 0 && !showForm ? (
        <div className="p-8 text-center">
          <FileText size={32} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-[var(--color-text-secondary)]">Aucune facture enregistrée.</p>
          {canUpload && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-2 text-sm font-medium underline"
              style={{ color: 'var(--color-primary)' }}
            >
              Ajouter la première facture
            </button>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-[var(--color-border)]">
          {invoices.map(inv => {
            const isPdf = inv.mimeType === 'application/pdf'
            const canDel = canDelete && (userRole === 'DEALER' || inv.uploadedBy?.id === userId)
            return (
              <li key={inv.id} className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isPdf ? 'bg-red-50' : 'bg-green-50'}`}>
                  {isPdf
                    ? <FileText size={20} className="text-red-500" />
                    : <Image size={20} className="text-green-600" />
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                    {inv.label || inv.filename}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {inv.invoiceDate && (
                      <span className="text-xs text-[var(--color-text-secondary)]">
                        {new Date(inv.invoiceDate).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                    {inv.amount != null && (
                      <span className="text-xs font-medium text-[var(--color-text-primary)]">
                        {inv.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                      </span>
                    )}
                    <span className="text-xs text-[var(--color-text-secondary)]">{formatBytes(inv.size)}</span>
                    {userRole === 'DEALER' && inv.uploadedBy && (
                      <span className="text-xs text-[var(--color-text-secondary)]">par {inv.uploadedBy.email}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openFile(inv)}
                    className="p-2 rounded-lg hover:bg-gray-100 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition"
                    title="Ouvrir"
                  >
                    <ExternalLink size={15} />
                  </button>
                  {canDel && (
                    <button
                      onClick={() => handleDelete(inv.id)}
                      className="p-2 rounded-lg hover:bg-red-50 text-[var(--color-text-secondary)] hover:text-red-600 transition"
                      title="Supprimer"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
