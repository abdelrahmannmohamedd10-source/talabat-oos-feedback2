import { useState, useEffect, useRef } from 'react'
import { CONFIG } from '../config'
import { verifyEmployee } from '../utils/api'

function parseJwt(token) {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
  return JSON.parse(decodeURIComponent(
    atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
  ))
}

export default function LoginScreen({ onSuccess }) {
  const [status, setStatus] = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const initialized = useRef(false)

  useEffect(() => {
    function initGSI() {
      if (initialized.current || !window.google?.accounts?.id) return
      initialized.current = true

      window.google.accounts.id.initialize({
        client_id: CONFIG.GOOGLE_CLIENT_ID,
        hd: CONFIG.ALLOWED_DOMAIN,
        callback: handleCredential,
        auto_select: false,
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: false,
      })

      // استخدم الزرار الرسمي من Google — أموثوق بكتير
      const container = document.getElementById('g-btn')
      if (container) {
        window.google.accounts.id.renderButton(container, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          width: 280,
        })
      }
    }

    if (window.google?.accounts?.id) {
      initGSI()
    } else {
      const t = setInterval(() => {
        if (window.google?.accounts?.id) { initGSI(); clearInterval(t) }
      }, 150)
      return () => clearInterval(t)
    }
  }, [])

  async function handleCredential(response) {
    setStatus('loading')
    setErrorMsg('')
    try {
      const payload = parseJwt(response.credential)

      if (!payload.email.toLowerCase().endsWith('@' + CONFIG.ALLOWED_DOMAIN)) {
        setErrorMsg(`مسموح فقط بإيميلات @${CONFIG.ALLOWED_DOMAIN}`)
        setStatus('error')
        return
      }

      const result = await verifyEmployee(response.credential)

      if (result.error) {
        setErrorMsg(
          result.error.includes('not found')
            ? 'إيميلك مش موجود في شيت MAPPING — تواصل مع الـ Admin'
            : result.error
        )
        setStatus('error')
        return
      }

      onSuccess(
        { email: payload.email, name: payload.name, picture: payload.picture, idToken: response.credential },
        result.employee
      )
    } catch (e) {
      console.error('Login error:', e)
      setErrorMsg('فشل الاتصال بالسيرفر (' + (e.message || 'network error') + ')')
      setStatus('error')
    }
  }

  return (
    <div className="screen">
      <div className="screen-header" style={{ justifyContent: 'center' }}>
        <div className="screen-logo" style={{ flexDirection: 'column', gap: 8, alignItems: 'center' }}>
          <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 64, height: 64 }}>
            <rect width="80" height="80" rx="20" fill="#FF6600"/>
            <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle"
              fill="white" fontSize="28" fontWeight="700" fontFamily="system-ui">TC</text>
          </svg>
          <div>
            <div className="screen-logo-text" style={{ textAlign: 'center', fontSize: 22 }}>T-Champ</div>
            <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
              نظام تسجيل الحضور
            </div>
          </div>
        </div>
      </div>

      <div className="screen-body">
        <div className="card" style={{ textAlign: 'center', padding: '32px 24px', gap: 20, display: 'flex', flexDirection: 'column' }}>
          <div>
            <div className="title">أهلاً بك 👋</div>
            <div className="subtitle">سجّل دخولك بإيميل Talabat الرسمي</div>
          </div>

          {status === 'loading' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div className="spinner" />
              <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>جاري التحقق...</span>
            </div>
          )}

          {status === 'error' && (
            <div className="error-box">
              <span className="error-icon">⚠️</span>
              <span className="error-text">{errorMsg}</span>
            </div>
          )}

          {/* Google's official rendered button */}
          <div style={{ display: 'flex', justifyContent: 'center', minHeight: 44, opacity: status === 'loading' ? 0.5 : 1 }}>
            <div id="g-btn" />
          </div>

          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            مسموح فقط بإيميلات <strong>@talabat.com</strong>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
          <span>📍 موقع GPS</span>
          <span>•</span>
          <span>📸 سيلفي</span>
          <span>•</span>
          <span>📊 Google Sheets</span>
        </div>
      </div>
    </div>
  )
}
