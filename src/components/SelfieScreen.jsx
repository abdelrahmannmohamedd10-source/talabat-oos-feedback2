import { useState, useEffect, useRef } from 'react'
import { submitAttendance } from '../utils/api'

export default function SelfieScreen({ user, employee, branch, location, onSuccess, onLogout }) {
  const [phase, setPhase] = useState('camera') // camera | preview | submitting | error
  const [capturedImage, setCapturedImage] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [cameraError, setCameraError] = useState('')
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [])

  async function startCamera() {
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 854 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setCameraError('تم رفض الوصول للكاميرا — افتح إعدادات المتصفح وأعطِ صلاحية الكاميرا')
      } else if (err.name === 'NotFoundError') {
        setCameraError('لم يتم العثور على كاميرا أمامية')
      } else {
        setCameraError('تعذّر تشغيل الكاميرا: ' + err.message)
      }
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  function capturePhoto() {
    const video = videoRef.current
    if (!video) return

    const canvas = document.createElement('canvas')
    // احتفظ بالنسبة الأصلية، لكن حدّ الحجم لـ 640px لتقليل حجم الـ base64
    const maxW = 640
    const scale = Math.min(1, maxW / video.videoWidth)
    canvas.width  = Math.round(video.videoWidth  * scale)
    canvas.height = Math.round(video.videoHeight * scale)

    const ctx = canvas.getContext('2d')
    // اعكس الصورة لأن الـ video معكوس (front camera mirror effect)
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    const dataUrl = canvas.toDataURL('image/jpeg', 0.75)
    setCapturedImage(dataUrl)
    stopCamera()
    setPhase('preview')
  }

  function retake() {
    setCapturedImage(null)
    setPhase('camera')
    startCamera()
  }

  async function confirmAndSubmit() {
    setPhase('submitting')
    setErrorMsg('')
    try {
      // أرسل base64 بدون الـ prefix
      const base64 = capturedImage.replace(/^data:image\/\w+;base64,/, '')
      const result = await submitAttendance({
        idToken: user.idToken,
        branch,
        location,
        selfieBase64: base64,
      })

      if (result.error) {
        setErrorMsg(result.error)
        setPhase('error')
        return
      }

      onSuccess(result)
    } catch (e) {
      setErrorMsg('حدث خطأ في الإرسال — تحقق من الاتصال وحاول مجدداً')
      setPhase('error')
    }
  }

  if (cameraError) {
    return (
      <div className="screen">
        <div className="screen-header">
          <div className="progress-dots">
            <div className="dot done" />
            <div className="dot done" />
            <div className="dot active" />
          </div>
          <button className="logout-btn" onClick={onLogout}>✕</button>
        </div>
        <div className="screen-body">
          <div className="card text-center" style={{ padding: '32px 24px', gap: 16, display: 'flex', flexDirection: 'column' }}>
            <div className="icon-circle icon-circle-danger" style={{ fontSize: 32 }}>📷</div>
            <div>
              <div className="title">مشكلة في الكاميرا</div>
              <div className="subtitle">{cameraError}</div>
            </div>
            <button className="btn btn-primary" onClick={startCamera}>🔄 إعادة المحاولة</button>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="screen">
        <div className="screen-header">
          <div className="progress-dots">
            <div className="dot done" /><div className="dot done" /><div className="dot active" />
          </div>
          <button className="logout-btn" onClick={onLogout}>✕</button>
        </div>
        <div className="screen-body">
          <div className="card text-center" style={{ padding: '32px 24px', gap: 16, display: 'flex', flexDirection: 'column' }}>
            <div className="icon-circle icon-circle-danger" style={{ fontSize: 32 }}>❌</div>
            <div>
              <div className="title">فشل الإرسال</div>
              <div className="subtitle">{errorMsg}</div>
            </div>
            <button className="btn btn-primary" onClick={() => { setPhase('preview') }}>حاول مجدداً</button>
            <button className="btn btn-outline" onClick={retake}>التقط صورة جديدة</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      <div className="screen-header">
        <div className="progress-dots">
          <div className="dot done" />
          <div className="dot done" />
          <div className="dot active" />
        </div>
        {phase !== 'submitting' && (
          <button className="logout-btn" onClick={onLogout}>✕</button>
        )}
      </div>

      {/* Info bar */}
      <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <span className="badge badge-info">📍 {branch.name}</span>
        <span className="badge badge-info">👤 {user.name?.split(' ')[0]}</span>
        {phase === 'preview' && <span className="badge badge-success">✓ جاهزة</span>}
      </div>

      {/* Camera / Preview */}
      <div className="camera-wrapper" style={{ flex: 1 }}>
        {phase === 'camera' && (
          <>
            <video ref={videoRef} className="camera-video" playsInline muted autoPlay />
            {/* إطار التصوير */}
            <div className="camera-corner tl" />
            <div className="camera-corner tr" />
            <div className="camera-corner bl" />
            <div className="camera-corner br" />
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: 'linear-gradient(transparent, rgba(0,0,0,0.5))',
              padding: '12px', textAlign: 'center',
              color: 'rgba(255,255,255,0.85)', fontSize: 13,
            }}>
              وجّه الكاميرا لوجهك بوضوح
            </div>
          </>
        )}

        {(phase === 'preview' || phase === 'submitting') && capturedImage && (
          <img src={capturedImage} className="camera-canvas" alt="selfie preview" />
        )}

        {phase === 'submitting' && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 16,
          }}>
            <div className="spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#FF6600', width: 44, height: 44 }} />
            <span style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>جاري تسجيل الحضور...</span>
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {phase === 'camera' && (
          <>
            <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
              ⚠️ يجب التقاط صورة جديدة — لا يمكن الرفع من الألبوم
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button className="capture-btn" onClick={capturePhoto} aria-label="التقاط صورة">
                <div className="capture-btn-inner" />
              </button>
            </div>
          </>
        )}

        {phase === 'preview' && (
          <>
            <button className="btn btn-primary" onClick={confirmAndSubmit}>
              ✅ تسجيل الحضور
            </button>
            <button className="btn btn-outline" onClick={retake}>
              📷 إعادة التصوير
            </button>
          </>
        )}
      </div>
    </div>
  )
}
