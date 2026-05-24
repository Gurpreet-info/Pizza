import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import { useApp } from '../context/AppContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Checkbox } from '../components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { toast } from 'sonner';
import { CartItem, SelectedOption, Option, OptionGroup } from '../types';
import { getOptionGroupOrderForMenuItem } from '../components/AdminFormSheet';
import { bucketOptionsByGroupId } from '../lib/optionGroupIds';
import { usePageMeta } from '../hooks/usePageMeta';
import { getMenuItemOfferDisplay } from '../lib/bogoOfferMenuBadge';
import { Minus, Plus } from 'lucide-react';
import { cn } from '../components/ui/utils';

function getSelectedCount(groupId: string, selectedOptions: SelectedOption[]): number {
  return selectedOptions.find((so) => so.optionGroupId === groupId)?.options.length ?? 0;
}

function formatGroupLimits(group: OptionGroup): string | null {
  if (group.type !== 'multiple') return null;
  const parts: string[] = [];
  if (group.minSelections != null && group.minSelections > 0) {
    parts.push(`min ${group.minSelections}`);
  }
  if (group.maxSelections != null && group.maxSelections > 0) {
    parts.push(`max ${group.maxSelections}`);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

export function MenuItemPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editCartItemId = searchParams.get('editCartItemId');
  const {
    cart,
    menuItems,
    optionGroups,
    options,
    addToCart,
    updateCartItemDetails,
    getActiveOffers,
    ensureMenuCustomizerLoaded,
  } = useApp();

  useEffect(() => {
    void ensureMenuCustomizerLoaded();
  }, []);

  const menuItem = menuItems.find(item => item.id === id);
  const metaDescription = menuItem
    ? (menuItem.description?.trim() ||
        `Customize ${menuItem.name} with options and add it to your cart at Pizza Offers.`)
    : 'This menu item could not be found. Browse the full menu and order online at Pizza Offers.';
  usePageMeta(menuItem ? menuItem.name : 'Menu item', metaDescription, 'menu_item');

  const itemOptionGroups = useMemo(() => {
    const list = optionGroups.filter(
      (og) => og.menuItemIds.includes(id!) || og.menuItemId === id
    );
    return [...list].sort((a: OptionGroup, b: OptionGroup) => {
      const byOrder =
        getOptionGroupOrderForMenuItem(a, id!) - getOptionGroupOrderForMenuItem(b, id!);
      if (byOrder !== 0) return byOrder;
      return (Number(a.id) || 0) - (Number(b.id) || 0);
    });
  }, [optionGroups, id]);

  const itemBogoOfferText = useMemo(() => {
    if (!menuItem) return null;
    const display = getMenuItemOfferDisplay(menuItem.id, getActiveOffers(), menuItems);
    const kind = display?.offer.offerKind;
    if (kind === 'bogo_same' || kind === 'bogo_any') return display?.badgeText ?? null;
    return null;
  }, [menuItem, menuItems, getActiveOffers]);

  /** Options per group in ascending order (shared options appear under each linked group). */
  const optionsByGroupId = useMemo(() => bucketOptionsByGroupId(options), [options]);
  const editingCartItem =
    editCartItemId && menuItem
      ? cart.find((c) => c.id === editCartItemId && c.menuItem.id === menuItem.id)
      : null;
  
  const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    if (editingCartItem) {
      setSelectedOptions(editingCartItem.selectedOptions);
      setQuantity(editingCartItem.quantity);
      setSpecialInstructions(editingCartItem.specialInstructions || '');
    } else {
      setSelectedOptions([]);
      setQuantity(1);
      setSpecialInstructions('');
    }
    setValidationErrors([]);
  }, [id, editingCartItem?.id]);

  useEffect(() => {
    if (editingCartItem) return;
    itemOptionGroups.forEach((group) => {
      if (group.required && group.type === 'single') {
        const groupOptions = optionsByGroupId.get(group.id) ?? [];
        const first = groupOptions[0];
        if (first) {
          setSelectedOptions((prev) => {
            const filtered = prev.filter((so) => so.optionGroupId !== group.id);
            return [
              ...filtered,
              {
                optionGroupId: group.id,
                optionGroupName: group.name,
                options: [first],
              },
            ];
          });
        }
      }
    });
  }, [id, itemOptionGroups, optionsByGroupId, editingCartItem?.id]);

  if (!menuItem) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold">Item not found</h1>
        <Button onClick={() => navigate('/popularpizza-menu')} className="mt-4">
          Back to Menu
        </Button>
      </div>
    );
  }

  const getImageForItem = (itemName: string) => {
    if (itemName.toLowerCase().includes('pizza')) {
      return 'https://images.unsplash.com/photo-1663858835211-3883764dcd52?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwaXp6YSUyMHJlc3RhdXJhbnQlMjBmb29kfGVufDF8fHx8MTc3NDYxNjMxN3ww&ixlib=rb-4.1.0&q=80&w=1080';
    } else if (itemName.toLowerCase().includes('burger')) {
      return 'https://images.unsplash.com/photo-1632898657999-ae6920976661?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXJnZXIlMjBnb3VybWV0JTIwZm9vZHxlbnwxfHx8fDE3NzQ2NDMyODB8MA&ixlib=rb-4.1.0&q=80&w=1080';
    } else if (itemName.toLowerCase().includes('pasta') || itemName.toLowerCase().includes('alfredo')) {
      return 'https://images.unsplash.com/photo-1609166639722-47053ca112ea?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwYXN0YSUyMGl0YWxpYW4lMjBmb29kfGVufDF8fHx8MTc3NDY4NzQzOHww&ixlib=rb-4.1.0&q=80&w=1080';
    } else if (itemName.toLowerCase().includes('salad')) {
      return 'https://images.unsplash.com/photo-1620019989479-d52fcedd99fe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmVzaCUyMHNhbGFkJTIwYm93bHxlbnwxfHx8fDE3NzQ2ODg1NTN8MA&ixlib=rb-4.1.0&q=80&w=1080';
    }
    return 'https://images.unsplash.com/photo-1596463989140-3b600dab72e5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkcmlua3MlMjBiZXZlcmFnZXMlMjByZXN0YXVyYW50fGVufDF8fHx8MTc3NDY4ODU1M3ww&ixlib=rb-4.1.0&q=80&w=1080';
  };

  const handleSingleSelect = (groupId: string, groupName: string, option: Option) => {
    setSelectedOptions(prev => {
      const filtered = prev.filter(so => so.optionGroupId !== groupId);
      return [...filtered, {
        optionGroupId: groupId,
        optionGroupName: groupName,
        options: [option],
      }];
    });
  };

  const getOptionQuantity = (groupId: string, optionId: string): number => {
    const group = selectedOptions.find((so) => so.optionGroupId === groupId);
    if (!group) return 0;
    return group.options.filter((o) => o.id === optionId).length;
  };

  const adjustRepeatOption = (
    groupId: string,
    groupName: string,
    option: Option,
    delta: number
  ) => {
    if (delta === 0) return;
    const og = itemOptionGroups.find((g) => g.id === groupId);
    setSelectedOptions((prev) => {
      const existingGroup = prev.find((so) => so.optionGroupId === groupId);
      const currentCount = existingGroup?.options.length ?? 0;

      if (delta > 0) {
        if (
          og?.maxSelections != null &&
          og.maxSelections > 0 &&
          currentCount >= og.maxSelections
        ) {
          toast.error(`You can only select up to ${og.maxSelections} option(s)`);
          return prev;
        }
        if (!existingGroup) {
          return [
            ...prev,
            { optionGroupId: groupId, optionGroupName: groupName, options: [option] },
          ];
        }
        return prev.map((so) =>
          so.optionGroupId === groupId
            ? { ...so, options: [...so.options, option] }
            : so
        );
      }

      if (!existingGroup) return prev;
      let removed = false;
      const updatedOptions = existingGroup.options.filter((o) => {
        if (!removed && o.id === option.id) {
          removed = true;
          return false;
        }
        return true;
      });
      if (updatedOptions.length === 0) {
        return prev.filter((so) => so.optionGroupId !== groupId);
      }
      return prev.map((so) =>
        so.optionGroupId === groupId ? { ...so, options: updatedOptions } : so
      );
    });
  };

  const handleMultipleSelect = (groupId: string, groupName: string, option: Option, checked: boolean) => {
    setSelectedOptions(prev => {
      const existingGroup = prev.find(so => so.optionGroupId === groupId);
      const group = itemOptionGroups.find(og => og.id === groupId);

      if (!existingGroup) {
        if (checked) {
          if (group?.maxSelections != null && group.maxSelections > 0 && 1 > group.maxSelections) {
            toast.error(`You can only select up to ${group.maxSelections} option(s)`);
            return prev;
          }
          return [...prev, {
            optionGroupId: groupId,
            optionGroupName: groupName,
            options: [option],
          }];
        }
        return prev;
      }

      if (checked) {
        if (group?.maxSelections != null && group.maxSelections > 0 && existingGroup.options.length >= group.maxSelections) {
          toast.error(`You can only select up to ${group.maxSelections} option(s)`);
          return prev;
        }
        return prev.map(so => 
          so.optionGroupId === groupId
            ? { ...so, options: [...so.options, option] }
            : so
        );
      } else {
        const updatedOptions = existingGroup.options.filter(o => o.id !== option.id);
        if (updatedOptions.length === 0) {
          return prev.filter(so => so.optionGroupId !== groupId);
        }
        return prev.map(so => 
          so.optionGroupId === groupId
            ? { ...so, options: updatedOptions }
            : so
        );
      }
    });
  };

  const isOptionSelected = (groupId: string, optionId: string): boolean => {
    return getOptionQuantity(groupId, optionId) > 0;
  };

  const calculateTotalPrice = (): number => {
    let total = menuItem.basePrice;
    selectedOptions.forEach(group => {
      group.options.forEach(option => {
        total += option.price;
      });
    });
    return total;
  };

  const validateSelections = (): boolean => {
    const errors: string[] = [];
    
    itemOptionGroups.forEach(group => {
      const selectedGroup = selectedOptions.find(so => so.optionGroupId === group.id);
      
      if (group.required && (!selectedGroup || selectedGroup.options.length === 0)) {
        errors.push(`Please select ${group.name}`);
      }
      
      if (
        group.type === 'multiple' &&
        group.minSelections != null &&
        group.minSelections > 0 &&
        (!selectedGroup || selectedGroup.options.length < group.minSelections)
      ) {
        errors.push(`Please select at least ${group.minSelections} option(s) for ${group.name}`);
      }

      if (
        group.type === 'multiple' &&
        group.maxSelections != null &&
        group.maxSelections > 0 &&
        selectedGroup &&
        selectedGroup.options.length > group.maxSelections
      ) {
        errors.push(`Please select at most ${group.maxSelections} option(s) for ${group.name}`);
      }
    });
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleAddToCart = () => {
    if (!validateSelections()) {
      toast.error('Please complete all required selections');
      return;
    }

    const bogoSameOffer = getActiveOffers().find(
      (offer) =>
        offer.offerKind === 'bogo_same' &&
        offer.applicableItemIds.includes(menuItem.id)
    );
    const quantityToAdd = !editingCartItem && bogoSameOffer ? Math.max(quantity, 2) : quantity;

    const cartItem: CartItem = {
      id: '',
      menuItem,
      selectedOptions,
      quantity: quantityToAdd,
      totalPrice: calculateTotalPrice(),
      specialInstructions: specialInstructions || undefined,
    };

    if (editingCartItem) {
      updateCartItemDetails(editingCartItem.id, {
        selectedOptions,
        quantity,
        totalPrice: calculateTotalPrice(),
        specialInstructions: specialInstructions || undefined,
      });
      toast.success('Cart item updated!');
    } else {
      addToCart(cartItem);
      toast.success('Added to cart!');
    }
    navigate('/cart');
  };

  const itemPrice = calculateTotalPrice();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image Section */}
        <div>
          <div className="aspect-square rounded-lg overflow-hidden sticky top-24">
            <ImageWithFallback
              src={menuItem.image || getImageForItem(menuItem.name)}
              alt={menuItem.name}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Options Section */}
        <div>
          <h1 className="text-4xl font-bold mb-2">{menuItem.name}</h1>
          <p className="text-gray-600 mb-4">{menuItem.description}</p>
          {itemBogoOfferText ? (
            <p className="text-sm font-medium text-emerald-700 mb-4">{itemBogoOfferText}</p>
          ) : null}
          <p className="text-3xl font-bold text-orange-600 mb-6">
            Starting at ${menuItem.basePrice.toFixed(2)}
          </p>

          {validationErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <ul className="list-disc list-inside text-red-600 text-sm">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Option Groups */}
          <div className="space-y-6 mb-6">
            {itemOptionGroups.map(group => {
              const groupOptions = optionsByGroupId.get(group.id) ?? [];
              const selectedCount = getSelectedCount(group.id, selectedOptions);
              const limitsLabel = formatGroupLimits(group);
              const atMax =
                group.type === 'multiple' &&
                group.maxSelections != null &&
                group.maxSelections > 0 &&
                selectedCount >= group.maxSelections;

              return (
                <Card key={group.id}>
                  <CardHeader>
                    <CardTitle className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <span className="flex flex-wrap items-center gap-2">
                        {group.name}
                        {group.required ? (
                          <span
                            className="rounded text-xs font-medium leading-none"
                            style={{
                              color: '#f54a00',
                              backgroundColor: 'rgb(232, 232, 232)',
                              padding: '3px 8px',
                            }}
                          >
                            Required
                          </span>
                        ) : null}
                      </span>
                      <span className="text-sm font-normal text-gray-500">
                        {group.type === 'multiple' ? (
                          <>
                            {selectedCount} selected
                            {limitsLabel ? ` (${limitsLabel})` : ''}
                          </>
                        ) : null}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {group.type === 'single' ? (
                      <RadioGroup
                        value={selectedOptions.find(so => so.optionGroupId === group.id)?.options[0]?.id || ''}
                        onValueChange={(value) => {
                          const option = groupOptions.find(o => o.id === value);
                          if (option) handleSingleSelect(group.id, group.name, option);
                        }}
                      >
                        {groupOptions.map(option => (
                          <div key={option.id} className="flex items-center justify-between py-2">
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value={option.id} id={option.id} />
                              <Label htmlFor={option.id} className="cursor-pointer">
                                {option.name}
                              </Label>
                            </div>
                            {option.price > 0 ? (
                              <span className="text-gray-600">+${option.price.toFixed(2)}</span>
                            ) : null}
                          </div>
                        ))}
                      </RadioGroup>
                    ) : group.allowRepeatSelections ? (
                      <div className="space-y-2">
                        {groupOptions.map((option) => {
                          const qty = getOptionQuantity(group.id, option.id);
                          const disablePlus = atMax;
                          return (
                            <div key={option.id} className="flex items-center justify-between py-2">
                              <div className="flex min-w-0 flex-1 items-center gap-2">
                                <span className="font-medium text-gray-900">{option.name}</span>
                                {option.price > 0 ? (
                                  <span className="text-gray-600 text-sm shrink-0">
                                    +${option.price.toFixed(2)}
                                  </span>
                                ) : null}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  disabled={qty === 0}
                                  aria-label={`Remove one ${option.name}`}
                                  onClick={() =>
                                    adjustRepeatOption(group.id, group.name, option, -1)
                                  }
                                >
                                  <Minus className="h-4 w-4" aria-hidden />
                                </Button>
                                <span className="w-6 text-center text-sm font-semibold tabular-nums">
                                  {qty}
                                </span>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  disabled={disablePlus}
                                  aria-label={`Add one ${option.name}`}
                                  onClick={() =>
                                    adjustRepeatOption(group.id, group.name, option, 1)
                                  }
                                >
                                  <Plus className="h-4 w-4" aria-hidden />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {groupOptions.map(option => {
                          const isSelected = isOptionSelected(group.id, option.id);
                          const disableUnchecked = atMax && !isSelected;
                          return (
                          <div key={option.id} className="flex items-center justify-between py-2">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={option.id}
                                checked={isSelected}
                                disabled={disableUnchecked}
                                onCheckedChange={(checked) => 
                                  handleMultipleSelect(group.id, group.name, option, checked as boolean)
                                }
                              />
                              <Label
                                htmlFor={option.id}
                                className={cn(
                                  'cursor-pointer',
                                  disableUnchecked && 'cursor-not-allowed opacity-50'
                                )}
                              >
                                {option.name}
                              </Label>
                            </div>
                            {option.price > 0 ? (
                              <span className="text-gray-600">+${option.price.toFixed(2)}</span>
                            ) : null}
                          </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {/* Special Instructions */}
            <Card>
              <CardHeader>
                <CardTitle>Special Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Any special requests? (optional)"
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  rows={3}
                />
              </CardContent>
            </Card>
          </div>

          {/* Quantity and Add to Cart */}
          <div className="bg-gray-50 rounded-lg p-6 sticky bottom-0">
            <div className="flex items-center justify-between mb-4">
              <span className="text-lg font-semibold">Quantity</span>
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-xl font-bold w-8 text-center">{quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <span className="text-2xl font-bold">Total</span>
              <span className="text-2xl font-bold text-orange-600">
                ${(itemPrice * quantity).toFixed(2)}
              </span>
            </div>

            <Button
              className="w-full" 
              size="lg"
              onClick={handleAddToCart}
            >
              {editingCartItem ? 'Update Cart Item' : 'Add to Cart'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
