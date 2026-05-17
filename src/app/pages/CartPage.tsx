import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useApp } from '../context/AppContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import {
  cartGrossExcludingBogoAutoFree,
  cartLineNetTotal,
  cartNetItemsSubtotal,
  cartTotalOfferDiscountDollars,
  isCartAutoAddedBogoFreeLine,
} from '../lib/cartPricing';
import { usePageMeta } from '../hooks/usePageMeta';

export function CartPage() {
  usePageMeta(
    'Cart',
    'Review your Pizza Offers cart — items, quantities, options, and applied deals before checkout.',
    'cart'
  );

  const navigate = useNavigate();
  const { cart, removeFromCart, updateCartItemQuantity, applyOfferToCart, ensureCartPricingLoaded } = useApp();

  useEffect(() => {
    void ensureCartPricingLoaded();
  }, []);

  // Apply offers to cart items
  const cartWithOffers = applyOfferToCart(cart);

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

  if (cart.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <ShoppingBag className="h-24 w-24 mx-auto text-gray-300 mb-4" />
        <h1 className="text-3xl font-bold mb-4">Your cart is empty</h1>
        <p className="text-gray-600 mb-8">Add some delicious items to get started!</p>
        <Link to="/popularpizza-menu">
          <Button size="lg">Browse Menu</Button>
        </Link>
      </div>
    );
  }

  /** Lines you pay for (auto BOGO free rows excluded from gross). */
  const subtotal = cartGrossExcludingBogoAutoFree(cart);
  /** All line-level offer savings, including full list value discounted on auto-added free BOGO lines. */
  const offerDiscountTotal = cartTotalOfferDiscountDollars(cartWithOffers);

  /** Match checkout: tax on same net items subtotal as line previews (pickup, no delivery/coupon). */
  const itemsNetSubtotal = cartNetItemsSubtotal(cartWithOffers);
  const tax = itemsNetSubtotal * 0.13; // 13% HST for Ontario, Canada
  const total = itemsNetSubtotal + tax;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Your Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cartWithOffers.map((item) => (
            <Card key={item.id}>
              <CardContent
                className="p-6 cursor-pointer"
                onClick={() =>
                  navigate(
                    `/popularpizza-menu/item/${item.menuItem.id}?editCartItemId=${encodeURIComponent(item.id)}`
                  )
                }
              >
                <div className="flex gap-4">
                  <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                    <ImageWithFallback
                      src={item.menuItem.image || getImageForItem(item.menuItem.name)}
                      alt={item.menuItem.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">
                      <Link
                        to={`/popularpizza-menu/item/${item.menuItem.id}?editCartItemId=${encodeURIComponent(item.id)}`}
                        className="hover:text-orange-600 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {item.menuItem.name}
                      </Link>
                    </h3>
                    {item.bogoSameAutoFree ? (
                      <p className="text-sm text-muted-foreground mb-2">
                        Buy 1 get 1 — free second unit added automatically (same item)
                      </p>
                    ) : item.bogoAutoFree ? (
                      <p className="text-sm text-muted-foreground mb-2">
                        Free with offer — added automatically (BOGO)
                      </p>
                    ) : null}
                    
                    {/* Selected Options */}
                    {item.selectedOptions.map((selectedGroup) => (
                      <div key={selectedGroup.optionGroupId} className="text-sm text-gray-600 mb-1">
                        <span className="font-medium">{selectedGroup.optionGroupName}:</span>{' '}
                        {selectedGroup.options.map(opt => opt.name).join(', ')}
                        {selectedGroup.options.some(opt => opt.price > 0) && (
                          <span className="text-orange-600 ml-1">
                            (+${selectedGroup.options.reduce((sum, opt) => sum + opt.price, 0).toFixed(2)})
                          </span>
                        )}
                      </div>
                    ))}

                    {item.specialInstructions && (
                      <div className="text-sm text-gray-600 mt-2">
                        <span className="font-medium">Note:</span> {item.specialInstructions}
                      </div>
                    )}

                    {/* Offer Applied Badge */}
                    {item.appliedOffer && (item.offerDiscount ?? 0) > 0 && (
                      <div className="mt-3 inline-flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-sm font-medium border border-green-200">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {item.appliedOffer.title} - Save ${((item.offerDiscount ?? 0) * item.quantity).toFixed(2)}
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center space-x-3">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          disabled={isCartAutoAddedBogoFreeLine(item)}
                          onClick={(e) => {
                            e.stopPropagation();
                            updateCartItemQuantity(item.id, item.quantity - 1);
                          }}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="font-medium w-8 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          disabled={isCartAutoAddedBogoFreeLine(item)}
                          onClick={(e) => {
                            e.stopPropagation();
                            updateCartItemQuantity(item.id, item.quantity + 1);
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          {(item.offerDiscount ?? 0) > 0 && (
                            <div className="text-sm text-muted-foreground line-through">
                              ${(item.totalPrice * item.quantity).toFixed(2)}
                            </div>
                          )}
                          <span className="text-xl font-bold text-orange-600">
                            ${cartLineNetTotal(item).toFixed(2)}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={isCartAutoAddedBogoFreeLine(item)}
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromCart(item.id);
                          }}
                          className="text-red-500 hover:text-red-700 disabled:opacity-40"
                          title={
                            isCartAutoAddedBogoFreeLine(item)
                              ? 'Remove paid items to change this free line'
                              : undefined
                          }
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {offerDiscountTotal > 0 && (
                <div className="space-y-0.5">
                  <div className="flex justify-between text-green-600">
                    <span>Offer discount</span>
                    <span>-${offerDiscountTotal.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Includes savings on free BOGO items (list price shown on each line).
                  </p>
                </div>
              )}
              <div className="flex justify-between">
                <span>Tax (HST 13%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-xl font-bold">
                <span>Total</span>
                <span className="text-orange-600">${total.toFixed(2)}</span>
              </div>

              <Button 
                className="w-full" 
                size="lg"
                onClick={() => navigate('/checkout')}
              >
                Proceed to Checkout
              </Button>

              <Link to="/popularpizza-menu">
                <Button variant="outline" className="w-full">
                  Continue Shopping
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}