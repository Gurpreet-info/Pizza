import React, { useEffect } from 'react';
import { Link, useParams } from 'react-router';
import { useApp } from '../context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';
import { CheckCircle2, MapPin, Package, Clock } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';

export function OrderConfirmationPage() {
  const { orderId } = useParams();
  const { orders, locations, ensureOrderConfirmationLoaded } = useApp();

  useEffect(() => {
    void ensureOrderConfirmationLoaded();
  }, []);

  const order = orders.find(o => o.id === orderId);
  usePageMeta(
    order ? `Order #${order.id}` : 'Order confirmation',
    order
      ? `Your Pizza Offers order #${order.id} is confirmed. Thank you — we will prepare it shortly.`
      : 'View your order confirmation number and details, or return to the menu to place an order.',
    'order_confirmation'
  );

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Order not found</h1>
        <Link to="/popularpizza-menu">
          <Button className="mt-4">Back to Menu</Button>
        </Link>
      </div>
    );
  }

  const location = order.locationId ? locations.find(l => l.id === order.locationId) : null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-8">
        <CheckCircle2 className="h-20 w-20 text-green-500 mx-auto mb-4" />
        <h1 className="text-4xl font-bold mb-2">Order Confirmed!</h1>
        <p className="text-gray-600 text-lg">Thank you for your order</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Order Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <span className="text-gray-600">Order Number:</span>
            <span className="font-semibold">#{order.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Order Date:</span>
            <span className="font-semibold">
              {new Date(order.createdAt).toLocaleString('en-CA', {
                dateStyle: 'medium',
                timeStyle: 'short'
              })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Status:</span>
            <span className="font-semibold capitalize px-3 py-1 rounded-full bg-orange-100 text-orange-700">
              {order.status}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Order Type Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {order.orderType === 'pickup' ? <Package className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
            {order.orderType === 'pickup' ? 'Pickup' : 'Delivery'} Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          {order.orderType === 'pickup' && location ? (
            <div className="space-y-2">
              <p className="font-semibold">{location.name}</p>
              <p className="text-gray-600">{location.address}</p>
              <p className="text-gray-600">{location.phone}</p>
              <div className="flex items-center gap-2 mt-4 text-orange-600">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">Ready for pickup in 20-30 minutes</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="font-semibold">Delivery Address</p>
              <p className="text-gray-600">{order.deliveryAddress}</p>
              <div className="flex items-center gap-2 mt-4 text-orange-600">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">Estimated delivery: 30-45 minutes</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Items */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {order.items.map((item) => (
            <div key={item.id}>
              <div className="flex justify-between mb-2">
                <div>
                  <p className="font-semibold">{item.menuItem.name} x{item.quantity}</p>
                  {item.selectedOptions.map((group) => (
                    <p key={group.optionGroupId} className="text-sm text-gray-600">
                      {group.optionGroupName}: {group.options.map(o => o.name).join(', ')}
                    </p>
                  ))}
                  {item.specialInstructions && (
                    <p className="text-sm text-gray-600 italic">Note: {item.specialInstructions}</p>
                  )}
                </div>
                <span className="font-semibold">${(item.totalPrice * item.quantity).toFixed(2)}</span>
              </div>
            </div>
          ))}

          <Separator />

          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>${order.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax (HST 13%)</span>
              <span>${order.tax.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-xl font-bold">
              <span>Total</span>
              <span className="text-orange-600">${order.total.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Name:</span>
            <span className="font-semibold">{order.customerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Email:</span>
            <span className="font-semibold">{order.customerEmail}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Phone:</span>
            <span className="font-semibold">{order.customerPhone}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Link to="/popularpizza-menu" className="flex-1">
          <Button variant="outline" className="w-full">Order Again</Button>
        </Link>
        <Link to="/dashboard" className="flex-1">
          <Button className="w-full">View My Orders</Button>
        </Link>
      </div>

      <div className="mt-8 text-center text-sm text-gray-600">
        <p>A confirmation email has been sent to {order.customerEmail}</p>
        <p className="mt-2">Need help? Call us at (416) 555-0100</p>
      </div>
    </div>
  );
}
