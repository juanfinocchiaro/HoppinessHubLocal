import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchBranchBySlug, updateBranch } from '@/services/adminService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Archive, MapPin, RotateCcw, Settings, Users } from 'lucide-react';
import { toast } from 'sonner';
import BranchEditPanel from '@/components/admin/BranchEditPanel';
import BranchTeamTab from '@/components/admin/BranchTeamTab';

type PublicStatus = 'active' | 'coming_soon' | 'hidden' | 'archived';

const statusConfig: Record<
  PublicStatus,
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
> = {
  active: { label: 'Activo', variant: 'default' },
  coming_soon: { label: 'Próximamente', variant: 'secondary' },
  hidden: { label: 'Oculto', variant: 'outline' },
  archived: { label: 'Archivado', variant: 'destructive' },
};

export default function BranchDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [archiving, setArchiving] = useState(false);

  const {
    data: branch,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['branch-detail', slug],
    queryFn: () => fetchBranchBySlug(slug!),
    enabled: !!slug,
  });

  const handleArchive = async () => {
    if (!branch) return;
    setArchiving(true);
    try {
      await updateBranch(branch.id, { public_status: 'archived', is_active: false });
      toast.success('Sucursal archivada');
      refetch();
      qc.invalidateQueries({ queryKey: ['branches'] });
    } catch {
      toast.error('Error al archivar la sucursal');
    } finally {
      setArchiving(false);
    }
  };

  const handleRestore = async () => {
    if (!branch) return;
    setArchiving(true);
    try {
      await updateBranch(branch.id, { public_status: 'hidden', is_active: true });
      toast.success(
        'Sucursal restaurada (estado: Oculto). Cambiá el estado a Activo cuando esté lista.',
      );
      refetch();
      qc.invalidateQueries({ queryKey: ['branches'] });
    } catch {
      toast.error('Error al restaurar la sucursal');
    } finally {
      setArchiving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-96 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!branch) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/mimarca')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div className="text-center py-12">
          <h2 className="text-xl font-bold">Sucursal no encontrada</h2>
          <p className="text-muted-foreground">No existe una sucursal con ese identificador</p>
        </div>
      </div>
    );
  }

  const publicStatus = ((branch as any).public_status as PublicStatus) || 'active';
  const config = statusConfig[publicStatus] || statusConfig.active;
  const isArchived = publicStatus === 'archived';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/mimarca')}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Volver
            </Button>
          </div>
          <h1 className="text-3xl font-bold">{branch.name}</h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>
              {branch.address}, {branch.city}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={config.variant}>{config.label}</Badge>
          {isArchived ? (
            <Button variant="outline" size="sm" onClick={handleRestore} disabled={archiving}>
              <RotateCcw className="h-4 w-4 mr-1" />
              {archiving ? 'Restaurando...' : 'Restaurar'}
            </Button>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                >
                  <Archive className="h-4 w-4 mr-1" />
                  Archivar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Archivar sucursal "{branch.name}"?</AlertDialogTitle>
                  <AlertDialogDescription>
                    La sucursal dejará de aparecer en la tienda, selectores y listados públicos. Los
                    datos históricos (ventas, RDO, equipo) se mantienen accesibles desde reportes.
                    Podés restaurarla en cualquier momento.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleArchive}
                    disabled={archiving}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {archiving ? 'Archivando...' : 'Sí, archivar sucursal'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {isArchived && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 text-sm text-destructive">
          Esta sucursal está archivada. No es visible para clientes ni aparece en selectores. Los
          datos históricos se mantienen.
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="info" className="w-full">
        <TabsList>
          <TabsTrigger value="info" className="gap-2">
            <Settings className="h-4 w-4" />
            Información
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <Users className="h-4 w-4" />
            Equipo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-6">
          <BranchEditPanel
            key={branch.id}
            branch={branch}
            onSaved={refetch}
            onCancel={() => navigate('/mimarca')}
          />
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <BranchTeamTab branchId={branch.id} branchName={branch.name} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
