export default function SuccessScreen({ user, employee, branch, result, onLogout }) {
  const now = new Date()
  const timeStr = result?.time ?? now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
  const dateStr = now.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const employeeName = result?.employee ?? employee?.['FULL NAME'] ?? user?.name

  return (
    <div className="screen">
      <div className="screen-header">
        <div className="progress-dots">
          <div className="dot done" />
          <div className="dot done" />
          <div className="dot done" />
        </div>
        <button className="logout-btn" onClick={onLogout} title="تسجيل الخروج">
          ⬅ خروج
        </button>
      </div>

      <div className="screen-body">
        {/* Success animation */}
        <div className="text-center success-anim" style={{ marginBottom: 8 }}>
          <svg width="90" height="90" viewBox="0 0 90 90">
            <circle cx="45" cy="45" r="42" fill="var(--success-light)" />
            <circle cx="45" cy="45" r="42" fill="none" stroke="var(--success)" strokeWidth="3" />
            <polyline
              className="check-path"
              points="26,47 40,61 64,33"
              fill="none"
              stroke="var(--success)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="text-center">
          <div className="title" style={{ color: 'var(--success)' }}>تم تسجيل حضورك ✓</div>
          <div className="subtitle">{dateStr}</div>
        </div>

        <div className="card">
          <div className="info-row">
            <span className="info-row-label">الاسم</span>
            <span className="info-row-value">{employeeName}</span>
          </div>
          <div className="info-row">
            <span className="info-row-label">الفرع</span>
            <span className="info-row-value">📍 {branch?.name ?? result?.branch}</span>
          </div>
          <div className="info-row">
            <span className="info-row-label">وقت الحضور</span>
            <span className="info-row-value" style={{ color: 'var(--primary)', fontWeight: 700 }}>
              {timeStr}
            </span>
          </div>
          {employee?.['ID'] && (
            <div className="info-row">
              <span className="info-row-label">الـ ID</span>
              <span className="info-row-value">{employee['ID']}</span>
            </div>
          )}
          {employee?.['VENDORS'] && (
            <div className="info-row">
              <span className="info-row-label">Vendors</span>
              <span className="info-row-value" style={{ fontSize: 13 }}>{employee['VENDORS']}</span>
            </div>
          )}
          {employee?.['CHAINS'] && (
            <div className="info-row">
              <span className="info-row-label">Chains</span>
              <span className="info-row-value" style={{ fontSize: 13 }}>{employee['CHAINS']}</span>
            </div>
          )}
        </div>

        <div style={{
          background: 'var(--success-light)',
          border: '1px solid #BBF7D0',
          borderRadius: 'var(--radius-sm)',
          padding: '12px 16px',
          fontSize: 13,
          color: 'var(--success)',
          textAlign: 'center',
          lineHeight: 1.6,
        }}>
          تم حفظ بياناتك في Google Sheets تلقائياً 📊
        </div>

        <button className="btn btn-outline" onClick={onLogout} style={{ marginTop: 8 }}>
          تسجيل الخروج
        </button>
      </div>
    </div>
  )
}
