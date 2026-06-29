import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Separator } from '../components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { Check, ChevronsUpDown, Pencil, Plus, Printer, Receipt, Search, Trash2 } from 'lucide-react';
import { formatOptionGroupNamesForOption } from '../lib/optionGroupIds';
import { MenuItem, OptionGroup, Option, Location, Order, CartItem, StoreStatusMode } from '../types';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../components/ui/command';
import { cn } from '../components/ui/utils';
import {
  AdminFormSheet,
  ADMIN_SHEET_SELECT_CONTENT_CLASS,
  formatOptionGroupMenuItemNames,
  MenuItemsMultiSelect,
  OptionGroupPicker,
  OptionGroupsMultiSelect,
} from './AdminFormSheet';

/** Matches checkout: `CheckoutPage` uses 13% HST on (subtotal − discounts + delivery). */
const RECEIPT_HST_PERCENT = 13;

/** Searchable combobox inside admin dialogs — keeps search visible, list scrolls within viewport. */
const ADMIN_SEARCH_COMBO_POPOVER =
  'z-[100] flex max-h-[min(18rem,var(--radix-popover-content-available-height,18rem))] flex-col overflow-hidden p-0 w-[min(calc(100vw-2rem),28rem)] sm:w-[var(--radix-popover-trigger-width)]';
const ADMIN_SEARCH_COMBO_COMMAND = 'flex min-h-0 flex-1 flex-col overflow-hidden';
const ADMIN_SEARCH_COMBO_LIST =
  'max-h-[min(14rem,calc(var(--radix-popover-content-available-height,18rem)-2.75rem))] min-h-0 flex-1 overflow-y-auto overscroll-contain';
const ADMIN_SEARCH_COMBO_POPOVER_PROPS = {
  side: 'bottom' as const,
  align: 'start' as const,
  collisionPadding: 16,
  sticky: 'partial' as const,
};

function getOrderPricingBreakdown(order: Order) {
  const taxableBeforeTax = Number((order.total - order.tax).toFixed(2));
  const couponOff = order.couponDiscount ?? 0;
  const offerOff = order.offerDiscount ?? 0;
  const deliveryFee =
    order.orderType === 'delivery'
      ? Math.max(
          0,
          Number((taxableBeforeTax - order.subtotal + offerOff + couponOff).toFixed(2))
        )
      : 0;
  return { taxableBeforeTax, couponOff, offerOff, deliveryFee };
}

