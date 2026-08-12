/* Отправка письма с формы обратной связи.

   Транспорт выбирается автоматически по переменным окружения:
     1. задан RESEND_API_KEY  → Resend (HTTP API, без TCP-соединений — надёжнее
        на serverless, где исходящий SMTP часто режут);
     2. иначе SMTP_HOST/USER/PASS → nodemailer, письмо уходит через сам ящик.
   Ни того, ни другого — бросаем MailConfigError, роут отвечает 503 и в форме
   показывается «напишите нам напрямую».

   Все адреса и креды — только в .env (см. .env.example), в коде их нет. */

export class MailConfigError extends Error {}

export type ContactMessage = {
  name: string;
  email: string;
  message: string;
};

const TO   = process.env.CONTACT_TO   || 'info@axisarredi.it';
// Отправитель должен быть на своём домене, иначе письмо уедет в спам: у Resend
// — верифицированный домен, у SMTP — обычно сам логин ящика.
const FROM = process.env.CONTACT_FROM || process.env.SMTP_USER || TO;

/** Экранирование пользовательского текста для HTML-части письма. */
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function render({ name, email, message }: ContactMessage) {
  // Заголовок письма: имя отправителя видно прямо в списке входящих.
  const subject = `Axis Arredi — richiesta dal sito: ${name}`;

  const text = [
    'Nuovo messaggio dal form del sito axisarredi.it',
    '',
    `Nome:      ${name}`,
    `Email:     ${email}`,
    '',
    'Messaggio:',
    message,
  ].join('\n');

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a">
  <p style="margin:0 0 18px;color:#666">Nuovo messaggio dal form del sito <b>axisarredi.it</b></p>
  <table cellpadding="0" cellspacing="0" style="margin:0 0 18px">
    <tr><td style="padding:2px 16px 2px 0;color:#888">Nome</td><td><b>${esc(name)}</b></td></tr>
    <tr><td style="padding:2px 16px 2px 0;color:#888">Email</td><td><a href="mailto:${esc(email)}">${esc(email)}</a></td></tr>
  </table>
  <div style="white-space:pre-wrap;border-left:3px solid #C8861A;padding:2px 0 2px 14px">${esc(message)}</div>
</div>`;

  return { subject, text, html };
}

async function sendViaResend(msg: ContactMessage, apiKey: string) {
  const { subject, text, html } = render(msg);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM,
      to: [TO],
      // Ответ из почтового клиента уходит сразу посетителю, а не на свой же ящик.
      reply_to: msg.email,
      subject,
      text,
      html,
    }),
  });

  if (!res.ok) {
    throw new Error(`Resend ${res.status}: ${await res.text().catch(() => '')}`);
  }
}

async function sendViaSmtp(msg: ContactMessage) {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    throw new MailConfigError('Нет ни RESEND_API_KEY, ни SMTP_HOST/SMTP_USER/SMTP_PASS');
  }

  // Порт 465 — implicit TLS, 587/25 — STARTTLS. Явный SMTP_SECURE перебивает.
  const port = Number(process.env.SMTP_PORT) || 465;
  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE === 'true'
    : port === 465;

  // Импорт внутри функции: при работе через Resend nodemailer не грузится.
  const { createTransport } = await import('nodemailer');
  const transport = createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    // Serverless: висеть на медленном SMTP дольше — значит упереться в лимит
    // времени функции без внятной ошибки.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });

  const { subject, text, html } = render(msg);
  await transport.sendMail({ from: FROM, to: TO, replyTo: msg.email, subject, text, html });
}

export async function sendContactMessage(msg: ContactMessage) {
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) return sendViaResend(msg, resendKey);
  return sendViaSmtp(msg);
}
