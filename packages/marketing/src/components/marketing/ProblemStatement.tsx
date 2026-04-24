'use client';

import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { fadeUpVariants, staggerContainer, viewportOpts } from '@/lib/animations';

const SISTEMAS = [
  { id: 'pos', label: 'POS', x: 160, y: 80 },
  { id: 'rappi', label: 'Rappi', x: 320, y: 40 },
  { id: 'py', label: 'PedidosYa', x: 480, y: 80 },
  { id: 'mpd', label: 'Mercado Pago', x: 560, y: 200 },
  { id: 'stock', label: 'Stock', x: 480, y: 320 },
  { id: 'whatsapp', label: 'WhatsApp', x: 320, y: 360 },
  { id: 'excel', label: 'Excel', x: 160, y: 320 },
  { id: 'afip', label: 'ARCA/AFIP', x: 80, y: 200 },
];

const CENTER = { x: 320, y: 200 };

function DisconnectedDiagram({ triggered }: { triggered: boolean }) {
  return (
    <svg
      viewBox="0 0 640 400"
      style={{ width: '100%', maxWidth: 580, display: 'block' }}
      aria-hidden="true"
    >
      {/* Error lines between some nodes */}
      {[
        [SISTEMAS[0], SISTEMAS[1]],
        [SISTEMAS[1], SISTEMAS[2]],
        [SISTEMAS[4], SISTEMAS[5]],
        [SISTEMAS[6], SISTEMAS[7]],
      ].map(([a, b], i) => (
        <line
          key={i}
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          stroke="#8A827C"
          strokeWidth="1"
          strokeDasharray="6,4"
          style={{
            opacity: triggered ? 1 : 0,
            animation: triggered ? `rs-flicker 0.15s ease-in-out ${i * 0.2}s 6 alternate` : 'none',
            transition: 'opacity 0.4s ease',
          }}
        />
      ))}

      <style>{`
        @keyframes rs-flicker {
          0%   { stroke: #8A827C; opacity: 0.6; }
          50%  { stroke: #B33F20; opacity: 1; }
          100% { stroke: #8A827C; opacity: 0.6; }
        }
        @media (prefers-reduced-motion: reduce) {
          line[style] { animation: none !important; }
        }
      `}</style>

      {/* Nodes */}
      {SISTEMAS.map((s) => (
        <g key={s.id}>
          <circle
            cx={s.x}
            cy={s.y}
            r={28}
            fill="var(--crema)"
            stroke="var(--hueso)"
            strokeWidth="1.5"
          />
          <text
            x={s.x}
            y={s.y + 4}
            textAnchor="middle"
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '10px',
              fill: 'var(--ceniza)',
              fontWeight: 500,
            }}
          >
            {s.label.split(' ').map((word, wi) => (
              <tspan key={wi} x={s.x} dy={wi === 0 ? (s.label.includes(' ') ? -6 : 0) : 13}>
                {word}
              </tspan>
            ))}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function ProblemStatement() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <section
      id="funciones"
      data-section="problem"
      ref={ref}
      style={{
        background: 'var(--papel)',
        padding: '140px 32px',
        borderBottom: '1px solid var(--crema)',
      }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOpts}
          style={{ maxWidth: 640, marginBottom: 80 }}
        >
          <motion.p variants={fadeUpVariants} style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.22em', color: 'var(--ceniza)', marginBottom: 16 }}>
            EL PROBLEMA
          </motion.p>
          <motion.h2
            variants={fadeUpVariants}
            style={{
              fontFamily: 'var(--font-serif)',
              fontVariationSettings: '"opsz" 144',
              fontWeight: 700,
              fontSize: 'clamp(36px, 5vw, 56px)',
              letterSpacing: '-0.03em',
              lineHeight: 1.05,
              color: 'var(--carbon)',
              marginBottom: 24,
            }}
          >
            Tenés ocho sistemas y ninguno se habla.
          </motion.h2>
          <motion.p
            variants={fadeUpVariants}
            style={{ fontFamily: 'var(--font-sans)', fontSize: 18, color: 'var(--humo)', lineHeight: 1.65, marginBottom: 16 }}
          >
            Vendés por cinco canales, imprimís tickets en tres lugares, tu stock se actualiza a mano, y el costo de un combo lo calculás con una calculadora.
          </motion.p>
          <motion.p
            variants={fadeUpVariants}
            style={{ fontFamily: 'var(--font-sans)', fontSize: 18, color: 'var(--humo)', lineHeight: 1.65 }}
          >
            Cada herramienta es buena por separado. Juntas, son tu cuello de botella.
          </motion.p>
        </motion.div>

        {/* Diagram */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOpts}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{ display: 'flex', justifyContent: 'center' }}
        >
          <DisconnectedDiagram triggered={inView} />
        </motion.div>
      </div>
    </section>
  );
}
