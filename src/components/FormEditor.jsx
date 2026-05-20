import { useState, useEffect } from 'react'
import { loadFormConfig, saveFormConfig, isConfigured, getShareableLink, saveSubmission } from '../lib/github'

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function SuccessModal({ link, onClose }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  function handlePreview() {
    window.open(link, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-body" style={{ textAlign: 'center', padding: '40px 32px 28px' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <svg fill="none" viewBox="0 0 24 24" stroke="var(--success)" strokeWidth={2.5} style={{ width: 32, height: 32 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-heading)', marginBottom: 8 }}>¡Formulario guardado!</h3>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 24 }}>
            El diseño se guardó con éxito y se generó un nuevo enlace para compartir.
          </p>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="text"
              readOnly
              value={link}
              onClick={e => e.target.select()}
              style={{ flex: 1, background: 'none', border: 'none', fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)', outline: 'none', cursor: 'text' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={handlePreview} style={{ gap: 8 }}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: 16, height: 16 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Previsualizar
            </button>
            <button className="btn btn-ghost" onClick={handleCopy} style={{ gap: 8 }}>
              {copied ? (
                <><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ width: 14, height: 14, color: 'var(--success)' }}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>¡Copiado!</>
              ) : (
                <><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: 14, height: 14 }}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copiar enlace</>
              )}
            </button>
            <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function FormEditor({ setPage }) {
  const [formFields, setFormFields] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [creating, setCreating] = useState(false)
  const [successLink, setSuccessLink] = useState(null)
  const configured = isConfigured()

  useEffect(() => {
    async function loadFields() {
      setLoading(true)
      try {
        const fields = await loadFormConfig()
        setFormFields(fields)
      } catch (e) {
        setError('Error al cargar la estructura del formulario: ' + e.message)
      } finally {
        setLoading(false)
      }
    }
    loadFields()
  }, [])

  async function handleSaveAndCreate() {
    if (!configured) { setError('Error de conexión con la base de datos.'); return }
    setCreating(true)
    setError(null)
    try {
      await saveFormConfig(formFields)
      const id = genId()
      await saveSubmission({ id, createdAt: new Date().toISOString(), status: 'draft' })
      setSuccessLink(getShareableLink('submission', id))
    } catch (e) {
      setError('Error al guardar el formulario: ' + e.message)
    } finally {
      setCreating(false)
    }
  }

  function handleFieldChange(index, key, value) {
    const updated = [...formFields]
    updated[index] = { ...updated[index], [key]: value }
    setFormFields(updated)
  }

  function handleAddField() {
    const newKey = 'campo_' + Math.random().toString(36).slice(2, 7)
    setFormFields(prev => [
      ...prev,
      { key: newKey, label: 'Nueva pregunta', type: 'textarea', required: false, placeholder: '', hint: '', category: 'standard' }
    ])
  }

  function handleRemoveField(index) {
    const field = formFields[index]
    if (['correo', 'nombre', 'proyecto'].includes(field.key)) {
      alert(`El campo "${field.label}" es obligatorio para el funcionamiento base del sistema y no puede eliminarse.`)
      return
    }
    if (!confirm(`¿Eliminar la pregunta "${field.label}"?`)) return
    setFormFields(prev => prev.filter((_, i) => i !== index))
  }

  function handleMove(index, direction) {
    const updated = [...formFields]
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= updated.length) return
    const temp = updated[index]
    updated[index] = updated[targetIndex]
    updated[targetIndex] = temp
    setFormFields(updated)
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Formularios</h2>
          <p>Creá un formulario y compartí el enlace para que te lo rellenen</p>
        </div>
        <div className="btn-row" style={{ margin: 0 }}>
          <button className="btn btn-primary btn-sm" onClick={handleSaveAndCreate} disabled={creating || loading} style={{ gap: 6 }}>
            {creating ? <span className="spinner" /> : (
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: 14, height: 14 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            )}
            Guardar formulario
          </button>
          <button className="btn btn-ghost btn-sm" onClick={handleAddField} disabled={loading} style={{ gap: 6 }}>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: 14, height: 14 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Agregar pregunta
          </button>
        </div>
      </div>

      <div className="page-content" style={{ maxWidth: 800 }}>

        <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 20 }}>Preguntas del formulario</h3>

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <span className="spinner spinner-dark" style={{ margin: '0 auto', width: 36, height: 36, borderWidth: 4 }} />
            <p style={{ marginTop: 12, color: 'var(--text-muted)' }}>Cargando estructura del formulario...</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {formFields.map((field, index) => {
              const isProtected = ['correo', 'nombre', 'proyecto'].includes(field.key)
              return (
                <div key={field.key} style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Pregunta #{index + 1}{isProtected ? ' (Requerida)' : ''}
                    </span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleMove(index, -1)} disabled={index === 0} style={{ padding: '4px 8px', minWidth: 'auto' }}>&uarr;</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleMove(index, 1)} disabled={index === formFields.length - 1} style={{ padding: '4px 8px', minWidth: 'auto' }}>&darr;</button>
                      {!isProtected && (
                        <button className="btn btn-ghost btn-sm" onClick={() => handleRemoveField(index)} style={{ padding: '4px 8px', minWidth: 'auto', color: 'var(--danger)' }}>Eliminar</button>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: 12 }}>Título / Pregunta</label>
                      <input type="text" value={field.label} onChange={e => handleFieldChange(index, 'label', e.target.value)} placeholder="Escribe la pregunta..." />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: 12 }}>Tipo de respuesta</label>
                      <select value={field.type} onChange={e => handleFieldChange(index, 'type', e.target.value)} style={{ width: '100%' }}>
                        <option value="text">Texto corto</option>
                        <option value="textarea">Texto largo</option>
                        <option value="email">Correo electrónico</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: 12 }}>Categoría</label>
                      <select value={field.category || 'standard'} onChange={e => handleFieldChange(index, 'category', e.target.value)} style={{ width: '100%' }}>
                        <option value="standard">Estándar</option>
                        <option value="luces">Luces (Verde)</option>
                        <option value="sombras">Sombras (Naranja)</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: 12 }}>Placeholder</label>
                      <input type="text" value={field.placeholder || ''} onChange={e => handleFieldChange(index, 'placeholder', e.target.value)} placeholder="Texto de ejemplo..." />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: 12 }}>Aclaración (Hint)</label>
                      <input type="text" value={field.hint || ''} onChange={e => handleFieldChange(index, 'hint', e.target.value)} placeholder="Consejo o aclaración..." />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="checkbox" id={`req-${field.key}`} checked={field.required} disabled={isProtected} onChange={e => handleFieldChange(index, 'required', e.target.checked)} style={{ width: 'auto', cursor: 'pointer' }} />
                    <label htmlFor={`req-${field.key}`} style={{ cursor: 'pointer', fontSize: 13, marginBottom: 0 }}>Es obligatorio responder esta pregunta</label>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {successLink && (
        <SuccessModal link={successLink} onClose={() => setSuccessLink(null)} />
      )}
    </>
  )
}
