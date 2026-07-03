'use client';

import { forwardRef } from 'react';

/**
 * Унифицированная CTA-кнопка сайта. Один элемент, два стиля (variant):
 *  - 'dark'  (по умолчанию) — матовое стекло, тёмная плашка, белый текст;
 *  - 'light' — контурная кнопка (как была на втором экране).
 * Стили — в globals.css (`.cta-button` / `.cta-button--light`).
 *
 * width — необязательная фиксированная ширина (любое CSS-значение, напр.
 * '33.333vw'). При заданной ширине горизонтальный паддинг убирается, а текст
 * центрируется; высота остаётся прежней (вертикальный паддинг + бордер).
 */
type CtaButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  width?: string;
  variant?: 'dark' | 'light';
};

const CtaButton = forwardRef<HTMLButtonElement, CtaButtonProps>(
  ({ width, variant = 'dark', className, style, children, ...rest }, ref) => {
    const classes = [
      'cta-button',
      variant === 'light' && 'cta-button--light',
      className,
    ].filter(Boolean).join(' ');

    return (
      <button
        ref={ref}
        className={classes}
        style={{
          ...(width ? { width, paddingLeft: 0, paddingRight: 0, textAlign: 'center' } : {}),
          ...style,
        }}
        {...rest}
      >
        {children}
      </button>
    );
  }
);

CtaButton.displayName = 'CtaButton';
export default CtaButton;
