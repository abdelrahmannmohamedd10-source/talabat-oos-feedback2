import { useState } from 'react'
import { verifyEmployee } from '../utils/api'

export default function LoginScreen({ onSuccess }) {
  const [ibs,      setIbs]      = useState('')
  const [status,   setStatus]   = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    const ibsTrim = ibs.trim()
    if (!ibsTrim || ibsTrim.length < 3) {
      setErrorMsg('أدخل رقم IBS الصحيح')
      return
    }

    setStatus('loading')
    setErrorMsg('')

    try {
      const result = await verifyEmployee(ibsTrim)
      if (result.error) {
        setErrorMsg(result.error)
        setStatus('error')
        return
      }

      const emp   = result.employee
      const name  = Object.entries(emp).find(([k]) => k.toLowerCase().includes('champ'))?.[1]
                 || ibsTrim
      const email = Object.entries(emp).find(([k]) => k.toLowerCase().includes('email'))?.[1]
                 || ''

      onSuccess({ email, name, ibsNumber: ibsTrim }, emp)
    } catch (err) {
      setErrorMsg('خطأ في الاتصال: ' + err.message)
      setStatus('error')
    }
  }

  const busy = status === 'loading'

  return (
    <div className="screen">
      <div className="screen-header" style={{ justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
          <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" style={{ width: 64, height: 64 }}>
            <rect width="80" height="80" rx="20" fill="#FF6600"/>
            <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle"
              fill="white" fontSize="28" fontWeight="700" fontFamily="system-ui">TC</text>
          </svg>
          <div>
            <div className="screen-logo-text" style={{ textAlign: 'center', fontSize: 22 }}>T-Champ</div>
            <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>نظام تسجيل الحضور</div>
          </div>
        </div>
      </div>

      <div className="screen-body">
        <form className="card" onSubmit={handleLogin}
          style={{ padding: '32px 24px', gap: 20, display: 'flex', flexDirection: 'column' }}>

          <div style={{ textAlign: 'center' }}>
            <div className="title">أهلاً بك 👋</div>
            <div className="subtitle">ادخل رقم IBS بتاعك</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>
              IBS Number
            </label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="مثال: 461253"
              value={ibs}
              onChange={e => { setIbs(e.target.value.replace(/\D/g, '')); setErrorMsg('') }}
              disabled={busy}
              required
              maxLength={10}
              autoComplete="off"
              autoFocus
              style={{
                padding: '14px 16px',
                borderRadius: 12,
                border: errorMsg ? '2px solid var(--danger)' : '2px solid var(--border)',
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: 4,
                textAlign: 'center',
                background: 'var(--surface)',
                color: 'var(--text-primary)',
                outline: 'none',
                width: '100%',
                boxSizing: 'border-box',
                fontFamily: 'monospace',
                transition: 'border-color 0.2s',
              }}
              dir="ltr"
            />
          </div>

          {errorMsg && (
            <div className="error-box">
              <span className="error-icon">⚠️</span>
              <span className="error-text">{errorMsg}</span>
            </div>
          )}

          {busy ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <div className="spinner"/>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>جاري التحقق...</span>
            </div>
          ) : (
            <button type="submit" className="btn btn-primary"
              style={{ fontSize: 17, padding: '15px', borderRadius: 14 }}>
              دخول ←
            </button>
          )}
        </form>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
          <span>📍 GPS</span><span>•</span><span>📸 سيلفي</span><span>•</span><span>📊 Sheets</span>
        </div>
      </div>
    </div>
  )
}
