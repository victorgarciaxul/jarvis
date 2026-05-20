import { useState, useEffect, useRef } from 'react'

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAYS_ES   = ['Lu','Ma','Mi','Ju','Vi','Sá','Do']

function parseValue(val) {
  if (!val) return null
  const [y, m, d] = val.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function toYMD(date) {
  if (!date) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatDisplay(val) {
  if (!val) return ''
  const d = parseValue(val)
  if (!d) return ''
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year, month) {
  // 0=Mon … 6=Sun
  const d = new Date(year, month, 1).getDay()
  return d === 0 ? 6 : d - 1
}

export default function DatePicker({ value, onChange, placeholder = 'Seleccionar fecha' }) {
  const [open, setOpen]       = useState(false)
  const [viewYear, setYear]   = useState(() => { const d = parseValue(value); return d ? d.getFullYear() : new Date().getFullYear() })
  const [viewMonth, setMonth] = useState(() => { const d = parseValue(value); return d ? d.getMonth() : new Date().getMonth() })
  const ref = useRef()

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Sync view when value changes externally
  useEffect(() => {
    const d = parseValue(value)
    if (d) { setYear(d.getFullYear()); setMonth(d.getMonth()) }
  }, [value])

  function prevMonth() {
    if (viewMonth === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  function selectDay(day) {
    const selected = new Date(viewYear, viewMonth, day)
    onChange(toYMD(selected))
    setOpen(false)
  }

  function selectToday() {
    const today = new Date()
    setYear(today.getFullYear())
    setMonth(today.getMonth())
    onChange(toYMD(today))
    setOpen(false)
  }

  function clear() {
    onChange('')
    setOpen(false)
  }

  const totalDays    = getDaysInMonth(viewYear, viewMonth)
  const startOffset  = getFirstDayOfWeek(viewYear, viewMonth)
  const selectedDate = parseValue(value)
  const today        = new Date()

  function isSelected(day) {
    return selectedDate &&
      selectedDate.getFullYear() === viewYear &&
      selectedDate.getMonth()    === viewMonth &&
      selectedDate.getDate()     === day
  }

  function isToday(day) {
    return today.getFullYear() === viewYear &&
      today.getMonth()    === viewMonth &&
      today.getDate()     === day
  }

  // Build grid cells (empty + day numbers)
  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= totalDays; d++) cells.push(d)
  // Pad to full rows
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block', width: '100%', maxWidth: 220 }}>
      {/* Trigger input */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--bg)', border: '1.5px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '9px 12px', cursor: 'pointer',
          fontSize: 14, color: value ? 'var(--text-heading)' : 'var(--text-muted)',
          transition: 'border-color .15s',
          borderColor: open ? 'var(--primary)' : 'var(--border)',
          userSelect: 'none',
        }}
      >
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          style={{ width: 15, height: 15, color: value ? 'var(--primary)' : 'var(--text-muted)', flexShrink: 0 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span style={{ flex: 1 }}>{value ? formatDisplay(value) : placeholder}</span>
        {value && (
          <span
            onClick={e => { e.stopPropagation(); clear() }}
            style={{ fontSize: 14, lineHeight: 1, color: 'var(--text-muted)', cursor: 'pointer', padding: '0 2px' }}
            title="Borrar"
          >✕</span>
        )}
      </div>

      {/* Calendar dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 1000,
          background: 'var(--surface)', border: '1.5px solid var(--border)',
          borderRadius: 12, padding: '16px', width: 264,
          boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
        }}>
          {/* Month/year header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <button onClick={prevMonth} style={navBtn}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ width: 14, height: 14 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-heading)' }}>
              {MONTHS_ES[viewMonth]} {viewYear}
            </span>
            <button onClick={nextMonth} style={navBtn}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ width: 14, height: 14 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Day-of-week headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 6 }}>
            {DAYS_ES.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', padding: '4px 0', letterSpacing: '0.3px' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {cells.map((day, i) => {
              if (!day) return <div key={`e-${i}`} />
              const sel   = isSelected(day)
              const todayMark = isToday(day)
              return (
                <button
                  key={day}
                  onClick={() => selectDay(day)}
                  style={{
                    width: '100%', aspectRatio: '1', border: 'none', cursor: 'pointer',
                    borderRadius: 8, fontSize: 13, fontWeight: sel ? 700 : 400,
                    background: sel ? 'var(--xul-red)' : todayMark ? 'rgba(192,49,43,0.12)' : 'transparent',
                    color: sel ? '#fff' : todayMark ? 'var(--xul-red)' : 'var(--text-heading)',
                    transition: 'background .12s, color .12s',
                    outline: 'none',
                    position: 'relative',
                  }}
                  onMouseEnter={e => { if (!sel) e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
                  onMouseLeave={e => { if (!sel) e.currentTarget.style.background = todayMark ? 'rgba(192,49,43,0.12)' : 'transparent' }}
                >
                  {day}
                  {todayMark && !sel && (
                    <span style={{ position: 'absolute', bottom: 3, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: '50%', background: 'var(--xul-red)', display: 'block' }} />
                  )}
                </button>
              )
            })}
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <button onClick={clear} style={footerBtn}>Borrar</button>
            <button onClick={selectToday} style={{ ...footerBtn, color: 'var(--xul-red)', fontWeight: 700 }}>Hoy</button>
          </div>
        </div>
      )}
    </div>
  )
}

const navBtn = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: 'var(--text-muted)', padding: '6px 8px', borderRadius: 8,
  display: 'flex', alignItems: 'center', transition: 'background .12s, color .12s',
}

const footerBtn = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: 13, color: 'var(--text-muted)', padding: '4px 8px',
  borderRadius: 6, fontWeight: 500, transition: 'color .12s',
}
