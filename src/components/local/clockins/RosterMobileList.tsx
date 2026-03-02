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
import { MoreVertical, Pencil, Trash2, Stethoscope, ChevronDown, Camera, AlertTriangle, Hand } from 'lucide-react';
import { formatDuration } from './helpers';
import { RosterExpandedRow } from './RosterExpandedRow';
import { STATUS_LABEL, STATUS_COLOR, type WindowConfig, DEFAULT_WINDOW } from './constants';
import type { ClockEntry, RosterRow } from './types';

interface Props {
  rows: RosterRow[];
  branchId: string;
  selectedDate: Date;
  isToday: boolean;
  canEdit?: boolean;
  windowConfig?: WindowConfig;
  onMarkLeave?: (userId: string, userName: string) => void;
  onOpenPhotos?: (payload: { userName: string; shiftLabel: string; entries: ClockEntry[] }) => void;
  onEditEntry?: (entry: ClockEntry) => void;
  onDeleteEntry?: (entry: ClockEntry) => void;
}

export function RosterMobileList({
  rows,
  branchId,
  selectedDate,
  isToday: _isToday,
  canEdit,
  windowConfig = DEFAULT_WINDOW,
  onMarkLeave,
  onOpenPhotos,
  onEditEntry,
  onDeleteEntry,
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

  return (
    <div className="divide-y">
      {groupedRows.map((group) => {
        const isExpanded = expandedUserId === group.userId;
        const mainRow = group.rows[0];

        const allEntries = mainRow.sessions.flatMap((s) => [s.clockIn, s.clockOut].filter(Boolean)) as ClockEntry[];
        const editableEntry = allEntries.length > 0 ? allEntries[allEntries.length - 1] : null;
        const canLeave = (mainRow.status === 'absent' || mainRow.status === 'pending') && onMarkLeave && !mainRow.isSubRow;
        const showMenu = canEdit && (editableEntry || canLeave);

        return (
          <Fragment key={group.userId}>
            <div
              onClick={() => setExpandedUserId(isExpanded ? null : group.userId)}
              className="cursor-pointer active:bg-muted/60 transition-colors"
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{mainRow.userName}</span>
                    <span className={`text-xs font-medium ${STATUS_COLOR[mainRow.status]}`}>
                      {STATUS_LABEL[mainRow.status]}
                    </span>
                    {mainRow.anomalyDetail && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[250px]">
                          <span className="text-xs">{mainRow.anomalyDetail}</span>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {mainRow.hasManualEntry && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Hand className="w-3 h-3 text-blue-500 flex-shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <span className="text-xs">Fichaje manual</span>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                    <span className="font-mono">{mainRow.shiftLabel}</span>
                    {mainRow.entryTime && (
                      <span className={`font-mono ${mainRow.isLate ? 'text-amber-600' : ''}`}>
                        {mainRow.entryTime}
                        {mainRow.exitTime ? ` → ${mainRow.exitTime}` : ''}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {mainRow.totalMinutes > 0 && (
                    <span className="text-sm font-mono font-medium">
                      {formatDuration(mainRow.totalMinutes)}
                    </span>
                  )}
                  {(() => {
                    const all = mainRow.sessions.flatMap((s) =>
                      [s.clockIn, s.clockOut].filter(Boolean),
                    ) as ClockEntry[];
                    const photos = all.filter((e) => !!e.photo_url);
                    if (!onOpenPhotos || photos.length === 0) return null;
                    return (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenPhotos({
                            userName: mainRow.userName,
                            shiftLabel: mainRow.shiftLabel,
                            entries: photos,
                          });
                        }}
                        className="p-1 rounded text-muted-foreground"
                        title={`Ver fotos (${photos.length})`}
                      >
                        <Camera className="w-3.5 h-3.5" />
                      </button>
                    );
                  })()}
                  {showMenu && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 rounded text-muted-foreground"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        {editableEntry && onEditEntry && (
                          <DropdownMenuItem onClick={() => onEditEntry(editableEntry)}>
                            <Pencil className="w-3.5 h-3.5 mr-2" />
                            Corregir fichaje
                          </DropdownMenuItem>
                        )}
                        {editableEntry && onDeleteEntry && (
                          <DropdownMenuItem onClick={() => onDeleteEntry(editableEntry)} className="text-destructive focus:text-destructive">
                            <Trash2 className="w-3.5 h-3.5 mr-2" />
                            Eliminar fichaje
                          </DropdownMenuItem>
                        )}
                        {canLeave && (
                          <DropdownMenuItem onClick={() => onMarkLeave!(mainRow.userId, mainRow.userName)}>
                            <Stethoscope className="w-3.5 h-3.5 mr-2" />
                            Marcar licencia
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </div>
              </div>

              {group.rows.slice(1).map((subRow) => (
                <div key={subRow.rowKey} className="flex items-center gap-3 px-4 pb-2 pl-8">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>↳</span>
                      <span className="font-mono">{subRow.shiftLabel}</span>
                      {subRow.entryTime && (
                        <span className={`font-mono ${subRow.isLate ? 'text-amber-600' : ''}`}>
                          {subRow.entryTime}
                          {subRow.exitTime ? ` → ${subRow.exitTime}` : ''}
                        </span>
                      )}
                      <span className={`font-medium ${STATUS_COLOR[subRow.status]}`}>
                        {STATUS_LABEL[subRow.status]}
                      </span>
                      {subRow.anomalyDetail && (
                        <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />
                      )}
                      {subRow.hasManualEntry && (
                        <Hand className="w-3 h-3 text-blue-500 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                  {subRow.totalMinutes > 0 && (
                    <span className="text-xs font-mono flex-shrink-0">
                      {formatDuration(subRow.totalMinutes)}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {isExpanded && (
              <RosterExpandedRow
                row={mainRow}
                branchId={branchId}
                selectedDate={selectedDate}
                canEdit={canEdit}
                windowConfig={windowConfig}
                onEditEntry={onEditEntry}
                onDeleteEntry={onDeleteEntry}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
