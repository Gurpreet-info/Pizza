import React, { useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { cn } from '../components/ui/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '../components/ui/dialog';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus, Search } from 'lucide-react';
import { Offer, MenuItem, OfferKind, SpendRewardType } from '../types';
import { useApp } from '../context/AppContext';
import { spendGetFreeRuleSummary } from '../lib/spendOfferDisplay';
import { offerDatesFromFormFields } from '../lib/offerValidity';

interface OffersManagerProps {
  offers: Offer[];
  addOffer: (offer: Omit<Offer, 'id'>) => void;
  updateOffer: (id: string, offer: Partial<Offer>) => void;
  deleteOffer: (id: string) => void;
}

type MenuFetchIntent = 'add' | { editOfferId: string };

const PLACEHOLDER_IMG = 'https://placehold.co/600x400/e2e8f0/64748b?text=Offer';

function filterMenuItemsBySearch(items: MenuItem[], query: string): MenuItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) => {
    const hay = `${item.name} ${item.description} ${item.id} ${item.basePrice.toFixed(2)}`.toLowerCase();
    return hay.includes(q);
  });
}

function SearchableMenuItemMultiSelect({
  id,
  items,
  selectedIds,
  onSelectedIdsChange,
  searchValue,
  onSearchChange,
  emptyMessage,
  maxListHeightClass = 'max-h-52',
  searchPlaceholder = 'Search menu items…',
}: {
  id: string;
  items: MenuItem[];
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  emptyMessage: string;
  maxListHeightClass?: string;
  searchPlaceholder?: string;
}) {
  const filteredItems = useMemo(
    () => filterMenuItemsBySearch(items, searchValue),
    [items, searchValue]
  );

  const toggleItem = (itemId: string, checked: boolean) => {
    onSelectedIdsChange(
      checked
        ? [...new Set([...selectedIds, itemId])]
        : selectedIds.filter((x) => x !== itemId)
    );
  };

  const selectAllShown = () => {
    const ids = filteredItems.map((item) => item.id);
    onSelectedIdsChange([...new Set([...selectedIds, ...ids])]);
  };

  const clearAllShown = () => {
    const remove = new Set(filteredItems.map((item) => item.id));
    onSelectedIdsChange(selectedIds.filter((itemId) => !remove.has(itemId)));
  };

  if (items.length === 0) {
    return <p className="text-sm text-gray-500 text-center py-8 border rounded-md">{emptyMessage}</p>;
  }

  return (
    <>
      <div className="relative mb-2">
        <Search
          className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
          aria-hidden
        />
        <Input
          type="search"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-9"
          aria-controls={id}
        />
      </div>
      <p className="text-muted-foreground mb-2 text-xs">
        Click checkboxes to select multiple items. Selections stay saved while you search.
      </p>
      {filteredItems.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" className="h-8" onClick={selectAllShown}>
            Select all shown
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-8" onClick={clearAllShown}>
            Clear shown
          </Button>
        </div>
      ) : null}
      <div
        id={id}
        role="listbox"
        aria-multiselectable="true"
        className={cn(
          'overflow-y-auto rounded-md border border-input bg-background shadow-sm',
          maxListHeightClass
        )}
      >
        {filteredItems.length === 0 ? (
          <p className="text-muted-foreground px-3 py-6 text-center text-sm">
            {searchValue.trim() ? 'No menu items match your search.' : 'No items to show.'}
          </p>
        ) : (
          filteredItems.map((item) => {
            const checked = selectedIds.includes(item.id);
            return (
              <label
                key={item.id}
                htmlFor={`${id}-${item.id}`}
                className={cn(
                  'flex cursor-pointer items-start gap-3 border-b border-input/60 px-3 py-2.5 last:border-b-0 hover:bg-muted/40',
                  checked && 'bg-muted/30'
                )}
              >
                <Checkbox
                  id={`${id}-${item.id}`}
                  checked={checked}
                  onCheckedChange={(value) => toggleItem(item.id, value === true)}
                  className="mt-0.5"
                />
                <span className="min-w-0 flex-1 text-sm leading-snug">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-muted-foreground"> — ${item.basePrice.toFixed(2)}</span>
                </span>
              </label>
            );
          })
        )}
      </div>
    </>
  );
}

