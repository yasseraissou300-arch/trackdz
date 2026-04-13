interface SendMessageParams {
  instanceId: string
  token: string
  to: string
  message: string
}

interface UltraMsgResponse {
  sent: string
  message: string
  id: string
}

export async function sendWhatsApp({
  instanceId,
  token,
  to,
  message,
}: SendMessageParams): Promise<UltraMsgResponse> {
  const response = await fetch(
    `${process.env.ULTRAMSG_BASE_URL}/${instanceId}/messages/chat`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token, to, body: message }),
    }
  )

  if (!response.ok) {
    throw new Error(`UltraMsg API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

export async function getInstanceInfo(instanceId: string, token: string) {
  const response = await fetch(
    `${process.env.ULTRAMSG_BASE_URL}/${instanceId}/instance/status?token=${token}`
  )
  if (!response.ok) throw new Error('Failed to get instance info')
  return response.json()
}
