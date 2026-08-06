import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../context/AppContext';
import { formatSelectedOptionNames } from '../lib/formatSelectedOptions';
import { CartItem, Order, Location } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { usePageMeta } from '../hooks/usePageMeta';
import { Receipt } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Share2 } from "lucide-react";
import * as htmlToImage from "html-to-image";

const RECEIPT_HST_PERCENT = 13;

const formatStatusLabel = (status: string) =>
  status.length ? status.charAt(0).toUpperCase() + status.slice(1) : status;

const fmt = (n: number) => `$${n.toFixed(2)}`;

const optionsExtraPerUnit = (item: CartItem) =>
  item.selectedOptions.reduce(
    (sum, g) => sum + g.options.reduce((s, o) => s + (o.price || 0), 0),
    0
  );

function DashboardOrderLineItem({ item }: { item: CartItem }) {
  const extras = optionsExtraPerUnit(item);
  const unitPrice = item.totalPrice;
  const lineTotal = unitPrice * item.quantity;
  const offerPerUnit = item.offerDiscount ?? 0;

  return (
    <li className="rounded-lg border bg-muted/30 p-3 sm:p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-base font-semibold">
          {item.menuItem.name}
          <span className="ml-1 font-normal text-muted-foreground">× {item.quantity}</span>
        </p>
        <p className="text-lg font-semibold tabular-nums text-orange-600">{fmt(lineTotal)}</p>
      </div>

      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
        <div className="flex justify-between gap-4 tabular-nums">
          <span>Menu base (each)</span>
          <span>{fmt(item.menuItem.basePrice)}</span>
        </div>
        {extras > 0 ? (
          <div className="flex justify-between gap-4 tabular-nums">
            <span>Add-ons (each)</span>
            <span>+{fmt(extras)}</span>
          </div>
        ) : null}
        {offerPerUnit > 0 ? (
          <div className="flex justify-between gap-4 tabular-nums text-emerald-700">
            <span>
              Offer
              {item.appliedOffer?.title ? `: ${item.appliedOffer.title}` : ''} (per item)
            </span>
            <span>−{fmt(offerPerUnit)}</span>
          </div>
        ) : null}
        <div className="flex justify-between gap-4 border-t border-border/60 pt-1 font-medium text-foreground tabular-nums">
          <span>Your price (each)</span>
          <span>{fmt(unitPrice)}</span>
        </div>
        <div className="flex justify-between gap-4 tabular-nums text-foreground">
          <span>Line total ({item.quantity} × {fmt(unitPrice)})</span>
          <span className="font-medium">{fmt(lineTotal)}</span>
        </div>
      </div>

      {item.selectedOptions.length > 0 ? (
        <ul className="mt-3 space-y-1.5 border-t border-border/60 pt-3 text-sm">
          {item.selectedOptions.map((group) => (
            <li key={group.optionGroupId}>
              <span className="font-medium text-muted-foreground">{group.optionGroupName}:</span>{' '}
              {formatSelectedOptionNames(group.options)}
              {group.options.some((o) => o.price > 0) ? (
                <span className="text-orange-600">
                  {' '}
                  (+{fmt(group.options.reduce((sum, o) => sum + o.price, 0))})
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {item.specialInstructions ? (
        <p className="mt-3 border-t border-border/60 pt-3 text-sm italic text-muted-foreground">
          Note: {item.specialInstructions}
        </p>
      ) : null}

    </li>
  );
}

function OrderPricingFooter({ order }: { order: Order }) {
  const offerOff = order.offerDiscount ?? 0;
  const couponOff = order.couponDiscount ?? 0;
  return (
    <div className="mt-4 space-y-1.5 border-t pt-4 text-sm">
      <div className="flex justify-between gap-4 tabular-nums">
        <span className="text-muted-foreground">Subtotal</span>
        <span>{fmt(order.subtotal)}</span>
      </div>
      {offerOff > 0 ? (
        <div className="flex justify-between gap-4 tabular-nums text-emerald-700">
          <span>Offer discount</span>
          <span>−{fmt(offerOff)}</span>
        </div>
      ) : null}
      {couponOff > 0 ? (
        <div className="flex justify-between gap-4 tabular-nums text-emerald-700">
          <span>Coupon{order.couponCode ? ` (${order.couponCode})` : ''}</span>
          <span>−{fmt(couponOff)}</span>
        </div>
      ) : null}
      <div className="flex justify-between gap-4 tabular-nums">
        <span className="text-muted-foreground">HST (13%)</span>
        <span>{fmt(order.tax)}</span>
      </div>
      <div className="flex justify-between gap-4 pt-1 text-base font-semibold tabular-nums">
        <span>Order total</span>
        <span className="text-orange-600">{fmt(order.total)}</span>
      </div>
    </div>
  );
}

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
        <div>{order.customerEmail}</div>
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

export function UserDashboardPage() {
  usePageMeta(
    'My orders',
    'View your Pizza Offers order history, statuses, totals, and account details in one place.',
    'user_dashboard'
  );
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const {
    user,
    orders,
    ensureUserDashboardLoaded,
    refreshUserOrdersQuiet,
    checkoutRevealPassword,
    locations
  } = useApp();
  const [showCheckoutPassword, setShowCheckoutPassword] = useState(false);
  const prevStatusesRef = useRef<Record<string, string>>({});
  const [statusBanners, setStatusBanners] = useState<
    Record<string, { from: string; to: string }>
  >({});
  const refreshQuietRef = useRef(refreshUserOrdersQuiet);
  refreshQuietRef.current = refreshUserOrdersQuiet;

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!user || user.isAdmin) return;
    void ensureUserDashboardLoaded();
  }, [user]);

  useEffect(() => {
    if (!user || user.isAdmin) return;
    const intervalId = window.setInterval(() => {
      void refreshQuietRef.current();
    }, 10_000);
    return () => window.clearInterval(intervalId);
  }, [user?.id, user?.isAdmin]);

  useEffect(() => {
    if (!user?.id) return;
    prevStatusesRef.current = {};
    setStatusBanners({});
  }, [user?.id]);

  const userOrders = useMemo(() => {
    const uid = user?.id;
    if (!uid) return [];
    return orders
      .filter((order) => order.userId === uid)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }, [orders, user?.id]);

  useEffect(() => {
    if (!user || user.isAdmin) return;
    const prev = prevStatusesRef.current;
    const nextSnapshot: Record<string, string> = { ...prev };
    const newBanners: Record<string, { from: string; to: string }> = {};

    for (const o of userOrders) {
      const oldStatus = prev[o.id];
      if (oldStatus !== undefined && oldStatus !== o.status) {
        newBanners[o.id] = { from: oldStatus, to: o.status };
        toast.info(`Order #${o.id} is now ${formatStatusLabel(o.status)}`, {
          description: `Previously: ${formatStatusLabel(oldStatus)}`,
        });
      }
      nextSnapshot[o.id] = o.status;
    }

    prevStatusesRef.current = nextSnapshot;

    if (Object.keys(newBanners).length > 0) {
      setStatusBanners((b) => ({ ...b, ...newBanners }));
    }
  }, [user?.id, user?.isAdmin, userOrders]);

  if (!user) {
    return null;
  }

  const handleShareReceipt = async () => {
      if (!receiptRef.current || !receiptOrder) return;
  
      try {
        // Generate PNG from receipt
        const dataUrl = await htmlToImage.toPng(receiptRef.current, {
          quality: 1,
          pixelRatio: 3,
          backgroundColor: "#ffffff",
          cacheBust: true,
        });
  
        const blob = await (await fetch(dataUrl)).blob();
  
        const file = new File(
          [blob],
          `Receipt-${receiptOrder.id}.png`,
          {
            type: "image/png",
          }
        );
  
        // Mobile sharing (WhatsApp, etc.)
        if (
          navigator.share &&
          navigator.canShare?.({
            files: [file],
          })
        ) {
          await navigator.share({
            title: `Receipt #${receiptOrder.id}`,
            text: "Pizza Receipt",
            files: [file],
          });
          return;
        }
  
        // Desktop fallback (downloads the image)
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `Receipt-${receiptOrder.id}.png`;
        a.click();
      } catch (err) {
        console.error(err);
      }
    };

  const getStatusColor = (status: Order['status']) => {
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">My Dashboard</h1>
        <p className="text-gray-600">Welcome back, {user.name}!</p>
      </div>

      {/* User Info */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Name:</span>
            <span className="font-semibold">{user.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Email:</span>
            <span className="font-semibold">{user.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Phone:</span>
            <span className="font-semibold">{user.phone}</span>
          </div>
          {checkoutRevealPassword ? (
            <div className="pt-4 border-t border-gray-100">
              <Label htmlFor="checkout-generated-password" className="text-gray-600">
                Your sign-in password (from checkout)
              </Label>
              <p className="text-xs text-muted-foreground mt-1 mb-2">
                Save this password to log in later. You verified your phone at checkout.
              </p>
              <div className="flex gap-2">
                <Input
                  id="checkout-generated-password"
                  type={showCheckoutPassword ? 'text' : 'password'}
                  readOnly
                  value={checkoutRevealPassword}
                  className="font-mono text-sm"
                  autoComplete="off"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  aria-label={showCheckoutPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowCheckoutPassword((s) => !s)}
                >
                  {showCheckoutPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          ) : null}
          {user.isAdmin && (
            <div className="flex justify-between">
              <span className="text-gray-600">Role:</span>
              <Badge>Administrator</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Orders */}
      <Card>
        <Dialog
        open={receiptOrder !== null}
        onOpenChange={(open) => {
          if (!open) setReceiptOrder(null);
        }}
      >
        <DialogContent
          className="
            max-h-[92vh]
            max-w-md
            overflow-y-auto
            sm:max-w-md

            print:fixed
            print:top-0
            print:left-1/2
            print:-translate-x-1/2
            print:translate-y-0

            print:w-[80mm]
            print:max-w-[80mm]

            print:max-h-none
            print:overflow-visible
            print:border-none
            print:bg-white
            print:p-0
            print:shadow-none
          "
        >
          <DialogHeader className="print:hidden">
            <DialogTitle>Receipt — Order #{receiptOrder?.id ?? ''}</DialogTitle>
            
          </DialogHeader>
          <div className="mb-3 flex gap-2 print:hidden">

            <Button
              type="button"
              variant="default"
              size="sm"
              className="gap-1.5"
              onClick={handleShareReceipt}
            >
              <Share2 className="h-4 w-4" />
              Share Receipt
            </Button>
          </div>
         
          
          {receiptOrder ? (
              <div ref={receiptRef}>
                <OrderReceiptContent
                  order={receiptOrder}
                  locations={locations}
                />
              </div>
            ) : null
          }
        </DialogContent>
      </Dialog>

        <CardHeader>
          <CardTitle>Order History</CardTitle>
        </CardHeader>
        <CardContent>
          {userOrders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">You haven't placed any orders yet</p>
              <Button onClick={() => navigate('/popularpizza-menu')}>Browse Menu</Button>
            </div>
          ) : (
            <div className="space-y-6">
              {userOrders.map((order) => (
                <div key={order.id}>
                  {statusBanners[order.id] ? (
                    <div
                      className="mb-3 flex flex-col gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-950 sm:flex-row sm:items-center sm:justify-between"
                      role="status"
                    >
                      <span>
                        <span className="font-semibold">Order update: </span>
                        {formatStatusLabel(statusBanners[order.id].from)} →{' '}
                        {formatStatusLabel(statusBanners[order.id].to)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 shrink-0 text-sky-900 hover:bg-sky-100"
                        onClick={() =>
                          setStatusBanners((b) => {
                            const next = { ...b };
                            delete next[order.id];
                            return next;
                          })
                        }
                      >
                        Dismiss
                      </Button>
                    </div>
                  ) : null}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div>
                      <p className="font-semibold">Order #{order.id}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(order.createdAt).toLocaleString('en-CA', {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })}
                      </p>
                      {order.status === 'completed' && (
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
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                      <span className="font-bold text-orange-600">
                        ${order.total.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {order.items.length > 0 ? (
                    <ul className="mb-4 space-y-3">
                      {order.items.map((item) => (
                        <DashboardOrderLineItem key={item.id} item={item} />
                      ))}
                    </ul>
                  ) : (
                    <p className="mb-4 text-sm text-muted-foreground">No line items recorded for this order.</p>
                  )}

                  <OrderPricingFooter order={order} />

                  <div className="mt-4 flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                      <span className="capitalize">{order.orderType}</span>
                      {order.orderType === 'delivery' && order.deliveryAddress && (
                        <span> - {order.deliveryAddress}</span>
                      )}
                    </div>
                                        
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/order-confirmation/${order.id}`)}
                    >
                      View Details
                    </Button>
                  </div>

                  <Separator className="mt-6" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}