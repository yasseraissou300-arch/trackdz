// BullMQ queue for WhatsApp message sending
// In production, connect to Redis (Upstash or self-hosted)

export interface WhatsAppJob {
  commandeId: string
  boutiqueId: string
  statut: string
}

// Queue stub - in production use BullMQ
export async function enqueueWhatsAppMessage(job: WhatsAppJob): Promise<void> {
  // In development, process inline
  if (process.env.NODE_ENV === 'development') {
    const { processWhatsAppJob } = await import('@/workers/whatsappWorker')
    await processWhatsAppJob(job)
    return
  }

  // In production with Redis:
  // const queue = new Queue('whatsapp-messages', { connection: redisConnection })
  // await queue.add('send-message', job, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } })
  console.log('WhatsApp job queued:', job)
}
