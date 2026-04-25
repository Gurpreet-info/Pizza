import React, { useState, useEffect } from 'react';
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
import { CartItem, SelectedOption, Option } from '../types';
import { usePageMeta } from '../hooks/usePageMeta';
import { Minus, Plus } from 'lucide-react';

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
  usePageMeta(menuItem ? menuItem.name : 'Menu item', metaDescription);

  const itemOptionGroups = optionGroups.filter(og => og.menuItemId === id);
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
        const groupOptions = options.filter((o) => o.optionGroupId === group.id);
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
  }, [id, itemOptionGroups.length, options.length, editingCartItem?.id]);

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

  const handleMultipleSelect = (groupId: string, groupName: string, option: Option, checked: boolean) => {
    setSelectedOptions(prev => {
      const existingGroup = prev.find(so => so.optionGroupId === groupId);
      
      if (!existingGroup) {
        if (checked) {
          return [...prev, {
            optionGroupId: groupId,
            optionGroupName: groupName,
            options: [option],
          }];
        }
        return prev;
      }

      if (checked) {
        const group = itemOptionGroups.find(og => og.id === groupId);
        if (group?.maxSelections && existingGroup.options.length >= group.maxSelections) {
          toast.error(`You can only select up to ${group.maxSelections} options`);
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
    const group = selectedOptions.find(so => so.optionGroupId === groupId);
    return group ? group.options.some(o => o.id === optionId) : false;
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
      
      if (group.minSelections && (!selectedGroup || selectedGroup.options.length < group.minSelections)) {
        errors.push(`Please select at least ${group.minSelections} option(s) for ${group.name}`);
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
              const groupOptions = options.filter(o => o.optionGroupId === group.id);
              
              return (
                <Card key={group.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>
                        {group.name}
                        {group.required && <span className="text-red-500 ml-1">*</span>}
                      </span>
                      {group.type === 'multiple' && group.maxSelections && (
                        <span className="text-sm font-normal text-gray-500">
                          (Max {group.maxSelections})
                        </span>
                      )}
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
                            <span className="text-gray-600">
                              {option.price > 0 ? `+$${option.price.toFixed(2)}` : 'Free'}
                            </span>
                          </div>
                        ))}
                      </RadioGroup>
                    ) : (
                      <div className="space-y-2">
                        {groupOptions.map(option => (
                          <div key={option.id} className="flex items-center justify-between py-2">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={option.id}
                                checked={isOptionSelected(group.id, option.id)}
                                onCheckedChange={(checked) => 
                                  handleMultipleSelect(group.id, group.name, option, checked as boolean)
                                }
                              />
                              <Label htmlFor={option.id} className="cursor-pointer">
                                {option.name}
                              </Label>
                            </div>
                            <span className="text-gray-600">
                              {option.price > 0 ? `+$${option.price.toFixed(2)}` : 'Free'}
                            </span>
                          </div>
                        ))}
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
