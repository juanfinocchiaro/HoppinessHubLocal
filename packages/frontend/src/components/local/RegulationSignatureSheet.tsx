/**
 * RegulationSignatureSheet - Documento membretado de constancia de firma del reglamento
 * Optimizado para una sola hoja A4
 */
import { forwardRef, useState, useEffect } from 'react';
import logoHoppiness from '@/assets/logo-hoppiness-blue.png';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface RegulationSignatureSheetData {
  employeeName: string;
  employeeDni?: string;
  employeeRole: string;
  branchName: string;
  regulationVersion: number;
  regulationTitle: string;
  publishedAt: string;
  referenceId?: string;
}

interface RegulationSignatureSheetProps {
  data: RegulationSignatureSheetData;
}

export const RegulationSignatureSheet = forwardRef<HTMLDivElement, RegulationSignatureSheetProps>(
  ({ data }, ref) => {
    const [logoBase64, setLogoBase64] = useState<string>('');
    const publishedFormatted = format(new Date(data.publishedAt), 'dd/MM/yyyy', { locale: es });

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
          padding: '20px 24px',
          maxWidth: '210mm',
          minHeight: '297mm',
          maxHeight: '297mm',
          margin: '0 auto',
          fontFamily: 'Arial, sans-serif',
          fontSize: '10pt',
          lineHeight: '1.4',
          boxSizing: 'border-box',
        }}
      >
        {/* Header with Logo - Compacto */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '2px solid #f97316',
            paddingBottom: '10px',
            marginBottom: '14px',
          }}
        >
          <img src={logoBase64 || logoHoppiness} alt="Hoppiness Club" style={{ height: '48px' }} />
          <div style={{ textAlign: 'right' }}>
            <h1
              style={{
                fontSize: '13px',
                fontWeight: 'bold',
                color: '#ea580c',
                margin: 0,
              }}
            >
              CONSTANCIA DE RECEPCIÓN
            </h1>
            <h2
              style={{
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#ea580c',
                margin: '2px 0 0 0',
              }}
            >
              DEL REGLAMENTO INTERNO
            </h2>
          </div>
        </div>

        {/* Datos en una sola fila compacta */}
        <div
          style={{
            marginBottom: '12px',
            padding: '10px 12px',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '8px',
            fontSize: '10pt',
          }}
        >
          <div>
            <span style={{ color: '#666', fontSize: '9pt' }}>Empleado:</span>{' '}
            <strong>{data.employeeName}</strong>
          </div>
          <div>
            <span style={{ color: '#666', fontSize: '9pt' }}>DNI:</span>{' '}
            <strong>{data.employeeDni || '________________'}</strong>
          </div>
          <div>
            <span style={{ color: '#666', fontSize: '9pt' }}>Puesto:</span>{' '}
            <strong>{data.employeeRole}</strong>
          </div>
        </div>

        {/* Regulation Info - Compacto en una línea */}
        <div
          style={{
            marginBottom: '14px',
            padding: '8px 12px',
            backgroundColor: '#eff6ff',
            borderRadius: '4px',
            border: '1px solid #bfdbfe',
            fontSize: '10pt',
            display: 'flex',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <span>
            <strong>Reglamento:</strong> {data.regulationTitle}
          </span>
          <span>
            <strong>Versión:</strong> {data.regulationVersion}
          </span>
          <span>
            <strong>Publicado:</strong> {publishedFormatted}
          </span>
          <span>
            <strong>Sucursal:</strong> {data.branchName}
          </span>
        </div>

        {/* Declaration Text - Más compacto */}
        <div style={{ marginBottom: '16px', textAlign: 'justify', fontSize: '10pt' }}>
          <p style={{ marginBottom: '10px', marginTop: 0 }}>
            Por la presente, el/la suscripto/a <strong>{data.employeeName}</strong>, DNI N°{' '}
            <strong>{data.employeeDni || '________________'}</strong>, en mi carácter de{' '}
            <strong>{data.employeeRole}</strong> de la sucursal
            <strong> {data.branchName}</strong> de Hoppiness Club, declaro:
          </p>

          <ol style={{ marginLeft: '12px', paddingLeft: '8px', marginTop: 0, marginBottom: 0 }}>
            <li style={{ marginBottom: '4px' }}>
              Que he recibido un ejemplar completo del{' '}
              <strong>Reglamento Interno de Trabajo</strong> (Versión {data.regulationVersion},
              publicado el {publishedFormatted}).
            </li>
            <li style={{ marginBottom: '4px' }}>
              Que he leído íntegramente su contenido y comprendo todas las disposiciones allí
              establecidas.
            </li>
            <li style={{ marginBottom: '4px' }}>
              Que me comprometo a cumplir con todas las normas, políticas y procedimientos
              detallados en dicho reglamento durante la vigencia de mi relación laboral con la
              empresa.
            </li>
            <li style={{ marginBottom: 0 }}>
              Que entiendo que el incumplimiento de las normas establecidas podrá dar lugar a las
              sanciones disciplinarias correspondientes.
            </li>
          </ol>
        </div>

        {/* Date of signature - Antes de las firmas */}
        <div
          style={{
            marginBottom: '20px',
            textAlign: 'center',
            fontSize: '10pt',
          }}
        >
          <p style={{ margin: 0 }}>
            Firmado en ________________________, el día ______ de _________________ de 20____
          </p>
        </div>

        {/* Signatures Section - Más compacto */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '40px',
            marginBottom: '24px',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                borderBottom: '1px solid #888',
                height: '50px',
                marginBottom: '6px',
              }}
            ></div>
            <p style={{ fontSize: '10pt', fontWeight: '600', margin: 0 }}>Firma del Empleado</p>
            <p style={{ fontSize: '9pt', color: '#666', marginTop: '2px', marginBottom: 0 }}>
              Aclaración: ________________________
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                borderBottom: '1px solid #888',
                height: '50px',
                marginBottom: '6px',
              }}
            ></div>
            <p style={{ fontSize: '10pt', fontWeight: '600', margin: 0 }}>Firma del Encargado</p>
            <p style={{ fontSize: '9pt', color: '#666', marginTop: '2px', marginBottom: 0 }}>
              (Testigo)
            </p>
          </div>
        </div>

        {/* Footer - Más pequeño */}
        <div
          style={{
            paddingTop: '12px',
            borderTop: '1px solid #ddd',
            textAlign: 'center',
            fontSize: '8pt',
            color: '#999',
          }}
        >
          {data.referenceId && <p style={{ margin: 0 }}>Ref: {data.referenceId}</p>}
          <p style={{ marginTop: '2px', marginBottom: 0 }}>
            © {new Date().getFullYear()} Hoppiness Club - Documento interno | Este documento debe
            ser firmado en dos ejemplares.
          </p>
        </div>
      </div>
    );
  },
);

RegulationSignatureSheet.displayName = 'RegulationSignatureSheet';
