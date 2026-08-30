'use client';

import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import CtaButton from '@/components/ui/cta-button';
import Flourish from '@/components/ui/flourish';


const Contacts = forwardRef<HTMLDivElement>((_, ref) => {
  const t = useTranslations('contacts');

  const [name,    setName]    = useState('');
  const [email,   setEmail]   = useState('');
  const [message, setMessage] = useState('');
  const [windowW, setWindowW] = useState(0);
  const [windowH, setWindowH] = useState(0);
  const [isOpen,    setIsOpen]    = useState(false);
  const [isPeeking, setIsPeeking] = useState(false);
  const [mounted,   setMounted]   = useState(false);
  const [waOpen,    setWaOpen]    = useState(false);
  const [copied,    setCopied]    = useState(false);
  const waRef = useRef<HTMLDivElement>(null);
  const privacyLinkRef = useRef<HTMLAnchorElement>(null);
  const [privacyOffsetY, setPrivacyOffsetY] = useState(0);

  useLayoutEffect(() => {
    const update = () => { setWindowW(window.innerWidth); setWindowH(window.innerHeight); };
    update();
    window.addEventListener('resize', update);
    requestAnimationFrame(() => setMounted(true));
    return () => window.removeEventListener('resize', update);
  }, []);

  const isMobile       = windowW > 0 && windowW < 1023;
  const isSmallDesktop = !isMobile && windowW > 0 && windowW < 1537;
  const isSmall        = false;
  // Компактные экраны (≤360) — бюджетные смартфоны, см. блок «КОМПАКТНЫЙ
  // ЭКРАН» в globals.css.
  const isCompact = windowW > 0 && windowW <= 360;
  // Иконки соцсетей в закрытом мобильном состоянии: на компактных −10%.
  const socialIconSize = isCompact ? 20 : 22;
  const diagAngle = windowW > 0 && windowH > 0
    ? Math.atan2(windowH, windowW) * (180 / Math.PI)
    : 65;

  // ── Отправка формы ──────────────────────────────────────────────
  // Уходит на /api/contact, оттуда письмом на info@axisarredi.it.
  // Ключ статуса совпадает с ключом в contacts.status.* (messages/*.json).
  type StatusKey = 'success' | 'validation' | 'rate' | 'config' | 'error';
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<StatusKey | null>(null);
  // Honeypot: поле спрятано от людей, заполнить его может только бот —
  // такие заявки сервер молча отбрасывает.
  const [company, setCompany] = useState('');
  // Результат показывается модальным окном (см. ниже) — оно перекрывает всё
  // и закрывается вручную, поэтому таймера на скрытие нет.
  const showStatus = (key: StatusKey) => setStatus(key);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;

    // Те же правила, что на сервере: пустое поле не гоняем по сети.
    if (!name.trim() || !message.trim() || !/^[^\s@]+@[^\s@,]+\.[a-z]{2,}$/i.test(email.trim())) {
      showStatus('validation');
      return;
    }

    setStatus(null);
    setSending(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message, company }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        showStatus('success');
        setName(''); setEmail(''); setMessage('');
      } else {
        const key = data.error as string;
        showStatus(key === 'validation' || key === 'rate' || key === 'config' ? key : 'error');
      }
    } catch {
      // Сеть недоступна / запрос оборвался.
      showStatus('error');
    } finally {
      setSending(false);
    }
  };

  // Модалка результата: Esc закрывает; колесо и свайп по подложке не прокручивают
  // страницу под окном (скролл сайта нативный, поэтому гасим события сами —
  // с passive:false, иначе preventDefault игнорируется).
  const modalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!status) return;
    const el = modalRef.current;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setStatus(null); };
    const stop = (e: Event) => e.preventDefault();
    document.addEventListener('keydown', onKey);
    el?.addEventListener('wheel', stop, { passive: false });
    el?.addEventListener('touchmove', stop, { passive: false });
    return () => {
      document.removeEventListener('keydown', onKey);
      el?.removeEventListener('wheel', stop);
      el?.removeEventListener('touchmove', stop);
    };
  }, [status]);

  // Телефон для WhatsApp: тот же номер, что в футере, без пробелов и «+».
  const phone   = t('footer.phone');
  const waLink  = `https://wa.me/${phone.replace(/\D/g, '')}`;

  // Мобайл — открываем приложение WhatsApp; десктоп — показываем плашку с
  // номером, откуда его можно скопировать.
  const handleWhatsApp = () => {
    if (isMobile) {
      window.open(waLink, '_blank', 'noopener,noreferrer');
    } else {
      setWaOpen(v => !v);
    }
  };

  const copyPhone = () => {
    navigator.clipboard?.writeText(phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  // Клик вне плашки — закрываем её.
  useEffect(() => {
    if (!waOpen) return;
    const onDown = (e: MouseEvent) => {
      if (waRef.current && !waRef.current.contains(e.target as Node)) setWaOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [waOpen]);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const [logoClipPath, setLogoClipPath] = useState<string | undefined>(undefined);
  const titleRef = useRef<HTMLSpanElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const addressRef = useRef<HTMLDivElement>(null);
  const [titleY, setTitleY] = useState<number | null>(null);
  const [addressTranslateY, setAddressTranslateY] = useState<number | null>(null);
  // Ширина заголовка — виньетка под ним рисуется в половину этой ширины.
  const [titleW, setTitleW] = useState(0);

  useEffect(() => {
    const measure = () => {
      const el = titleRef.current;
      if (!el) return;
      // Меряем именно текст, а не растянутый по контейнеру flex-бокс заголовка.
      const range = document.createRange();
      range.selectNodeContents(el);
      // getBoundingClientRect даёт layout-ширину (по advance глифов): в неё
      // входит интервал letter-spacing после последней буквы и боковые засечки.
      // Вычитаем их, чтобы виньетка совпала с видимым текстом, а не с боксом.
      const cs = getComputedStyle(el);
      const trailing = parseFloat(cs.letterSpacing) || 0;
      const fontSize = parseFloat(cs.fontSize) || 0;
      const inset = trailing + fontSize * 0.12; // ≈ боковые засечки Cinzel
      setTitleW(Math.max(0, range.getBoundingClientRect().width - inset));
    };
    requestAnimationFrame(measure);
    document.fonts?.ready.then(measure);
    // Размер заголовка анимируется (~0.85s при разворачивании формы) —
    // перемеряем после перехода, чтобы виньетка совпала с итоговой шириной.
    const afterTransition = setTimeout(measure, 900);
    return () => clearTimeout(afterTransition);
  }, [windowW, windowH, mounted, isOpen]);

  useEffect(() => {
    const update = () => {
      const el = logoRef.current;
      if (!el) { setLogoClipPath(undefined); return; }
      const r = el.getBoundingClientRect();
      const W = window.innerWidth;
      const H = window.innerHeight;
      // Clip line: diagonal slope -H/W, passing through (r.right, 0.58*H - 20)
      const clipYScreen = 0.58 * H - 20;
      const yR = clipYScreen - r.top;       // local y at right edge
      const lH = r.height;
      const lW = r.width;
      if (yR >= lH) { setLogoClipPath(undefined); return; }
      const f = (v: number, d: number) => `${((v / d) * 100).toFixed(1)}%`;
      // Where diagonal exits bottom edge (local y = lH)
      const xBot = lW - (r.top + lH - clipYScreen) * (W / H);
      let pts = `0 0, 100% 0, 100% ${f(Math.max(0, yR), lH)}`;
      if (xBot > 0 && xBot < lW) pts += `, ${f(xBot, lW)} 100%`;
      pts += `, 0 100%`;
      setLogoClipPath(`polygon(${pts})`);
    };
    // Позиция логотипа плавно едет во время анимаций формы (padding-top ~0.85s
    // при сворачивании/разворачивании). Разовый пересчёт поймал бы промежуточную
    // позицию и срезал логотип. Поэтому крутим короткий rAF-цикл (~950мс —
    // длительность перехода), пересчитывая клип каждый кадр, пока layout едет.
    let loopId = 0;
    const start = performance.now();
    const loop = (now: number) => {
      update();
      if (now - start < 950) loopId = requestAnimationFrame(loop);
    };
    loopId = requestAnimationFrame(loop);
    // Клип считается по позиции логотипа относительно вьюпорта. Сайт —
    // постраничный скролл: если он загружен на 1-м экране, логотип 4-го
    // экрана далеко внизу за вьюпортом (r.top огромный) → клип считается по
    // «нижней» позиции и срезает логотип. При долистывании до 4-го экрана
    // позиция меняется, поэтому пересчитываем на скролле (пока секция видна)
    // и когда логотип попадает во вьюпорт. rAF-троттлинг, чтобы не молотить.
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { update(); ticking = false; });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    document.fonts?.ready.then(update);
    // Логотип может сдвинуться и от собственного ресайза (height в vh).
    const ro = new ResizeObserver(update);
    // Пересчёт в момент появления/исчезновения логотипа во вьюпорте.
    const io = new IntersectionObserver(update, { threshold: [0, 0.5, 1] });
    if (logoRef.current) { ro.observe(logoRef.current); io.observe(logoRef.current); }
    return () => {
      cancelAnimationFrame(loopId);
      window.removeEventListener('scroll', onScroll);
      ro.disconnect();
      io.disconnect();
    };
  }, [windowW, windowH, isMobile, isOpen]);

  // Ссылка privacy (мобайл, закрытое состояние) прижимается к низу экрана:
  // её низ держится на 20px выше фиксированного нижнего меню
  // (#mobileMenu — отдельный компонент вне этого дерева, поэтому меряем его
  // через DOM). Сдвиг — position:relative + top: он не влияет на поток, так
  // что раскладка блока выше (кнопка, лого, слоган, иконки) не едет; менять
  // маргины нельзя — они делят свободное место через marginTop:auto.
  //
  // Считаем от низа самой секции, а не от низа вьюпорта. Меню фиксировано, его
  // rect от прокрутки не зависит, а вот rect ссылки — зависит: пока 4‑й экран
  // не прокручен, её низ уходит на пару высот экрана вниз. Замер по вьюпорту
  // давал бы тогда сдвиг в минус пол-документа, и ссылка улетала бы за пределы
  // секции (у неё overflow:hidden) — то есть пропадала совсем.
  useEffect(() => {
    if (!isMobile || isOpen) return;
    const measure = () => {
      const link = privacyLinkRef.current;
      const section = sectionRef.current;
      const menu = document.getElementById('mobileMenu');
      if (!link || !section || !menu) return;
      const menuRect = menu.getBoundingClientRect();
      // На 1‑м экране меню на мобиле скрыто (display:none) — rect нулевой.
      // Мерить по нему нельзя; ResizeObserver ниже разбудит замер, как только
      // меню появится.
      if (menuRect.height === 0) return;
      // Ссылка появляется с анимацией по translateY — она входит в rect,
      // поэтому вычитаем её, иначе замер в середине анимации промахнётся.
      const shift = new DOMMatrixReadOnly(getComputedStyle(link).transform).f;
      const linkBottom = link.getBoundingClientRect().bottom - shift;
      // Сколько меню съедает от низа экрана (высота + его собственный отступ).
      const menuFromBottom = window.innerHeight - menuRect.top;
      const target = section.getBoundingClientRect().bottom - menuFromBottom - 20;
      // top уже учтён в rect, поэтому корректируем накопительно.
      setPrivacyOffsetY((prev) => {
        const next = prev + (target - linkBottom);
        return Math.abs(next - prev) < 0.5 ? prev : next;
      });
    };
    requestAnimationFrame(measure);
    document.fonts?.ready.then(measure);
    // Финальный замер после появления ссылки (анимация: задержка 0.6s + 0.5s).
    const afterAnimation = setTimeout(measure, 1200);
    const menu = document.getElementById('mobileMenu');
    const ro = new ResizeObserver(measure);
    if (menu) ro.observe(menu);
    if (privacyLinkRef.current) ro.observe(privacyLinkRef.current);
    window.addEventListener('resize', measure);
    return () => {
      clearTimeout(afterAnimation);
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [isMobile, isOpen, windowW, windowH, mounted]);

  useEffect(() => {
    if (isMobile || isSmall) return;
    const measure = () => {
      const title = titleRef.current;
      const address = addressRef.current;
      const section = sectionRef.current;
      if (!title || !address || !section) return;
      const sR = section.getBoundingClientRect();
      const tR = title.getBoundingClientRect();
      const aR = address.getBoundingClientRect();
      const ty = tR.top - sR.top;
      setTitleY(ty);
    };
    requestAnimationFrame(measure);
  }, [windowW, windowH, isMobile, isSmall, mounted]);

  const handleMapClose = () => { setIsOpen(false); };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    if (Math.sqrt(dx * dx + dy * dy) > 20) handleMapClose();
    touchStartRef.current = null;
  };

  const handleMapPeek = () => {
    if (isOpen || isPeeking) return;
    setIsPeeking(true);
    setTimeout(() => setIsPeeking(false), 950);
  };

  const mapClipPath = isMobile
    ? isOpen      ? 'polygon(100% 72%, 100% 100%, 72% 100%)'
      : isPeeking ? 'polygon(100% 3%,  100% 100%, 3%  100%)'
      :             'polygon(100% 28%, 100% 100%, 28% 100%)'
    : 'polygon(100% 28%, 100% 100%, 28% 100%)';

  const contactsClipPath = isMobile
    ? isOpen      ? 'polygon(0 0, 100% 0, 100% 100%, 0 100%)'
      : isPeeking ? 'polygon(0 0, 100% 0, 100% 3%,  3%  100%, 0 100%)'
      :             'polygon(0 0, 100% 0, 100% 28%, 28% 100%, 0 100%)'
    : 'polygon(0 0, 100% 0, 100% 28%, 28% 100%, 0 100%)';

  const peekEasing   = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
  const smoothEasing = 'cubic-bezier(0.77, 0, 0.18, 1)';

  const mapTransition = mounted && isMobile
    ? isPeeking
      ? `clip-path 0.5s ${peekEasing}`
      : `clip-path 0.65s ${smoothEasing}`
    : undefined;

  const contactsTransition = mounted && isMobile
    ? isPeeking
      ? `clip-path 0.5s ${peekEasing}`
      : `clip-path 0.85s ${smoothEasing}`
    : undefined;

  return (
    <div id="contactsSection" ref={(el) => { sectionRef.current = el; if (typeof ref === 'function') ref(el); else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = el; }} className="relative w-screen h-screen overflow-hidden" style={{ background: 'var(--color-primary-bg)' }}>

      {/* ── Верхний треугольник — светлый ── */}
      <div id="contacts" className="absolute inset-0 bg-primary-bg" style={{
        clipPath: contactsClipPath,
        zIndex: isMobile ? 30 : undefined,
        transition: contactsTransition,
      }}>



        {/* ── Колонки 1/2/3: flex-обёртка для равных гапов (десктоп) ── */}
        {!isMobile && (
          <div style={{
            position: 'absolute',
            top: '104px',
            left: '9.32%',
            right: '9.32%',
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            pointerEvents: 'none',
          }}>
            {/* Спейсер — повторяет ширину формы */}
            <div style={{ width: isSmallDesktop ? 'min(46%, 518px)' : 'min(51%, 575px)', flexShrink: 0 }} />

            {/* Колонка 2: Логотип + слоган */}
            <div style={{
              display: isSmallDesktop ? 'none' : 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginTop: '24px',
            }}>
              <img
                src="/logoC.png"
                alt="Axis Arredamenti"
                style={{
                  width: 'auto',
                  height: '22vh',
                  display: 'block',
                  maskImage: 'linear-gradient(to right, transparent, black 25%, black 75%, transparent), linear-gradient(to bottom, black 55%, transparent)',
                  WebkitMaskImage: 'linear-gradient(to right, transparent, black 25%, black 75%, transparent), linear-gradient(to bottom, black 55%, transparent)',
                  maskComposite: 'intersect',
                  WebkitMaskComposite: 'source-in',
                }}
              />
              <span id="motto" className="t-script" style={{
                color: 'var(--color-primary)',
                width: '7em',
                lineHeight: 1.1,
                textAlign: 'center',
                marginTop: '4vh',
              }}>
                {t('motto')}
              </span>
            </div>

            {/* Колонка 3: Адрес */}
            <div ref={addressRef} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '20px',
              paddingTop: '8px',
              pointerEvents: 'auto',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span className="t-title uppercase" style={{
                  letterSpacing: '0.16em',
                  color: 'var(--color-text-secondary)',
                  whiteSpace: 'nowrap',
                }}>
                  {t('footer.company')}
                </span>
                <div style={{ width: '22px', height: '1px', background: 'var(--color-border)' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                <span className="t-subtitle" style={{
                  letterSpacing: '0.09em',
                  color: 'var(--color-text-muted)',
                  whiteSpace: 'nowrap',
                }}>
                  {t('footer.address')}
                </span>
                <span className="t-subtitle" style={{
                  letterSpacing: '0.09em',
                  color: 'var(--color-text-muted)',
                  whiteSpace: 'nowrap',
                }}>
                  {t('footer.piva')}
                </span>
                <span className="t-subtitle" style={{
                  letterSpacing: '0.09em',
                  color: 'var(--color-text-muted)',
                  whiteSpace: 'nowrap',
                }}>
                  {t('footer.phone')}
                </span>
                <span className="t-subtitle" style={{
                  letterSpacing: '0.09em',
                  color: 'var(--color-text-muted)',
                  whiteSpace: 'nowrap',
                }}>
                  info@axisarredi.it
                </span>
                <Link href="/privacy" className="t-label normal-case" style={{
                  letterSpacing: '0.09em',
                  color: 'var(--color-text-muted)',
                  textDecoration: 'underline',
                  textUnderlineOffset: '3px',
                  whiteSpace: 'nowrap',
                  width: 'fit-content',
                }}>
                  {t('footer.privacy')}
                </Link>
              </div>

              <div style={{ display: 'flex', gap: '18px' }}>
                <div ref={waRef} style={{ position: 'relative', display: 'inline-flex' }}>
                  <svg onClick={handleWhatsApp} width={25} height={25} viewBox="0 0 24 24" fill="none" style={{ cursor: 'pointer', opacity: waOpen ? 1 : 0.75 }}>
                    <path d="M20.52 3.48A11.93 11.93 0 0 0 12 0C5.37 0 0 5.37 0 12c0 2.11.55 4.17 1.6 5.98L0 24l6.18-1.57A11.95 11.95 0 0 0 12 24c6.63 0 12-5.37 12-12 0-3.2-1.25-6.22-3.48-8.52zM12 22c-1.85 0-3.66-.5-5.24-1.44l-.38-.22-3.67.93.97-3.56-.25-.38A9.94 9.94 0 0 1 2 12C2 6.48 6.48 2 12 2c2.67 0 5.18 1.04 7.07 2.93A9.93 9.93 0 0 1 22 12c0 5.52-4.48 10-10 10zm5.47-7.4c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.89-.79-1.49-1.76-1.66-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.48-.5-.67-.51H7.6c-.2 0-.52.07-.79.37C6.54 8.6 5.8 9.3 5.8 10.73c0 1.43 1.04 2.81 1.19 3.01.15.2 2.05 3.13 4.97 4.39.7.3 1.24.48 1.66.61.7.22 1.33.19 1.83.12.56-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35z" fill="var(--color-text-secondary)" />
                  </svg>

                  {/* Плашка с номером (десктоп) — клик копирует в буфер обмена */}
                  {waOpen && (
                    <div
                      onClick={copyPhone}
                      style={{
                        position: 'absolute',
                        bottom: 'calc(100% + 12px)',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 14px',
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        background: 'var(--color-primary-bg)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        boxShadow: '0 8px 24px var(--color-shadow)',
                        zIndex: 50,
                        animation: 'wa-pop-in 0.2s ease',
                      }}
                    >
                      <span className="t-subtitle" style={{ letterSpacing: '0.06em', color: 'var(--color-text-primary)' }}>
                        {phone}
                      </span>
                      {copied ? (
                        <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                          <path d="M20 6L9 17l-5-5" stroke="var(--color-success)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" style={{ opacity: 0.7 }}>
                          <rect x="9" y="9" width="11" height="11" rx="2" stroke="var(--color-text-secondary)" strokeWidth="1.8" />
                          <path d="M5 15V5a2 2 0 0 1 2-2h10" stroke="var(--color-text-secondary)" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                      )}
                      {/* Хвостик плашки */}
                      <span style={{
                        position: 'absolute',
                        top: '100%',
                        left: '50%',
                        transform: 'translateX(-50%) rotate(45deg)',
                        marginTop: '-5px',
                        width: '9px',
                        height: '9px',
                        background: 'var(--color-primary-bg)',
                        borderRight: '1px solid var(--color-border)',
                        borderBottom: '1px solid var(--color-border)',
                      }} />
                    </div>
                  )}
                </div>
                <a href="https://www.facebook.com/profile.php?id=61589294769580" target="_blank" rel="noopener noreferrer" style={{ display: 'flex' }}>
                  <svg width={25} height={25} viewBox="0 0 24 24" fill="none" style={{ cursor: 'pointer', opacity: 0.75 }}>
                    <path d="M24 12c0-6.627-5.373-12-12-12S0 5.373 0 12c0 5.99 4.388 10.954 10.125 11.854V15.47H7.078V12h3.047V9.356c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874V12h3.328l-.532 3.469h-2.796v8.385C19.612 22.954 24 17.99 24 12z" fill="var(--color-text-secondary)" />
                  </svg>
                </a>
                <a href="https://www.instagram.com/axisarredi/" target="_blank" rel="noopener noreferrer" style={{ display: 'flex' }}>
                  <svg width={25} height={25} viewBox="0 0 24 24" fill="none" style={{ cursor: 'pointer', opacity: 0.75 }}>
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" fill="var(--color-text-secondary)" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Вертикальный контейнер на всю высоту: форма + адрес */}
        <div style={{
          position: 'absolute',
          top: !isMobile ? '104px' : 0,
          left: isMobile ? '9%' : isSmall ? '7%' : '9.32%',
          ...(isMobile ? { right: '9%', bottom: 0 } : { width: isSmallDesktop ? 'min(46%, 518px)' : 'min(51%, 575px)' }),
          display: 'flex',
          flexDirection: 'column',
          ...(isMobile
            ? { paddingTop: isOpen ? '12%' : 'min(17%, 78px)', paddingBottom: 'min(22%, 101px)' }
            : {}),
          gap: !isMobile ? '8%' : isOpen ? '4%' : undefined,
          transition: mounted && isMobile ? 'padding-top 0.85s cubic-bezier(0.77,0,0.18,1)' : undefined,
        }}>

          {/* Форма — занимает всё доступное вертикальное пространство */}
          <form
            onSubmit={handleSubmit}
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
          >
            {/* Заголовок */}
            <span ref={titleRef} className="contacts-title" style={isMobile ? {
              // Открытая форма на компактных: заголовок крупнее (иначе clamp
              // упирался в минимум 22px и терялся).
              fontSize: isOpen
                ? (isCompact ? 'clamp(24px, 7vw, 30px)' : 'clamp(22px, 6vw, 30px)')
                : 'clamp(27px, 9vw, 42px)',
              letterSpacing: isOpen ? '0.28em' : '0.18em',
              transition: mounted ? `font-size 0.85s ${smoothEasing}, letter-spacing 0.85s ${smoothEasing}` : undefined,
              width: 'fit-content',
              whiteSpace: 'nowrap',
            } : undefined}>
              {t('title')}
            </span>

            {/* Компактные (≤360): отступы вокруг подзаголовка вдвое меньше. */}
            <div style={{ margin: isCompact ? '16px 0 12px' : '16px 0 24px' }}>
              {titleW > 0 && (
                <Flourish w={titleW} curlW={Math.min(56, titleW)} color="var(--color-accent1)" />
              )}
            </div>

            <span className="contacts-subtitle" style={{ marginBottom: isCompact ? '20px' : '40px' }}>
              {t('subtitle')}
            </span>

            {/* Имя + Email */}
            <div style={{
              display: 'flex',
              gap: '32px',
              marginBottom: isMobile && !isOpen ? '0' : '24px',
              maxHeight: isMobile && !isOpen ? '0px' : '120px',
              opacity: isMobile && !isOpen ? 0 : 1,
              overflow: 'hidden',
              transition: mounted && isMobile
                ? (isOpen
                  ? 'max-height 0.7s cubic-bezier(0.77,0,0.18,1) 0.15s, opacity 0.5s ease 0.35s, margin-bottom 0.7s ease 0.15s'
                  : 'max-height 0.4s ease, opacity 0.2s ease, margin-bottom 0.4s ease')
                : undefined,
            }}>
              <div style={{ flex: 1 }}>
                <label className="contacts-label">{t('name')}</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} autoComplete="name" className="contacts-input" />
              </div>
              <div style={{ flex: 1 }}>
                <label className="contacts-label">{t('email')}</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" className="contacts-input" />
              </div>
            </div>

            {/* Сообщение */}
            <div style={{
              display: 'flex',
              ...(isMobile ? { flex: 1 } : {}),
              flexDirection: 'column',
              marginBottom: isMobile && !isOpen ? '0' : '40px',
              maxHeight: isMobile && !isOpen ? '0px' : '600px',
              opacity: isMobile && !isOpen ? 0 : 1,
              overflow: 'hidden',
              transition: mounted && isMobile
                ? (isOpen
                  ? 'max-height 0.85s cubic-bezier(0.77,0,0.18,1) 0.2s, opacity 0.5s ease 0.4s, margin-bottom 0.85s ease 0.2s'
                  : 'max-height 0.4s ease, opacity 0.2s ease, margin-bottom 0.4s ease')
                : undefined,
            }}>
              <label className="contacts-label">{t('message')}</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="contacts-textarea"
                style={isMobile ? { flex: 1 } : { height: '200px', marginTop: '28px', marginBottom: '16px' }}
              />
            </div>

            {/* Honeypot — приманка для ботов. Скрыт от людей и от скринридеров,
                исключён из табуляции и автозаполнения; если пришёл непустым,
                сервер считает заявку спамом. */}
            <input
              type="text"
              name="company"
              value={company}
              onChange={e => setCompany(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{
                position: 'absolute',
                width: '1px',
                height: '1px',
                opacity: 0,
                pointerEvents: 'none',
                left: '-9999px',
              }}
            />

            {/* Кнопка */}
            <div style={{
              display: 'flex',
              justifyContent: !isMobile ? 'flex-start' : undefined,
              marginTop: isMobile && !isOpen ? '24px' : undefined,
              ...(isMobile && !isOpen ? { flex: 1, flexDirection: 'column' } : {}),
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignSelf: isMobile && !isOpen ? 'flex-start' : undefined,
                flex: isMobile && !isOpen ? 1 : undefined,
              }}>
                {isMobile && !isOpen ? (
                  /* Поверх логотипа (zIndex 1): на узких экранах он
                     подтягивается вверх и иначе перекрывал бы кнопку. */
                  <CtaButton type="button" onClick={() => setIsOpen(true)} style={{ position: 'relative', zIndex: 2 }}>
                    {t('write')}
                  </CtaButton>
                ) : (
                  <button
                    type="submit"
                    disabled={sending}
                    className="contacts-btn-send"
                    style={{
                      marginLeft: isMobile && isOpen ? 'auto' : undefined,
                      transition: mounted && isMobile ? 'margin-left 0.85s cubic-bezier(0.77,0,0.18,1)' : undefined,
                      ...(sending ? { opacity: 0.6, cursor: 'progress' } : {}),
                      ...(!isMobile && !isSmall ? { width: `calc((min(${isSmallDesktop ? '46vw, 518px' : '51vw, 575px'}) - 32px) / 2)`, textAlign: 'center', padding: '12px 0' } : {}),
                    }}
                  >
                    {sending ? t('sending') : t('send')}
                  </button>
                )}

                {/* Результат отправки — модальным окном (см. конец файла).
                    В потоке формы его нет намеренно: строка статуса шире
                    кнопки, и та уезжала вправо из-за marginLeft:auto. */}

                {isMobile && !isOpen && (
                  <>
                    {/* Зазор кнопка→лого: увеличен на 24px (≥460 — маргином,
                        уже — ослабленным подъёмом translateY, было -10vh+44px). */}
                    <div style={{
                      marginTop: windowW >= 460 ? '48px' : 'auto',
                      marginLeft: '-12px',
                      transform: windowW >= 460 ? undefined : 'translateY(calc(-10vh + 68px))',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: '10px',
                      animation: mounted ? 'logo-in 0.4s ease 0.5s both' : undefined,
                    }}>
                      <div id="logo" ref={logoRef} style={{
                        height: '18vh',
                        clipPath: logoClipPath,
                        zIndex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}>
                        <img
                          src="/logoC.png"
                          alt="Axis Arredamenti"
                          style={{
                            width: 'auto',
                            height: '100%',
                            display: 'block',
                            maskImage: 'linear-gradient(to right, transparent, black 25%, black 75%, transparent), linear-gradient(to bottom, black 55%, transparent)',
                            WebkitMaskImage: 'linear-gradient(to right, transparent, black 25%, black 75%, transparent), linear-gradient(to bottom, black 55%, transparent)',
                            maskComposite: 'intersect',
                            WebkitMaskComposite: 'source-in',
                          }}
                        />
                      </div>
                    </div>

                    <div style={{
                      width: '100%',
                      // <460: слоган следует за лого, опущенным на 24px выше.
                      marginTop: windowW >= 460 ? '12px' : '-6px',
                      animation: mounted ? 'logo-in 0.4s ease 0.5s both' : undefined,
                    }}>
                      <span className="t-script" style={{
                        color: 'var(--color-primary)',
                        lineHeight: 1.25,
                        opacity: 0.5,
                        display: 'block',
                        textAlign: 'left',
                        maxWidth: '50%',
                      }}>
                        {t('motto')}
                      </span>
                    </div>

                    <div style={{
                      display: 'flex',
                      gap: '20px',
                      marginTop: 'auto',
                      // >360: зазор до privacy делает её marginTop:auto (поровну
                      // с зазором над иконками); ≤360 — фиксированные 24px.
                      marginBottom: windowW > 360 ? undefined : '24px',
                      zIndex: 10,
                      animation: mounted ? 'social-icons-in 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.55s both' : undefined,
                    }}>
                      <svg onClick={handleWhatsApp} width={socialIconSize} height={socialIconSize} viewBox="0 0 24 24" fill="none" style={{ cursor: 'pointer', opacity: 0.5 }}>
                        <path d="M20.52 3.48A11.93 11.93 0 0 0 12 0C5.37 0 0 5.37 0 12c0 2.11.55 4.17 1.6 5.98L0 24l6.18-1.57A11.95 11.95 0 0 0 12 24c6.63 0 12-5.37 12-12 0-3.2-1.25-6.22-3.48-8.52zM12 22c-1.85 0-3.66-.5-5.24-1.44l-.38-.22-3.67.93.97-3.56-.25-.38A9.94 9.94 0 0 1 2 12C2 6.48 6.48 2 12 2c2.67 0 5.18 1.04 7.07 2.93A9.93 9.93 0 0 1 22 12c0 5.52-4.48 10-10 10zm5.47-7.4c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.89-.79-1.49-1.76-1.66-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.48-.5-.67-.51H7.6c-.2 0-.52.07-.79.37C6.54 8.6 5.8 9.3 5.8 10.73c0 1.43 1.04 2.81 1.19 3.01.15.2 2.05 3.13 4.97 4.39.7.3 1.24.48 1.66.61.7.22 1.33.19 1.83.12.56-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35z" fill="var(--color-text-secondary)" />
                      </svg>
                      <a href="https://www.facebook.com/profile.php?id=61589294769580" target="_blank" rel="noopener noreferrer" style={{ display: 'flex' }}>
                        <svg width={socialIconSize} height={socialIconSize} viewBox="0 0 24 24" fill="none" style={{ cursor: 'pointer', opacity: 0.5 }}>
                          <path d="M24 12c0-6.627-5.373-12-12-12S0 5.373 0 12c0 5.99 4.388 10.954 10.125 11.854V15.47H7.078V12h3.047V9.356c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874V12h3.328l-.532 3.469h-2.796v8.385C19.612 22.954 24 17.99 24 12z" fill="var(--color-text-secondary)" />
                        </svg>
                      </a>
                      <a href="https://www.instagram.com/axisarredi/" target="_blank" rel="noopener noreferrer" style={{ display: 'flex' }}>
                        <svg width={socialIconSize} height={socialIconSize} viewBox="0 0 24 24" fill="none" style={{ cursor: 'pointer', opacity: 0.5 }}>
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" fill="var(--color-text-secondary)" />
                        </svg>
                      </a>
                    </div>

                    {/* Отступ снизу подобран так, чтобы низ ссылки не заезжал
                        под нижнее меню. >360: marginTop:auto в паре с auto у
                        иконок делит свободное место поровну — зазор privacy↔
                        иконки равен зазору иконки↔блок выше. */}
                    <Link ref={privacyLinkRef} href="/privacy" className="t-label normal-case" style={{
                      marginTop: windowW > 360 ? 'auto' : undefined,
                      letterSpacing: '0.12em',
                      color: 'var(--color-text-muted)',
                      textDecoration: 'underline',
                      textUnderlineOffset: '2px',
                      width: 'fit-content',
                      marginBottom: 'min(calc(32% - 1px), 146px)',
                      position: 'relative',
                      top: `${privacyOffsetY}px`,
                      zIndex: 10,
                      animation: mounted ? 'social-icons-in 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.6s both' : undefined,
                    }}>
                      {/* Две строки: «Privacy &» / «Cookie Policy» */}
                      {t('footer.privacy').split(/\s(?=Cookie\s)/).map((line, i) => (
                        <span key={i} style={{ display: 'block' }}>{line}</span>
                      ))}
                    </Link>

                  </>
                )}
              </div>
            </div>
          </form>

          {/* Адрес — внизу контейнера (только мобайл) */}
          {isMobile && <div id="address" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
            ...(isMobile ? {
              maxHeight: isOpen ? '300px' : '0px',
              overflow: 'visible',
              transform: isOpen
                ? 'rotate(0deg)'
                : `rotate(-${diagAngle.toFixed(1)}deg)`,
              transformOrigin: 'top left',
              opacity: isOpen ? 1 : 0,
              pointerEvents: isOpen ? undefined : 'none',
              transition: mounted
                ? (isOpen
                  ? 'max-height 0.85s ease 0.25s, transform 0.85s cubic-bezier(0.77,0,0.18,1) 0.3s, opacity 0.45s ease 0.3s'
                  : 'max-height 0.01s ease 0.22s, opacity 0.2s ease, transform 0.2s ease')
                : undefined,
            } : {}),
          }}>

            {/* Соцсети — над названием фирмы */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '16px' }}>
              {/* WhatsApp */}
              <svg onClick={handleWhatsApp} width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ cursor: 'pointer', opacity: 0.45 }}>
                <path d="M20.52 3.48A11.93 11.93 0 0 0 12 0C5.37 0 0 5.37 0 12c0 2.11.55 4.17 1.6 5.98L0 24l6.18-1.57A11.95 11.95 0 0 0 12 24c6.63 0 12-5.37 12-12 0-3.2-1.25-6.22-3.48-8.52zM12 22c-1.85 0-3.66-.5-5.24-1.44l-.38-.22-3.67.93.97-3.56-.25-.38A9.94 9.94 0 0 1 2 12C2 6.48 6.48 2 12 2c2.67 0 5.18 1.04 7.07 2.93A9.93 9.93 0 0 1 22 12c0 5.52-4.48 10-10 10zm5.47-7.4c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.89-.79-1.49-1.76-1.66-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.48-.5-.67-.51H7.6c-.2 0-.52.07-.79.37C6.54 8.6 5.8 9.3 5.8 10.73c0 1.43 1.04 2.81 1.19 3.01.15.2 2.05 3.13 4.97 4.39.7.3 1.24.48 1.66.61.7.22 1.33.19 1.83.12.56-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35z" fill="var(--color-text-secondary)" />
              </svg>

              {/* Facebook */}
              <a href="https://www.facebook.com/profile.php?id=61589294769580" target="_blank" rel="noopener noreferrer" style={{ display: 'flex' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ cursor: 'pointer', opacity: 0.45 }}>
                  <path d="M24 12c0-6.627-5.373-12-12-12S0 5.373 0 12c0 5.99 4.388 10.954 10.125 11.854V15.47H7.078V12h3.047V9.356c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874V12h3.328l-.532 3.469h-2.796v8.385C19.612 22.954 24 17.99 24 12z" fill="var(--color-text-secondary)" />
                </svg>
              </a>

              {/* Instagram */}
              <a href="https://www.instagram.com/axisarredi/" target="_blank" rel="noopener noreferrer" style={{ display: 'flex' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ cursor: 'pointer', opacity: 0.45 }}>
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" fill="var(--color-text-secondary)" />
                </svg>
              </a>
            </div>

            {/* Название фирмы — над адресом. На компактных (≤360) весь блок
                на ступень мельче: t-title→t-subtitle, t-subtitle→t-label
                (с normal-case; трекинг задан инлайном и не меняется). */}
            <span className={isCompact ? 't-subtitle uppercase' : 't-title uppercase'} style={{
              letterSpacing: '0.2em',
              color: 'var(--color-text-secondary)',
            }}>
              {t('footer.company')}
            </span>

            <div style={{ width: '18px', height: '1px', background: 'var(--color-border)', margin: '7px 0 9px' }} />

            <span className={isCompact ? 't-label normal-case' : 't-subtitle'} style={{
              letterSpacing: '0.09em',
              color: 'var(--color-text-muted)',
            }}>
              {t('footer.address').split(/\s(?=via\s)/).map((line, i) => (
                <span key={i} style={{ display: 'block' }}>{line}</span>
              ))}
            </span>
            <span className={isCompact ? 't-label normal-case' : 't-subtitle'} style={{
              letterSpacing: '0.09em',
              color: 'var(--color-text-muted)',
            }}>
              {t('footer.piva')}
            </span>
            <span className={isCompact ? 't-label normal-case' : 't-subtitle'} style={{
              letterSpacing: '0.09em',
              color: 'var(--color-text-muted)',
            }}>
              {t('footer.phone')}
            </span>
            <span className={isCompact ? 't-label normal-case' : 't-subtitle'} style={{
              letterSpacing: '0.09em',
              color: 'var(--color-text-muted)',
            }}>
              info@axisarredi.it
            </span>

          </div>}

        </div>

        {/* Адрес вдоль диагонали — только в закрытом мобильном состоянии */}
        {isMobile && (
          <div id="address" style={{
            position: 'absolute',
            left: '62%',
            top: '58%',
            zIndex: 2,
            transform: `translate(-50%, -50%) rotate(-${diagAngle.toFixed(1)}deg) translateY(calc(-52% + 24px))`,
            transformOrigin: 'center center',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '5px',
            paddingTop: '0',
            paddingBottom: '16px',
            background: 'var(--color-primary-bg)',
            opacity: isOpen ? 0 : 1,
            transition: mounted ? (isOpen ? 'opacity 0.25s ease' : 'opacity 0.35s ease 0.7s') : undefined,
          }}>
            <span className="t-label" style={{
              fontWeight: 500,
              letterSpacing: '0.32em',
              color: 'var(--color-text-secondary)',
            }}>
              {t('footer.company')} - {t('footer.piva')}
            </span>
            <span className="t-label normal-case" style={{
              fontStyle: 'italic',
              letterSpacing: '0.08em',
              color: 'var(--color-text-muted)',
            }}>
              {t('footer.address')} · {t('footer.phone')} · info@axisarredi.it
            </span>
          </div>
        )}

      </div>

      {/* ── Диагональная граница ── */}
      <svg
        style={{
          display: isMobile ? 'none' : undefined,
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          pointerEvents: 'none', zIndex: 20,
          overflow: 'visible',
        }}
      >
        <defs>
          <linearGradient id="diagLineGrad" x1="100%" y1="28%" x2="28%" y2="100%" gradientUnits="objectBoundingBox">
            <stop offset="0%"   stopColor="var(--color-primary-border)" stopOpacity={0} />
            <stop offset="18%"  stopColor="var(--color-primary-border)" stopOpacity={0.55} />
            <stop offset="50%"  stopColor="var(--color-primary-border)" stopOpacity={0.75} />
            <stop offset="82%"  stopColor="var(--color-primary-border)" stopOpacity={0.55} />
            <stop offset="100%" stopColor="var(--color-primary-border)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="diagGlowGrad" x1="100%" y1="28%" x2="28%" y2="100%" gradientUnits="objectBoundingBox">
            <stop offset="0%"   stopColor="var(--color-primary-bg)" stopOpacity={0} />
            <stop offset="18%"  stopColor="var(--color-primary-bg)" stopOpacity={0.12} />
            <stop offset="50%"  stopColor="var(--color-primary-bg)" stopOpacity={0.18} />
            <stop offset="82%"  stopColor="var(--color-primary-bg)" stopOpacity={0.12} />
            <stop offset="100%" stopColor="var(--color-primary-bg)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <line x1="100%" y1="28%" x2="28%" y2="100%" stroke="url(#diagGlowGrad)" strokeWidth="9" />
        <line x1="100%" y1="28%" x2="28%" y2="100%" stroke="url(#diagLineGrad)" strokeWidth="1.5" />
      </svg>


      {/* ── Нижний контейнер: тёмный треугольник + карта + маркер — скрыт ── */}
      <style>{`
        @keyframes map-pin-bounce {
          0%, 100% { transform: translate(-50%, -100%) translateY(0); }
          50%       { transform: translate(-50%, -100%) translateY(-5px); }
        }
        @keyframes map-ring-expand {
          0%   { transform: translate(-50%, -50%) scale(0.5); opacity: 0.85; }
          100% { transform: translate(-50%, -50%) scale(2.6); opacity: 0; }
        }
        @keyframes social-icons-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes logo-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes hint-pulse {
          0%, 100% { opacity: 0.55; transform: translateX(0); }
          50%       { opacity: 0.8;  transform: translateX(-4px); }
        }
        @keyframes wa-pop-in {
          from { opacity: 0; transform: translateX(-50%) translateY(4px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes modal-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes modal-panel-in {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
      `}</style>
      <div id="map" style={{
        position: 'absolute',
        inset: 0,
        zIndex: isMobile && isOpen ? 35 : undefined,
        // Контейнер тянется на весь экран и иначе перехватывал бы наведение/
        // клики по форме (включая кнопку). Делаем его «прозрачным» для событий,
        // а интерактив включаем точечно на самой карте.
        pointerEvents: 'none',
      }}>

        {/* Тёмный треугольник */}
        <div className="absolute inset-0 bg-primary" style={{
          clipPath: mapClipPath,
          transition: mapTransition,
        }} />

        {/* Google карта */}
        <div className="absolute inset-0" style={{
          clipPath: mapClipPath,
          opacity: 0.5,
          transition: mapTransition,
          // Взаимодействие обрабатывают отдельные зоны-оверлеи (клик по карте
          // открывает Google Maps), поэтому у самой карты события отключены.
          pointerEvents: 'none',
        }}>
          <iframe
            src={
              isMobile
                ? 'https://maps.google.com/maps?q=via+Chinigiano+10+Montespertoli&output=embed&z=17'
                : 'https://maps.google.com/maps?q=via+Chinigiano+10+Montespertoli&output=embed'
            }
            style={{
              border: 0,
              filter: 'grayscale(100%)',
              position: 'absolute',
              width: isMobile ? '180%' : '120%',
              height: isMobile ? '180%' : '120%',
              left: isMobile ? '-17%' : '13%',
              top: isMobile ? '-17%' : '13%',
            }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

        {/* Затемнение карты под боковым меню (десктоп): градиент, разлитый
            по всему нижнему треугольнику — темнее всего у правого края
            (где закреплено меню) и плавно сходит на нет к диагонали, чтобы
            светлые пункты меню читались поверх пёстрой ч/б карты. События
            не перехватывает — карта остаётся интерактивной. */}
        {!isMobile && (
          <div className="absolute inset-0" style={{
            clipPath: mapClipPath,
            pointerEvents: 'none',
            background: 'linear-gradient(to right, transparent 45%, color-mix(in srgb, var(--color-mosaic-1) 14%, transparent) 72%, color-mix(in srgb, var(--color-mosaic-1) 34%, transparent) 88%, color-mix(in srgb, var(--color-mosaic-1) 60%, transparent) 100%)',
          }} />
        )}

        {/* Кастомный маркер */}
        <div className="absolute inset-0" style={{
          clipPath: mapClipPath,
          zIndex: 22,
          pointerEvents: 'none',
          transition: mapTransition,
        }}>
          <div style={{
            position: 'absolute', left: '73%', top: '73%',
            width: '14px', height: '14px',
            borderRadius: '50%',
            border: '1.5px solid #E8A838',
            animation: 'map-ring-expand 2.2s ease-out infinite',
          }} />
          <div style={{
            position: 'absolute', left: '73%', top: '73%',
            width: '14px', height: '14px',
            borderRadius: '50%',
            border: '1.5px solid #E8A838',
            animation: 'map-ring-expand 2.2s ease-out infinite',
            animationDelay: '1.1s',
          }} />
          <div style={{
            position: 'absolute', left: '73%', top: '73%',
            animation: 'map-pin-bounce 2.8s ease-in-out infinite',
            animationDelay: '0.4s',
          }}>
            <svg width="28" height="36" viewBox="0 0 26 34" fill="none">
              <path d="M13 0C5.82 0 0 5.82 0 13c0 9.75 13 21 13 21s13-11.25 13-21C26 5.82 20.18 0 13 0z" fill="#C8861A" />
              <path d="M13 0C5.82 0 0 5.82 0 13c0 9.75 13 21 13 21s13-11.25 13-21C26 5.82 20.18 0 13 0z" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
              <circle cx="13" cy="13" r="5" fill="rgba(255,255,255,0.92)" />
              <circle cx="13" cy="13" r="2" fill="#C8861A" />
            </svg>
          </div>
        </div>

      </div>

      {/* ── Кликабельная зона карты (десктоп): клик открывает Google Maps ── */}
      {!isMobile && (
        <div
          onClick={() => window.open('https://maps.google.com/maps?q=via+Chinigiano+10+Montespertoli', '_blank', 'noopener,noreferrer')}
          style={{
            position: 'absolute',
            inset: 0,
            clipPath: 'polygon(100% 28%, 100% 100%, 28% 100%)',
            zIndex: 23,
            cursor: 'pointer',
          }}
        />
      )}

      {/* ── Кликабельная зона тёмного треугольника (закрытое состояние) ── */}
      {isMobile && !isOpen && (
        <div
          onClick={() => window.open('https://maps.google.com/maps?q=via+Chinigiano+10+Montespertoli', '_blank', 'noopener,noreferrer')}
          style={{
            position: 'absolute',
            inset: 0,
            clipPath: 'polygon(100% 28%, 100% 100%, 28% 100%)',
            zIndex: 31,
            cursor: 'pointer',
          }}
        />
      )}

      {/* ── Кликабельная зона угла карты (открытое состояние) ── */}
      {isMobile && isOpen && (
        <div
          onClick={handleMapClose}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{
            position: 'absolute',
            inset: 0,
            clipPath: 'polygon(100% 72%, 100% 100%, 72% 100%)',
            zIndex: 36,
            cursor: 'pointer',
          }}
        >
          <div style={{
            position: 'absolute',
            right: 'calc(7% - 8px)',
            bottom: 'calc(7% + 16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '45px',
            height: '45px',
            pointerEvents: 'none',
            transform: `rotate(${diagAngle - 45}deg)`,
          }}>
            <svg
              width="28" height="28" viewBox="0 0 24 24" fill="none"
              style={{ animation: mounted ? 'hint-pulse 2.8s ease-in-out infinite' : undefined }}
            >
              <path d="M19 12H5M12 5l-7 7 7 7" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      )}

      {/* ── Модальное окно результата отправки ──────────────────────────
          Портал в body: у верхнего треугольника (#contacts) стоит clip-path,
          а он режет даже position:fixed-потомков. Клик по подложке, крестик,
          кнопка и Esc — все закрывают окно. */}
      {mounted && status && createPortal(
        <div
          ref={modalRef}
          onClick={() => setStatus(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,   // выше мобильного меню (z-50) и всех слоёв секции
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            background: 'color-mix(in srgb, var(--color-ink) 55%, transparent)',
            WebkitBackdropFilter: 'blur(6px)',
            backdropFilter: 'blur(6px)',
            animation: 'modal-fade-in 0.25s ease',
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="contactsModalTitle"
            onClick={e => e.stopPropagation()}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '420px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              padding: isCompact ? '34px 24px 28px' : '44px 36px 36px',
              background: 'var(--color-primary-bg)',
              border: '1px solid var(--color-border)',
              boxShadow: '0 24px 64px var(--color-shadow)',
              animation: 'modal-panel-in 0.35s cubic-bezier(0.34,1.56,0.64,1)',
            }}
          >
            {/* Крестик */}
            <button
              type="button"
              onClick={() => setStatus(null)}
              aria-label={t('status.close')}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                display: 'flex',
                padding: '8px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                opacity: 0.45,
                lineHeight: 0,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M6 6l12 12M18 6L6 18" stroke="var(--color-text-secondary)" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>

            <span
              id="contactsModalTitle"
              className={isCompact ? 't-subtitle uppercase' : 't-title uppercase'}
              style={{
                letterSpacing: '0.2em',
                color: status === 'success' ? 'var(--color-text-secondary)' : 'var(--color-error)',
              }}
            >
              {t(`status.${status}.title`)}
            </span>

            {/* Та же виньетка, что под заголовком формы */}
            <div style={{ margin: isCompact ? '14px 0 16px' : '18px 0 20px' }}>
              <Flourish
                w={isCompact ? 140 : 170}
                curlW={56}
                color={status === 'success' ? 'var(--color-accent1)' : 'var(--color-error)'}
              />
            </div>

            {/* t-body (а не t-body-sm): текст окна должен читаться без прищура.
                Цвет — свой у класса, --color-text-primary, не переопределяем. */}
            <span className="t-body" style={{ maxWidth: '30ch' }}>
              {t(`status.${status}.text`)}
            </span>

            <CtaButton
              type="button"
              onClick={() => setStatus(null)}
              style={{ marginTop: isCompact ? '24px' : '30px' }}
            >
              {t('status.close')}
            </CtaButton>
          </div>
        </div>,
        document.body,
      )}

    </div>
  );
});

Contacts.displayName = 'Contacts';
export default Contacts;
