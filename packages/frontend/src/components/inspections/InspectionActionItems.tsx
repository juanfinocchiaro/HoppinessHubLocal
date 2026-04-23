/**
 * InspectionActionItems - Editor de acciones a tomar
 */

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { InspectionActionItem } from '@/types/inspection';

interface TeamMember {
  id: string;
  full_name: string;
}

interface InspectionActionItemsProps {
  value: InspectionActionItem[];
  onChange: (items: InspectionActionItem[]) => void;
  teamMembers: TeamMember[];
  readOnly?: boolean;
}

export function InspectionActionItems({
  value,
  onChange,
  teamMembers,
  readOnly = false,
}: InspectionActionItemsProps) {
  const [newDescription, setNewDescription] = useState('');
  const [newResponsible, setNewResponsible] = useState('');
  const [newDueDate, setNewDueDate] = useState('');

  const handleAdd = () => {
    if (!newDescription.trim()) return;

    const responsibleMember = teamMembers.find((m) => m.id === newResponsible);

    const newItem: InspectionActionItem = {
      id: crypto.randomUUID(),
      description: newDescription.trim(),
      responsible_id: newResponsible || '',
      responsible_name: responsibleMember?.full_name || '',
      due_date: newDueDate || '',
      completed: false,
    };

    onChange([...value, newItem]);
    setNewDescription('');
    setNewResponsible('');
    setNewDueDate('');
  };

  const handleRemove = (id: string) => {
    onChange(value.filter((item) => item.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newDescription.trim()) {
      e.preventDefault();
      handleAdd();
    }
  };

  if (readOnly) {
    if (value.length === 0) return null;

    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Acciones a Tomar</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {value.map((item, idx) => (
              <li key={item.id} className="flex items-start gap-2 text-sm p-2 bg-muted/50 rounded">
                <span className="font-medium">{idx + 1}.</span>
                <div>
                  <p>{item.description}</p>
                  {(item.responsible_name || item.due_date) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.responsible_name && `Responsable: ${item.responsible_name}`}
                      {item.responsible_name && item.due_date && ' • '}
                      {item.due_date && `Vence: ${item.due_date}`}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Acciones a Tomar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing items */}
        {value.length > 0 && (
          <ul className="space-y-2">
            {value.map((item, idx) => (
              <li
                key={item.id}
                className="flex items-start gap-2 text-sm p-2 bg-muted/50 rounded group"
              >
                <span className="font-medium shrink-0">{idx + 1}.</span>
                <div className="flex-1">
                  <p>{item.description}</p>
                  {(item.responsible_name || item.due_date) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.responsible_name && `Responsable: ${item.responsible_name}`}
                      {item.responsible_name && item.due_date && ' • '}
                      {item.due_date && `Vence: ${item.due_date}`}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemove(item.id)}
                >
                  <Trash2 className="w-3 h-3 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        {/* Add new item */}
        <div className="space-y-3 pt-2 border-t">
          <div>
            <Label className="text-xs">Nueva acción</Label>
            <Input
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Descripción de la acción..."
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Responsable</Label>
              <Select value={newResponsible || undefined} onValueChange={setNewResponsible}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Fecha límite</Label>
              <div className="relative mt-1">
                <Input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleAdd}
            disabled={!newDescription.trim()}
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar Acción
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
