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
  const [status, setStatus] = useState('idle') // idle | loading | error
  const [errorMsg, setErrorMsg] = useState('')
  const gsiReady = useRef(false)

  useEffect(() => {
    const init = () => {
      if (!window.google) return
      window.google.accounts.id.initialize({
        client_id: CONFIG.GOOGLE_CLIENT_ID,
        hd: CONFIG.ALLOWED_DOMAIN,
        callback: handleCredential,
        auto_select: false,
        cancel_on_tap_outside: true,
      })
      gsiReady.current = true
    }

    if (window.google) {
      init()
    } else {
      // انتظر حتى يتحمل GIS script
      const interval = setInterval(() => {
        if (window.google) { init(); clearInterval(interval) }
      }, 200)
      return () => clearInterval(interval)
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
        setErrorMsg(result.error === 'Employee not found in MAPPING sheet'
          ? 'اسمك غير موجود في قائمة الموظفين — تواصل مع الـ Admin'
          : result.error)
        setStatus('error')
        return
      }

      onSuccess(
        { email: payload.email, name: payload.name, picture: payload.picture, idToken: response.credential },
        result.employee
      )
    } catch (e) {
      setErrorMsg('حدث خطأ — تحقق من الاتصال وحاول مجدداً')
      setStatus('error')
    }
  }

  function handleSignIn() {
    if (!gsiReady.current) {
      setErrorMsg('جاري تحميل Google Sign-in...')
      return
    }
    setStatus('idle')
    setErrorMsg('')
    window.google.accounts.id.prompt(notification => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // One Tap مش شغال (محجوب على iOS) — فتح popup بديل
        window.google.accounts.oauth2 && openFallbackOAuth()
      }
    })
  }

  function openFallbackOAuth() {
    // Fallback: استخدام OAuth implicit flow لو One Tap مش شغال
    const client = window.google.accounts.oauth2.initCodeClient({
      client_id: CONFIG.GOOGLE_CLIENT_ID,
      scope: 'openid email profile',
      hint: '',
      callback: () => {},
    })
    client.requestCode()
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
        <div className="card" style={{ textAlign: 'center', padding: '32px 24px', gap: 24, display: 'flex', flexDirection: 'column' }}>
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

          {status !== 'loading' && (
            <button className="btn btn-google" onClick={handleSignIn}>
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              تسجيل الدخول بـ Google
            </button>
          )}

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