function offerSummary(offer: Offer): string {
  const kind: OfferKind = offer.offerKind ?? 'standard';
  if (kind === 'bogo_same') return 'Buy 1 get 1 (same item)';
  if (kind === 'bogo_any') return 'Buy 1 (paid list) get 1 free (free list)';
  if (kind === 'spend_get_free') {
    return spendGetFreeRuleSummary(offer);
  }
  return offer.discountType === 'percentage'
    ? `${offer.discountValue}% off`
    : `$${offer.discountValue.toFixed(2)} off`;
}

export function OffersManager({ offers, addOffer, updateOffer, deleteOffer }: OffersManagerProps) {
  const { apiRequest } = useApp();
  const menuFetchIntentRef = useRef<MenuFetchIntent>('add');
  const [isOpen, setIsOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [availableMenuItems, setAvailableMenuItems] = useState<MenuItem[]>([]);
  const [menuItemSearch, setMenuItemSearch] = useState({
    applicable: '',
    bogoPay: '',
    bogoFree: '',
    reward: '',
  });
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image: '',
    offerKind: 'standard' as OfferKind,
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: '',
    minSpend: '',
    spendRewardType: 'free_item' as SpendRewardType,
    spendRewardPercent: '',
    spendRewardFixed: '',
    rewardMenuItemId: '',
    applicableItemIds: [] as string[],
    bogoFreeItemIds: [] as string[],
    showOnSlider: false,
    validFrom: '',
    validUntil: '',
    active: true,
  });

  const mapApiToMenuItem = (item: any): MenuItem => {
    const categoriesRaw = (item.categories ?? []) as Array<{ id: number | string }>;
    let categoryIds = categoriesRaw.map((c) => String(c.id)).filter(Boolean);
    if (categoryIds.length === 0 && item.category_id != null && item.category_id !== '') {
      categoryIds = [String(item.category_id)];
    }
    return {
      id: String(item.id),
      name: item.name,
      description: item.description || '',
      basePrice: Number(item.base_price),
      categoryIds,
      categoryId: categoryIds[0] ?? '',
      image: item.image || '',
      available: Boolean(item.available),
    };
  };

  const fetchMenuItemsForAdd = async () => {
    try {
      const data = (await apiRequest('/menu-items/without-offers', {}, { silent: true })) as any[];
      setAvailableMenuItems(
        (data || []).map(mapApiToMenuItem).sort((a, b) => a.name.localeCompare(b.name))
      );
    } catch (error) {
      console.error('Error fetching menu items for new offer:', error);
      toast.error('Could not load menu items for offers. Try again.');
      setAvailableMenuItems([]);
    }
  };

  const loadMenuItemsForEditOffer = async (offerId: string) => {
    try {
      const data = (await apiRequest(
        `/menu-items/without-offers?for_offer_id=${offerId}`,
        {},
        { silent: true }
      )) as any[];
      setAvailableMenuItems((data || []).map(mapApiToMenuItem).sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error('Error loading menu items for offer edit:', error);
      toast.error('Could not load items for this offer. Try again.');
      setAvailableMenuItems([]);
    }
  };

  const resetForm = () => {
    menuFetchIntentRef.current = 'add';
    setFormData({
      title: '',
      description: '',
      image: '',
      offerKind: 'standard',
      discountType: 'percentage',
      discountValue: '',
      minSpend: '',
      spendRewardType: 'free_item',
      spendRewardPercent: '',
      spendRewardFixed: '',
      rewardMenuItemId: '',
      applicableItemIds: [],
      bogoFreeItemIds: [],
      showOnSlider: false,
      validFrom: '',
      validUntil: '',
      active: true,
    });
    setEditingOffer(null);
    setMenuItemSearch({ applicable: '', bogoPay: '', bogoFree: '', reward: '' });
  };

  const handleEdit = (offer: Offer) => {
    menuFetchIntentRef.current = { editOfferId: offer.id };
    setEditingOffer(offer);
    const kind = offer.offerKind ?? 'standard';
    setFormData({
      title: offer.title,
      description: offer.description,
      image: offer.image,
      offerKind: kind,
      discountType: offer.discountType,
      discountValue: offer.discountValue.toString(),
      minSpend: offer.minSpend != null ? String(offer.minSpend) : '',
      spendRewardType: offer.spendRewardType ?? 'free_item',
      spendRewardPercent:
        offer.spendRewardPercent != null ? String(offer.spendRewardPercent) : '',
      spendRewardFixed:
        offer.spendRewardFixedAmount != null ? String(offer.spendRewardFixedAmount) : '',
      rewardMenuItemId: offer.rewardMenuItemId || '',
      applicableItemIds: offer.applicableItemIds,
      bogoFreeItemIds: offer.bogoFreeItemIds ?? [],
      showOnSlider: Boolean(offer.showOnSlider),
      validFrom: new Date(offer.validFrom).toISOString().split('T')[0],
      validUntil: new Date(offer.validUntil).toISOString().split('T')[0],
      active: offer.active,
    });
    setIsOpen(true);
    void loadMenuItemsForEditOffer(offer.id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const kind = formData.offerKind;

    if (kind === 'standard') {
      if (formData.applicableItemIds.length === 0 && !editingOffer) {
        toast.error('Please select at least one menu item');
        return;
      }
      if (!formData.discountValue.trim()) {
        toast.error('Enter discount value');
        return;
      }
    } else if (kind === 'bogo_same') {
      if (formData.applicableItemIds.length === 0) {
        toast.error('Select at least one item in the BOGO pool');
        return;
      }
    } else if (kind === 'bogo_any') {
      if (formData.applicableItemIds.length === 0) {
        toast.error('Select at least one paid (buy) menu item');
        return;
      }
      if (formData.bogoFreeItemIds.length === 0) {
        toast.error('Select at least one free menu item');
        return;
      }
      const overlap = formData.applicableItemIds.filter((id) => formData.bogoFreeItemIds.includes(id));
      if (overlap.length > 0) {
        toast.error('Paid and free lists cannot include the same item');
        return;
      }
    } else if (kind === 'spend_get_free') {
      if (!formData.minSpend.trim() || Number(formData.minSpend) <= 0) {
        toast.error('Enter a minimum spend greater than 0');
        return;
      }
      const rt = formData.spendRewardType;
      if (rt === 'free_item') {
        if (!formData.rewardMenuItemId) {
          toast.error('Choose the free reward item');
          return;
        }
      } else if (rt === 'percent_off') {
        const p = parseFloat(formData.spendRewardPercent);
        if (!formData.spendRewardPercent.trim() || Number.isNaN(p) || p <= 0 || p > 100) {
          toast.error('Enter a percent off between 0 and 100');
          return;
        }
      } else if (rt === 'fixed_amount') {
        const f = parseFloat(formData.spendRewardFixed);
        if (!formData.spendRewardFixed.trim() || Number.isNaN(f) || f <= 0) {
          toast.error('Enter a fixed discount amount greater than 0');
          return;
        }
      }
    }

    const image =
      formData.image.trim() ||
      (kind === 'standard' ? '' : PLACEHOLDER_IMG);

    if (!image) {
      toast.error('Please enter an image URL');
      return;
    }

    const offerData: Omit<Offer, 'id'> = {
      title: formData.title,
      description: formData.description,
      image,
      offerKind: kind,
      discountType: kind === 'standard' ? formData.discountType : 'fixed',
      discountValue: kind === 'standard' ? parseFloat(formData.discountValue) : 0,
      minSpend: kind === 'spend_get_free' ? parseFloat(formData.minSpend) : null,
      spendRewardType: kind === 'spend_get_free' ? formData.spendRewardType : null,
      spendRewardPercent:
        kind === 'spend_get_free' && formData.spendRewardType === 'percent_off'
          ? parseFloat(formData.spendRewardPercent)
          : null,
      spendRewardFixedAmount:
        kind === 'spend_get_free' && formData.spendRewardType === 'fixed_amount'
          ? parseFloat(formData.spendRewardFixed)
          : null,
      rewardMenuItemId:
        kind === 'spend_get_free'
          ? formData.spendRewardType === 'free_item'
            ? formData.rewardMenuItemId
            : null
          : null,
      applicableItemIds: kind === 'spend_get_free' ? [] : formData.applicableItemIds,
      bogoFreeItemIds: kind === 'bogo_any' ? formData.bogoFreeItemIds : [],
      showOnSlider: formData.showOnSlider,
      ...offerDatesFromFormFields(formData.validFrom, formData.validUntil),
      active: formData.active,
    };

    if (editingOffer) {
      updateOffer(editingOffer.id, offerData);
      toast.success('Offer updated');
    } else {
      addOffer(offerData);
      toast.success('Offer added');
    }

    setIsOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this offer?')) {
      deleteOffer(id);
      toast.success('Offer deleted');
    }
  };

  const sortedMenuItems = [...availableMenuItems].sort((a, b) => a.name.localeCompare(b.name));
  const filteredRewardMenuItems = useMemo(
    () => filterMenuItemsBySearch(sortedMenuItems, menuItemSearch.reward),
    [sortedMenuItems, menuItemSearch.reward]
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Offers</CardTitle>
        <Dialog
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open);
            if (open) {
              if (menuFetchIntentRef.current === 'add') {
                void fetchMenuItemsForAdd();
              }
            } else {
              resetForm();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button
              type="button"
              onClick={() => {
                menuFetchIntentRef.current = 'add';
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Offer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingOffer ? 'Edit' : 'Add'} Offer</DialogTitle>
              <DialogDescription>
                Standard discounts work as before. BOGO and spend-threshold offers use the extra fields below.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div>
                  <Label htmlFor="offer-kind">Offer type *</Label>
                  <Select
                    value={formData.offerKind}
                    onValueChange={(value: OfferKind) =>
                      setFormData((prev) => ({
                        ...prev,
                        offerKind: value,
                        applicableItemIds: value === 'spend_get_free' ? [] : prev.applicableItemIds,
                        bogoFreeItemIds: value === 'bogo_any' ? prev.bogoFreeItemIds : [],
                        rewardMenuItemId: value === 'spend_get_free' ? prev.rewardMenuItemId : '',
                        minSpend: value === 'spend_get_free' ? prev.minSpend : '',
                        spendRewardType:
                          value === 'spend_get_free' ? prev.spendRewardType ?? 'free_item' : 'free_item',
                        spendRewardPercent: value === 'spend_get_free' ? prev.spendRewardPercent : '',
                        spendRewardFixed: value === 'spend_get_free' ? prev.spendRewardFixed : '',
                      }))
                    }
                  >
                    <SelectTrigger id="offer-kind" className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Percentage / fixed off selected items</SelectItem>
                      <SelectItem value="bogo_same">Buy 1 get 1 free — same product & toppings</SelectItem>
                      <SelectItem value="bogo_any">Buy 1 (paid items) get 1 free (separate free items)</SelectItem>
                      <SelectItem value="spend_get_free">
                        Spend threshold — free item, % off order, or $ off order
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Weekend Special"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Shown on the Offers page"
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="image">Image URL {formData.offerKind === 'standard' ? '*' : ''}</Label>
                  <Input
                    id="image"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    placeholder={PLACEHOLDER_IMG}
                    required={formData.offerKind === 'standard'}
                  />
                  {formData.offerKind !== 'standard' ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      Optional for BOGO / spend offers — a neutral placeholder is used if empty.
                    </p>
                  ) : null}
                </div>

                {formData.offerKind === 'standard' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="discountType">Discount type *</Label>
                      <Select
                        value={formData.discountType}
                        onValueChange={(value: 'percentage' | 'fixed') =>
                          setFormData({ ...formData, discountType: value })
                        }
                      >
                        <SelectTrigger id="discountType">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage (%)</SelectItem>
                          <SelectItem value="fixed">Fixed amount ($)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="discountValue">
                        Discount value * {formData.discountType === 'percentage' ? '(%)' : '($)'}
                      </Label>
                      <Input
                        id="discountValue"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.discountValue}
                        onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                ) : null}

                {formData.offerKind === 'spend_get_free' ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="spend-reward-type">Reward when minimum is met *</Label>
                      <Select
                        value={formData.spendRewardType}
                        onValueChange={(value: SpendRewardType) =>
                          setFormData((prev) => ({ ...prev, spendRewardType: value }))
                        }
                      >
                        <SelectTrigger id="spend-reward-type" className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free_item">One menu item free (customer adds it to cart)</SelectItem>
                          <SelectItem value="percent_off">Percentage off the whole order</SelectItem>
                          <SelectItem value="fixed_amount">Fixed dollar amount off the order</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="min-spend">Minimum cart subtotal ($) *</Label>
                        <Input
                          id="min-spend"
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={formData.minSpend}
                          onChange={(e) => setFormData({ ...formData, minSpend: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          After other line discounts (BOGO, item % off, etc.).
                        </p>
                      </div>
                      {formData.spendRewardType === 'free_item' ? (
                        <div>
                          <Label htmlFor="reward-item">Free reward menu item *</Label>
                          <div className="relative mt-2 mb-2">
                            <Search
                              className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                              aria-hidden
                            />
                            <Input
                              type="search"
                              value={menuItemSearch.reward}
                              onChange={(e) =>
                                setMenuItemSearch((prev) => ({ ...prev, reward: e.target.value }))
                              }
                              placeholder="Search menu items…"
                              className="pl-9"
                              aria-controls="reward-item"
                            />
                          </div>
                          <Select
                            value={formData.rewardMenuItemId || '__none__'}
                            onValueChange={(v) =>
                              setFormData((prev) => ({
                                ...prev,
                                rewardMenuItemId: v === '__none__' ? '' : v,
                              }))
                            }
                          >
                            <SelectTrigger id="reward-item">
                              <SelectValue placeholder="Select item" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">— Select —</SelectItem>
                              {filteredRewardMenuItems.map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.name} — ${item.basePrice.toFixed(2)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {menuItemSearch.reward.trim() && filteredRewardMenuItems.length === 0 ? (
                            <p className="text-muted-foreground mt-1 text-xs">
                              No menu items match your search.
                            </p>
                          ) : null}
                        </div>
                      ) : formData.spendRewardType === 'percent_off' ? (
                        <div>
                          <Label htmlFor="spend-pct">Percent off order (%) *</Label>
                          <Input
                            id="spend-pct"
                            type="number"
                            step="0.01"
                            min="0.01"
                            max="100"
                            value={formData.spendRewardPercent}
                            onChange={(e) =>
                              setFormData({ ...formData, spendRewardPercent: e.target.value })
                            }
                          />
                        </div>
                      ) : (
                        <div>
                          <Label htmlFor="spend-fixed">Amount off order ($) *</Label>
                          <Input
                            id="spend-fixed"
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={formData.spendRewardFixed}
                            onChange={(e) =>
                              setFormData({ ...formData, spendRewardFixed: e.target.value })
                            }
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="validFrom">Valid from *</Label>
                    <Input
                      id="validFrom"
                      type="date"
                      value={formData.validFrom}
                      onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="validUntil">Valid until *</Label>
                    <Input
                      id="validUntil"
                      type="date"
                      value={formData.validUntil}
                      onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {(formData.offerKind === 'standard' || formData.offerKind === 'bogo_same') && (
                  <div>
                    <Label htmlFor="applicable-menu-items" className="mb-2 block">
                      Eligible menu items *
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      {formData.offerKind === 'standard'
                        ? 'Select every item this discount applies to (one offer, many items).'
                        : 'Select every item for buy-one-get-one-same (one offer, many items).'}
                    </p>
                    <SearchableMenuItemMultiSelect
                      id="applicable-menu-items"
                      items={availableMenuItems}
                      selectedIds={formData.applicableItemIds}
                      onSelectedIdsChange={(selected) =>
                        setFormData((prev) => ({ ...prev, applicableItemIds: selected }))
                      }
                      searchValue={menuItemSearch.applicable}
                      onSearchChange={(value) =>
                        setMenuItemSearch((prev) => ({ ...prev, applicable: value }))
                      }
                      emptyMessage={
                        editingOffer
                          ? 'Loading items… or no items on this offer and none free to add.'
                          : 'No menu items without an offer. Remove items from other offers first.'
                      }
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Selected: {formData.applicableItemIds.length} item(s)
                    </p>
                  </div>
                )}

                {formData.offerKind === 'bogo_any' && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="bogo-pay-items" className="mb-2 block">
                        Paid (buy) items *
                      </Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Customer must add these to pay for the deal. Do not repeat these in the free list.
                      </p>
                      <SearchableMenuItemMultiSelect
                        id="bogo-pay-items"
                        items={availableMenuItems}
                        selectedIds={formData.applicableItemIds}
                        onSelectedIdsChange={(selected) =>
                          setFormData((prev) => ({ ...prev, applicableItemIds: selected }))
                        }
                        searchValue={menuItemSearch.bogoPay}
                        onSearchChange={(value) =>
                          setMenuItemSearch((prev) => ({ ...prev, bogoPay: value }))
                        }
                        emptyMessage={
                          editingOffer ? 'Loading items…' : 'No menu items without an offer.'
                        }
                        searchPlaceholder="Search paid (buy) items…"
                      />
                      <p className="text-xs text-gray-500 mt-2">Selected: {formData.applicableItemIds.length}</p>
                    </div>
                    <div>
                      <Label htmlFor="bogo-free-items" className="mb-2 block">
                        Free items *
                      </Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Eligible lines that can be discounted as the free side (one unit free per paid unit, cheapest free
                        units first).
                      </p>
                      <SearchableMenuItemMultiSelect
                        id="bogo-free-items"
                        items={availableMenuItems}
                        selectedIds={formData.bogoFreeItemIds}
                        onSelectedIdsChange={(selected) =>
                          setFormData((prev) => ({ ...prev, bogoFreeItemIds: selected }))
                        }
                        searchValue={menuItemSearch.bogoFree}
                        onSearchChange={(value) =>
                          setMenuItemSearch((prev) => ({ ...prev, bogoFree: value }))
                        }
                        emptyMessage={
                          editingOffer ? 'Loading items…' : 'No menu items without an offer.'
                        }
                        searchPlaceholder="Search free items…"
                      />
                      <p className="text-xs text-gray-500 mt-2">Selected: {formData.bogoFreeItemIds.length}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Switch
                    id="show-on-slider"
                    checked={formData.showOnSlider}
                    onCheckedChange={(checked) => setFormData({ ...formData, showOnSlider: checked })}
                  />
                  <Label htmlFor="show-on-slider">Show on home slider</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={formData.active}
                    onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                  />
                  <Label htmlFor="active">Active</Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">{editingOffer ? 'Update' : 'Add'} Offer</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Rule</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Valid until</TableHead>
              <TableHead>Slider</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {offers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  No offers found. Create one to get started!
                </TableCell>
              </TableRow>
            ) : (
              offers.map((offer: Offer) => (
                <TableRow key={offer.id}>
                  <TableCell className="font-medium">{offer.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{offer.offerKind ?? 'standard'}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] text-sm">{offerSummary(offer)}</TableCell>
                  <TableCell>
                    {offer.offerKind === 'bogo_any'
                      ? `${offer.applicableItemIds.length} pay / ${(offer.bogoFreeItemIds ?? []).length} free`
                      : `${offer.applicableItemIds.length} item(s)`}
                  </TableCell>
                  <TableCell>{new Date(offer.validUntil).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={offer.showOnSlider ? 'default' : 'secondary'}>
                      {offer.showOnSlider ? 'Shown' : 'Hidden'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={offer.active ? 'default' : 'secondary'}>
                      {offer.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(offer)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(offer.id)}>
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
