import { CONFIG } from '../config'
import { getValues, appendRow } from './sheetsApi'

function colIdx(headers, ...names) {
  for (const n of names) {
    const i = headers.findIndex(h => String(h).toLowerCase().trim() === n.toLowerCase())
    if (i !== -1) return i
  }
  return -1
}

export async function verifyEmployee(email, accessToken) {
  const data = await getValues(CONFIG.SPREADSHEET_ID, 'MAPPING', accessToken)
  const rows = data.values || []
  if (!rows.length) return { error: 'شيت MAPPING فاضي' }

  const headers = rows[0]
  const eIdx = colIdx(headers, 'email')
  if (eIdx === -1) return { error: 'عمود Email مش موجود في شيت MAPPING' }

  for (let i = 1; i < rows.length; i++) {
    if ((rows[i][eIdx] || '').toLowerCase() === email.toLowerCase()) {
      const emp = {}
      headers.forEach((h, idx) => { emp[h] = rows[i][idx] || '' })
      return { success: true, employee: emp }
    }
  }
  return { error: 'إيميلك مش موجود في شيت MAPPING — تواصل مع الـ Admin' }
}

export async function getBranches(email, accessToken) {
  const data = await getValues(CONFIG.SPREADSHEET_ID, 'MAPPING', accessToken)
  const rows = data.values || []
  if (!rows.length) return { error: 'شيت MAPPING فاضي' }

  const headers = rows[0]
  const eIdx     = colIdx(headers, 'email')
  const nameIdx  = colIdx(headers, 'vendor attributes vendor name (english)', 'vendor name')
  const locIdx   = colIdx(headers, 'vendor attributes vendor map location', 'vendor map location')

  const branches = [], seen = new Set()

  for (let i = 1; i < rows.length; i++) {
    if ((rows[i][eIdx] || '').toLowerCase() !== email.toLowerCase()) continue
    const locStr = String(rows[i][locIdx] || '').trim()
    const parts  = locStr.split(',')
    if (parts.length < 2) continue
    const lat = parseFloat(parts[0])
    const lng = parseFloat(parts[1])
    if (isNaN(lat) || isNaN(lng)) continue
    const key = lat.toFixed(4) + ',' + lng.toFixed(4)
    if (seen.has(key)) continue
    seen.add(key)
    branches.push({
      name:      String(rows[i][nameIdx] || 'Vendor'),
      lat, lng,
      radius:    CONFIG.DEFAULT_RADIUS,
      chainName: String(rows[i][1] || ''),
    })
  }

  return branches.length
    ? { success: true, branches }
    : { error: 'مفيش مواقع فندور مرتبطة بإيميلك' }
}

export async function submitAttendance({ employee, branch, location, accessToken }) {
  const now  = new Date()
  const date = now.toLocaleDateString('en-CA')
  const time = now.toLocaleTimeString('en-GB')

  // منع التسجيل المكرر
  try {
    const existing = await getValues(CONFIG.SPREADSHEET_ID, 'ATTENDANCE', accessToken)
    const rows = existing.values || []
    if (rows.length > 1) {
      const h = rows[0]
      const dIdx = h.indexOf('DATE'), eIdx = h.indexOf('EMAIL')
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][dIdx] === date && (rows[i][eIdx] || '').toLowerCase() === (employee['Email'] || '').toLowerCase()) {
          return { error: 'سجّلت حضورك اليوم مسبقاً ✓' }
        }
      }
    }
  } catch { /* شيت ATTENDANCE مش موجود بعد — عادي */ }

  await appendRow(CONFIG.SPREADSHEET_ID, 'ATTENDANCE', [
    date, time,
    employee['T-champ']    || '',
    employee['Ibs Number'] || '',
    employee['Email']      || '',
    branch.chainName       || '',
    branch.name,
    location.latitude,
    location.longitude,
    location.accuracy,
  ], accessToken)

  return {
    success:  true,
    employee: employee['T-champ'],
    branch:   branch.name,
    time:     now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Cairo' }),
    date,
  }
}
