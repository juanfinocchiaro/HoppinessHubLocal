/**
 * NewInspectionPage - Iniciar una nueva visita de supervisión
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, MapPin, ClipboardList, Play } from 'lucide-react';
import { fetchActiveBranches } from '@/services/adminService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/ui/page-header';
import { HoppinessLoader } from '@/components/ui/hoppiness-loader';
import { useCreateInspection } from '@/hooks/useInspections';
import type { InspectionType } from '@/types/inspection';

export default function NewInspectionPage() {
  const navigate = useNavigate();
  const [branchId, setBranchId] = useState<string>('');
  const [inspectionType, setInspectionType] = useState<InspectionType | ''>('');

  const createInspection = useCreateInspection();

  // Fetch branches
  const { data: branches, isLoading: loadingBranches } = useQuery({
    queryKey: ['branches-for-inspection'],
    queryFn: fetchActiveBranches,
  });

  const handleStart = async () => {
    if (!branchId || !inspectionType) return;

    const result = await createInspection.mutateAsync({
      branch_id: branchId,
      inspection_type: inspectionType,
    });

    navigate(`/mimarca/supervisiones/${result.id}`);
  };

  const canStart = branchId && inspectionType;

  if (loadingBranches) {
    return (
      <div className="flex justify-center py-12">
        <HoppinessLoader />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nueva Visita de Supervisión"
        subtitle="Selecciona la sucursal y el tipo de visita"
        actions={
          <Button variant="ghost" onClick={() => navigate('/mimarca/supervisiones')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        }
      />

      <div className="max-w-lg mx-auto space-y-6">
        {/* Branch Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="w-5 h-5" />
              Sucursal
            </CardTitle>
            <CardDescription>¿En qué sucursal estás realizando la visita?</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar sucursal..." />
              </SelectTrigger>
              <SelectContent>
                {branches?.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Inspection Type */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardList className="w-5 h-5" />
              Tipo de Visita
            </CardTitle>
            <CardDescription>¿Qué área vas a supervisar?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                inspectionType === 'boh'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => setInspectionType('boh')}
            >
              <div className="font-medium">BOH - Back-of-House</div>
              <div className="text-sm text-muted-foreground">
                Heladeras, depósito, cocina, seguridad (17 ítems)
              </div>
            </div>

            <div
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                inspectionType === 'foh'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => setInspectionType('foh')}
            >
              <div className="font-medium">FOH - Front-of-House</div>
              <div className="text-sm text-muted-foreground">
                Mostrador, producto, salón, atención (13 ítems)
              </div>
            </div>

            <div
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                inspectionType === 'ultrasmash'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => setInspectionType('ultrasmash')}
            >
              <div className="font-medium">Ultra Smash - Monitoreo de Técnica</div>
              <div className="text-sm text-muted-foreground">
                Checklist de preparación Ultrasmash para cocineros (11 ítems)
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Start Button */}
        <Button
          className="w-full h-12 text-lg"
          disabled={!canStart || createInspection.isPending}
          onClick={handleStart}
        >
          <Play className="w-5 h-5 mr-2" />
          {createInspection.isPending ? 'Iniciando...' : 'Iniciar Visita'}
        </Button>
      </div>
    </div>
  );
}
