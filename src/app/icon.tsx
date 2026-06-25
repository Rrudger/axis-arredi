import { ImageResponse } from 'next/og';

export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 24,
          // OG/ImageResponse (Satori) не поддерживает CSS-переменные —
          // цвет фавикона задаётся литералом. При смене темы поставьте
          // --color-primary активной темы: sage #8FA68C / terracotta #C4907A /
          // clay #A47764 / olive #7A7A45 / taupe #9E8B72.
          background: '#8FA68C',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
        }}
      >
        D
      </div>
    ),
    {
      ...size,
    }
  )
}
