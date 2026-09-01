import { CONFIG } from '../config'
import { loadMapping } from './gviz'

function findCol(obj, ...names) {
  const norm = s => String(s).toLowerCase().replace(/\s+/g, ' ').trim()
  const keys = Object.keys(obj)
  for (const name of names) {
    const n = norm(name)
    const exact   = keys.find(k => norm(k) === n)
    const partial = keys.find(k => norm(k).includes(n))
    if (exact || partial) return exact || partial
  }
  return null
}

function empVal(emp, ...names) {
  const k = findCol(emp, ...names)
  return k ? String(emp[k] || '').trim() : ''
}

export async function verifyEmployee(ibsNumber) {
  const { rows } = await loadMapping(CONFIG.SPREADSHEET_ID)
  const ibs = String(ibsNumber).trim()

  for (const row of rows) {
    if (empVal(row, 'ibs number', 'ibs') === ibs) {
      return { success: true, employee: row }
    }
  }
  return { error: 'رقم IBS غير موجود — تواصل مع الـ Admin' }
}

export async function getBranches(ibsNumber) {
  const { rows } = await loadMapping(CONFIG.SPREADSHEET_ID)
  const ibs = String(ibsNumber).trim()
  const branches = [], seen = new Set()

  for (const row of rows) {
    if (empVal(row, 'ibs number', 'ibs') !== ibs) continue
    const locStr = empVal(row, 'vendor map location', 'vendor attributes vendor map location')
    const parts  = locStr.split(',')
    if (parts.length < 2) continue
    const lat = parseFloat(parts[0])
    const lng = parseFloat(parts[1])
    if (isNaN(lat) || isNaN(lng)) continue
    const key = lat.toFixed(4) + ',' + lng.toFixed(4)
    if (seen.has(key)) continue
    seen.add(key)
    branches.push({
      name:      empVal(row, 'vendor name', 'vendor name/english', 'vendor attributes vendor name') || 'Vendor',
      lat, lng,
      radius:    CONFIG.DEFAULT_RADIUS,
      chainName: empVal(row, 'chain name'),
    })
  }

  return branches.length
    ? { success: true, branches }
    : { error: 'مفيش مواقع فندور مرتبطة بـ IBS Number بتاعك' }
}

export async function submitAttendance({ employee, branch, location }) {
  const now  = new Date()
  const date = now.toLocaleDateString('en-CA')
  const time = now.toLocaleTimeString('en-GB')

  const params = new URLSearchParams({
    action: 'submit',
    date,
    time,
    name:   empVal(employee, 't-champ name', 'tchamp', 'champ'),
    ibs:    empVal(employee, 'ibs number', 'ibs'),
    email:  empVal(employee, 'email'),
    chain:  branch.chainName || '',
    branch: branch.name,
    lat:    location.latitude,
    lng:    location.longitude,
    acc:    Math.round(location.accuracy),
  })

  const res = await fetch(`${CONFIG.APPS_SCRIPT_URL}?${params}`)
  if (!res.ok) throw new Error(`خطأ في السيرفر: ${res.status}`)
  const json = await res.json()
  if (json.error) throw new Error(json.error)

  return {
    success:  true,
    employee: params.get('name'),
    branch:   branch.name,
    time:     now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Cairo' }),
    date,
  }
}
