/**
 * AuditLogPage - View audit trail of system changes
 * Accessible to superadmin only
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAuditLogs, fetchAuditLogTables } from '@/services/adminService';
import { PageHeader } from '@/components/ui/page-header';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { History, Search, ChevronLeft, ChevronRight, Eye, Shield } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { EmptyState } from '@/components/ui/states/empty-state';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const PAGE_SIZE = 50;

const actionLabels: Record<string, string> = {
  INSERT: 'Creación',
  UPDATE: 'Modificación',
  DELETE: 'Eliminación',
};

const actionVariants: Record<string, 'default' | 'secondary' | 'destructive'> = {
  INSERT: 'default',
  UPDATE: 'secondary',
  DELETE: 'destructive',
};

export default function AuditLogPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [tableFilter, setTableFilter] = useState('');
  const [page, setPage] = useState(0);
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, debouncedSearch, tableFilter],
    queryFn: () =>
      fetchAuditLogs({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch || undefined,
        tableFilter: tableFilter || undefined,
      }),
  });

  const { data: tables } = useQuery({
    queryKey: ['audit-log-tables'],
    queryFn: fetchAuditLogTables,
    staleTime: 5 * 60 * 1000,
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Historial de Cambios"
        subtitle={`${total} registros`}
        icon={<History className="w-5 h-5" />}
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por tabla o acción..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="pl-9"
          />
        </div>
        <select
          value={tableFilter}
          onChange={(e) => {
            setTableFilter(e.target.value);
            setPage(0);
          }}
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">Todas las tablas</option>
          {tables?.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={Shield}
              title="Sin registros"
              description="No se encontraron registros de auditoría para los filtros seleccionados."
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Acción</TableHead>
                  <TableHead>Tabla</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead className="text-center">Detalle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {log.created_at
                        ? format(new Date(log.created_at), 'dd/MM/yy HH:mm', { locale: es })
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={actionVariants[log.action] || 'secondary'}>
                        {actionLabels[log.action] || log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{log.table_name}</TableCell>
                    <TableCell className="text-sm">
                      {log.profiles?.full_name ||
                        log.profiles?.email ||
                        log.user_id?.substring(0, 8) ||
                        'Sistema'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button size="sm" variant="ghost" onClick={() => setSelectedLog(log)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Página {page + 1} de {totalPages || 1}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Detail dialog */}
      <Dialog
        open={!!selectedLog}
        onOpenChange={(open) => {
          if (!open) setSelectedLog(null);
        }}
      >
        <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle del registro</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Tabla:</span>{' '}
                  <span className="font-mono">{selectedLog.table_name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Acción:</span>{' '}
                  {actionLabels[selectedLog.action] || selectedLog.action}
                </div>
                <div>
                  <span className="text-muted-foreground">Registro:</span>{' '}
                  <span className="font-mono text-xs">{selectedLog.record_id || '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">IP:</span> {selectedLog.ip_address || '-'}
                </div>
              </div>

              {selectedLog.old_data && (
                <div>
                  <p className="text-sm font-medium mb-1 text-muted-foreground">Datos anteriores</p>
                  <pre className="bg-muted rounded-md p-3 text-xs overflow-x-auto max-h-40">
                    {JSON.stringify(selectedLog.old_data, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.new_data && (
                <div>
                  <p className="text-sm font-medium mb-1 text-muted-foreground">Datos nuevos</p>
                  <pre className="bg-muted rounded-md p-3 text-xs overflow-x-auto max-h-40">
                    {JSON.stringify(selectedLog.new_data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
