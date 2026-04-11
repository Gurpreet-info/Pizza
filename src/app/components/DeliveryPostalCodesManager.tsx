import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { DeliveryPostalCode } from '../types';

export interface DeliveryPostalCodesManagerProps {
  rows: DeliveryPostalCode[];
  addRow: (row: Omit<DeliveryPostalCode, 'id'>) => void;
  updateRow: (id: string, row: Partial<DeliveryPostalCode>) => void;
  deleteRow: (id: string) => void;
}

export function DeliveryPostalCodesManager({
  rows,
  addRow,
  updateRow,
  deleteRow,
}: DeliveryPostalCodesManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<DeliveryPostalCode | null>(null);
  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');
  const [active, setActive] = useState(true);

  const resetForm = () => {
    setCode('');
    setLabel('');
    setActive(true);
    setEditing(null);
  };

  const openEdit = (row: DeliveryPostalCode) => {
    setEditing(row);
    setCode(row.code);
    setLabel(row.label);
    setActive(row.active);
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      toast.error('Postal code is required');
      return;
    }
    if (editing) {
      updateRow(editing.id, { code: trimmed, label: label.trim(), active });
      toast.success('Delivery zone updated');
    } else {
      addRow({ code: trimmed, label: label.trim(), active });
      toast.success('Delivery zone added');
    }
    setIsOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm('Remove this postal code from delivery zones?')) {
      deleteRow(id);
      toast.success('Removed');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Delivery postal codes</CardTitle>
          <p className="text-sm text-muted-foreground font-normal mt-1">
            Customers can only choose delivery if their postal code is listed and active. Use pickup for areas outside these zones.
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <Button
            type="button"
            onClick={() => {
              resetForm();
              setIsOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add postal code
          </Button>
          <Dialog
            open={isOpen}
            onOpenChange={(open) => {
              setIsOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? 'Edit zone' : 'Add delivery zone'}</DialogTitle>
                <DialogDescription>
                  Enter a postal or ZIP code as customers would type it (e.g. M5V 3A8). It is stored normalized.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="pc-code">Postal code *</Label>
                  <Input
                    id="pc-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. M5V 3A8"
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="pc-label">Area label (optional)</Label>
                  <Input
                    id="pc-label"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="e.g. Downtown Toronto"
                    className="mt-1"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="pc-active" checked={active} onCheckedChange={setActive} />
                  <Label htmlFor="pc-active">Delivery active for this code</Label>
                </div>
                <DialogFooter>
                  <Button type="submit">{editing ? 'Save' : 'Add'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">
            No postal codes yet. Add at least one to enable delivery at checkout.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono font-medium">{row.code}</TableCell>
                  <TableCell>{row.label || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={row.active ? 'default' : 'secondary'}>
                      {row.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(row)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleDelete(row.id)}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
