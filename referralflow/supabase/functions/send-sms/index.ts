// Supabase Edge Function: Send SMS via Twilio
// Deploy: supabase functions deploy send-sms

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')!
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')!
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER')!

interface SmsRequest {
  to: string
  type: 'client_intro' | 'partner_notification'
  data: {
    clientFirstName?: string
    clientLastName?: string
    clientPhone?: string
    senderName: string
    senderBusiness: string
    partnerName: string
    partnerBusiness: string
    partnerProfession: string
    context?: string
    referralLink?: string
  }
}

function buildClientSms(data: SmsRequest['data']): string {
  return `Hi ${data.clientFirstName}, ${data.senderName} from ${data.senderBusiness} has recommended you speak with ${data.partnerName} at ${data.partnerBusiness} regarding ${data.partnerProfession} services.\n\n${data.partnerName} will be in touch shortly. If you'd prefer not to be contacted, reply STOP.\n\nSent via Referio`
}

function buildPartnerSms(data: SmsRequest['data']): string {
  return `New referral via Referio from ${data.senderName} at ${data.senderBusiness}: ${data.clientFirstName} ${data.clientLastName}, ${data.clientPhone}. Context: ${data.context}. View: ${data.referralLink}`
}

async function sendTwilioSms(to: string, body: string): Promise<boolean> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`
  const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)

  const params = new URLSearchParams({
    To: to,
    From: TWILIO_PHONE_NUMBER,
    Body: body,
  })

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  return response.ok
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  try {
    const { to, type, data }: SmsRequest = await req.json()

    const message = type === 'client_intro'
      ? buildClientSms(data)
      : buildPartnerSms(data)

    const sent = await sendTwilioSms(to, message)

    return new Response(JSON.stringify({ success: sent }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }
})
