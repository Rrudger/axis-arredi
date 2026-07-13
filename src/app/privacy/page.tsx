import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export const metadata: Metadata = {
  title: 'Privacy & Cookie Policy — Axis arredi',
};

/* Informativa privacy/cookie (обязательная по GDPR/Garante «informativa» —
   даже при одних технических куках). Открывается по ссылке из футера
   4-го экрана. Порядок секций фиксирован здесь, тексты — в messages/*. */
const SECTIONS = ['owner', 'cookies', 'map', 'hosting', 'rights'] as const;

export default async function PrivacyPage() {
  const t = await getTranslations('privacy');

  return (
    <main style={{ minHeight: '100vh', background: 'var(--color-primary-bg)' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '40px 9% 72px' }}>

        <Link href="/" className="t-label" style={{
          color: 'var(--color-text-muted)',
          textDecoration: 'none',
        }}>
          ← {t('back')}
        </Link>

        <h1 className="t-display" style={{
          color: 'var(--color-text-secondary)',
          marginTop: '36px',
        }}>
          {t('title')}
        </h1>

        <p className="t-caption" style={{
          color: 'var(--color-text-muted)',
          marginTop: '10px',
        }}>
          {t('updated')}
        </p>

        <div style={{ width: '22px', height: '1px', background: 'var(--color-border)', marginTop: '20px' }} />

        {SECTIONS.map((section) => (
          <section key={section} style={{ marginTop: '36px' }}>
            <h2 className="t-title uppercase" style={{
              letterSpacing: '0.16em',
              color: 'var(--color-text-secondary)',
            }}>
              {t(`${section}.heading`)}
            </h2>
            <p className="t-body-sm" style={{ marginTop: '10px' }}>
              {t(`${section}.body`)}
            </p>
          </section>
        ))}

      </div>
    </main>
  );
}
