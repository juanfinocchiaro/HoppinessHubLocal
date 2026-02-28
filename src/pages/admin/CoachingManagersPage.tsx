/**
 * CoachingManagersPage - Coaching a Encargados de toda la red
 *
 * Permite a Superadmin/Coordinador evaluar encargados de cualquier sucursal
 * desde un solo lugar, sin necesidad de navegar a cada local.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchActiveBranchNames } from '@/services/adminService';
import { useManagersCoachingList } from '@/hooks/useManagersCoachingList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { EmptyState } from '@/components/ui/states';
import { CoachingManagerForm } from '@/components/coaching';
import {
  Users,
  CheckCircle,
  Clock,
  ChevronRight,
  ChevronDown,
  MapPin,
  TrendingUp,
  TrendingDown,
  Minus,
  X,
} from 'lucide-react';

import { RequireBrandPermission } from '@/components/guards';

function CoachingManagersPageContent() {
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [expandedManagerId, setExpandedManagerId] = useState<string | null>(null);

  // Obtener lista de sucursales para el filtro
  const { data: branches } = useQuery({
    queryKey: ['branches-list'],
    queryFn: fetchActiveBranchNames,
  });

  // Obtener lista de encargados
  const {
    data: managers,
    isLoading,
    refetch,
  } = useManagersCoachingList({
    branchId: branchFilter !== 'all' ? branchFilter : undefined,
  });

  const currentMonth = new Date().toLocaleString('es-AR', { month: 'long' });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return 'text-muted-foreground';
    if (score >= 3.5) return 'text-green-600';
    if (score >= 2.5) return 'text-amber-600';
    return 'text-red-600';
  };

  const getTrendIcon = (current: number | null, previous: number | null) => {
    if (!current || !previous) return <Minus className="h-3 w-3 text-muted-foreground" />;
    if (current > previous) return <TrendingUp className="h-3 w-3 text-green-600" />;
    if (current < previous) return <TrendingDown className="h-3 w-3 text-red-600" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  const handleCoachingSuccess = () => {
    setExpandedManagerId(null);
    refetch();
  };

  // Stats
  const totalManagers = managers?.length || 0;
  const completedCount = managers?.filter((m) => m.hasCoachingThisMonth).length || 0;
  const pendingCount = totalManagers - completedCount;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Coaching de Encargados
          </h1>
          <p className="text-muted-foreground capitalize">Evaluaciones de {currentMonth}</p>
        </div>

        {/* Filtro por sucursal */}
        <Select value={branchFilter} onValueChange={setBranchFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Todas las sucursales" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las sucursales</SelectItem>
            {branches?.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalManagers}</p>
                <p className="text-xs text-muted-foreground">Encargados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-950">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedCount}</p>
                <p className="text-xs text-muted-foreground">Evaluados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-950">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-xs text-muted-foreground">Pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de encargados */}
      <Card>
        <CardHeader>
          <CardTitle>Encargados de la Red</CardTitle>
          <CardDescription>
            Seleccioná un encargado para realizar su coaching mensual
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!managers?.length ? (
            <EmptyState
              icon={Users}
              title="Sin encargados"
              description="No hay encargados asignados en las sucursales"
            />
          ) : (
            <div className="space-y-2">
              {managers.map((manager) => {
                const isExpanded = expandedManagerId === `${manager.userId}-${manager.branchId}`;
                const managerId = `${manager.userId}-${manager.branchId}`;

                return (
                  <Collapsible
                    key={managerId}
                    open={isExpanded}
                    onOpenChange={() =>
                      !manager.hasCoachingThisMonth &&
                      setExpandedManagerId(isExpanded ? null : managerId)
                    }
                  >
                    <div
                      className={`border rounded-lg transition-colors ${isExpanded ? 'border-primary bg-muted/50' : ''}`}
                    >
                      <CollapsibleTrigger asChild disabled={manager.hasCoachingThisMonth}>
                        <div
                          className={`flex items-center justify-between p-4 ${!manager.hasCoachingThisMonth ? 'cursor-pointer hover:bg-muted/30' : ''}`}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={manager.avatarUrl || undefined} />
                              <AvatarFallback>{getInitials(manager.fullName)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{manager.fullName}</p>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                {manager.branchName}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {manager.hasCoachingThisMonth && manager.latestCoaching ? (
                              <div className="flex items-center gap-2">
                                <div className="text-right">
                                  <span
                                    className={`font-semibold ${getScoreColor(manager.latestCoaching.overallScore)}`}
                                  >
                                    {manager.latestCoaching.overallScore?.toFixed(1) || '-'}
                                  </span>
                                  <span className="text-xs text-muted-foreground">/5</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  {getTrendIcon(
                                    manager.latestCoaching.overallScore,
                                    manager.previousScore,
                                  )}
                                </div>
                                <Badge variant="secondary" className="gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  Completado
                                </Badge>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">
                                  {isExpanded ? 'Cerrar' : 'Evaluar'}
                                </span>
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="border-t p-4 bg-background">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold">Coaching de {manager.fullName}</h3>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setExpandedManagerId(null)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <CoachingManagerForm
                            employee={{
                              id: manager.userId,
                              full_name: manager.fullName,
                              avatar_url: manager.avatarUrl,
                            }}
                            branchId={manager.branchId}
                            onSuccess={handleCoachingSuccess}
                            onCancel={() => setExpandedManagerId(null)}
                          />
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function CoachingManagersPage() {
  return (
    <RequireBrandPermission
      permission="canCoachManagers"
      noAccessMessage="No tenés permiso para realizar coaching a encargados."
    >
      <CoachingManagersPageContent />
    </RequireBrandPermission>
  );
}
