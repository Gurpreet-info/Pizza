import React, { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, GripVertical, X } from 'lucide-react';
import { bucketOptionsByGroupId } from '../lib/optionGroupIds';
import { Category, MenuItem, Option, OptionGroup } from '../types';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';
import { Switch } from './ui/switch';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './ui/command';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from './ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { cn } from './ui/utils';

const COMBO_POPOVER =
  'z-[100] flex max-h-[min(18rem,var(--radix-popover-content-available-height,18rem))] flex-col overflow-hidden p-0 w-[min(calc(100vw-2rem),28rem)] sm:w-[var(--radix-popover-trigger-width)]';
const COMBO_COMMAND = 'flex min-h-0 flex-1 flex-col overflow-hidden';
const COMBO_LIST =
  'max-h-[min(14rem,calc(var(--radix-popover-content-available-height,18rem)-2.75rem))] min-h-0 flex-1 overflow-y-auto overscroll-contain';
const COMBO_PROPS = { side: 'bottom' as const, align: 'start' as const, collisionPadding: 16, sticky: 'partial' as const };

/** Select dropdowns must sit above the admin sheet (z-[60]). */
export const ADMIN_SHEET_SELECT_CONTENT_CLASS = 'z-[100]';

export function AdminFormSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="z-[60] flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        <SheetHeader className="border-b px-6 py-4 text-left">
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
        {footer ? <SheetFooter className="mt-0 border-t px-6 py-4">{footer}</SheetFooter> : null}
      </SheetContent>
    </Sheet>
  );
}

export function getOptionGroupMenuItemIds(group: OptionGroup): string[] {
  if (group.menuItemIds?.length > 0) return [...group.menuItemIds];
  if (group.menuItemId) return [group.menuItemId];
  return [];
}

export function getOptionGroupOrderForMenuItem(group: OptionGroup, menuItemId: string): number {
  return group.pivotOrderByMenuItem?.[menuItemId] ?? group.order ?? 0;
}

export function getLinkedOptionGroupIdsForMenuItem(
  menuItemId: string,
  optionGroups: OptionGroup[]
): string[] {
  return optionGroups
    .filter((g) => getOptionGroupMenuItemIds(g).includes(menuItemId))
    .sort((a, b) => {
      const byOrder = getOptionGroupOrderForMenuItem(a, menuItemId) - getOptionGroupOrderForMenuItem(b, menuItemId);
      if (byOrder !== 0) return byOrder;
      return (Number(a.id) || 0) - (Number(b.id) || 0);
    })
    .map((g) => g.id);
}

export function formatOptionGroupMenuItemNames(group: OptionGroup, menuItems: MenuItem[]) {
  const ids =
    group.menuItemIds?.length > 0
      ? group.menuItemIds
      : group.menuItemId
        ? [group.menuItemId]
        : [];
  return ids
    .map((mid) => menuItems.find((m) => m.id === mid)?.name)
    .filter(Boolean)
    .join(', ');
}

export function formatMenuItemCategoryNames(item: MenuItem, categories: Category[]) {
  const ids =
    item.categoryIds?.length > 0
      ? item.categoryIds
      : item.categoryId
        ? [item.categoryId]
        : [];
  return ids
    .map((id) => categories.find((c) => c.id === id)?.name)
    .filter(Boolean)
    .join(', ');
}

