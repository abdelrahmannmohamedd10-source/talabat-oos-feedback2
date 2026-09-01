export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function findNearestBranch(userLat, userLon, branches) {
  let nearest = null
  let minDistance = Infinity
  for (const branch of branches) {
    const dist = haversineDistance(userLat, userLon, branch.lat, branch.lng)
    if (dist < minDistance) {
      minDistance = dist
      nearest = { ...branch, distance: Math.round(dist) }
    }
  }
  return nearest
}

let _lastPos = null
let _lastTs = null

export async function detectMockLocation(position) {
  const { latitude, longitude, accuracy } = position.coords
  const now = Date.now()

  // الطريقة الأكيدة: بعض Android WebViews بتكشف الـ mock مباشرة
  if (position.coords.mocked === true) {
    return { isMock: true, reason: 'تم اكتشاف تطبيق موقع وهمي — يرجى إغلاقه والمحاولة مجدداً' }
  }

  // دقة أقل من 2 متر مستحيلة في الـ GPS العادي
  if (accuracy !== null && accuracy < 2) {
    return { isMock: true, reason: 'تم اكتشاف موقع وهمي — الدقة مريبة جداً' }
  }

  // سرعة مستحيلة بين قراءتين (أسرع من 300 كم/ساعة = انتقال فوري)
  if (_lastPos && _lastTs) {
    const seconds = (now - _lastTs) / 1000
    if (seconds > 0 && seconds < 30) {
      const dist = haversineDistance(_lastPos.lat, _lastPos.lon, latitude, longitude)
      const speedKmh = (dist / seconds) * 3.6
      if (speedKmh > 300) {
        return { isMock: true, reason: 'تم رصد حركة غير طبيعية في الموقع' }
      }
    }
  }
  _lastPos = { lat: latitude, lon: longitude }
  _lastTs = now

  // مقارنة مع موقع الـ IP كإشارة إضافية (أكثر من 200كم فرق = مريب)
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 4000)
    const ipGeo = await fetch('https://ipapi.co/json/', { signal: ctrl.signal }).then(r => r.json())
    clearTimeout(timer)
    if (ipGeo.latitude && ipGeo.longitude) {
      const ipDist = haversineDistance(latitude, longitude, ipGeo.latitude, ipGeo.longitude)
      if (ipDist > 200000) {
        return { isMock: true, reason: 'الموقع لا يتطابق مع موقع الشبكة — يرجى إيقاف أي تطبيق موقع وهمي' }
      }
    }
  } catch {
    // IP check فشل — نكمل بدونه
  }

  return { isMock: false }
}
