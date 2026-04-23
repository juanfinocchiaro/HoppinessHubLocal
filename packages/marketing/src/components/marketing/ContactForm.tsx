'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const schema = z.object({
  nombre: z.string().min(2, 'El nombre es muy corto'),
  email: z.string().email('Email inválido'),
  empresa: z.string().optional(),
  locales: z.string().optional(),
  motivo: z.string().optional(),
  mensaje: z.string().min(10, 'El mensaje es muy corto'),
});

type FormData = z.infer<typeof schema>;

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const inputStyle: React.CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 15,
  color: 'var(--carbon)',
  background: 'var(--papel)',
  border: '1px solid var(--hueso)',
  borderRadius: 4,
  padding: '12px 16px',
  width: '100%',
  outline: 'none',
  transition: 'border-color 0.15s ease',
};

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontWeight: 500,
  fontSize: 13,
  color: 'var(--ceniza)',
  display: 'block',
  marginBottom: 6,
};

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setServerError('');
    try {
      const res = await fetch(`${API_BASE}/api/public/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setServerError((body as { error?: string }).error ?? 'Error enviando el formulario.');
        return;
      }
      setSubmitted(true);
    } catch {
      setServerError('Error de red. Revisá tu conexión e intentá de nuevo.');
    }
  }

  if (submitted) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <p style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 28, color: 'var(--carbon)', marginBottom: 12 }}>
          Mensaje recibido.
        </p>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 16, color: 'var(--ceniza)' }}>
          Te escribimos en menos de 24 horas.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <label htmlFor="nombre" style={labelStyle}>Nombre *</label>
          <input id="nombre" type="text" {...register('nombre')} style={inputStyle} placeholder="Tu nombre" />
          {errors.nombre && <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--error)', marginTop: 4 }}>{errors.nombre.message}</p>}
        </div>
        <div>
          <label htmlFor="email" style={labelStyle}>Email *</label>
          <input id="email" type="email" {...register('email')} style={inputStyle} placeholder="tu@empresa.com" />
          {errors.email && <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--error)', marginTop: 4 }}>{errors.email.message}</p>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <label htmlFor="empresa" style={labelStyle}>Empresa</label>
          <input id="empresa" type="text" {...register('empresa')} style={inputStyle} placeholder="Nombre del restaurante" />
        </div>
        <div>
          <label htmlFor="locales" style={labelStyle}>¿Cuántos locales?</label>
          <select id="locales" {...register('locales')} style={inputStyle}>
            <option value="">Seleccioná</option>
            <option value="1">1 local</option>
            <option value="2-5">2 a 5 locales</option>
            <option value="6-20">6 a 20 locales</option>
            <option value="20+">Más de 20</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="motivo" style={labelStyle}>Motivo</label>
        <select id="motivo" {...register('motivo')} style={inputStyle}>
          <option value="">Seleccioná</option>
          <option value="demo">Quiero una demo</option>
          <option value="ventas">Consulta de precios</option>
          <option value="soporte">Soporte técnico</option>
          <option value="partnership">Partnership / integración</option>
          <option value="otro">Otro</option>
        </select>
      </div>

      <div>
        <label htmlFor="mensaje" style={labelStyle}>Mensaje *</label>
        <textarea
          id="mensaje"
          {...register('mensaje')}
          rows={5}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
          placeholder="Contanos sobre tu operación..."
        />
        {errors.mensaje && <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--error)', marginTop: 4 }}>{errors.mensaje.message}</p>}
      </div>

      {serverError && (
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--error)', background: 'rgba(179, 63, 32, 0.08)', padding: '12px 16px', borderRadius: 4 }}>
          {serverError}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        style={{
          fontFamily: 'var(--font-sans)',
          fontWeight: 500,
          fontSize: 16,
          color: 'var(--papel)',
          background: isSubmitting ? 'var(--ceniza)' : 'var(--brasa)',
          border: 'none',
          padding: '14px 28px',
          borderRadius: 999,
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
          transition: 'background 0.15s ease',
          alignSelf: 'flex-start',
        }}
        onMouseEnter={(e) => { if (!isSubmitting) (e.currentTarget as HTMLButtonElement).style.background = 'var(--ember)'; }}
        onMouseLeave={(e) => { if (!isSubmitting) (e.currentTarget as HTMLButtonElement).style.background = 'var(--brasa)'; }}
      >
        {isSubmitting ? 'Enviando...' : 'Enviar mensaje'}
      </button>
    </form>
  );
}
