let _cache   = null
let _pending = null

export function clearCache() { _cache = null; _pending = null }

export function loadMapping(spreadsheetId) {
  if (_cache)   return Promise.resolve(_cache)
  if (_pending) return _pending

  _pending = new Promise((resolve, reject) => {
    const cb  = 'gviz' + Math.random().toString(36).slice(2, 9)
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json;responseHandler:${cb}&sheet=MAPPING`

    const timer = setTimeout(() => {
      clean()
      reject(new Error('انتهت مهلة تحميل الشيت — تحقق من الاتصال'))
    }, 15000)

    function clean() {
      clearTimeout(timer)
      delete window[cb]
      document.getElementById(cb)?.remove()
      _pending = null
    }

    window[cb] = (gviz) => {
      clean()
      try {
        const cols = gviz.table.cols.map(c => c.label || c.id)
        const rows = gviz.table.rows.map(r => {
          const obj = {}
          r.c.forEach((cell, i) => { obj[cols[i]] = cell?.v ?? '' })
          return obj
        })
        _cache = { cols, rows }
        resolve(_cache)
      } catch (e) {
        reject(new Error('خطأ في قراءة بيانات الشيت: ' + e.message))
      }
    }

    const s = Object.assign(document.createElement('script'), { id: cb, src: url })
    s.onerror = () => {
      clean()
      reject(new Error('فشل تحميل الشيت — تأكد إن الشيت مشارك (Anyone with link → Viewer)'))
    }
    document.head.appendChild(s)
  })

  return _pending
}
