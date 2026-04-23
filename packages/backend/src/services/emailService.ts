/**
 * Email service — pluggable provider.
 *
 * In production, set EMAIL_PROVIDER=resend and RESEND_API_KEY.
 * In development (no key), emails are logged to console.
 *
 * To switch to SendGrid: set EMAIL_PROVIDER=sendgrid and SENDGRID_API_KEY.
 */

type EmailTemplate =
  | 'welcome'
  | 'trial_ending_4d'
  | 'trial_ending_1d'
  | 'trial_ended'
  | 'payment_success'
  | 'payment_failed_retry'
  | 'payment_failed_final'
  | 'subscription_cancelled'
  | 'account_reactivated';

interface EmailParams {
  to: string;
  template: EmailTemplate;
  vars: Record<string, string | number>;
}

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? '';
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY ?? '';
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER ?? 'console';
const FROM_EMAIL = process.env.FROM_EMAIL ?? 'hola@restostack.com';

const TEMPLATES: Record<EmailTemplate, { subject: string; body: (vars: Record<string, string | number>) => string }> = {
  welcome: {
    subject: '¡Bienvenido a RestoStack! Empezá tu prueba gratuita',
    body: v => `Hola, gracias por registrar "${v.business_name}" en RestoStack. Tu prueba gratuita de 14 días está activa hasta el ${v.trial_ends}. ¡Que lo disfrutes!`,
  },
  trial_ending_4d: {
    subject: 'Tu prueba gratuita termina en 4 días',
    body: v => `Hola, tu prueba de RestoStack para "${v.business_name}" termina el ${v.trial_ends}. Agregá un método de pago para seguir operando sin interrupciones.`,
  },
  trial_ending_1d: {
    subject: 'Último día de prueba gratuita',
    body: v => `Hola, tu prueba de RestoStack termina mañana. Elegí tu plan en ${v.billing_url} para seguir operando.`,
  },
  trial_ended: {
    subject: 'Tu prueba gratuita terminó',
    body: v => `Tu período de prueba en RestoStack terminó. Tu cuenta está en modo solo lectura. Elegí un plan en ${v.billing_url} para volver a operar completamente.`,
  },
  payment_success: {
    subject: 'Pago recibido — RestoStack',
    body: v => `Tu pago de USD ${v.amount} fue procesado exitosamente. ¡Gracias! Tu próximo cobro será el ${v.next_billing}.`,
  },
  payment_failed_retry: {
    subject: 'Problema con tu pago — reintentaremos',
    body: v => `Hubo un problema al procesar tu pago de USD ${v.amount}. Vamos a reintentar automáticamente. Si el problema persiste, actualizá tu método de pago en ${v.billing_url}.`,
  },
  payment_failed_final: {
    subject: 'Tu suscripción fue cancelada por falta de pago',
    body: v => `Después de múltiples intentos fallidos, tu suscripción de RestoStack fue cancelada. Podés reactivarla en ${v.billing_url}. Tus datos están seguros por 90 días.`,
  },
  subscription_cancelled: {
    subject: 'Tu suscripción fue cancelada',
    body: v => `Tu suscripción de RestoStack para "${v.business_name}" fue cancelada. Tus datos estarán disponibles por 90 días. Podés reactivarla en cualquier momento.`,
  },
  account_reactivated: {
    subject: 'Tu cuenta de RestoStack fue reactivada',
    body: v => `¡Buenas noticias! Tu cuenta de RestoStack para "${v.business_name}" fue reactivada. ¡Seguí operando!`,
  },
};

export async function sendEmail(params: EmailParams): Promise<void> {
  const template = TEMPLATES[params.template];
  if (!template) {
    console.warn(`[email] Unknown template: ${params.template}`);
    return;
  }

  const subject = template.subject;
  const body = template.body(params.vars);

  if (EMAIL_PROVIDER === 'resend' && RESEND_API_KEY) {
    await sendViaResend({ to: params.to, subject, body });
  } else if (EMAIL_PROVIDER === 'sendgrid' && SENDGRID_API_KEY) {
    await sendViaSendGrid({ to: params.to, subject, body });
  } else {
    // Console logging for development
    console.log(`[email:dev] TO: ${params.to}`);
    console.log(`[email:dev] SUBJECT: ${subject}`);
    console.log(`[email:dev] BODY: ${body}`);
  }
}

async function sendViaResend(params: { to: string; subject: string; body: string }): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: params.to,
      subject: params.subject,
      text: params.body,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('[email:resend] Failed to send:', err);
  }
}

async function sendViaSendGrid(params: { to: string; subject: string; body: string }): Promise<void> {
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: params.to }] }],
      from: { email: FROM_EMAIL },
      subject: params.subject,
      content: [{ type: 'text/plain', value: params.body }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('[email:sendgrid] Failed to send:', err);
  }
}
