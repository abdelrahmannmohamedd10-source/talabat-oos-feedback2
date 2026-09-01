// =====================================================================
//  T-Champ Attendance — Google Apps Script Backend  (v2 — IBS Login)
//  Deploy as: Web App → Execute as: Me → Who has access: Anyone, even anonymous
//  يتم النشر من Gmail شخصي (مش Talabat Workspace)
// =====================================================================

const SPREADSHEET_ID = '1Iu58nCd29iKLRuzkKAdSF7JIK0CLXCKqpkzOzvDTYNo'
const TIMEZONE       = 'Africa/Cairo'

// ─── Entry points ──────────────────────────────────────────────────────
function doGet(e) {
  try {
    const action = (e.parameter.action || 'status').toLowerCase()
    if (action === 'status') return respond({ status: 'T-Champ Attendance API v2 running' })
    if (action === 'submit') return respond(handleSubmit(e.parameter))
    return respond({ error: 'Unknown action: ' + action })
  } catch (err) {
    Logger.log('Error: ' + err.message + '\n' + err.stack)
    return respond({ error: err.message })
  }
}

// بتدير OPTIONS preflight للـ CORS
function doOptions() {
  return ContentService.createTextOutput('').setMimeType(ContentService.MimeType.TEXT)
}

// ─── Submit Attendance via GET params ─────────────────────────────────
function handleSubmit(p) {
  const ibs    = String(p.ibs    || '').trim()
  const name   = String(p.name   || '').trim()
  const branch = String(p.branch || '').trim()

  if (!ibs || !name || !branch) {
    return { error: 'بيانات ناقصة (ibs, name, branch مطلوبين)' }
  }

  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID)
  const today = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd')

  // منع التسجيل المكرر — بالـ IBS Number ويوم اليوم
  const attSheet = getOrCreateAttendanceSheet(ss)
  if (hasCheckedInToday(attSheet, ibs, today)) {
    return { error: 'سجّلت حضورك اليوم مسبقاً ✓' }
  }

  const now  = new Date()
  const date = p.date || Utilities.formatDate(now, TIMEZONE, 'yyyy-MM-dd')
  const time = p.time || Utilities.formatDate(now, TIMEZONE, 'HH:mm:ss')

  attSheet.appendRow([
    date,
    time,
    name,
    ibs,
    String(p.email  || ''),
    String(p.chain  || ''),
    branch,
    String(p.lat    || ''),
    String(p.lng    || ''),
    String(p.acc    || ''),
  ])

  return {
    success:  true,
    employee: name,
    branch,
    time:     Utilities.formatDate(now, TIMEZONE, 'HH:mm'),
    date,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────
function getOrCreateAttendanceSheet(ss) {
  let sheet = ss.getSheetByName('ATTENDANCE')
  if (!sheet) {
    sheet = ss.insertSheet('ATTENDANCE')
    const headers = ['DATE','TIME','T-CHAMP NAME','IBS NUMBER','EMAIL',
                     'CHAIN NAME','VENDOR NAME','LATITUDE','LONGITUDE','ACCURACY']
    sheet.appendRow(headers)
    const range = sheet.getRange(1, 1, 1, headers.length)
    range.setFontWeight('bold').setBackground('#FF6600').setFontColor('#ffffff')
    sheet.setFrozenRows(1)
  }
  return sheet
}

// بتتحقق لو الموظف سجّل اليوم قبل كده (بالـ IBS Number)
function hasCheckedInToday(sheet, ibs, today) {
  const last = sheet.getLastRow()
  if (last < 2) return false
  const data = sheet.getRange(2, 1, last - 1, 4).getValues()
  for (const row of data) {
    if (String(row[0]) === today && String(row[3]) === ibs) return true
  }
  return false
}

function respond(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
}
