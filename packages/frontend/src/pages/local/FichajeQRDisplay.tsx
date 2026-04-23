/**
 * FichajeQRDisplay - Pantalla de QR estático para encargados
 *
 * Muestra el código QR del local para que los empleados escaneen.
 * El QR apunta a /fichaje/{clock_code}
 */
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fetchBranchClockInfoMaybe } from '@/services/hrService';
import { Clock, AlertCircle, QrCode } from 'lucide-react';
import { SpinnerLoader } from '@/components/ui/loaders';
import { useState, useEffect } from 'react';
import logoHoppiness from '@/assets/logo-hoppiness-white.png';
import { getClockInUrl } from '@/lib/constants';

export default function FichajeQRDisplay() {
  const { branchId } = useParams();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch branch info
  const {
    data: branch,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['branch-for-qr', branchId],
    queryFn: () => fetchBranchClockInfoMaybe(branchId!),
    enabled: !!branchId,
  });

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (!branchId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Sucursal no especificada</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary">
        <SpinnerLoader size="lg" />
      </div>
    );
  }

  if (error || !branch?.clock_code) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Error</h1>
            <p className="text-muted-foreground">
              No se pudo cargar la información del local o no tiene código de fichaje configurado.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const qrUrl = getClockInUrl(branch.clock_code);

  return (
    <div className="min-h-screen bg-primary flex flex-col items-center justify-center p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <img src={logoHoppiness} alt="Hoppiness" className="h-16 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-primary-foreground">Control de Asistencia</h1>
        <Badge variant="secondary" className="mt-2 text-base px-4 py-1">
          {branch.name}
        </Badge>
      </div>

      {/* Main Card with QR */}
      <Card className="w-full max-w-md shadow-elevated">
        <CardContent className="p-8">
          {/* Clock */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 text-5xl font-bold font-mono text-primary">
              <Clock className="w-10 h-10" />
              {formatTime(currentTime)}
            </div>
            <p className="text-muted-foreground mt-2 capitalize">{formatDate(currentTime)}</p>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center">
            <div className="relative bg-white p-4 rounded-xl shadow-inner">
              <QRCodeSVG
                value={qrUrl}
                size={256}
                level="M"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>

            {/* Static indicator */}
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <QrCode className="w-4 h-4" />
              <span>Código permanente del local</span>
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-6 text-center">
            <p className="text-lg font-medium">Escanea para fichar</p>
            <p className="text-muted-foreground">Ingreso / Egreso</p>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center mt-8">
        <p className="text-primary-foreground/80 text-sm">
          Usá la cámara de tu celular para escanear el código QR
        </p>
        <p className="text-primary-foreground/50 text-xs mt-2">Código: {branch.clock_code}</p>
      </div>
    </div>
  );
}
