// =====================================================================
//  T-Champ Attendance — Google Apps Script Backend
//  Deploy as: Web App → Execute as: Me → Who has access: Anyone
// =====================================================================

const SPREADSHEET_ID  = '1Iu58nCd29iKLRuzkKAdSF7JIK0CLXCKqpkzOzvDTYNo'
const DRIVE_FOLDER_ID = 'YOUR_DRIVE_FOLDER_ID_HERE'  // فولدر Drive للـ Selfies
const ALLOWED_DOMAIN  = 'talabat.com'
const TIMEZONE        = 'Africa/Cairo'
const DEFAULT_RADIUS  = 50  // متر

// ─── Entry point ──────────────────────────────────────────────────────
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents)
    const { action, token } = data

    const userInfo = verifyGoogleToken(token)
    if (!userInfo) return respond({ error: 'Invalid or expired token' })

    const email = userInfo.email.toLowerCase()
    if (!email.endsWith('@' + ALLOWED_DOMAIN)) {
      return respond({ error: 'غير مسموح — فقط إيميلات @' + ALLOWED_DOMAIN })
    }

    switch (action) {
      case 'verify':      return respond(handleVerify(email, userInfo))
      case 'getBranches': return respond(handleGetBranches(email))
      case 'submit':      return respond(handleSubmit(data, email, userInfo))
      default:            return respond({ error: 'Unknown action' })
    }
  } catch (err) {
    Logger.log('Error: ' + err.message)
    return respond({ error: 'Server error: ' + err.message })
  }
}

function doGet() {
  return respond({ status: 'T-Champ Attendance API running' })
}

// ─── Verify Google ID Token ───────────────────────────────────────────
function verifyGoogleToken(idToken) {
  try {
    const res  = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + idToken, { muteHttpExceptions: true })
    const data = JSON.parse(res.getContentText())
    if (data.error || !data.email) return null
    return { email: data.email, name: data.name || '' }
  } catch (e) { return null }
}

// ─── Get MAPPING sheet + column indexes ──────────────────────────────
function getMappingInfo() {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID)
  // بنجرب اسم MAPPING الأول، لو مش موجود بناخد أول شيت
  const sheet = ss.getSheetByName('MAPPING') || ss.getSheets()[0]
  const data  = sheet.getDataRange().getValues()
  const rawHeaders = data[0].map(h => String(h).trim())

  // نوجد الأعمدة بالاسم (case-insensitive)
  function col(...names) {
    for (const n of names) {
      const i = rawHeaders.findIndex(h => h.toLowerCase() === n.toLowerCase())
      if (i !== -1) return i
    }
    return -1
  }

  return {
    data,
    idx: {
      email:      col('email'),
      tchamp:     col('t-champ', 'tchamp'),
      ibs:        col('ibs number', 'ibsnumber'),
      vendorName: col('vendor attributes vendor name (english)', 'vendor name'),
      vendorLoc:  col('vendor attributes vendor map location', 'vendor map location', 'location'),
      chainName:  1,   // العمود الثاني دايماً اسم الـ Chain
      chainId:    0,   // العمود الأول دايماً ID الـ Chain
      vendorId:   2,   // العمود التالت ID الـ Vendor
    }
  }
}

// ─── Verify employee ──────────────────────────────────────────────────
function handleVerify(email, userInfo) {
  const { data, idx } = getMappingInfo()
  if (idx.email === -1) return { error: 'لم يتم إيجاد عمود Email في الشيت' }

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idx.email]).toLowerCase() !== email) continue
    return {
      success: true,
      employee: {
        'FULL NAME':  String(data[i][idx.tchamp]),
        'ID':         String(data[i][idx.ibs]),
        'EMAIL':      email,
      }
    }
  }
  return { error: 'الإيميل مش موجود في شيت MAPPING — تواصل مع الـ Admin' }
}

