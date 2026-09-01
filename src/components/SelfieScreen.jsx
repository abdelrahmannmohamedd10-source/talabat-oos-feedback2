import { useState, useEffect, useRef } from 'react'
import { submitAttendance } from '../utils/api'

export default function SelfieScreen({ user, employee, branch, location, onSuccess, onLogout }) {
  const [phase, setPhase]         = useState('camera')
  const [captured, setCaptured]   = useState(null)
  const [errorMsg, setErrorMsg]   = useState('')
  const [camError, setCamError]   = useState('')
  const videoRef  = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => { startCamera(); return stopCamera }, [])

  async function startCamera() {
    setCamError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 854 } }, audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play() }
    } catch (err) {
      setCamError(err.name === 'NotAllowedError' ? 'تم رفض الوصول للكاميرا — افتح إعدادات المتصفح'
        : err.name === 'NotFoundError' ? 'لم يتم العثور على كاميرا أمامية'
        : 'خطأ في الكاميرا: ' + err.message)
    }
  }

  function stopCamera() { streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null }

  function capturePhoto() {
    const v = videoRef.current
    const c = document.createElement('canvas')
    const scale = Math.min(1, 640 / v.videoWidth)
    c.width = Math.round(v.videoWidth * scale); c.height = Math.round(v.videoHeight * scale)
    const ctx = c.getContext('2d')
    ctx.translate(c.width, 0); ctx.scale(-1, 1)
    ctx.drawImage(v, 0, 0, c.width, c.height)
    setCaptured(c.toDataURL('image/jpeg', 0.75))
    stopCamera(); setPhase('preview')
  }

  function retake() { setCaptured(null); setPhase('camera'); startCamera() }

  async function confirm() {
    setPhase('submitting')
    try {
      const result = await submitAttendance({ employee, branch, location, accessToken: user.accessToken })
      if (result.error) { setErrorMsg(result.error); setPhase('error'); return }
      onSuccess(result)
    } catch (e) {
      setErrorMsg('خطأ في الإرسال: ' + e.message)
      setPhase('error')
    }
  }

  if (camError) return (
    <div className="screen">
      <div className="screen-header">
        <div className="progress-dots"><div className="dot done"/><div className="dot done"/><div className="dot active"/></div>
        <button className="logout-btn" onClick={onLogout}>✕</button>
      </div>
      <div className="screen-body">
        <div className="card text-center" style={{ padding: '32px 24px', gap: 16, display: 'flex', flexDirection: 'column' }}>
          <div className="icon-circle icon-circle-danger" style={{ fontSize: 32 }}>📷</div>
          <div><div className="title">مشكلة في الكاميرا</div><div className="subtitle">{camError}</div></div>
          <button className="btn btn-primary" onClick={startCamera}>🔄 إعادة المحاولة</button>
        </div>
      </div>
    </div>
  )

  if (phase === 'error') return (
    <div className="screen">
      <div className="screen-header">
        <div className="progress-dots"><div className="dot done"/><div className="dot done"/><div className="dot active"/></div>
        <button className="logout-btn" onClick={onLogout}>✕</button>
      </div>
      <div className="screen-body">
        <div className="card text-center" style={{ padding: '32px 24px', gap: 16, display: 'flex', flexDirection: 'column' }}>
          <div className="icon-circle icon-circle-danger" style={{ fontSize: 32 }}>❌</div>
          <div><div className="title">فشل الإرسال</div><div className="subtitle">{errorMsg}</div></div>
          <button className="btn btn-primary" onClick={() => setPhase('preview')}>حاول مجدداً</button>
          <button className="btn btn-outline" onClick={retake}>التقط صورة جديدة</button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="screen">
      <div className="screen-header">
        <div className="progress-dots"><div className="dot done"/><div className="dot done"/><div className="dot active"/></div>
        {phase !== 'submitting' && <button className="logout-btn" onClick={onLogout}>✕</button>}
      </div>
      <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <span className="badge badge-info">📍 {branch.name}</span>
        <span className="badge badge-info">👤 {user.name?.split(' ')[0]}</span>
        {phase === 'preview' && <span className="badge badge-success">✓ جاهزة</span>}
      </div>
      <div className="camera-wrapper" style={{ flex: 1 }}>
        {phase === 'camera' && (
          <>
            <video ref={videoRef} className="camera-video" playsInline muted autoPlay/>
            <div className="camera-corner tl"/><div className="camera-corner tr"/>
            <div className="camera-corner bl"/><div className="camera-corner br"/>
            <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'linear-gradient(transparent,rgba(0,0,0,0.5))', padding:12, textAlign:'center', color:'rgba(255,255,255,0.85)', fontSize:13 }}>
              وجّه الكاميرا لوجهك بوضوح
            </div>
          </>
        )}
        {(phase === 'preview' || phase === 'submitting') && captured && (
          <img src={captured} className="camera-canvas" alt="selfie"/>
        )}
        {phase === 'submitting' && (
          <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.65)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16 }}>
            <div className="spinner" style={{ borderColor:'rgba(255,255,255,0.3)', borderTopColor:'#FF6600', width:44, height:44 }}/>
            <span style={{ color:'#fff', fontSize:15, fontWeight:600 }}>جاري تسجيل الحضور...</span>
          </div>
        )}
      </div>
      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {phase === 'camera' && (
          <>
            <div style={{ textAlign:'center', fontSize:13, color:'var(--text-muted)' }}>⚠️ يجب التقاط صورة جديدة — لا يمكن الرفع من الألبوم</div>
            <div style={{ display:'flex', justifyContent:'center' }}>
              <button className="capture-btn" onClick={capturePhoto}><div className="capture-btn-inner"/></button>
            </div>
          </>
        )}
        {phase === 'preview' && (
          <>
            <button className="btn btn-primary" onClick={confirm}>✅ تسجيل الحضور</button>
            <button className="btn btn-outline" onClick={retake}>📷 إعادة التصوير</button>
          </>
        )}
      </div>
    </div>
  )
}