export function CategoriesMultiSelect({
  categories,
  value,
  onChange,
  label,
  description,
}: {
  categories: Category[];
  value: string[];
  onChange: (ids: string[]) => void;
  label: string;
  description?: string;
}) {
  const [open, setOpen] = useState(false);
  const sorted = useMemo(
    () => [...categories].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)),
    [categories]
  );

  const toggle = (categoryId: string) => {
    onChange(
      value.includes(categoryId)
        ? value.filter((id) => id !== categoryId)
        : [...value, categoryId]
    );
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {description ? <p className="text-muted-foreground text-xs">{description}</p> : null}
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((categoryId) => {
            const name = categories.find((c) => c.id === categoryId)?.name;
            if (!name) return null;
            return (
              <Badge key={categoryId} variant="secondary" className="font-normal">
                {name}
              </Badge>
            );
          })}
        </div>
      ) : null}
      <Popover modal={false} open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <span className="truncate text-left">
              {value.length > 0 ? `${value.length} categor${value.length === 1 ? 'y' : 'ies'} selected` : 'Select categories'}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent {...COMBO_PROPS} className={COMBO_POPOVER}>
          <Command
            className={COMBO_COMMAND}
            filter={(val, search) => {
              const q = search.trim().toLowerCase();
              if (!q) return 1;
              return val.toLowerCase().includes(q) ? 1 : 0;
            }}
          >
            <CommandInput
              placeholder="Search categories…"
              onKeyDown={(e) => e.stopPropagation()}
            />
            <CommandList className={COMBO_LIST}>
              <CommandEmpty>No category found.</CommandEmpty>
              <CommandGroup>
                {sorted.map((cat) => (
                  <CommandItem
                    key={cat.id}
                    value={`${cat.id} ${cat.name}`}
                    onSelect={() => toggle(cat.id)}
                  >
                    <Check
                      className={cn(
                        'h-4 w-4 shrink-0',
                        value.includes(cat.id) ? 'opacity-100' : 'opacity-0'
                      )}
                      aria-hidden
                    />
                    <span className="truncate">{cat.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function MenuItemsMultiSelect({
  menuItems,
  value,
  onChange,
  label,
  description,
}: {
  menuItems: MenuItem[];
  value: string[];
  onChange: (ids: string[]) => void;
  label: string;
  description?: string;
}) {
  const [open, setOpen] = useState(false);
  const sorted = useMemo(
    () => [...menuItems].sort((a, b) => a.name.localeCompare(b.name)),
    [menuItems]
  );

  const toggle = (itemId: string) => {
    onChange(
      value.includes(itemId) ? value.filter((id) => id !== itemId) : [...value, itemId]
    );
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {description ? <p className="text-muted-foreground text-xs">{description}</p> : null}
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((itemId) => {
            const name = menuItems.find((m) => m.id === itemId)?.name;
            if (!name) return null;
            return (
              <Badge key={itemId} variant="secondary" className="font-normal">
                {name}
              </Badge>
            );
          })}
        </div>
      ) : null}
      <Popover modal={false} open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <span className="truncate text-left">
              {value.length > 0 ? `${value.length} menu item(s) selected` : 'Select menu items'}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent {...COMBO_PROPS} className={COMBO_POPOVER}>
          <Command
            className={COMBO_COMMAND}
            filter={(val, search) => {
              const q = search.trim().toLowerCase();
              if (!q) return 1;
              return val.toLowerCase().includes(q) ? 1 : 0;
            }}
          >
            <CommandInput
              placeholder="Search menu items…"
              onKeyDown={(e) => e.stopPropagation()}
            />
            <CommandList className={COMBO_LIST}>
              <CommandEmpty>No menu item found.</CommandEmpty>
              <CommandGroup>
                {sorted.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={`${item.id} ${item.name}`}
                    onSelect={() => toggle(item.id)}
                  >
                    <Check
                      className={cn(
                        'h-4 w-4 shrink-0',
                        value.includes(item.id) ? 'opacity-100' : 'opacity-0'
                      )}
                      aria-hidden
                    />
                    <span className="truncate">{item.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export type OptionGroupRulesForm = {
  type: 'single' | 'multiple';
  required: boolean;
  minSelections: string;
  maxSelections: string;
  allowRepeatSelections: boolean;
};

export function optionGroupToRulesForm(group: OptionGroup): OptionGroupRulesForm {
  return {
    type: group.type,
    required: group.required,
    minSelections: group.minSelections != null ? String(group.minSelections) : '',
    maxSelections: group.maxSelections != null ? String(group.maxSelections) : '',
    allowRepeatSelections: Boolean(group.allowRepeatSelections),
  };
}

export function rulesFormToPartialOptionGroup(rules: OptionGroupRulesForm): Partial<OptionGroup> {
  const patch: Partial<OptionGroup> = {
    type: rules.type,
    required: rules.required,
  };
  if (rules.type === 'multiple') {
    patch.minSelections = rules.minSelections.trim()
      ? Number.parseInt(rules.minSelections, 10)
      : undefined;
    patch.maxSelections = rules.maxSelections.trim()
      ? Number.parseInt(rules.maxSelections, 10)
      : undefined;
    patch.allowRepeatSelections = rules.allowRepeatSelections;
  } else {
    patch.minSelections = undefined;
    patch.maxSelections = undefined;
    patch.allowRepeatSelections = false;
  }
  return patch;
}

export function OptionGroupRulesFields({
  value,
  onChange,
  idPrefix,
}: {
  value: OptionGroupRulesForm;
  onChange: (patch: Partial<OptionGroupRulesForm>) => void;
  idPrefix: string;
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor={`${idPrefix}-type`}>Selection type</Label>
        <Select
          modal={false}
          value={value.type}
          onValueChange={(v: 'single' | 'multiple') =>
            onChange({
              type: v,
              ...(v === 'single' ? { allowRepeatSelections: false } : {}),
            })
          }
        >
          <SelectTrigger id={`${idPrefix}-type`}>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent className={ADMIN_SHEET_SELECT_CONTENT_CLASS}>
            <SelectItem value="single">Single select</SelectItem>
            <SelectItem value="multiple">Multiple select</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          id={`${idPrefix}-required`}
          checked={value.required}
          onCheckedChange={(checked) => onChange({ required: checked })}
        />
        <Label htmlFor={`${idPrefix}-required`}>Required</Label>
      </div>
      {value.type === 'multiple' ? (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor={`${idPrefix}-min`}>Min options</Label>
            <Input
              id={`${idPrefix}-min`}
              type="number"
              min={0}
              value={value.minSelections}
              onChange={(e) => onChange({ minSelections: e.target.value })}
              placeholder="e.g. 1"
            />
            <p className="text-muted-foreground mt-1 text-xs">Minimum choices customer must pick.</p>
          </div>
          <div>
            <Label htmlFor={`${idPrefix}-max`}>Max options</Label>
            <Input
              id={`${idPrefix}-max`}
              type="number"
              min={0}
              value={value.maxSelections}
              onChange={(e) => onChange({ maxSelections: e.target.value })}
              placeholder="e.g. 3"
            />
            <p className="text-muted-foreground mt-1 text-xs">Maximum choices allowed.</p>
          </div>
        </div>
      ) : null}
      {value.type === 'multiple' ? (
        <div className="flex items-start space-x-2 rounded-md border border-border/60 p-3">
          <Switch
            id={`${idPrefix}-allow-repeat`}
            checked={value.allowRepeatSelections}
            onCheckedChange={(checked) => onChange({ allowRepeatSelections: checked })}
          />
          <div className="space-y-0.5">
            <Label htmlFor={`${idPrefix}-allow-repeat`} className="cursor-pointer">
              Customer can choose multiple selection of same option
            </Label>
            <p className="text-muted-foreground text-xs">
              When max is 3, they can pick the same topping three times or three different toppings.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export type NewOptionGroupDraft = {
  localId: string;
  name: string;
} & OptionGroupRulesForm;

export function createEmptyOptionGroupDraft(): NewOptionGroupDraft {
  return {
    localId: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: '',
    type: 'single',
    required: false,
    minSelections: '',
    maxSelections: '',
    allowRepeatSelections: false,
  };
}

/** Preserve selection order when picking from the combobox. */
export function mergeOptionGroupSelection(prev: string[], next: string[]): string[] {
  const kept = prev.filter((id) => next.includes(id));
  const added = next.filter((id) => !prev.includes(id));
  return [...kept, ...added];
}

function OptionGroupOptionsTooltipBody({
  groupName,
  groupOptions,
}: {
  groupName: string;
  groupOptions: Option[];
}) {
  if (groupOptions.length === 0) {
    return (
      <div>
        <p className="font-medium">{groupName}</p>
        <p className="text-primary-foreground/80 mt-1">No options in this group yet.</p>
      </div>
    );
  }
  return (
    <div className="max-w-[16rem]">
      <p className="mb-1.5 font-medium">{groupName}</p>
      <p className="text-primary-foreground/80 mb-1 text-[11px]">Options ({groupOptions.length})</p>
      <ul className="max-h-48 space-y-0.5 overflow-y-auto pr-0.5">
        {groupOptions.map((opt) => (
          <li
            key={opt.id}
            className={cn('leading-snug', !opt.active && 'text-primary-foreground/60')}
          >
            {opt.name}
            {opt.price > 0 ? ` (+$${opt.price.toFixed(2)})` : ''}
            {!opt.active ? ' · inactive' : ''}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LinkedOptionGroupsSortableList({
  optionGroups,
  options,
  orderedIds,
  onReorder,
  onRemove,
  rulesByGroupId,
  onRulesChange,
}: {
  optionGroups: OptionGroup[];
  options: Option[];
  orderedIds: string[];
  onReorder: (ids: string[]) => void;
  onRemove: (id: string) => void;
  rulesByGroupId: Record<string, OptionGroupRulesForm>;
  onRulesChange: (groupId: string, patch: Partial<OptionGroupRulesForm>) => void;
}) {
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const optionsByGroupId = useMemo(() => bucketOptionsByGroupId(options), [options]);

  const moveDraggedTo = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;
    const fromIndex = orderedIds.indexOf(draggedId);
    const toIndex = orderedIds.indexOf(targetId);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;
    const next = [...orderedIds];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    onReorder(next);
  };

  const handleDragStart = (e: React.DragEvent, groupId: string) => {
    setDraggedId(groupId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', groupId);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    moveDraggedTo(targetId);
  };

  const endDrag = () => setDraggedId(null);

  if (orderedIds.length === 0) {
    return (
      <p className="text-muted-foreground rounded-md border border-dashed px-3 py-4 text-center text-xs">
        No option groups linked yet. Use the picker above or create a new group below.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {orderedIds.map((groupId, index) => {
        const group = optionGroups.find((g) => g.id === groupId);
        if (!group) return null;
        const rules = rulesByGroupId[groupId] ?? optionGroupToRulesForm(group);
        const isDragging = draggedId === groupId;
        const isDropTarget = draggedId != null && draggedId !== groupId;
        const groupOptions = optionsByGroupId.get(groupId) ?? [];
        return (
          <li
            key={groupId}
            className={cn(
              'overflow-hidden rounded-md border bg-card transition-shadow',
              isDragging && 'opacity-60',
              isDropTarget && 'ring-1 ring-primary/30'
            )}
            onDragOver={(e) => handleDragOver(e, groupId)}
            onDrop={(e) => {
              e.preventDefault();
              endDrag();
            }}
          >
            <div className="flex items-center bg-black text-white">
              <Tooltip delayDuration={350} open={isDragging ? false : undefined}>
                <TooltipTrigger asChild>
                  <div
                    draggable
                    onDragStart={(e) => handleDragStart(e, groupId)}
                    onDragEnd={endDrag}
                    className="flex min-w-0 flex-1 cursor-grab items-center gap-2 px-3 py-2 active:cursor-grabbing"
                  >
                    <span className="shrink-0 touch-none" aria-hidden>
                      <GripVertical className="h-4 w-4 text-gray-300" />
                    </span>
                    <span className="w-5 shrink-0 text-center text-xs tabular-nums text-gray-300">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1 select-none">
                      <p className="truncate text-sm font-medium text-white">{group.name}</p>
                      <p className="text-xs capitalize text-gray-300">
                        {rules.type} select
                        {rules.type === 'multiple' && rules.maxSelections.trim()
                          ? ` · max ${rules.maxSelections}`
                          : ''}
                        {rules.type === 'multiple' && rules.minSelections.trim()
                          ? ` · min ${rules.minSelections}`
                          : ''}
                      </p>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="left"
                  sideOffset={8}
                  className={cn(ADMIN_SHEET_SELECT_CONTENT_CLASS, 'px-3 py-2')}
                >
                  <OptionGroupOptionsTooltipBody
                    groupName={group.name}
                    groupOptions={groupOptions}
                  />
                </TooltipContent>
              </Tooltip>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mr-1 h-8 w-8 shrink-0 text-gray-200 hover:bg-white/10 hover:text-white"
                aria-label={`Remove ${group.name}`}
                draggable={false}
                onClick={() => onRemove(groupId)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div
              className="border-t bg-muted/20 px-3 py-3"
              onDragOver={(e) => handleDragOver(e, groupId)}
            >
              <OptionGroupRulesFields
                idPrefix={`linked-${groupId}`}
                value={rules}
                onChange={(patch) => onRulesChange(groupId, patch)}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function OptionGroupsMultiSelect({
  optionGroups,
  menuItems,
  value,
  onChange,
  label,
  description,
  showSelectedBadges = true,
}: {
  optionGroups: OptionGroup[];
  menuItems?: MenuItem[];
  value: string[];
  onChange: (ids: string[]) => void;
  label: string;
  description?: string;
  showSelectedBadges?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const sorted = useMemo(
    () => [...optionGroups].sort((a, b) => a.name.localeCompare(b.name)),
    [optionGroups]
  );

  const toggle = (groupId: string) => {
    onChange(
      value.includes(groupId) ? value.filter((id) => id !== groupId) : [...value, groupId]
    );
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {description ? <p className="text-muted-foreground text-xs">{description}</p> : null}
      {showSelectedBadges && value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((groupId) => {
            const name = optionGroups.find((g) => g.id === groupId)?.name;
            if (!name) return null;
            return (
              <Badge key={groupId} variant="secondary" className="font-normal">
                {name}
              </Badge>
            );
          })}
        </div>
      ) : null}
      <Popover modal={false} open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <span className="truncate text-left">
              {value.length > 0 ? `${value.length} option group(s) selected` : 'Select option groups'}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent {...COMBO_PROPS} className={COMBO_POPOVER}>
          <Command
            className={COMBO_COMMAND}
            filter={(val, search) => {
              const q = search.trim().toLowerCase();
              if (!q) return 1;
              return val.toLowerCase().includes(q) ? 1 : 0;
            }}
          >
            <CommandInput
              placeholder="Search option groups…"
              onKeyDown={(e) => e.stopPropagation()}
            />
            <CommandList className={COMBO_LIST}>
              <CommandEmpty>No option group found.</CommandEmpty>
              <CommandGroup>
                {sorted.map((group) => {
                  const items =
                    menuItems?.length ? formatOptionGroupMenuItemNames(group, menuItems) : '';
                  return (
                    <CommandItem
                      key={group.id}
                      value={`${group.id} ${group.name} ${group.type} ${items}`}
                      onSelect={() => toggle(group.id)}
                    >
                      <Check
                        className={cn(
                          'h-4 w-4 shrink-0',
                          value.includes(group.id) ? 'opacity-100' : 'opacity-0'
                        )}
                        aria-hidden
                      />
                      <span className="truncate">
                        {group.name}
                        {items ? ` · ${items}` : ''}
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function MenuItemNewOptionGroupsEditor({
  drafts,
  onChange,
}: {
  drafts: NewOptionGroupDraft[];
  onChange: (drafts: NewOptionGroupDraft[]) => void;
}) {
  const updateDraft = (localId: string, patch: Partial<NewOptionGroupDraft>) => {
    onChange(drafts.map((d) => (d.localId === localId ? { ...d, ...patch } : d)));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm font-medium">New option groups</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...drafts, createEmptyOptionGroupDraft()])}
        >
          Add group
        </Button>
      </div>
      {drafts.length === 0 ? (
        <p className="text-muted-foreground text-xs">
          Optional — create groups like Size or Toppings for this item.
        </p>
      ) : (
        drafts.map((draft, index) => (
          <div key={draft.localId} className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">Group {index + 1}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-destructive hover:text-destructive"
                onClick={() => onChange(drafts.filter((d) => d.localId !== draft.localId))}
              >
                Remove
              </Button>
            </div>
            <div>
              <Label htmlFor={`og-name-${draft.localId}`}>Group name *</Label>
              <Input
                id={`og-name-${draft.localId}`}
                value={draft.name}
                onChange={(e) => updateDraft(draft.localId, { name: e.target.value })}
                placeholder="e.g., Size, Toppings"
              />
            </div>
            <div>
              <Label>Selection type *</Label>
              <Select
                modal={false}
                value={draft.type}
                onValueChange={(value: 'single' | 'multiple') =>
                  updateDraft(draft.localId, { type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className={ADMIN_SHEET_SELECT_CONTENT_CLASS}>
                  <SelectItem value="single">Single select</SelectItem>
                  <SelectItem value="multiple">Multiple select</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id={`og-required-${draft.localId}`}
                checked={draft.required}
                onCheckedChange={(checked) => updateDraft(draft.localId, { required: checked })}
              />
              <Label htmlFor={`og-required-${draft.localId}`}>Required</Label>
            </div>
            {draft.type === 'multiple' ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor={`og-min-${draft.localId}`}>Min selections</Label>
                  <Input
                    id={`og-min-${draft.localId}`}
                    type="number"
                    value={draft.minSelections}
                    onChange={(e) => updateDraft(draft.localId, { minSelections: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor={`og-max-${draft.localId}`}>Max selections</Label>
                  <Input
                    id={`og-max-${draft.localId}`}
                    type="number"
                    value={draft.maxSelections}
                    onChange={(e) => updateDraft(draft.localId, { maxSelections: e.target.value })}
                  />
                </div>
              </div>
            ) : null}
          </div>
        ))
      )}
    </div>
  );
}

export function OptionGroupPicker({
  optionGroups,
  menuItems,
  value,
  onChange,
  label,
}: {
  optionGroups: OptionGroup[];
  menuItems: MenuItem[];
  value: string;
  onChange: (groupId: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const sorted = useMemo(
    () => [...optionGroups].sort((a, b) => a.name.localeCompare(b.name)),
    [optionGroups]
  );

  const selectedLabel = useMemo(() => {
    if (!value) return '';
    const g = optionGroups.find((x) => x.id === value);
    if (!g) return '';
    const items = formatOptionGroupMenuItemNames(g, menuItems);
    return items ? `${g.name} (${items})` : g.name;
  }, [value, optionGroups, menuItems]);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover modal={false} open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <span className="truncate text-left">
              {value ? selectedLabel : 'Select existing option group'}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent {...COMBO_PROPS} className={COMBO_POPOVER}>
          <Command
            className={COMBO_COMMAND}
            filter={(val, search) => {
              const q = search.trim().toLowerCase();
              if (!q) return 1;
              return val.toLowerCase().includes(q) ? 1 : 0;
            }}
          >
            <CommandInput
              placeholder="Search option groups…"
              onKeyDown={(e) => e.stopPropagation()}
            />
            <CommandList className={COMBO_LIST}>
              <CommandEmpty>No option group found.</CommandEmpty>
              <CommandGroup>
                {sorted.map((group) => {
                  const filterValue = `${group.id} ${group.name} ${formatOptionGroupMenuItemNames(group, menuItems)}`;
                  return (
                    <CommandItem
                      key={group.id}
                      value={filterValue}
                      onSelect={() => {
                        onChange(group.id);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          'h-4 w-4 shrink-0',
                          value === group.id ? 'opacity-100' : 'opacity-0'
                        )}
                        aria-hidden
                      />
                      <span className="truncate">{group.name}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
