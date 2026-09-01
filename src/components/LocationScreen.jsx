import { useState, useEffect, useRef } from 'react'
import { CONFIG } from '../config'
import { detectMockLocation, findNearestBranch } from '../utils/geo'
import { getBranches } from '../utils/api'

const STATUS = {
  FETCHING_BRANCHES: 'fetching_branches',
  REQUESTING:  'requesting',
  CHECKING:    'checking',
  MOCK:        'mock',
  OUT_OF_RANGE:'out_of_range',
  DENIED:      'denied',
  OK:          'ok',
  ERROR:       'error',
}

export default function LocationScreen({ user, onSuccess, onLogout }) {
  const [status, setStatus] = useState(STATUS.FETCHING_BRANCHES)
  const [message, setMessage] = useState('')
  const [branches, setBranches] = useState([])
  const [nearestBranch, setNearestBranch] = useState(null)
  const watchId = useRef(null)
  const checkedRef = useRef(false)

  useEffect(() => {
    fetchBranches()
    return () => { if (watchId.current) navigator.geolocation.clearWatch(watchId.current) }
  }, [])

  async function fetchBranches() {
    try {
      const result = await getBranches(user.idToken)
      if (result.error || !result.branches?.length) {
        setStatus(STATUS.ERROR)
        setMessage(result.error || 'مفيش فروع متسجلة في شيت BRANCHES — تواصل مع الـ Admin')
        return
      }
      setBranches(result.branches)
      setStatus(STATUS.REQUESTING)
      startLocationWatch(result.branches)
    } catch {
      setStatus(STATUS.ERROR)
      setMessage('حدث خطأ في تحميل الفروع — تحقق من الاتصال')
    }
  }

  function startLocationWatch(branchList) {
    if (!navigator.geolocation) {
      setStatus(STATUS.ERROR)
      setMessage('متصفحك لا يدعم GPS')
      return
    }

    setStatus(STATUS.REQUESTING)

    watchId.current = navigator.geolocation.watchPosition(
      async (pos) => {
        if (checkedRef.current) return
        checkedRef.current = true
        navigator.geolocation.clearWatch(watchId.current)
        setStatus(STATUS.CHECKING)
        await handlePosition(pos, branchList)
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus(STATUS.DENIED)
        } else {
          setStatus(STATUS.ERROR)
          setMessage('تعذّر الحصول على الموقع — تأكد من تفعيل GPS')
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  async function handlePosition(pos, branchList) {
    const { latitude, longitude, accuracy } = pos.coords

    // فحص Mock Location
    const mockResult = await detectMockLocation(pos)
    if (mockResult.isMock) {
      setStatus(STATUS.MOCK)
      setMessage(mockResult.reason)
      return
    }

    // إيجاد أقرب فرع
    const nearest = findNearestBranch(latitude, longitude, branchList)
    setNearestBranch(nearest)

    const radius = nearest?.radius ?? CONFIG.DEFAULT_RADIUS
    if (!nearest || nearest.distance > radius) {
      setStatus(STATUS.OUT_OF_RANGE)
      return
    }

    setStatus(STATUS.OK)
    setTimeout(() => {
      onSuccess({ latitude, longitude, accuracy }, nearest)
    }, 1200)
  }

  function retry() {
    checkedRef.current = false
    setNearestBranch(null)
    setStatus(STATUS.FETCHING_BRANCHES)
    fetchBranches()
  }

  const stateUI = {
    [STATUS.FETCHING_BRANCHES]: {
      icon: '🔄', iconClass: 'icon-circle-primary',
      title: 'جاري تحميل الفروع...',
      sub: 'لحظة من فضلك',
      spinner: true,
    },
    [STATUS.REQUESTING]: {
      icon: '📍', iconClass: 'icon-circle-primary',
      title: 'نحتاج موقعك',
      sub: 'اضغط "السماح" في النافذة اللي هتظهر',
      spinner: true,
    },
    [STATUS.CHECKING]: {
      icon: '🔍', iconClass: 'icon-circle-primary',
      title: 'جاري التحقق...',
      sub: 'بنتأكد من موقعك',
      spinner: true,
    },
    [STATUS.OK]: {
      icon: '✅', iconClass: 'icon-circle-success',
      title: `أنت في ${nearestBranch?.name ?? 'الفرع'}`,
      sub: `على بُعد ${nearestBranch?.distance ?? 0} متر — ممتاز!`,
      spinner: false,
    },
    [STATUS.MOCK]: {
      icon: '🚫', iconClass: 'icon-circle-danger',
      title: 'موقع وهمي مكتشف',
      sub: message,
      spinner: false,
      retry: true,
    },
    [STATUS.OUT_OF_RANGE]: {
      icon: '📵', iconClass: 'icon-circle-warning',
      title: 'أنت بعيد عن أي فرع',
      sub: nearestBranch
        ? `أقرب فرع: ${nearestBranch.name} (${nearestBranch.distance} متر)`
        : 'لا يوجد فرع قريب منك',
      spinner: false,
      retry: true,
    },
    [STATUS.DENIED]: {
      icon: '🔒', iconClass: 'icon-circle-danger',
      title: 'تم رفض الوصول للموقع',
      sub: 'افتح إعدادات المتصفح وأعطِ صلاحية الموقع لهذا الموقع',
      spinner: false,
      retry: true,
    },
    [STATUS.ERROR]: {
      icon: '⚠️', iconClass: 'icon-circle-warning',
      title: 'حدث خطأ',
      sub: message,
      spinner: false,
      retry: true,
    },
  }

  const ui = stateUI[status] || stateUI[STATUS.ERROR]

  return (
    <div className="screen">
      <div className="screen-header">
        <div className="progress-dots">
          <div className="dot done" />
          <div className="dot active" />
          <div className="dot" />
        </div>
        <button className="logout-btn" onClick={onLogout} title="تسجيل الخروج">✕</button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <UserRow user={user} />
      </div>

      <div className="screen-body">
        <div className="card text-center" style={{ gap: 16, display: 'flex', flexDirection: 'column', padding: '32px 24px' }}>
          <div className={`icon-circle ${ui.iconClass}`} style={{ fontSize: 32 }}>
            {ui.spinner ? <div className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} /> : ui.icon}
          </div>
          <div>
            <div className="title">{ui.title}</div>
            <div className="subtitle">{ui.sub}</div>
          </div>

          {status === STATUS.MOCK && (
            <div style={{ background: 'var(--danger-light)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: 'var(--danger)', lineHeight: 1.7, textAlign: 'right' }}>
              <strong>خطوات الإصلاح:</strong><br />
              ١. أوقف تطبيق Fake GPS أو أي تطبيق موقع وهمي<br />
              ٢. روح إعدادات المطور وأوقف "Mock Location"<br />
              ٣. اضغط "إعادة المحاولة"
            </div>
          )}

          {status === STATUS.DENIED && (
            <div style={{ background: 'var(--primary-light)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: 'var(--primary)', lineHeight: 1.7, textAlign: 'right' }}>
              <strong>لتفعيل الموقع:</strong><br />
              Chrome: ⋮ → الإعدادات → إعدادات الموقع<br />
              ابحث عن هذا الموقع واغيّر الإذن إلى "السماح"
            </div>
          )}

          {ui.retry && (
            <button className="btn btn-primary" onClick={retry}>
              🔄 إعادة المحاولة
            </button>
          )}
        </div>

        {branches.length > 0 && status !== STATUS.OK && (
          <div className="card" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>الفروع المتاحة</div>
            {branches.map(b => (
              <div key={b.name} style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '4px 0' }}>
                📍 {b.name}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function UserRow({ user }) {
  return (
    <div className="user-row">
      {user.picture
        ? <img src={user.picture} alt="avatar" className="user-avatar" />
        : <div className="user-avatar-placeholder">{user.name?.[0] ?? '?'}</div>
      }
      <div className="user-info">
        <div className="user-name">{user.name}</div>
        <div className="user-email">{user.email}</div>
      </div>
    </div>
  )
}
