import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../context/AppContext';
import { normalizePostalCode } from '../lib/postal';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Separator } from '../components/ui/separator';
import { toast } from 'sonner';
import { Package, Tag, X } from 'lucide-react';
import {
  cartGrossExcludingBogoAutoFree,
  cartHasPromotionalPricing,
  cartLineNetTotal,
  cartNetItemsSubtotal,
  cartTotalOfferDiscountDollars,
} from '../lib/cartPricing';

export function CheckoutPage() {
  const navigate = useNavigate();
  const {
    cart,
    user,
    locations,
    activeDeliveryPostalCodes,
    createOrder,
    clearCart,
    validateCoupon,
    applyCoupon,
    applyOfferToCart,
    ensureCheckoutLoaded,
    checkoutEnsureAccount,
    ensureUserDashboardLoaded,
  } = useApp();

  useEffect(() => {
    void ensureCheckoutLoaded();
  }, []);

  const [orderType, setOrderType] = useState<'pickup' | 'delivery'>('pickup');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryPostalCode, setDeliveryPostalCode] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);

  const cartWithOffers = applyOfferToCart(cart);
  const totalOfferDiscount = cartWithOffers.reduce((sum, item) => {
    return sum + ((item.offerDiscount || 0) * item.quantity);
  }, 0);
  const subtotalPayable = cartGrossExcludingBogoAutoFree(cart);
  const offerDiscountDisplayTotal = cartTotalOfferDiscountDollars(cartWithOffers);
  const promoBlocksCoupon = cartHasPromotionalPricing(cart, cartWithOffers);
  const couponIsActive = Boolean(appliedCoupon);
  /** Coupons cannot stack with BOGO or any promotional offer on the cart. */
  const couponActiveForPricing = couponIsActive && !promoBlocksCoupon;

  useEffect(() => {
    if (!promoBlocksCoupon) return;
    if (!appliedCoupon && couponDiscount <= 0) return;
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponCode('');
    toast.info('Coupon removed: offers in your cart can’t be combined with a coupon.');
  }, [promoBlocksCoupon, appliedCoupon, couponDiscount]);

  const hasDeliveryZones = activeDeliveryPostalCodes.length > 0;
  const allowedPostalNormalized = useMemo(
    () => new Set(activeDeliveryPostalCodes.map((z) => normalizePostalCode(z.code))),
    [activeDeliveryPostalCodes]
  );
  const normalizedPostalInput = normalizePostalCode(deliveryPostalCode);
  const deliveryPostalAccepted =
    !hasDeliveryZones ||
    (normalizedPostalInput.length > 0 && allowedPostalNormalized.has(normalizedPostalInput));

  useEffect(() => {
    if (!hasDeliveryZones && orderType === 'delivery') {
      setOrderType('pickup');
    }
  }, [hasDeliveryZones, orderType]);

  if (cart.length === 0) {
    navigate('/cart');
    return null;
  }

  const deliveryFee = orderType === 'delivery' ? 5.99 : 0;
  /**
   * Same net line math as cart page: sum of (line − line offer) × qty. When a coupon is allowed,
   * strip line offers so pricing matches coupon-only semantics; never use gross cartTotal when
   * promos apply (avoids taxing BOGO list price if discounts aren’t in the branch yet).
   */
  const pricingCart = couponActiveForPricing
    ? cart.map((item) => ({ ...item, appliedOffer: undefined, offerDiscount: undefined }))
    : cartWithOffers;
  const itemsNetSubtotal = cartNetItemsSubtotal(pricingCart);
  const effectiveCouponDiscount = couponActiveForPricing ? couponDiscount : 0;
  const taxableAmount = itemsNetSubtotal + deliveryFee - effectiveCouponDiscount;
  const tax = taxableAmount * 0.13;
  const total = taxableAmount + tax;

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) {
      toast.error('Please enter a coupon code');
      return;
    }

    if (promoBlocksCoupon) {
      toast.error(
        'This cart has a promotional offer (including BOGO). Remove it or complete checkout without a coupon — offers and coupons can’t be combined.'
      );
      return;
    }

    const validation = validateCoupon(couponCode.trim(), subtotalPayable);

    if (validation.valid && validation.coupon) {
      let discount = 0;

      if (validation.coupon.discountType === 'percentage') {
        discount = (subtotalPayable * validation.coupon.discountValue) / 100;
        if (validation.coupon.maxDiscount && discount > validation.coupon.maxDiscount) {
          discount = validation.coupon.maxDiscount;
        }
      } else {
        discount = validation.coupon.discountValue;
      }

      setAppliedCoupon(validation.coupon);
      setCouponDiscount(discount);
      toast.success(validation.message);
    } else {
      toast.error(validation.message);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponCode('');
    toast.info('Coupon removed');
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    const startedAsGuest = user === null;
    let generatedPasswordFromCheckout: string | null = null;

    if (!customerName || !customerEmail || !customerPhone) {
      toast.error('Please fill in all customer information');
      return;
    }

    if (!user) {
      const { error, generatedPassword } = await checkoutEnsureAccount(
        customerName.trim(),
        customerEmail.trim(),
        customerPhone.trim()
      );
      if (error) {
        toast.error(error);
        return;
      }
      generatedPasswordFromCheckout = generatedPassword ?? null;
    }

    if (orderType === 'pickup' && !selectedLocation) {
      toast.error('Please select a pickup location');
      return;
    }

    if (orderType === 'delivery' && !deliveryAddress.trim()) {
      toast.error('Please enter a delivery address');
      return;
    }

    if (orderType === 'delivery' && hasDeliveryZones) {
      if (!normalizedPostalInput) {
        toast.error('Please enter your postal code');
        return;
      }
      if (!allowedPostalNormalized.has(normalizedPostalInput)) {
        toast.error('No delivery available in your area');
        return;
      }
    }

    if (couponActiveForPricing && appliedCoupon) {
      applyCoupon(appliedCoupon.code);
    }

    try {
      const itemsForOrder = couponActiveForPricing
        ? cart.map((item) => ({ ...item, appliedOffer: undefined, offerDiscount: undefined }))
        : cartWithOffers;

      const orderId = await createOrder({
        userId: user?.id || 'guest',
        items: itemsForOrder,
        subtotal: itemsNetSubtotal,
        tax,
        total,
        orderType,
        locationId: orderType === 'pickup' ? selectedLocation : undefined,
        deliveryAddress: orderType === 'delivery' ? deliveryAddress.trim() : undefined,
        deliveryPostalCode:
          orderType === 'delivery' && hasDeliveryZones ? normalizedPostalInput : undefined,
        status: 'pending',
        customerName,
        customerEmail,
        customerPhone,
        couponCode: couponActiveForPricing ? appliedCoupon?.code : undefined,
        couponDiscount: couponActiveForPricing ? couponDiscount : 0,
        offerDiscount: couponActiveForPricing ? 0 : totalOfferDiscount,
      });

      clearCart();
      if (startedAsGuest) {
        toast.success(
          generatedPasswordFromCheckout
            ? 'Account created and order placed! Your temporary password is on your dashboard.'
            : 'Order placed! Redirecting to your dashboard.'
        );
      } else {
        toast.success('Order placed successfully!');
      }
      await ensureUserDashboardLoaded();
      navigate('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not place order';
      toast.error(message);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Checkout</h1>

      <form onSubmit={handleSubmitOrder}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Order Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={orderType} onValueChange={(value) => setOrderType(value as 'pickup' | 'delivery')}>
                  <div className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value="pickup" id="pickup" />
                    <Label htmlFor="pickup" className="cursor-pointer">Pickup</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="delivery" id="delivery" disabled={!hasDeliveryZones} />
                    <Label htmlFor="delivery" className={!hasDeliveryZones ? 'cursor-not-allowed text-muted-foreground' : 'cursor-pointer'}>
                      Delivery (+$5.99)
                    </Label>
                  </div>
                </RadioGroup>
                {!hasDeliveryZones ? (
                  <p className="mt-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-3">
                    Delivery is not available until the restaurant adds at least one delivery postal code in the admin panel. You can still choose pickup.
                  </p>
                ) : null}

                {orderType === 'pickup' && (
                  <div className="mt-4">
                    <Label htmlFor="location">Select Pickup Location *</Label>
                    <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                      <SelectTrigger id="location" className="mt-2">
                        <SelectValue placeholder="Choose a location" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.name} - {location.address}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {orderType === 'delivery' && (
                  <div className="mt-4 space-y-4">
                    <div>
                      <Label htmlFor="postal">Postal code *</Label>
                      <Input
                        id="postal"
                        placeholder="e.g. M5V 3A8"
                        value={deliveryPostalCode}
                        onChange={(e) => setDeliveryPostalCode(e.target.value)}
                        className="mt-2"
                        autoComplete="postal-code"
                        required
                      />
                      {normalizedPostalInput.length > 0 && !deliveryPostalAccepted ? (
                        <p className="mt-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                          No delivery available in your area
                        </p>
                      ) : null}
                    </div>
                    <div>
                      <Label htmlFor="address">Street address *</Label>
                      <Input
                        id="address"
                        placeholder="Unit, street, city"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        className="mt-2"
                        required
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(416) 555-0100"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    required
                  />
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Please enter a valid number. We may call you to verify order details.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {pricingCart.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm gap-2">
                      <span className="min-w-0">
                        {item.menuItem.name} x{item.quantity}
                        {item.bogoSameAutoFree ? (
                          <span className="block text-xs text-muted-foreground">BOGO — 2nd unit free (same item)</span>
                        ) : item.bogoAutoFree ? (
                          <span className="block text-xs text-muted-foreground">BOGO — free item</span>
                        ) : null}
                      </span>
                      <span className="shrink-0">${cartLineNetTotal(item).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <Separator />

                {promoBlocksCoupon ? (
                  <p className="text-sm font-medium text-amber-800">
                    This cart uses a promotional offer (including BOGO). Coupons can&apos;t be combined — remove offer
                    items or check out without a coupon code.
                  </p>
                ) : null}

                {!promoBlocksCoupon && !appliedCoupon ? (
                  <div className="space-y-2">
                    <Label htmlFor="coupon" className="text-sm flex items-center gap-1">
                      <Tag className="h-4 w-4" />
                      Have a coupon code?
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="coupon"
                        placeholder="Enter code"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleApplyCoupon();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleApplyCoupon}
                        disabled={!couponCode.trim()}
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                ) : null}

                <Separator />

                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>${subtotalPayable.toFixed(2)}</span>
                </div>

                {!couponActiveForPricing && offerDiscountDisplayTotal > 0 && (
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-green-600">
                      <span>Offer discount</span>
                      <span>-${offerDiscountDisplayTotal.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Includes savings on free BOGO items (list price on each line).
                    </p>
                  </div>
                )}

                {orderType === 'delivery' && (
                  <div className="flex justify-between">
                    <span>Delivery Fee</span>
                    <span>${deliveryFee.toFixed(2)}</span>
                  </div>
                )}

                {couponActiveForPricing && appliedCoupon && (
                  <div className="flex justify-between">
                    <span className="flex items-center">
                      <Tag className="h-4 w-4 mr-1" />
                      {appliedCoupon.code}
                    </span>
                    <span className="flex items-center">
                      -${effectiveCouponDiscount.toFixed(2)}
                      <Button
                        type="button"
                        size="sm"
                        className="ml-2"
                        onClick={handleRemoveCoupon}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </span>
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
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={
                    orderType === 'delivery' &&
                    hasDeliveryZones &&
                    (!normalizedPostalInput || !allowedPostalNormalized.has(normalizedPostalInput))
                  }
                >
                  Place Order
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  By placing your order, you agree to our terms and conditions
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
