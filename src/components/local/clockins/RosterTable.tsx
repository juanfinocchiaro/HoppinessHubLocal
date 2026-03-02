import { useState, Fragment, useMemo } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Pencil, Trash2, Stethoscope, Camera, AlertTriangle, Hand } from 'lucide-react';
import { formatDuration } from './helpers';
import { RosterExpandedRow } from './RosterExpandedRow';
import { STATUS_LABEL, STATUS_COLOR, GROUP_BG, type WindowConfig, DEFAULT_WINDOW } from './constants';
import type { ClockEntry, RosterRow } from './types';

interface Props {
  rows: RosterRow[];
  branchId: string;
  selectedDate: Date;
  isToday: boolean;
  canEdit?: boolean;
  windowConfig?: WindowConfig;
  onEditEntry?: (entry: ClockEntry) => void;
  onDeleteEntry?: (entry: ClockEntry) => void;
  onMarkLeave?: (userId: string, userName: string) => void;
  onOpenPhotos?: (payload: { userName: string; shiftLabel: string; entries: ClockEntry[] }) => void;
}

function RowActions({
  row,
  canEdit,
  onEdit,
  onDelete,
  onMarkLeave,
}: {
  row: RosterRow;
  canEdit?: boolean;
  onEdit?: (e: ClockEntry) => void;
  onDelete?: (e: ClockEntry) => void;
  onMarkLeave?: (userId: string, userName: string) => void;
}) {
  if (!canEdit) return null;

  const allEntries = row.sessions.flatMap((s) => [s.clockIn, s.clockOut].filter(Boolean)) as ClockEntry[];
  const editableEntry = allEntries.length > 0 ? allEntries[allEntries.length - 1] : null;
  const canLeave = (row.status === 'absent' || row.status === 'pending') && onMarkLeave && !row.isSubRow;

  if (!editableEntry && !canLeave) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {editableEntry && onEdit && (
          <DropdownMenuItem onClick={() => onEdit(editableEntry)}>
            <Pencil className="w-3.5 h-3.5 mr-2" />
            Corregir fichaje
          </DropdownMenuItem>
        )}
        {editableEntry && onDelete && (
          <DropdownMenuItem onClick={() => onDelete(editableEntry)} className="text-destructive focus:text-destructive">
            <Trash2 className="w-3.5 h-3.5 mr-2" />
            Eliminar fichaje
          </DropdownMenuItem>
        )}
        {canLeave && (
          <DropdownMenuItem onClick={() => onMarkLeave!(row.userId, row.userName)}>
            <Stethoscope className="w-3.5 h-3.5 mr-2" />
            Marcar licencia
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function StatusCell({ row }: { row: RosterRow }) {
  const hasAnomaly = !!row.anomalyDetail;
  const hasManual = !!row.hasManualEntry;

  return (
    <span className="inline-flex items-center gap-1">
      <span className={`text-xs font-medium ${STATUS_COLOR[row.status]}`}>
        {STATUS_LABEL[row.status]}
        {row.isLate && ` (${row.lateMinutes}m)`}
      </span>
      {hasAnomaly && (
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 cursor-help" />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[250px]">
            <span className="text-xs">{row.anomalyDetail}</span>
          </TooltipContent>
        </Tooltip>
      )}
      {hasManual && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Hand className="w-3 h-3 text-blue-500 cursor-help" />
          </TooltipTrigger>
          <TooltipContent side="top">
            <span className="text-xs">Fichaje manual</span>
          </TooltipContent>
        </Tooltip>
      )}
    </span>
  );
}

export function RosterTable({
  rows,
  branchId,
  selectedDate,
  isToday: _isToday,
  canEdit,
  windowConfig = DEFAULT_WINDOW,
  onEditEntry,
  onDeleteEntry,
  onMarkLeave,
  onOpenPhotos,
}: Props) {
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  const groupedRows = useMemo(() => {
    const groups: { userId: string; rows: RosterRow[] }[] = [];
    let current: { userId: string; rows: RosterRow[] } | null = null;

    for (const row of rows) {
      if (!row.isSubRow) {
        current = { userId: row.userId, rows: [row] };
        groups.push(current);
      } else if (current && current.userId === row.userId) {
        current.rows.push(row);
      } else {
        current = { userId: row.userId, rows: [row] };
        groups.push(current);
      }
    }
    return groups;
  }, [rows]);

  if (rows.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No hay horarios ni fichajes registrados</p>;
  }

  const colCount = canEdit ? 7 : 6;

  const getPhotoEntries = (row: RosterRow): ClockEntry[] => {
    const all = row.sessions.flatMap((s) => [s.clockIn, s.clockOut].filter(Boolean)) as ClockEntry[];
    const withPhoto = all.filter((e) => !!e.photo_url);
    const dedup = new Map<string, ClockEntry>();
    for (const e of withPhoto) dedup.set(e.id, e);
    return [...dedup.values()].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground text-left text-xs">
            <th className="py-2 pl-4 pr-2 font-medium w-[28%]">Empleado</th>
            <th className="py-2 px-2 font-medium">Turno</th>
            <th className="py-2 px-2 font-medium">Entrada</th>
            <th className="py-2 px-2 font-medium">Salida</th>
            <th className="py-2 px-2 font-medium">Estado</th>
            <th className="py-2 px-2 font-medium text-right">Horas</th>
            {canEdit && <th className="py-2 px-2 font-medium w-10" />}
          </tr>
        </thead>
        <tbody>
          {groupedRows.map((group, gIdx) => {
            const isExpanded = expandedUserId === group.userId;
            const mainRow = group.rows[0];
            const hasMultiple = group.rows.length > 1;
            const groupBg = GROUP_BG[mainRow.status] ?? '';

            return (
              <Fragment key={group.userId}>
                <tr
                  className={`group cursor-pointer hover:bg-muted/40 transition-colors ${groupBg} ${gIdx > 0 ? 'border-t' : ''}`}
                  onClick={() => setExpandedUserId(isExpanded ? null : group.userId)}
                >
                  <td className={`py-2.5 pl-4 pr-2 ${hasMultiple ? 'pb-0' : ''}`}>
                    <span className="font-medium">{mainRow.userName}</span>
                  </td>
                  <td className="py-2.5 px-2 text-muted-foreground font-mono text-xs">
                    {mainRow.shiftLabel}
                  </td>
                  <td className={`py-2.5 px-2 font-mono ${mainRow.isLate ? 'text-amber-600 font-semibold' : ''}`}>
                    <span className="inline-flex items-center gap-1.5">
                      <span>{mainRow.entryTime ?? '—'}</span>
                      {(() => {
                        const photos = getPhotoEntries(mainRow);
                        if (!onOpenPhotos || photos.length === 0) return null;
                        return (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenPhotos({ userName: mainRow.userName, shiftLabel: mainRow.shiftLabel, entries: photos });
                            }}
                            className="text-muted-foreground hover:text-foreground"
                            title={`Ver fotos (${photos.length})`}
                          >
                            <Camera className="w-3.5 h-3.5" />
                          </button>
                        );
                      })()}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 font-mono">{mainRow.exitTime ?? '—'}</td>
                  <td className="py-2.5 px-2">
                    <StatusCell row={mainRow} />
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono">
                    {mainRow.totalMinutes > 0 ? formatDuration(mainRow.totalMinutes) : '—'}
                  </td>
                  {canEdit && (
                    <td className="py-2.5 px-2 text-right">
                      <RowActions row={mainRow} canEdit={canEdit} onEdit={onEditEntry} onDelete={onDeleteEntry} onMarkLeave={onMarkLeave} />
                    </td>
                  )}
                </tr>

                {group.rows.slice(1).map((subRow) => (
                  <tr
                    key={subRow.rowKey}
                    className={`group cursor-pointer hover:bg-muted/40 transition-colors ${groupBg}`}
                    onClick={() => setExpandedUserId(isExpanded ? null : group.userId)}
                  >
                    <td className="py-1.5 pl-4 pr-2">
                      <span className="text-xs text-muted-foreground pl-4">↳</span>
                    </td>
                    <td className="py-1.5 px-2 text-muted-foreground font-mono text-xs">{subRow.shiftLabel}</td>
                    <td className={`py-1.5 px-2 font-mono ${subRow.isLate ? 'text-amber-600 font-semibold' : ''}`}>
                      <span className="inline-flex items-center gap-1.5">
                        <span>{subRow.entryTime ?? '—'}</span>
                        {(() => {
                          const photos = getPhotoEntries(subRow);
                          if (!onOpenPhotos || photos.length === 0) return null;
                          return (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenPhotos({ userName: subRow.userName, shiftLabel: subRow.shiftLabel, entries: photos });
                              }}
                              className="text-muted-foreground hover:text-foreground"
                              title={`Ver fotos (${photos.length})`}
                            >
                              <Camera className="w-3.5 h-3.5" />
                            </button>
                          );
                        })()}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 font-mono">{subRow.exitTime ?? '—'}</td>
                    <td className="py-1.5 px-2">
                      <StatusCell row={subRow} />
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono">
                      {subRow.totalMinutes > 0 ? formatDuration(subRow.totalMinutes) : '—'}
                    </td>
                    {canEdit && (
                      <td className="py-1.5 px-2 text-right">
                        <RowActions row={subRow} canEdit={canEdit} onEdit={onEditEntry} onDelete={onDeleteEntry} onMarkLeave={onMarkLeave} />
                      </td>
                    )}
                  </tr>
                ))}

                {isExpanded && (
                  <tr>
                    <td colSpan={colCount} className="p-0">
                      <RosterExpandedRow
                        row={mainRow}
                        branchId={branchId}
                        selectedDate={selectedDate}
                        canEdit={canEdit}
                        windowConfig={windowConfig}
                        onEditEntry={onEditEntry}
                        onDeleteEntry={onDeleteEntry}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
