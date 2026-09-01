export const CONFIG = {
  // 1. من Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs
  GOOGLE_CLIENT_ID: '397053555500-r40ar3ue88qjjv0rsp5cgec50feudj8b.apps.googleusercontent.com',

  // 2. من Apps Script بعد الـ Deploy → Web App URL
  APPS_SCRIPT_URL: 'https://script.google.com/a/macros/talabat.com/s/AKfycbyJcOsVPEFRhmYgU-MwntkGGyruUytmVGP3pkAiij5Bs_1lm_2kMVX4oEDIuFOvu8ua/exec',

  // Domain المسموح بيه فقط
  ALLOWED_DOMAIN: 'talabat.com',

  // نطاق الـ Geofence الافتراضي (بالمتر) - بيتغلب عليه لو في RADIUS في شيت BRANCHES
  DEFAULT_RADIUS: 50,
}
