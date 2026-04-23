import { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Store, ArrowRight, Fingerprint, Eye, EyeOff, KeyRound, Check } from 'lucide-react';
import { LOCAL_ROLE_LABELS } from '@/hooks/usePermissions';
import { PinManagementModal } from './PinManagementModal';

interface BranchWorkCardProps {
  branchId: string;
  branchName: string;
  localRole: string;
  clockPin: string | null;
  roleId: string;
  userId: string;
}

export function BranchWorkCard({
  branchId,
  branchName,
  localRole,
  clockPin,
  roleId,
  userId,
}: BranchWorkCardProps) {
  const [showPin, setShowPin] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const pinTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const hasPin = !!clockPin;

  // Franquiciados don't need PIN (they don't clock in)
  const isFranquiciado = localRole === 'franquiciado';

  // Reset state when branchId changes
  useEffect(() => {
    setShowPin(false);
    setPinModalOpen(false);
    clearTimeout(pinTimerRef.current);
  }, [branchId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimeout(pinTimerRef.current);
  }, []);

  // Auto-hide PIN after 3 seconds
  const handleShowPin = useCallback(() => {
    setShowPin(true);
    clearTimeout(pinTimerRef.current);
    pinTimerRef.current = setTimeout(() => setShowPin(false), 3000);
  }, []);

  return (
    <>
      <Card className="hover:shadow-sm transition-shadow">
        <CardContent className="p-4 space-y-3">
          {/* Header: Branch name + role + action */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Store className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <span className="font-medium truncate">{branchName}</span>
              <Badge variant="outline" className="flex-shrink-0">
                {LOCAL_ROLE_LABELS[localRole] || localRole}
              </Badge>
            </div>
            <Link to={`/milocal/${branchId}`}>
              <Button variant="outline" size="sm" className="min-h-[36px]">
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          {/* PIN Section - only for operational roles (not franchisees) */}
          {!isFranquiciado && (
            <div className="flex items-center justify-between bg-muted/50 rounded-lg p-2 pl-3">
              <div className="flex items-center gap-2">
                <Fingerprint className="w-4 h-4 text-muted-foreground" />
                {hasPin ? (
                  <>
                    <span className="text-sm text-muted-foreground">PIN:</span>
                    <span className="font-mono tracking-widest text-sm">
                      {showPin ? clockPin : '••••'}
                    </span>
                    {!showPin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={handleShowPin}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        <span className="text-xs">Ver</span>
                      </Button>
                    )}
                    {showPin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => setShowPin(false)}
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Check className="w-4 h-4 text-success" />
                  </>
                ) : (
                  <span className="text-sm text-warning">Sin PIN configurado</span>
                )}
              </div>

              <Button
                variant={hasPin ? 'ghost' : 'default'}
                size="sm"
                className="h-7"
                onClick={() => setPinModalOpen(true)}
              >
                <KeyRound className="w-3.5 h-3.5 mr-1" />
                <span className="text-xs">{hasPin ? 'Cambiar' : 'Crear'}</span>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* PIN Modal - only for operational roles */}
      {!isFranquiciado && (
        <PinManagementModal
          open={pinModalOpen}
          onOpenChange={setPinModalOpen}
          branchName={branchName}
          branchId={branchId}
          roleId={roleId}
          currentPin={clockPin}
          userId={userId}
        />
      )}
    </>
  );
}
