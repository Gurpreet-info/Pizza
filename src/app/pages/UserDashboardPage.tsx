import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../context/AppContext';
import { CartItem, Order } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { usePageMeta } from '../hooks/usePageMeta';

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
              {group.options
                .map((o) => (o.price > 0 ? `${o.name} (+${fmt(o.price)})` : o.name))
                .join(', ')}
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

export function UserDashboardPage() {
  usePageMeta(
    'My orders',
    'View your Pizza Offers order history, statuses, totals, and account details in one place.'
  );

  const navigate = useNavigate();
  const {
    user,
    orders,
    ensureUserDashboardLoaded,
    refreshUserOrdersQuiet,
    checkoutRevealPassword,
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