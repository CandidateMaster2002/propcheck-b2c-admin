/**
 * Outbound webhook helper to sync inspection events from B2C Admin Portal to PropCheck Backend
 */

export async function notifyPropCheckWebhook(property: any): Promise<boolean> {
  if (!property) return false;

  const webhookUrl =
    process.env.PROPCHECK_WEBHOOK_URL ||
    'https://propcheck-be.onrender.com/api/bookings/webhooks/completed';

  const payload = {
    leadId: property.leadId || null,
    bookingId: property.bookingId || null,
    ownerPhone: property.ownerPhone || null,
    ownerEmail: property.ownerEmail || null,
    reportUrl: property.reportUrl || null,
    insScore: property.overallhealthrating || property.insScore || null,
    status: 'INSPECTION_DONE',
    propertyName: property.propertyName || property.projectName || null,
    inspectionNumber: property.inspectionNumber || property.shortId || null,
  };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[PropCheck Webhook] Status ${res.status}:`, errText);
      return false;
    }

    const data = await res.json();
    console.log('[PropCheck Webhook] Successfully notified PropCheck portal:', data);
    return true;
  } catch (error: any) {
    console.warn('[PropCheck Webhook] Failed to connect to PropCheck backend:', error?.message);
    return false;
  }
}
