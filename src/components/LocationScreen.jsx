import { useState, useEffect, useRef } from 'react'
import { CONFIG } from '../config'
import { detectMockLocation, findNearestBranch } from '../utils/geo'
import { getBranches } from '../utils/api'

const STATUS = {
  FETCHING: 'fetching', REQUESTING: 'requesting', CHECKING: 'checking',
  MOCK: 'mock', OUT_OF_RANGE: 'out_of_range', DENIED: 'denied', OK: 'ok', ERROR: 'error',
}

export default function LocationScreen({ user, onSuccess, onLogout }) {
  const [status, setStatus]       = useState(STATUS.FETCHING)
  const [message, setMessage]     = useState('')
  const [branches, setBranches]   = useState([])
  const [nearest, setNearest]     = useState(null)
  const watchId  = useRef(null)
  const checked  = useRef(false)

  useEffect(() => {
    load()
    return () => { if (watchId.current) navigator.geolocation.clearWatch(watchId.current) }
  }, [])

  async function load() {
    try {
      const result = await getBranches(user.ibsNumber)
      if (result.error || !result.branches?.length) {
        setStatus(STATUS.ERROR)
        setMessage(result.error || 'مفيش فروع')
        return
      }
      setBranches(result.branches)
      startWatch(result.branches)
    } catch (e) {
      setStatus(STATUS.ERROR)
      setMessage('خطأ في تحميل الفروع: ' + e.message)
    }
  }

  function startWatch(branchList) {
    if (!navigator.geolocation) { setStatus(STATUS.ERROR); setMessage('متصفحك لا يدعم GPS'); return }
    setStatus(STATUS.REQUESTING)
    watchId.current = navigator.geolocation.watchPosition(
      async (pos) => {
        if (checked.current) return
        checked.current = true
        navigator.geolocation.clearWatch(watchId.current)
        setStatus(STATUS.CHECKING)
        const { latitude, longitude, accuracy } = pos.coords
        const mock = await detectMockLocation(pos)
        if (mock.isMock) { setStatus(STATUS.MOCK); setMessage(mock.reason); return }
        const near = findNearestBranch(latitude, longitude, branchList)
        setNearest(near)
        if (!near || near.distance > (near.radius ?? CONFIG.DEFAULT_RADIUS)) { setStatus(STATUS.OUT_OF_RANGE); return }
        setStatus(STATUS.OK)
        setTimeout(() => onSuccess({ latitude, longitude, accuracy }, near), 1000)
      },
      (err) => {
        setStatus(err.code === err.PERMISSION_DENIED ? STATUS.DENIED : STATUS.ERROR)
        setMessage('تعذّر الحصول على الموقع')
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  function retry() { checked.current = false; setNearest(null); setStatus(STATUS.FETCHING); load() }

  const ui = {
    [STATUS.FETCHING]:      { icon: '🔄', cls: 'primary', title: 'جاري تحميل الفروع...', sub: 'لحظة', spin: true },
    [STATUS.REQUESTING]:    { icon: '📍', cls: 'primary', title: 'نحتاج موقعك', sub: 'اضغط "السماح" في النافذة اللي هتظهر', spin: true },
    [STATUS.CHECKING]:      { icon: '🔍', cls: 'primary', title: 'جاري التحقق...', sub: 'بنتأكد من موقعك', spin: true },
    [STATUS.OK]:            { icon: '✅', cls: 'success', title: `أنت في ${nearest?.name ?? ''}`, sub: `على بُعد ${nearest?.distance ?? 0} متر`, spin: false },
    [STATUS.MOCK]:          { icon: '🚫', cls: 'danger',  title: 'موقع وهمي مكتشف', sub: message, spin: false, retry: true },
    [STATUS.OUT_OF_RANGE]:  { icon: '📵', cls: 'warning', title: 'أنت بعيد عن أي فندور', sub: nearest ? `أقرب: ${nearest.name} (${nearest.distance}م)` : '', spin: false, retry: true },
    [STATUS.DENIED]:        { icon: '🔒', cls: 'danger',  title: 'تم رفض الموقع', sub: 'افتح إعدادات المتصفح وأعطِ صلاحية الموقع', spin: false, retry: true },
    [STATUS.ERROR]:         { icon: '⚠️', cls: 'warning', title: 'حدث خطأ', sub: message, spin: false, retry: true },
  }[status] || { icon: '⚠️', cls: 'warning', title: 'خطأ', sub: message, spin: false, retry: true }

  return (
    <div className="screen">
      <div className="screen-header">
        <div className="progress-dots"><div className="dot done"/><div className="dot active"/><div className="dot"/></div>
        <button className="logout-btn" onClick={onLogout}>✕</button>
      </div>
      <div className="user-row" style={{ marginBottom: 16 }}>
        {user.picture ? <img src={user.picture} className="user-avatar" alt=""/> : <div className="user-avatar-placeholder">{user.name?.[0]}</div>}
        <div className="user-info"><div className="user-name">{user.name}</div><div className="user-email">{user.email}</div></div>
      </div>
      <div className="screen-body">
        <div className="card text-center" style={{ padding: '32px 24px', gap: 16, display: 'flex', flexDirection: 'column' }}>
          <div className={`icon-circle icon-circle-${ui.cls}`} style={{ fontSize: 32 }}>
            {ui.spin ? <div className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }}/> : ui.icon}
          </div>
          <div><div className="title">{ui.title}</div><div className="subtitle">{ui.sub}</div></div>
          {status === STATUS.MOCK && (
            <div style={{ background: 'var(--danger-light)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: 'var(--danger)', lineHeight: 1.7, textAlign: 'right' }}>
              <strong>خطوات الإصلاح:</strong><br/>
              ١. أوقف تطبيق Fake GPS<br/>٢. أوقف "Mock Location" في إعدادات المطور<br/>٣. اضغط إعادة المحاولة
            </div>
          )}
          {ui.retry && <button className="btn btn-primary" onClick={retry}>🔄 إعادة المحاولة</button>}
        </div>
      </div>
    </div>
  )
}