function OrderReceiptContent({ order, locations }: { order: Order; locations: Location[] }) {
  const fmt = (n: number) => `$${n.toFixed(2)}`;
  const store =
    (order.locationId ? locations.find((l) => l.id === order.locationId) : undefined) ?? locations[0];
  const storeName = store?.name || 'Pizza Offers';
  const storePhone = store?.phone || '—';
  const storeAddress = store?.address || '—';

  const { couponOff, offerOff, deliveryFee } = getOrderPricingBreakdown(order);

  const when = new Date(order.createdAt).toLocaleString('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const fulfillmentLines =
    order.orderType === 'pickup'
      ? [
          store ? `${store.name}` : 'Pickup',
          store ? store.address : '',
        ].filter(Boolean)
      : [order.deliveryAddress || '—', order.deliveryPostalCode ? `Postal: ${order.deliveryPostalCode}` : ''].filter(
          Boolean
        );

  return (
    <div className="receipt-print rounded-sm border-2 border-dashed border-gray-800 bg-white p-4 font-mono text-[11px] leading-snug text-black shadow-inner print:border print:border-gray-400 print:shadow-none">
      <div className="border-b border-dashed border-gray-600 pb-3 text-center">
        <div className="text-sm font-bold tracking-tight">{storeName.toUpperCase()}</div>
        <div>{storePhone}</div>
        <div className="mt-2 font-bold">ONLINE ORDER</div>
        <div className="mt-1 text-[10px]">{storeAddress}</div>
      </div>

      <div className="border-b border-dashed border-gray-600 py-3">
        <div className="flex justify-between font-bold">
          <span />
          <span className="uppercase">{order.orderType}</span>
        </div>
        <div>{when}</div>
        <div className="mt-1">
          <span className="font-semibold">Order</span> {order.id}
        </div>
        <div>{order.customerName}</div>
        <div>{order.customerPhone}</div>
        <div className="mt-2 font-semibold">
          {order.orderType === 'delivery' ? 'Delivery address' : 'Pickup'}
        </div>
        {fulfillmentLines.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>

      <div className="space-y-3 border-b border-dashed border-gray-600 py-3">
        {order.items.length === 0 ? (
          <div className="text-gray-600">(No line items stored for this order)</div>
        ) : (
          order.items.map((line: CartItem) => (
            <div key={line.id}>
              <div className="font-bold uppercase">
                {line.menuItem.name}
                {line.quantity > 1 ? ` ×${line.quantity}` : ''}
              </div>
              {line.selectedOptions.map((group) => (
                <div key={group.optionGroupId} className="pl-2 text-[10px]">
                  <span className="font-semibold">{group.optionGroupName}:</span>{' '}
                  {group.options.map((o) => (o.price > 0 ? `${o.name} (+${fmt(o.price)})` : o.name)).join(', ')}
                </div>
              ))}
              {line.specialInstructions ? (
                <div className="pl-2 text-[10px] italic">Note: {line.specialInstructions}</div>
              ) : null}
              <div className="pl-2 text-[10px]">{fmt(line.totalPrice * line.quantity)}</div>
            </div>
          ))
        )}
      </div>

      <div className="space-y-1 border-b border-dashed border-gray-600 py-3">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{fmt(order.subtotal)}</span>
        </div>
        {offerOff > 0 ? (
          <div className="flex justify-between">
            <span>Offer discount</span>
            <span>-{fmt(offerOff)}</span>
          </div>
        ) : null}
        {couponOff > 0 ? (
          <div className="flex justify-between">
            <span>Coupon {order.couponCode ? `(${order.couponCode})` : ''}</span>
            <span>-{fmt(couponOff)}</span>
          </div>
        ) : null}
        {order.orderType === 'delivery' ? (
          <div className="flex justify-between">
            <span>Delivery charges</span>
            <span>{fmt(deliveryFee)}</span>
          </div>
        ) : null}
        <div className="flex justify-between">
          <span>Tax (HST {RECEIPT_HST_PERCENT}%)</span>
          <span>{fmt(order.tax)}</span>
        </div>
      </div>

      <div className="py-3">
        <div className="flex justify-between text-sm font-bold">
          <span>TOTAL</span>
          <span>{fmt(order.total)}</span>
        </div>
        <div className="mt-2 flex justify-between">
          <span>Payment</span>
          <span className="font-semibold uppercase">Online order</span>
        </div>
      </div>

      <div className="border-t border-dashed border-gray-600 pt-3 text-center text-[10px]">
        Thank you for ordering from Pizza Offers!
      </div>
    </div>
  );
}

function OrderDetailDialogContent({ order, locations }: { order: Order; locations: Location[] }) {
  const fmt = (n: number) => `$${Number(n || 0).toFixed(2)}`;
  const { couponOff, offerOff, deliveryFee } = getOrderPricingBreakdown(order);
  const location = order.locationId ? locations.find((l) => l.id === order.locationId) : undefined;

  const when = new Date(order.createdAt).toLocaleString('en-CA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="space-y-7 text-base leading-relaxed">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-muted-foreground text-sm">Placed</p>
          <p className="text-lg font-medium">{when}</p>
        </div>
        <Badge variant="outline" className="px-2.5 py-1 text-sm capitalize">
          {order.orderType}
        </Badge>
      </div>

      <div>
        <h3 className="mb-3 text-lg font-semibold text-foreground">Customer</h3>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground text-sm font-medium">Name</dt>
            <dd className="mt-0.5 text-base font-medium">{order.customerName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-sm font-medium">Phone</dt>
            <dd className="mt-0.5 text-base">{order.customerPhone}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground text-sm font-medium">Email</dt>
            <dd className="mt-0.5 break-all text-base">{order.customerEmail}</dd>
          </div>
        </dl>
      </div>

      <Separator />

      <div>
        <h3 className="mb-3 text-lg font-semibold text-foreground">Address & fulfillment</h3>
        {order.orderType === 'delivery' ? (
          <div className="space-y-2 rounded-md border bg-muted/30 p-4">
            <p className="text-base font-semibold">Delivery address</p>
            <p className="text-base">{order.deliveryAddress || '—'}</p>
            {order.deliveryPostalCode ? (
              <p className="text-muted-foreground text-sm">Postal code: {order.deliveryPostalCode}</p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-2 rounded-md border bg-muted/30 p-4">
            <p className="text-base font-semibold">Pickup</p>
            {location ? (
              <>
                <p className="text-base">{location.name}</p>
                <p className="text-muted-foreground text-base">{location.address}</p>
                <p className="text-muted-foreground text-sm">Phone: {location.phone}</p>
              </>
            ) : (
              <p className="text-muted-foreground text-base">
                {order.locationId ? `Location id ${order.locationId} (not found in list)` : 'No location linked'}
              </p>
            )}
          </div>
        )}
      </div>

      <Separator />

      <div>
        <h3 className="mb-3 text-lg font-semibold text-foreground">Items</h3>
        {order.items.length === 0 ? (
          <p className="text-muted-foreground text-base">No line items were stored for this order.</p>
        ) : (
          <ul className="space-y-4">
            {order.items.map((line: CartItem) => (
              <li key={line.id} className="rounded-lg border bg-card p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-base font-semibold">
                    {line.menuItem.name}
                    <span className="text-muted-foreground font-normal"> × {line.quantity}</span>
                  </p>
                  <p className="text-lg font-semibold text-orange-600 tabular-nums">
                    {fmt(line.totalPrice * line.quantity)}
                  </p>
                </div>
                {line.selectedOptions.length > 0 ? (
                  <ul className="mt-3 space-y-1.5 border-t pt-3 text-sm">
                    {line.selectedOptions.map((group) => (
                      <li key={group.optionGroupId}>
                        <span className="font-medium text-muted-foreground">{group.optionGroupName}:</span>{' '}
                        {group.options
                          .map((o) => (o.price > 0 ? `${o.name} (+${fmt(o.price)})` : o.name))
                          .join(', ')}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {line.specialInstructions ? (
                  <p className="mt-3 text-sm italic text-muted-foreground">Note: {line.specialInstructions}</p>
                ) : null}
                {(line.offerDiscount ?? 0) > 0 ? (
                  <p className="mt-2 text-sm font-medium text-emerald-700">
                    Item offer (this line): −{fmt((line.offerDiscount ?? 0) * line.quantity)}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <Separator />

      <div>
        <h3 className="mb-3 text-lg font-semibold text-foreground">Pricing</h3>
        <div className="space-y-2.5 rounded-lg border bg-muted/20 p-5 text-base">
          <div className="flex justify-between gap-4">
            <span>Subtotal</span>
            <span className="tabular-nums font-medium">{fmt(order.subtotal)}</span>
          </div>
          {offerOff > 0 ? (
            <div className="flex justify-between gap-4 text-emerald-700">
              <span>Offer discount</span>
              <span className="tabular-nums font-medium">−{fmt(offerOff)}</span>
            </div>
          ) : null}
          {couponOff > 0 ? (
            <div className="flex justify-between gap-4 text-emerald-700">
              <span>Coupon {order.couponCode ? `(${order.couponCode})` : ''}</span>
              <span className="tabular-nums font-medium">−{fmt(couponOff)}</span>
            </div>
          ) : null}
          {order.orderType === 'delivery' ? (
            <div className="flex justify-between gap-4">
              <span>Delivery charges</span>
              <span className="tabular-nums font-medium">{fmt(deliveryFee)}</span>
            </div>
          ) : null}
          <div className="flex justify-between gap-4">
            <span>HST ({RECEIPT_HST_PERCENT}%)</span>
            <span className="tabular-nums font-medium">{fmt(order.tax)}</span>
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between gap-4 text-xl font-bold">
            <span>Total</span>
            <span className="tabular-nums text-orange-600">{fmt(order.total)}</span>
          </div>
        </div>
        <p className="text-muted-foreground mt-3 text-sm leading-normal">
          Delivery fee is derived from stored totals when not saved separately; HST matches checkout (13%).
        </p>
      </div>
    </div>
  );
}

// Options Manager Component
export function OptionsManager({ menuItems, optionGroups, options, addOptionGroup, updateOptionGroup, deleteOptionGroup, addOption, updateOption, deleteOption }: any) {
  return (
    <div className="space-y-6">
      <OptionGroupsManager
        menuItems={menuItems}
        optionGroups={optionGroups}
        addOptionGroup={addOptionGroup}
        updateOptionGroup={updateOptionGroup}
        deleteOptionGroup={deleteOptionGroup}
      />
      <OptionsListManager
        menuItems={menuItems}
        optionGroups={optionGroups}
        options={options}
        addOption={addOption}
        updateOption={updateOption}
        deleteOption={deleteOption}
      />
    </div>
  );
}

// Option Groups Manager
function OptionGroupsManager({ menuItems, optionGroups, addOptionGroup, updateOptionGroup, deleteOptionGroup }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [groupTableSearch, setGroupTableSearch] = useState('');
  const [editingGroup, setEditingGroup] = useState<OptionGroup | null>(null);
  const [setupMode, setSetupMode] = useState<'existing' | 'new'>('new');
  const [existingGroupId, setExistingGroupId] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    menuItemIds: [] as string[],
    type: 'single' as 'single' | 'multiple',
    required: false,
    minSelections: '',
    maxSelections: '',
    allowRepeatSelections: false,
  });

  const optionGroupsSorted = useMemo(
    () => [...optionGroups].sort((a: OptionGroup, b: OptionGroup) => a.name.localeCompare(b.name)),
    [optionGroups]
  );

  const optionGroupsTableRows = useMemo(() => {
    const q = groupTableSearch.trim().toLowerCase();
    if (!q) return optionGroupsSorted;
    return optionGroupsSorted.filter((group: OptionGroup) => {
      const hay = [
        group.name,
        formatOptionGroupMenuItemNames(group, menuItems),
        group.type,
        String(group.order ?? 0),
        group.id,
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [optionGroupsSorted, menuItems, groupTableSearch]);

  const resetForm = () => {
    setFormData({
      name: '',
      menuItemIds: [],
      type: 'single',
      required: false,
      minSelections: '',
      maxSelections: '',
      allowRepeatSelections: false,
    });
    setEditingGroup(null);
    setSetupMode('new');
    setExistingGroupId('');
  };

  const openAddSheet = () => {
    resetForm();
    setIsOpen(true);
  };

  const loadGroupIntoForm = (group: OptionGroup) => {
    const ids =
      group.menuItemIds?.length > 0
        ? [...group.menuItemIds]
        : group.menuItemId
          ? [group.menuItemId]
          : [];
    setFormData({
      name: group.name,
      menuItemIds: ids,
      type: group.type,
      required: group.required,
      minSelections: group.minSelections?.toString() || '',
      maxSelections: group.maxSelections?.toString() || '',
      allowRepeatSelections: Boolean(group.allowRepeatSelections),
    });
  };

  const handleEdit = (group: OptionGroup) => {
    setEditingGroup(group);
    setSetupMode('new');
    loadGroupIntoForm(group);
    setIsOpen(true);
  };

  const handleExistingGroupPick = (groupId: string) => {
    setExistingGroupId(groupId);
    const group = optionGroups.find((g: OptionGroup) => g.id === groupId);
    if (group) {
      const ids =
        group.menuItemIds?.length > 0
          ? [...group.menuItemIds]
          : group.menuItemId
            ? [group.menuItemId]
            : [];
      setFormData((prev) => ({ ...prev, menuItemIds: ids }));
    }
  };

  const buildGroupPayload = (): Omit<OptionGroup, 'id'> => {
    const payload: Omit<OptionGroup, 'id'> = {
      name: formData.name.trim(),
      menuItemIds: formData.menuItemIds,
      menuItemId: formData.menuItemIds[0] ?? '',
      type: formData.type,
      required: formData.required,
      order: 0,
    };
    if (formData.minSelections) {
      payload.minSelections = Number.parseInt(formData.minSelections, 10);
    }
    if (formData.maxSelections) {
      payload.maxSelections = Number.parseInt(formData.maxSelections, 10);
    }
    if (formData.type === 'multiple') {
      payload.allowRepeatSelections = formData.allowRepeatSelections;
    }
    return payload;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.menuItemIds.length === 0) {
      toast.error('Select at least one menu item');
      return;
    }

    try {
      if (editingGroup) {
        await updateOptionGroup(editingGroup.id, buildGroupPayload());
        toast.success('Option group updated');
      } else if (setupMode === 'existing') {
        if (!existingGroupId) {
          toast.error('Select an existing option group');
          return;
        }
        await updateOptionGroup(existingGroupId, { menuItemIds: formData.menuItemIds });
        toast.success('Menu items linked to option group');
      } else {
        if (!formData.name.trim()) {
          toast.error('Group name is required');
          return;
        }
        await addOptionGroup(buildGroupPayload());
        toast.success('Option group added');
      }

      setIsOpen(false);
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save option group');
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure? This will also delete all options in this group.')) {
      deleteOptionGroup(id);
      toast.success('Option group deleted');
    }
  };

  const renderGroupFields = (showName: boolean) => (
    <>
      {showName ? (
        <div>
          <Label htmlFor="group-name">Group Name *</Label>
          <Input
            id="group-name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Size, Toppings"
            required
          />
        </div>
      ) : null}
      <MenuItemsMultiSelect
        menuItems={menuItems}
        value={formData.menuItemIds}
        onChange={(ids) => setFormData((prev) => ({ ...prev, menuItemIds: ids }))}
        label="Menu items *"
        description="Select every menu item that should show this option group."
      />
      {showName ? (
        <>
          <div>
            <Label htmlFor="group-type">Selection Type *</Label>
            <Select
              modal={false}
              value={formData.type}
              onValueChange={(value: 'single' | 'multiple') =>
                setFormData((prev) => ({
                  ...prev,
                  type: value,
                  ...(value === 'single' ? { allowRepeatSelections: false } : {}),
                }))
              }
            >
              <SelectTrigger id="group-type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent className={ADMIN_SHEET_SELECT_CONTENT_CLASS}>
                <SelectItem value="single">Single Select</SelectItem>
                <SelectItem value="multiple">Multiple Select</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="required"
              checked={formData.required}
              onCheckedChange={(checked) => setFormData({ ...formData, required: checked })}
            />
            <Label htmlFor="required">Required</Label>
          </div>
          {formData.type === 'multiple' ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="min">Min Selections</Label>
                <Input
                  id="min"
                  type="number"
                  value={formData.minSelections}
                  onChange={(e) => setFormData({ ...formData, minSelections: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="max">Max Selections</Label>
                <Input
                  id="max"
                  type="number"
                  value={formData.maxSelections}
                  onChange={(e) => setFormData({ ...formData, maxSelections: e.target.value })}
                />
              </div>
            </div>
          ) : null}
          {formData.type === 'multiple' ? (
            <div className="flex items-start space-x-2 rounded-md border p-3">
              <Switch
                id="allow-repeat-selections"
                checked={formData.allowRepeatSelections}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, allowRepeatSelections: checked })
                }
              />
              <div className="space-y-0.5">
                <Label htmlFor="allow-repeat-selections" className="cursor-pointer">
                  Customer can choose multiple selection of same option
                </Label>
                <p className="text-muted-foreground text-xs">
                  Max applies to total picks (e.g. same option 3× or three different options).
                </p>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Option Groups</CardTitle>
        <Button type="button" onClick={openAddSheet}>
          <Plus className="h-4 w-4 mr-2" />
          Add Option Group
        </Button>
        <AdminFormSheet
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) resetForm();
          }}
          title={editingGroup ? 'Edit Option Group' : 'Add Option Group'}
          description={
            editingGroup
              ? 'Update this shared option group and linked menu items.'
              : 'Create a new group or link an existing group to more menu items.'
          }
          footer={
            <Button type="submit" form="option-group-form" className="w-full sm:w-auto">
              {editingGroup ? 'Update' : setupMode === 'existing' ? 'Save links' : 'Add'} Group
            </Button>
          }
        >
          <form id="option-group-form" onSubmit={handleSubmit} className="grid gap-4">
            {!editingGroup ? (
              <Tabs value={setupMode} onValueChange={(v) => setSetupMode(v as 'existing' | 'new')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="existing">Existing one</TabsTrigger>
                  <TabsTrigger value="new">Add New</TabsTrigger>
                </TabsList>
                <TabsContent value="existing" className="mt-4 space-y-4">
                  <OptionGroupPicker
                    optionGroups={optionGroups}
                    menuItems={menuItems}
                    value={existingGroupId}
                    onChange={handleExistingGroupPick}
                    label="Option group *"
                  />
                  {renderGroupFields(false)}
                </TabsContent>
                <TabsContent value="new" className="mt-4 space-y-4">
                  {renderGroupFields(true)}
                </TabsContent>
              </Tabs>
            ) : (
              renderGroupFields(true)
            )}
          </form>
        </AdminFormSheet>
      </CardHeader>
      <CardContent>
        <div className="relative mb-4">
          <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" aria-hidden />
          <Input
            type="search"
            value={groupTableSearch}
            onChange={(e) => setGroupTableSearch(e.target.value)}
            placeholder="Search by group name, menu item, type…"
            className="pl-9"
            aria-label="Search option groups"
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Menu Items</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Required</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {optionGroupsTableRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground text-center py-8">
                  No option groups match your search.
                </TableCell>
              </TableRow>
            ) : (
              optionGroupsTableRows.map((group: OptionGroup) => (
                <TableRow key={group.id}>
                  <TableCell className="font-medium">{group.name}</TableCell>
                  <TableCell className="max-w-[14rem] truncate" title={formatOptionGroupMenuItemNames(group, menuItems)}>
                    {formatOptionGroupMenuItemNames(group, menuItems)}
                  </TableCell>
                  <TableCell className="capitalize">{group.type}</TableCell>
                  <TableCell>
                    <Badge variant={group.required ? 'default' : 'secondary'}>
                      {group.required ? 'Yes' : 'No'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(group)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(group.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// Options List Manager
function OptionsListManager({
  menuItems,
  optionGroups,
  options,
  addOption,
  updateOption,
  deleteOption,
}: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [optionsTableSearch, setOptionsTableSearch] = useState('');
  const [editingOption, setEditingOption] = useState<Option | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    optionGroupIds: [] as string[],
    price: '',
    active: true,
    isPopular: false,
  });

  const optionsTableRows = useMemo(() => {
    const q = optionsTableSearch.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt: Option) => {
      const groupNames = formatOptionGroupNamesForOption(opt, optionGroups);
      const hay = [
        opt.name,
        opt.price.toFixed(2),
        String(opt.price),
        groupNames,
        opt.active === false ? 'inactive' : 'active',
        opt.isPopular ? 'popular' : '',
        opt.id,
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [options, optionGroups, menuItems, optionsTableSearch]);

  const resetForm = () => {
    setFormData({ name: '', optionGroupIds: [], price: '', active: true, isPopular: false });
    setEditingOption(null);
  };

  const openAddSheet = () => {
    resetForm();
    setIsOpen(true);
  };

  const handleEdit = (option: Option) => {
    setEditingOption(option);
    setFormData({
      name: option.name,
      optionGroupIds:
        option.optionGroupIds?.length > 0
          ? [...option.optionGroupIds]
          : option.optionGroupId
            ? [option.optionGroupId]
            : [],
      price: option.price.toString(),
      active: option.active !== false,
      isPopular: option.isPopular === true,
    });
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.optionGroupIds.length === 0) {
      toast.error('Select at least one option group');
      return;
    }

    const optionData = {
      name: formData.name,
      optionGroupIds: formData.optionGroupIds,
      price: parseFloat(formData.price) || 0,
      active: formData.active,
      isPopular: formData.isPopular,
    };

    if (editingOption) {
      updateOption(editingOption.id, optionData);
      toast.success('Option updated');
    } else {
      addOption(optionData);
      toast.success('Option added');
    }

    setIsOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this option?')) {
      deleteOption(id);
      toast.success('Option deleted');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Options</CardTitle>
        <Button type="button" onClick={openAddSheet}>
          <Plus className="h-4 w-4 mr-2" />
          Add Option
        </Button>
        <AdminFormSheet
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) resetForm();
          }}
          title={editingOption ? 'Edit Option' : 'Add Option'}
          description={
            editingOption
              ? 'Update option details. Inactive options are hidden on the customer menu.'
              : 'Add a choice within an option group.'
          }
          footer={
            <Button
              type="submit"
              form="option-form"
              className="w-full sm:w-auto"
              disabled={formData.optionGroupIds.length === 0}
            >
              {editingOption ? 'Update' : 'Add'} Option
            </Button>
          }
        >
          <form id="option-form" onSubmit={handleSubmit} className="grid gap-4">
            <div>
              <Label htmlFor="option-name">Option Name *</Label>
              <Input
                id="option-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Extra Cheese, Large"
                required
              />
            </div>
            <OptionGroupsMultiSelect
              optionGroups={optionGroups}
              menuItems={menuItems}
              value={formData.optionGroupIds}
              onChange={(optionGroupIds) => setFormData((prev) => ({ ...prev, optionGroupIds }))}
              label="Option groups *"
              description="This choice can appear in every selected group on the customize page."
            />
            <div>
              <Label htmlFor="option-price">Additional Price</Label>
              <Input
                id="option-price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="option-active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
              <Label htmlFor="option-active">Active (visible on menu)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="option-popular"
                checked={formData.isPopular}
                onCheckedChange={(checked) => setFormData({ ...formData, isPopular: checked })}
              />
              <Label htmlFor="option-popular">Popular (show a "Popular" tag on the menu)</Label>
            </div>
          </form>
        </AdminFormSheet>
      </CardHeader>
      <CardContent>
        <div className="relative mb-4">
          <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" aria-hidden />
          <Input
            type="search"
            value={optionsTableSearch}
            onChange={(e) => setOptionsTableSearch(e.target.value)}
            placeholder="Search by option name, price, group, menu item…"
            className="pl-9"
            aria-label="Search options"
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Popular</TableHead>
              <TableHead>Actions</TableHead>
              <TableHead>Group</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {optionsTableRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground text-center py-8">
                  No options match your search.
                </TableCell>
              </TableRow>
            ) : (
              optionsTableRows.map((option: Option) => {
              const groupLabel = formatOptionGroupNamesForOption(option, optionGroups);
              return (
                <TableRow key={option.id}>
                  <TableCell className="font-medium">{option.name}</TableCell>
                  <TableCell>${option.price.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={option.active === false ? 'secondary' : 'default'}>
                      {option.active === false ? 'Inactive' : 'Active'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {option.isPopular ? (
                      <Badge>Popular</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(option)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(option.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>{groupLabel || '—'}</TableCell>
                </TableRow>
              );
            })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// Locations Manager Component
export function LocationsManager({ locations, addLocation, updateLocation, deleteLocation }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    hours: '',
    opensAt: '',
    closesAt: '',
    storeStatusMode: 'auto' as StoreStatusMode,
    image: '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      phone: '',
      hours: '',
      opensAt: '',
      closesAt: '',
      storeStatusMode: 'auto',
      image: '',
    });
    setEditingLocation(null);
  };

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      address: location.address,
      phone: location.phone,
      hours: location.hours,
      opensAt: location.opensAt ?? '',
      closesAt: location.closesAt ?? '',
      storeStatusMode: location.storeStatusMode ?? 'auto',
      image: location.image,
    });
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingLocation) {
      updateLocation(editingLocation.id, formData);
      toast.success('Location updated');
    } else {
      addLocation(formData);
      toast.success('Location added');
    }

    setIsOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this location?')) {
      deleteLocation(id);
      toast.success('Location deleted');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Locations</CardTitle>
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Location
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingLocation ? 'Edit' : 'Add'} Location</DialogTitle>
              <DialogDescription>
                {editingLocation ? 'Edit the details of this location.' : 'Add a new location to your business.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div>
                  <Label htmlFor="loc-name">Name *</Label>
                  <Input
                    id="loc-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="loc-address">Address *</Label>
                  <Textarea
                    id="loc-address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="loc-phone">Phone *</Label>
                  <Input
                    id="loc-phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="loc-hours">Hours *</Label>
                  <Input
                    id="loc-hours"
                    value={formData.hours}
                    onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                    placeholder="Mon-Sun: 11:00 AM - 10:00 PM"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="loc-opens">Opens at (for automatic status)</Label>
                    <Input
                      id="loc-opens"
                      type="time"
                      step={60}
                      value={formData.opensAt}
                      onChange={(e) => setFormData({ ...formData, opensAt: e.target.value })}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">Local time; used only when status is Automatic</p>
                  </div>
                  <div>
                    <Label htmlFor="loc-closes">Closes at</Label>
                    <Input
                      id="loc-closes"
                      type="time"
                      step={60}
                      value={formData.closesAt}
                      onChange={(e) => setFormData({ ...formData, closesAt: e.target.value })}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      If close is earlier than open (e.g. 2:00 after 10 PM), hours span midnight
                    </p>
                  </div>
                </div>
                <div>
                  <Label htmlFor="loc-store-status">Store status on home banner</Label>
                  <Select
                    value={formData.storeStatusMode}
                    onValueChange={(v) =>
                      setFormData({ ...formData, storeStatusMode: v as StoreStatusMode })
                    }
                  >
                    <SelectTrigger id="loc-store-status" className="w-full">
                      <SelectValue placeholder="Choose status mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Automatic — use opens / closes times</SelectItem>
                      <SelectItem value="force_open">Always show as open (green badge)</SelectItem>
                      <SelectItem value="force_closed">Always show as closed (red badge)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="loc-image">Image URL</Label>
                  <Input
                    id="loc-image"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">{editingLocation ? 'Update' : 'Add'} Location</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>Banner status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations.map((location: Location) => (
              <TableRow key={location.id}>
                <TableCell className="font-medium">{location.name}</TableCell>
                <TableCell>{location.address}</TableCell>
                <TableCell>{location.phone}</TableCell>
                <TableCell>{location.hours || location.timing || '—'}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {location.storeStatusMode === 'force_open' ? (
                      <Badge className="w-fit bg-green-600">Always open</Badge>
                    ) : location.storeStatusMode === 'force_closed' ? (
                      <Badge variant="destructive" className="w-fit">Always closed</Badge>
                    ) : (
                      <Badge variant="secondary" className="w-fit">Auto</Badge>
                    )}
                    {location.opensAt && location.closesAt ? (
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {location.opensAt} – {location.closesAt}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">No hours set</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(location)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(location.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// Orders Manager Component
type OrdersManagerProps = {
  orders: Order[];
  locations: Location[];
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  fetchAdminOrders: (filters?: {
    phone?: string;
    email?: string;
    coupon_code?: string;
    date_filter?: 'last_week' | 'last_month' | 'custom';
    from_date?: string;
    to_date?: string;
  }) => Promise<Order[]>;
};

type AdminDateFilterValue = 'unset' | 'last_week' | 'last_month' | 'custom';

export function OrdersManager({ orders, locations, updateOrderStatus, fetchAdminOrders }: OrdersManagerProps) {
  const [dateFilter, setDateFilter] = useState<AdminDateFilterValue>('unset');
  /** Bumps on Clear so Radix Select remounts and shows the placeholder again. */
  const [dateFilterSelectKey, setDateFilterSelectKey] = useState(0);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [searching, setSearching] = useState(false);
  const [displayOrders, setDisplayOrders] = useState<Order[] | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'preparing': return 'bg-purple-100 text-purple-800';
      case 'ready': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const buildFilters = () => ({
    phone: phone.trim() || undefined,
    email: email.trim() || undefined,
    coupon_code: couponCode.trim() || undefined,
    date_filter: dateFilter === 'unset' ? undefined : dateFilter,
    from_date: dateFilter === 'custom' ? (fromDate || undefined) : undefined,
    to_date: dateFilter === 'custom' ? (toDate || undefined) : undefined,
  });

  const refreshWithCurrentFilters = async () => {
    const list = await fetchAdminOrders(buildFilters());
    setDisplayOrders(list);
  };

  const handleSearch = async () => {
    if (dateFilter === 'custom') {
      if (!fromDate || !toDate) {
        toast.error('Please select both from and to dates for custom filter');
        return;
      }
      if (fromDate > toDate) {
        toast.error('From date cannot be after to date');
        return;
      }
    }
    setSearching(true);
    try {
      const list = await fetchAdminOrders(buildFilters());
      setDisplayOrders(list);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setSearching(false);
    }
  };

  const handleClear = () => {
    setPhone('');
    setEmail('');
    setCouponCode('');
    setDateFilter('unset');
    setDateFilterSelectKey((k) => k + 1);
    setFromDate('');
    setToDate('');
    setDisplayOrders(null);
  };

  const handleStatusChange = (orderId: string, status: Order['status']) => {
    updateOrderStatus(orderId, status);
    toast.success('Order status updated');
    void refreshWithCurrentFilters();
  };

  const baseList = displayOrders ?? orders;
  const sortedOrders = [...baseList].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const formatMoney = (value?: number) => `$${Number(value || 0).toFixed(2)}`;

  return (
    <Card>
      <Dialog
        open={receiptOrder !== null}
        onOpenChange={(open) => {
          if (!open) setReceiptOrder(null);
        }}
      >
        <DialogContent className="max-h-[92vh] max-w-md overflow-y-auto sm:max-w-md print:max-h-none print:overflow-visible print:border-none print:bg-transparent print:p-0 print:shadow-none">
          <DialogHeader className="print:hidden">
            <DialogTitle>Receipt — Order #{receiptOrder?.id ?? ''}</DialogTitle>
            <DialogDescription className="sr-only">Printable order receipt for kitchen or customer</DialogDescription>
          </DialogHeader>
          <div className="mb-3 print:hidden">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-1.5"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4" aria-hidden />
              Print receipt
            </Button>
          </div>
          {receiptOrder ? <OrderReceiptContent order={receiptOrder} locations={locations} /> : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={detailOrder !== null}
        onOpenChange={(open) => {
          if (!open) setDetailOrder(null);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl">Order details — #{detailOrder?.id ?? ''}</DialogTitle>
            <DialogDescription className="text-base">
              Customer info, items with options, and full pricing.
            </DialogDescription>
          </DialogHeader>
          {detailOrder ? <OrderDetailDialogContent order={detailOrder} locations={locations} /> : null}
        </DialogContent>
      </Dialog>

      <CardHeader>
        <CardTitle>Order history</CardTitle>
        <p className="text-sm text-gray-600 font-normal">With no date option selected, the list shows the last 3 days. Or choose last week, last month, or a custom range. Search by phone, email, or coupon code (combined with AND).</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="admin-order-phone">Phone</Label>
            <Input
              id="admin-order-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 4165550100"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="admin-order-email">Email</Label>
            <Input
              id="admin-order-email"
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="customer@example.com"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="admin-order-coupon">Coupon code</Label>
            <Input
              id="admin-order-coupon"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="SAVE10"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="admin-order-date-filter">Date filter</Label>
            <Select
              key={dateFilterSelectKey}
              value={dateFilter === 'unset' ? undefined : dateFilter}
              onValueChange={(value: 'last_week' | 'last_month' | 'custom') => setDateFilter(value)}
            >
              <SelectTrigger id="admin-order-date-filter" className="mt-1">
                <SelectValue placeholder="Select option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last_week">Last week</SelectItem>
                <SelectItem value="last_month">Last month</SelectItem>
                <SelectItem value="custom">Custom date</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {dateFilter === 'custom' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="admin-order-from-date">From</Label>
              <Input
                id="admin-order-from-date"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="admin-order-to-date">To</Label>
              <Input
                id="admin-order-to-date"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={handleSearch} disabled={searching}>
            {searching ? 'Searching…' : 'Search'}
          </Button>
          <Button type="button" variant="outline" onClick={handleClear} disabled={searching}>
            Clear
          </Button>
        </div>

        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Order</TableHead>
                <TableHead className="min-w-[220px]">Customer</TableHead>
                <TableHead className="min-w-[220px]">Fulfillment</TableHead>
                <TableHead className="min-w-[280px]">Items</TableHead>
                <TableHead className="min-w-[160px]">Discounts</TableHead>
                <TableHead className="w-[120px]">Total</TableHead>
                <TableHead className="w-[220px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedOrders.map((order: Order) => {
                const location = order.locationId ? locations.find((l) => l.id === order.locationId) : undefined;
                const hasDiscount = Boolean(order.couponCode) || Boolean(order.couponDiscount) || Boolean(order.offerDiscount);
                return (
                  <TableRow key={order.id} className="align-top">
                    <TableCell className="py-2 text-xs">
                      <button
                        type="button"
                        className="text-left font-semibold text-sm leading-5 text-orange-700 underline-offset-2 hover:underline"
                        onClick={() => {
                          setReceiptOrder(order);
                          setDetailOrder(null);
                        }}
                      >
                        #{order.id}
                      </button>
                      <div className="text-gray-500 leading-4">
                        {new Date(order.createdAt).toLocaleString('en-CA')}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2 h-7 gap-1 px-2 text-xs"
                        onClick={() => {
                          setReceiptOrder(order);
                          setDetailOrder(null);
                        }}
                      >
                        <Receipt className="h-3.5 w-3.5" aria-hidden />
                        Receipt
                      </Button>
                    </TableCell>
                    <TableCell className="py-2 text-xs leading-4">
                      <div className="font-medium text-sm leading-5">{order.customerName}</div>
                      <div className="text-gray-600">{order.customerEmail}</div>
                      <div className="text-gray-600">{order.customerPhone}</div>
                    </TableCell>
                    <TableCell className="py-2 text-xs leading-4">
                      <Badge
                        variant={order.orderType === 'pickup' ? 'default' : 'destructive'}
                        className="mb-1 capitalize"
                      >
                        {order.orderType}
                      </Badge>
                      {order.orderType === 'pickup' ? (
                        <div className="text-gray-700">
                          {location ? (
                            <>
                              <div className="font-medium">{location.name}</div>
                              <div>{location.address}</div>
                            </>
                          ) : (
                            <div>Pickup location not found</div>
                          )}
                        </div>
                      ) : (
                        <div className="text-gray-700">
                          <div>{order.deliveryAddress || 'No delivery address'}</div>
                          {order.deliveryPostalCode ? <div>Postal: {order.deliveryPostalCode}</div> : null}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-2 text-xs leading-4">
                      <button
                        type="button"
                        className="w-full rounded-md p-1 text-left outline-none transition-colors hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-1"
                        title="View customer, items, and pricing"
                        onClick={() => {
                          setDetailOrder(order);
                          setReceiptOrder(null);
                        }}
                      >
                        {order.items.length === 0 ? (
                          <span className="text-gray-500">No item details in this API response</span>
                        ) : (
                          <div className="space-y-1">
                            {order.items.map((item) => (
                              <div key={item.id} className="rounded-sm border border-gray-100 bg-gray-50/60 px-2 py-1">
                                <div>
                                  <span className="font-medium">{item.menuItem.name}</span> x{item.quantity}
                                  <span className="text-gray-600"> ({formatMoney(item.totalPrice * item.quantity)})</span>
                                </div>
                                {item.selectedOptions.length > 0 ? (
                                  <div className="mt-1 space-y-0.5 text-[11px] text-gray-600">
                                    {item.selectedOptions.map((group) => (
                                      <div key={`${item.id}-${group.optionGroupId}`}>
                                        <span className="font-medium">{group.optionGroupName}:</span>{' '}
                                        {group.options
                                          .map((opt) =>
                                            opt.price > 0 ? `${opt.name} (+${formatMoney(opt.price)})` : opt.name
                                          )
                                          .join(', ')}
                                      </div>
                                    ))}
                                  </div>
                                ) : null}
                                {item.specialInstructions ? (
                                  <div className="mt-1 text-[11px] text-gray-500">
                                    Note: {item.specialInstructions}
                                  </div>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        )}
                        <span className="mt-1.5 block text-[10px] font-medium text-orange-700/90">
                          Full details →
                        </span>
                      </button>
                    </TableCell>
                    <TableCell className="py-2 text-xs leading-4">
                      {hasDiscount ? (
                        <div className="space-y-1">
                          {order.couponCode ? (
                            <div>
                              Coupon: <span className="font-semibold">{order.couponCode}</span>
                            </div>
                          ) : null}
                          {order.couponDiscount ? (
                            <div className="text-emerald-700">Coupon off: -{formatMoney(order.couponDiscount)}</div>
                          ) : null}
                          {order.offerDiscount ? (
                            <div className="text-emerald-700">Offer off: -{formatMoney(order.offerDiscount)}</div>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-gray-500">None</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2 text-sm font-bold text-orange-600">{formatMoney(order.total)}</TableCell>
                    <TableCell className="py-2">
                      <div className="space-y-2">
                        <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                        <Select
                          value={order.status}
                          onValueChange={(value: Order['status']) => handleStatusChange(order.id, value)}
                        >
                          <SelectTrigger id={`status-${order.id}`} className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="confirmed">Confirmed</SelectItem>
                            <SelectItem value="preparing">Preparing</SelectItem>
                            <SelectItem value="ready">Ready</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {sortedOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-gray-500">
                    No orders match your criteria
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}