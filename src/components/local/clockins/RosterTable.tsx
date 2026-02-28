import { useState, Fragment, useMemo } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Pencil, Trash2, Stethoscope, Camera } from 'lucide-react';
import { formatDuration } from './helpers';
import { RosterExpandedRow } from './RosterExpandedRow';
import { STATUS_LABEL, STATUS_COLOR, GROUP_BG, type WindowConfig, DEFAULT_WINDOW } from './constants';
import type { ClockEntry, RosterRow, RosterRowStatus } from './types';

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

function ActionButtons({
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

  return (
    <span className="inline-flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      {editableEntry && onEdit && (
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(editableEntry); }}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
          title="Editar fichaje"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      )}
      {editableEntry && onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(editableEntry); }}
          className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
          title="Eliminar fichaje"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
      {(row.status === 'absent' || row.status === 'pending') && onMarkLeave && !row.isSubRow && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={(e) => { e.stopPropagation(); onMarkLeave(row.userId, row.userName); }}
              className="p-1 rounded hover:bg-purple-100 text-purple-500 hover:text-purple-700"
              title="Marcar licencia"
            >
              <Stethoscope className="w-3.5 h-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent><span className="text-xs">Marcar licencia</span></TooltipContent>
        </Tooltip>
      )}
    </span>
  );
}

export function RosterTable({
  rows,
  branchId,
  selectedDate,
  isToday,
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
            {canEdit && <th className="py-2 px-2 font-medium w-20" />}
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
                    <span className={`text-xs font-medium ${STATUS_COLOR[mainRow.status]}`}>
                      {STATUS_LABEL[mainRow.status]}
                      {mainRow.isLate && ` (${mainRow.lateMinutes}m)`}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono">
                    {mainRow.totalMinutes > 0 ? formatDuration(mainRow.totalMinutes) : '—'}
                  </td>
                  {canEdit && (
                    <td className="py-2.5 px-2 text-right">
                      <ActionButtons row={mainRow} canEdit={canEdit} onEdit={onEditEntry} onDelete={onDeleteEntry} onMarkLeave={onMarkLeave} />
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
                      <span className={`text-xs font-medium ${STATUS_COLOR[subRow.status]}`}>
                        {STATUS_LABEL[subRow.status]}
                        {subRow.isLate && ` (${subRow.lateMinutes}m)`}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono">
                      {subRow.totalMinutes > 0 ? formatDuration(subRow.totalMinutes) : '—'}
                    </td>
                    {canEdit && (
                      <td className="py-1.5 px-2 text-right">
                        <ActionButtons row={subRow} canEdit={canEdit} onEdit={onEditEntry} onDelete={onDeleteEntry} onMarkLeave={onMarkLeave} />
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
