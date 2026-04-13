export function formatPhoneAlgeria(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('213')) return cleaned
  if (cleaned.startsWith('0')) return '213' + cleaned.slice(1)
  if (cleaned.length === 9) return '213' + cleaned
  return cleaned
}

export function formatPhoneDisplay(phone: string): string {
  const formatted = formatPhoneAlgeria(phone)
  if (formatted.startsWith('213')) {
    const local = formatted.slice(3)
    return `+213 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`
  }
  return phone
}

export function isPhoneValid(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '')
  return cleaned.length >= 9 && cleaned.length <= 13
}

export function generateTrackingUrl(trackingNumber: string): string {
  return `${process.env.NEXT_PUBLIC_APP_URL}/suivi/${trackingNumber}`
}

export function encryptApiKey(key: string): string {
  // In production, use proper AES-256 encryption
  // For now, use base64 as placeholder
  return Buffer.from(key).toString('base64')
}

export function decryptApiKey(encrypted: string): string {
  return Buffer.from(encrypted, 'base64').toString('utf-8')
}