// ─── Get vendor locations for this T-champ ────────────────────────────
// بدل شيت BRANCHES، بنرجع مواقع الفندورز المخصصة للموظف ده مباشرة
function handleGetBranches(email) {
  const { data, idx } = getMappingInfo()
  if (idx.email === -1)      return { error: 'لم يتم إيجاد عمود Email' }
  if (idx.vendorLoc === -1)  return { error: 'لم يتم إيجاد عمود Vendor Map Location' }
  if (idx.vendorName === -1) return { error: 'لم يتم إيجاد عمود Vendor Name' }

  const branches = []
  const seen = new Set()

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idx.email]).toLowerCase() !== email) continue

    const locStr = String(data[i][idx.vendorLoc]).trim()
    if (!locStr) continue

    // الإحداثيات في شكل "lat,lng"
    const parts = locStr.split(',')
    if (parts.length < 2) continue

    const lat = parseFloat(parts[0])
    const lng = parseFloat(parts[1])
    if (isNaN(lat) || isNaN(lng)) continue

    const vendorName = String(data[i][idx.vendorName]).trim()
    const key = lat.toFixed(5) + ',' + lng.toFixed(5)
    if (seen.has(key)) continue
    seen.add(key)

    branches.push({
      name:      vendorName,
      lat,
      lng,
      radius:    DEFAULT_RADIUS,
      chainName: String(data[i][idx.chainName]),
      vendorId:  String(data[i][idx.vendorId]),
    })
  }

  if (!branches.length) {
    return { error: 'مفيش مواقع فندور مرتبطة بإيميلك — تواصل مع الـ Admin' }
  }
  return { success: true, branches }
}

// ─── Submit Attendance ────────────────────────────────────────────────
function handleSubmit(data, email, userInfo) {
  const { data: mappingData, idx } = getMappingInfo()
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID)

  // جلب بيانات الموظف
  let tchampName = userInfo.name, ibsNumber = '', chainName = ''
  for (let i = 1; i < mappingData.length; i++) {
    if (String(mappingData[i][idx.email]).toLowerCase() !== email) continue
    tchampName = String(mappingData[i][idx.tchamp]) || userInfo.name
    ibsNumber  = String(mappingData[i][idx.ibs])
    chainName  = String(mappingData[i][idx.chainName])
    break
  }

  // منع التسجيل المكرر في نفس اليوم
  const today = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd')
  if (hasCheckedInToday(ss, email, today)) {
    return { error: 'قمت بتسجيل حضورك اليوم مسبقاً ✓' }
  }

  // حفظ الـ Selfie في Drive
  let selfieUrl = ''
  if (data.selfie && DRIVE_FOLDER_ID !== 'YOUR_DRIVE_FOLDER_ID_HERE') {
    selfieUrl = saveSelfie(data.selfie, email, today)
  }

  // تسجيل في شيت ATTENDANCE
  const now  = new Date()
  const date = Utilities.formatDate(now, TIMEZONE, 'yyyy-MM-dd')
  const time = Utilities.formatDate(now, TIMEZONE, 'HH:mm:ss')

  let attSheet = ss.getSheetByName('ATTENDANCE')
  if (!attSheet) {
    attSheet = ss.insertSheet('ATTENDANCE')
    const headers = ['DATE','TIME','T-CHAMP NAME','IBS NUMBER','EMAIL',
                     'CHAIN','VENDOR NAME','LATITUDE','LONGITUDE','ACCURACY','SELFIE URL']
    attSheet.appendRow(headers)
    attSheet.getRange(1,1,1,headers.length)
      .setFontWeight('bold')
      .setBackground('#FF6600')
      .setFontColor('#ffffff')
    attSheet.setFrozenRows(1)
  }

  attSheet.appendRow([
    date, time,
    tchampName, ibsNumber, email,
    chainName,
    data.branch || '',
    data.latitude  || '',
    data.longitude || '',
    data.accuracy  || '',
    selfieUrl,
  ])

  return {
    success:  true,
    employee: tchampName,
    branch:   data.branch,
    time:     Utilities.formatDate(now, TIMEZONE, 'HH:mm'),
    date,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────
function hasCheckedInToday(ss, email, today) {
  const sheet = ss.getSheetByName('ATTENDANCE')
  if (!sheet || sheet.getLastRow() < 2) return false
  const data = sheet.getDataRange().getValues()
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === today && String(data[i][4]).toLowerCase() === email) return true
  }
  return false
}

function saveSelfie(base64, email, dateStr) {
  try {
    const decoded = Utilities.base64Decode(base64)
    const blob    = Utilities.newBlob(decoded, 'image/jpeg', email + '_' + dateStr + '.jpg')
    const folder  = DriveApp.getFolderById(DRIVE_FOLDER_ID)
    const file    = folder.createFile(blob)
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW)
    return file.getUrl()
  } catch (e) {
    Logger.log('Selfie error: ' + e.message)
    return ''
  }
}

function respond(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
}
