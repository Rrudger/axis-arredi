import { NextResponse } from 'next/server';

import { MailConfigError, sendContactMessage } from '@/lib/mail';

/* POST /api/contact — приём формы обратной связи с 4-го экрана.

   Тело: { name, email, message, company? }. Поле company — honeypot: оно
   спрятано от людей, так что заполнить его может только бот; такие заявки
   молча отбрасываем (отвечаем ok, чтобы бот не подбирал обход).

   Коды ответа: 200 ok · 400 validation · 429 rate-limit · 503 config
   (почта не настроена) · 502 send (транспорт не принял письмо). Форма
   различает их и показывает свой текст. */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LIMITS = { name: 100, email: 200, message: 5000 };
// Достаточно строгая проверка, чтобы отсечь мусор; финальную валидность
// адреса всё равно покажет только ответное письмо.
const EMAIL_RE = /^[^\s@]+@[^\s@,]+\.[a-z]{2,}$/i;

// Троттлинг по IP: не больше RATE_MAX заявок за RATE_WINDOW. Память процесса —
// на serverless счётчик живёт лишь пока жив инстанс и не общий между ними.
// Это заслон от случайного дабл-клика и простого флуда, а не полноценная защита;
// под неё нужен внешний стор (KV/Redis).
const RATE_WINDOW = 10 * 60_000;
const RATE_MAX = 5;
const hits = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW);
  // Подчистка: иначе Map растёт на каждый новый IP до перезапуска инстанса.
  for (const [key, times] of hits) {
    if (times.every((t) => now - t >= RATE_WINDOW)) hits.delete(key);
  }
  if (recent.length >= RATE_MAX) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'validation' }, { status: 400 });
  }

  const data = (body ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

  const name = str(data.name);
  const email = str(data.email);
  const message = str(data.message);

  if (str(data.company)) {
    // Бот. Молча «принимаем» и никуда не отправляем.
    return NextResponse.json({ ok: true });
  }

  if (
    !name || name.length > LIMITS.name ||
    !email || email.length > LIMITS.email || !EMAIL_RE.test(email) ||
    !message || message.length > LIMITS.message
  ) {
    return NextResponse.json({ ok: false, error: 'validation' }, { status: 400 });
  }

  // За прокси/CDN реальный адрес приходит в x-forwarded-for (первый в списке).
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
  if (rateLimited(ip)) {
    return NextResponse.json({ ok: false, error: 'rate' }, { status: 429 });
  }

  try {
    await sendContactMessage({ name, email, message });
  } catch (err) {
    if (err instanceof MailConfigError) {
      console.error('[contact] почта не настроена:', err.message);
      return NextResponse.json({ ok: false, error: 'config' }, { status: 503 });
    }
    console.error('[contact] не удалось отправить письмо:', err);
    return NextResponse.json({ ok: false, error: 'send' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
