// ✅ فقط named export — هیچ export default ی وجود ندارد

export function setItemWithExpiry(key, value, ttl) {
  const now = Date.now();
  const item = { value, expiry: now + Number(ttl || 0) };
  localStorage.setItem(key, JSON.stringify(item));
}

export function getItemWithExpiry(key) {
  const raw = localStorage.getItem(key);
  if (!raw) return null;

  try {
    const item = JSON.parse(raw);
    if (!item || typeof item.expiry !== 'number') return null;

    if (Date.now() > item.expiry) {
      localStorage.removeItem(key);
      return null;
    }
    return item.value;
  } catch {
    // اگر خراب ذخیره شده باشه پاکش کن
    localStorage.removeItem(key);
    return null;
  }
}

export function removeItem(key) {
  localStorage.removeItem(key);
}
