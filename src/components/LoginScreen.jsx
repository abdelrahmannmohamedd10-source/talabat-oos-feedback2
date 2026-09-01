import { useState, useEffect, useRef } from 'react'
import { CONFIG } from '../config'
import { verifyEmployee } from '../utils/api'

const SCOPE = [
  'email', 'profile', 'openid',
  'https://www.googleapis.com/auth/spreadsheets',
].join(' ')

export default function LoginScreen({ onSuccess }) {
  const [status, setStatus]   = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const clientRef = useRef(null)

  useEffect(() => {
    function init() {
      if (!window.google?.accounts?.oauth2 || clientRef.current) return
      clientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id:     CONFIG.GOOGLE_CLIENT_ID,
        scope:         SCOPE,
        hosted_domain: CONFIG.ALLOWED_DOMAIN,
        callback:      handleToken,
      })
    }
    if (window.google?.accounts?.oauth2) {
      init()
    } else {
      const t = setInterval(() => {
        if (window.google?.accounts?.oauth2) { init(); clearInterval(t) }
      }, 150)
      return () => clearInterval(t)
    }
  }, [])

  async function handleToken(response) {
    if (response.error) {
      setErrorMsg('تم إلغاء تسجيل الدخول')
      setStatus('error')
      return
    }

    setStatus('loading')
    setErrorMsg('')

    try {
      const accessToken = response.access_token

      // جلب بيانات الحساب من Google
      const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then(r => r.json())

      if (!userInfo.email?.toLowerCase().endsWith('@' + CONFIG.ALLOWED_DOMAIN)) {
        setErrorMsg(`مسموح فقط بإيميلات @${CONFIG.ALLOWED_DOMAIN}`)
        setStatus('error')
        return
      }

      const result = await verifyEmployee(userInfo.email, accessToken)
      if (result.error) {
        setErrorMsg(result.error)
        setStatus('error')
        return
      }

      onSuccess(
        { email: userInfo.email, name: userInfo.name, picture: userInfo.picture, accessToken },
        result.employee
      )
    } catch (e) {
      console.error(e)
      setErrorMsg('خطأ في الاتصال: ' + e.message)
      setStatus('error')
    }
  }

  function handleSignIn() {
    if (!clientRef.current) {
      setErrorMsg('جاري تحميل Google...')
      return
    }
    setStatus('idle')
    setErrorMsg('')
    clientRef.current.requestAccessToken()
  }

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
          <span>📍 موقع GPS</span><span>•</span><span>📸 سيلفي</span><span>•</span><span>📊 Google Sheets</span>
        </div>
      </div>
    </div>
  )
}
