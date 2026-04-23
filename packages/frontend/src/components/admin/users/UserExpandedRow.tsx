import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Phone, MapPin } from 'lucide-react';
import { UserRoleModal } from './UserRoleModal';
import type { UserWithStats, Branch } from './types';
import { ROLE_LABELS } from './types';
import { useWorkPositions } from '@/hooks/useWorkPositions';

interface UserExpandedRowProps {
  user: UserWithStats;
  branches: Branch[];
  onClose: () => void;
  onUserUpdated: () => void;
}

export function UserExpandedRow({ user, branches, onClose: _onClose, onUserUpdated }: UserExpandedRowProps) {
  const [showRoleModal, setShowRoleModal] = useState(false);
  const { data: workPositions = [] } = useWorkPositions();

  // Helper to get position label
  const getPositionLabel = (key: string | null | undefined) => {
    if (!key) return null;
    const position = workPositions.find((p) => p.key === key);
    return position?.label || key;
  };

  return (
    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Column 1: Information */}
      <div className="space-y-4">
        <h4 className="font-semibold text-sm uppercase text-muted-foreground">Información</h4>

        <div className="space-y-2 text-sm">
          {user.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{user.phone}</span>
            </div>
          )}

          {user.email && <div className="text-muted-foreground">{user.email}</div>}
        </div>
      </div>

      {/* Column 2: Access & Roles */}
      <div className="space-y-4">
        <h4 className="font-semibold text-sm uppercase text-muted-foreground">Accesos y rol</h4>

        <div className="space-y-3 text-sm">
          {/* Brand Access */}
          <div className="flex items-start gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full mt-1 ${user.brand_role ? 'bg-success' : 'bg-muted-foreground/30'}`}
            />
            <div className="flex-1">
              <span className="font-medium">Mi Marca: </span>
              <span className="text-muted-foreground">
                {user.brand_role ? ROLE_LABELS[user.brand_role] : 'Sin acceso'}
              </span>
            </div>
          </div>

          {/* Local Access - Nueva arquitectura con múltiples sucursales */}
          <div className="flex items-start gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full mt-1 ${user.hasLocalAccess ? 'bg-success' : 'bg-muted-foreground/30'}`}
            />
            <div className="flex-1">
              <span className="font-medium">Mi Local: </span>
              {user.branch_roles.length > 0 ? (
                <div className="space-y-1 mt-1">
                  {user.branch_roles.map((br) => (
                    <div
                      key={br.branch_id}
                      className="flex items-center gap-2 text-muted-foreground"
                    >
                      <MapPin className="h-3 w-3" />
                      <span className="font-medium">{br.branch_name}:</span>
                      <span>{ROLE_LABELS[br.local_role] || br.local_role}</span>
                      {br.default_position && (
                        <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {getPositionLabel(br.default_position)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-muted-foreground">Sin acceso</span>
              )}
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowRoleModal(true)}
          className="w-full"
        >
          {user.brand_role || user.hasLocalAccess ? 'Editar roles' : 'Asignar roles'}
        </Button>
      </div>

      {showRoleModal && (
        <UserRoleModal
          user={user}
          branches={branches}
          open={showRoleModal}
          onOpenChange={setShowRoleModal}
          onSuccess={() => {
            onUserUpdated();
            setShowRoleModal(false);
          }}
        />
      )}
    </div>
  );
}
