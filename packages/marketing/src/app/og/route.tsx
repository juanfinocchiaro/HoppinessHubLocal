import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get('title') ?? 'RestoStack — Tu operación, en orden.';
  const subtitle = searchParams.get('subtitle') ?? 'Restaurant OS para LatAm';

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: '#0C0B09',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '80px 96px',
          position: 'relative',
        }}
      >
        {/* Dots pattern via repeated circles */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(242, 237, 228, 0.04) 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Logo symbol */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginBottom: 48,
            position: 'relative',
          }}
        >
          <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
            <rect width="64" height="64" rx="8" fill="#0C0B09" />
            <rect x="25" y="10" width="14" height="5" rx="1" fill="#D4CDBF" />
            <rect x="25" y="49" width="14" height="5" rx="1" fill="#D4CDBF" />
            <rect x="10" y="25" width="5" height="14" rx="1" fill="#D4CDBF" />
            <rect x="49" y="25" width="5" height="14" rx="1" fill="#D4CDBF" />
            <rect x="22" y="22" width="20" height="20" rx="2" fill="#CF4E2E" />
          </svg>
          <span
            style={{
              fontSize: 32,
              fontWeight: 800,
              color: '#FAF8F4',
              letterSpacing: '-0.03em',
            }}
          >
            RestoStack
          </span>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: title.length > 40 ? 56 : 72,
            fontWeight: 800,
            color: '#FAF8F4',
            letterSpacing: '-0.04em',
            lineHeight: 1,
            margin: 0,
            marginBottom: 24,
            maxWidth: 900,
            position: 'relative',
          }}
        >
          {title}
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: 24,
            fontWeight: 400,
            color: '#5A5450',
            letterSpacing: '-0.01em',
            margin: 0,
            position: 'relative',
          }}
        >
          {subtitle}
        </p>

        {/* Brasa accent bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 80,
            right: 96,
            width: 6,
            height: 120,
            background: '#CF4E2E',
            borderRadius: 4,
          }}
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
