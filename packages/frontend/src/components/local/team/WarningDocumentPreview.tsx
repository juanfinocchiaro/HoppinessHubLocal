/**
 * WarningDocumentPreview - Documento membretado para imprimir apercibimientos
 * Usa estilos inline para garantizar impresión A4 correcta
 */
import { forwardRef, useState, useEffect } from 'react';
import logoHoppiness from '@/assets/logo-hoppiness-blue.png';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface WarningDocumentData {
  employeeName: string;
  employeeDni?: string;
  employeeRole: string;
  branchName: string;
  warningType: string;
  warningTypeLabel: string;
  incidentDate: string;
  description: string;
  issuedByName: string;
  referenceId?: string;
}

interface WarningDocumentPreviewProps {
  data: WarningDocumentData;
}

const WARNING_TYPE_OPTIONS = [
  { value: 'verbal', label: 'Llamado de atención verbal' },
  { value: 'written', label: 'Apercibimiento escrito' },
  { value: 'lateness', label: 'Llegada tarde' },
  { value: 'absence', label: 'Inasistencia' },
  { value: 'suspension', label: 'Suspensión' },
  { value: 'other', label: 'Otro' },
];

export const WarningDocumentPreview = forwardRef<HTMLDivElement, WarningDocumentPreviewProps>(
  ({ data }, ref) => {
    const [logoBase64, setLogoBase64] = useState<string>('');
    const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es });
    const incidentFormatted = format(new Date(data.incidentDate), "dd 'de' MMMM 'de' yyyy", {
      locale: es,
    });

    // Convert logo to base64 for print compatibility
    useEffect(() => {
      fetch(logoHoppiness)
        .then((res) => res.blob())
        .then((blob) => {
          const reader = new FileReader();
          reader.onload = () => setLogoBase64(reader.result as string);
          reader.readAsDataURL(blob);
        });
    }, []);

    return (
      <div
        ref={ref}
        style={{
          backgroundColor: 'white',
          color: 'black',
          padding: '32px',
          maxWidth: '210mm',
          margin: '0 auto',
          fontFamily: 'Arial, sans-serif',
          fontSize: '12pt',
          lineHeight: '1.5',
        }}
      >
        {/* Header with Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '2px solid #f97316',
            paddingBottom: '16px',
            marginBottom: '24px',
          }}
        >
          <img src={logoBase64 || logoHoppiness} alt="Hoppiness Club" style={{ height: '64px' }} />
          <div style={{ textAlign: 'right' }}>
            <h1
              style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#ea580c',
                margin: 0,
              }}
            >
              APERCIBIMIENTO FORMAL
            </h1>
            <p style={{ fontSize: '14px', color: '#666', margin: '4px 0 0 0' }}>
              Sucursal: {data.branchName}
            </p>
            <p style={{ fontSize: '14px', color: '#666', margin: '4px 0 0 0' }}>
              Fecha de emisión: {today}
            </p>
          </div>
        </div>

        {/* Employee Data Section */}
        <div
          style={{
            marginBottom: '24px',
            padding: '16px',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px',
          }}
        >
          <h2
            style={{
              fontWeight: 'bold',
              fontSize: '11pt',
              textTransform: 'uppercase',
              color: '#555',
              marginBottom: '8px',
              marginTop: 0,
            }}
          >
            Datos del Empleado
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              fontSize: '11pt',
            }}
          >
            <div>
              <span style={{ color: '#666' }}>Nombre:</span> <strong>{data.employeeName}</strong>
            </div>
            <div>
              <span style={{ color: '#666' }}>DNI:</span>{' '}
              <strong>{data.employeeDni || '________________'}</strong>
            </div>
            <div>
              <span style={{ color: '#666' }}>Puesto:</span> <strong>{data.employeeRole}</strong>
            </div>
          </div>
        </div>

        {/* Warning Type Section */}
        <div style={{ marginBottom: '24px' }}>
          <h2
            style={{
              fontWeight: 'bold',
              fontSize: '11pt',
              textTransform: 'uppercase',
              color: '#555',
              marginBottom: '8px',
              marginTop: 0,
            }}
          >
            Tipo de Apercibimiento
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '4px',
              fontSize: '11pt',
            }}
          >
            {WARNING_TYPE_OPTIONS.map((option) => (
              <div key={option.value} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '14px',
                    height: '14px',
                    border: '1px solid #888',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                  }}
                >
                  {data.warningType === option.value ? '✓' : ''}
                </span>
                <span>{option.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Incident Date */}
        <div style={{ marginBottom: '24px' }}>
          <h2
            style={{
              fontWeight: 'bold',
              fontSize: '11pt',
              textTransform: 'uppercase',
              color: '#555',
              marginBottom: '8px',
              marginTop: 0,
            }}
          >
            Fecha del Incidente
          </h2>
          <p
            style={{
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              margin: 0,
            }}
          >
            {incidentFormatted}
          </p>
        </div>

        {/* Description */}
        <div style={{ marginBottom: '32px' }}>
          <h2
            style={{
              fontWeight: 'bold',
              fontSize: '11pt',
              textTransform: 'uppercase',
              color: '#555',
              marginBottom: '8px',
              marginTop: 0,
            }}
          >
            Descripción del Incidente
          </h2>
          <div
            style={{
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              minHeight: '100px',
              whiteSpace: 'pre-wrap',
            }}
          >
            {data.description}
          </div>
        </div>

        {/* Signatures Section */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '32px',
            marginTop: '48px',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                borderBottom: '1px solid #888',
                height: '48px',
                marginBottom: '8px',
              }}
            ></div>
            <p style={{ fontSize: '11pt', fontWeight: '600', margin: 0 }}>Firma del Empleado</p>
            <p style={{ fontSize: '9pt', color: '#888', marginTop: '4px' }}>
              Aclaración: ________________________
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                borderBottom: '1px solid #888',
                height: '48px',
                marginBottom: '8px',
              }}
            ></div>
            <p style={{ fontSize: '11pt', fontWeight: '600', margin: 0 }}>Firma del Encargado</p>
            <p style={{ fontSize: '9pt', color: '#888', marginTop: '4px' }}>
              ({data.issuedByName})
            </p>
          </div>
        </div>

        {/* Date of signature */}
        <div
          style={{
            marginTop: '32px',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '11pt', color: '#666', margin: 0 }}>
            Fecha de firma: ______ / ______ / ____________
          </p>
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: '48px',
            paddingTop: '16px',
            borderTop: '1px solid #ddd',
            textAlign: 'center',
            fontSize: '9pt',
            color: '#aaa',
          }}
        >
          {data.referenceId && <p style={{ margin: 0 }}>Ref: {data.referenceId}</p>}
          <p style={{ marginTop: '4px' }}>
            © {new Date().getFullYear()} Hoppiness Club - Documento interno
          </p>
        </div>
      </div>
    );
  },
);

WarningDocumentPreview.displayName = 'WarningDocumentPreview';
