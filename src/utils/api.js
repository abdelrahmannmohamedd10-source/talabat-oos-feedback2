import { CONFIG } from '../config'

async function post(body) {
  const res = await fetch(CONFIG.APPS_SCRIPT_URL, {
    method: 'POST',
    // text/plain يتجنب CORS preflight مع Apps Script
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  return JSON.parse(text)
}

export async function verifyEmployee(idToken) {
  return post({ action: 'verify', token: idToken })
}

export async function getBranches(idToken) {
  return post({ action: 'getBranches', token: idToken })
}

export async function submitAttendance({ idToken, branch, location, selfieBase64 }) {
  return post({
    action: 'submit',
    token: idToken,
    branch: branch.name,
    latitude: location.latitude,
    longitude: location.longitude,
    accuracy: location.accuracy,
    selfie: selfieBase64,
  })
}
