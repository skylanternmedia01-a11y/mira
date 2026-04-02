const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY

export async function sendEmail({ to, subject, html }) {
  if (!RESEND_API_KEY) {
    console.warn('Resend API key not configured, email not sent')
    return
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'DepreciateAU <hello@depreciateau.com.au>',
        to,
        subject,
        html,
      }),
    })
    return res.json()
  } catch (err) {
    console.error('Email send failed:', err)
  }
}

export function estimateEmailHtml(estimate, property) {
  return `
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #1B2A4A;">Your Depreciation Estimate</h1>
      <p style="color: #1E293B;">Here's your preliminary estimate for <strong>${property.property_address}</strong></p>
      <div style="background: #F8F9FA; border-radius: 8px; padding: 24px; margin: 24px 0;">
        <h2 style="color: #1B2A4A; margin-top: 0;">Estimated First-Year Depreciation</h2>
        <p style="font-size: 32px; color: #16A34A; font-weight: 700; margin: 8px 0;">$${estimate.total_firstYear.toLocaleString()}</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          <tr><td style="padding: 8px 0; color: #64748b;">Division 43 (Capital Works)</td><td style="text-align: right; font-weight: 600;">$${estimate.division43_annual.toLocaleString()}/yr</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">Division 40 (Plant & Equipment)</td><td style="text-align: right; font-weight: 600;">$${estimate.division40_firstYear.toLocaleString()}/yr</td></tr>
          <tr style="border-top: 1px solid #e2e8f0;"><td style="padding: 8px 0; color: #64748b;">Total over 5 years</td><td style="text-align: right; font-weight: 600;">$${estimate.total_5year.toLocaleString()}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">Total over 10 years</td><td style="text-align: right; font-weight: 600;">$${estimate.total_10year.toLocaleString()}</td></tr>
        </table>
      </div>
      <p style="color: #64748b; font-size: 14px;">This is an indicative AI-generated estimate. Your actual deductions may vary. A full ATO-compliant schedule requires assessment by a registered Quantity Surveyor.</p>
      <a href="https://depreciateau.com.au/estimate" style="display: inline-block; background: #16A34A; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">Get Matched with a QS — Free</a>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
      <p style="color: #94a3b8; font-size: 12px;">DepreciateAU is a marketplace that connects property investors with registered Quantity Surveyors. We do not prepare depreciation schedules.</p>
    </div>
  `
}

export function briefConfirmationEmailHtml(briefId) {
  return `
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #1B2A4A;">Your Brief Has Been Submitted!</h1>
      <p>Reference: <strong>${briefId}</strong></p>
      <h3>What happens next:</h3>
      <ol>
        <li>Up to 3 registered Quantity Surveyors will review your brief</li>
        <li>Matched QS firms will contact you directly with their quote</li>
        <li>You choose the QS that's right for you — no obligation</li>
      </ol>
      <p>Average turnaround: 5-10 business days once you engage a QS.</p>
      <p style="color: #64748b; margin-top: 24px;">Questions? Contact us at hello@depreciateau.com.au</p>
    </div>
  `
}
