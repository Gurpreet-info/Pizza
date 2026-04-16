import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../context/AppContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus, Bell } from 'lucide-react';
import { MenuItem, Category, OptionGroup, Option, Location, Coupon, Offer, Order } from '../types';
import { OptionsManager, LocationsManager, OrdersManager } from '../components/AdminComponents';
import { OffersManager } from '../components/OffersManager';
import { DeliveryPostalCodesManager } from '../components/DeliveryPostalCodesManager';
import orderReadySoundUrl from '../../assets/order-ready.mpeg?url';
import { usePageMeta } from '../hooks/usePageMeta';

const ADMIN_ORDER_ACK_KEY = 'pizza_admin_orders_last_ack_id';

function maxNumericOrderId(orderList: Order[]): number {
  if (!orderList.length) return 0;
  return Math.max(...orderList.map((o) => Number(o.id) || 0));
}

export function AdminPage() {
  usePageMeta(
    'Admin',
    'Pizza Offers admin — manage menu, locations, coupons, offers, delivery zones, and order history.'
  );

  const navigate = useNavigate();
  const { 
    user, 
    menuItems, categories, optionGroups, options, locations, orders, coupons, offers,
    addMenuItem, updateMenuItem, deleteMenuItem,
    addCategory, updateCategory, deleteCategory,
    addOptionGroup, updateOptionGroup, deleteOptionGroup,
    addOption, updateOption, deleteOption,
    addLocation, updateLocation, deleteLocation,
    deliveryPostalCodesAdmin,
    addDeliveryPostalCode, updateDeliveryPostalCode, deleteDeliveryPostalCode,
    addCoupon, updateCoupon, deleteCoupon,
    addOffer, updateOffer, deleteOffer,
    fetchAdminOrders,
    updateOrderStatus,
    refreshAdminOrdersList,
    ensureAdminWorkspaceLoaded,
  } = useApp();

  useEffect(() => {
    if (!user?.isAdmin) return;
    void ensureAdminWorkspaceLoaded();
  }, [user?.isAdmin]);

  const [adminTab, setAdminTab] = useState('dashboard');
  const [lastAckOrderId, setLastAckOrderId] = useState(() => {
    if (typeof sessionStorage === 'undefined') return 0;
    const raw = sessionStorage.getItem(ADMIN_ORDER_ACK_KEY);
    if (raw === null) return 0;
    return parseInt(raw, 10) || 0;
  });
  const pollRef = useRef(refreshAdminOrdersList);
  pollRef.current = refreshAdminOrdersList;

  /** First orders snapshot: baseline only (no voice for orders that already existed). */
  const ordersAlertBaselineDoneRef = useRef(false);
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  /** Order IDs still `pending` that trigger the alert sound until `confirmed` or `cancelled`. */
  const ordersNeedingVoiceAlertRef = useRef<Set<string>>(new Set());
  const orderAlertAudioRef = useRef<HTMLAudioElement | null>(null);
  const orderAlertGapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const orderAlertLoopScheduledRef = useRef(false);
  const orderAlertEndedHandlerRef = useRef<(() => void) | null>(null);

  const clearOrderAlertGapTimeout = () => {
    if (orderAlertGapTimeoutRef.current != null) {
      clearTimeout(orderAlertGapTimeoutRef.current);
      orderAlertGapTimeoutRef.current = null;
    }
  };

  const stopOrderAlertPlayback = useCallback(() => {
    clearOrderAlertGapTimeout();
    orderAlertLoopScheduledRef.current = false;
    const a = orderAlertAudioRef.current;
    const h = orderAlertEndedHandlerRef.current;
    if (a && h) {
      a.removeEventListener('ended', h);
      orderAlertEndedHandlerRef.current = null;
    }
    if (a) {
      a.pause();
      a.currentTime = 0;
    }
  }, []);

  const startOrderAlertLoopIfNeeded = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (orderAlertLoopScheduledRef.current) return;
    orderAlertLoopScheduledRef.current = true;

    const step = () => {
      clearOrderAlertGapTimeout();
      if (ordersNeedingVoiceAlertRef.current.size === 0) {
        stopOrderAlertPlayback();
        return;
      }

      let a = orderAlertAudioRef.current;
      if (!a) {
        a = new Audio(orderReadySoundUrl);
        a.preload = 'auto';
        orderAlertAudioRef.current = a;
      }

      const onEnded = () => {
        orderAlertEndedHandlerRef.current = null;
        if (ordersNeedingVoiceAlertRef.current.size === 0) {
          stopOrderAlertPlayback();
          return;
        }
        orderAlertGapTimeoutRef.current = window.setTimeout(() => {
          orderAlertGapTimeoutRef.current = null;
          step();
        }, 2000);
      };

      orderAlertEndedHandlerRef.current = onEnded;
      a.currentTime = 0;
      a.addEventListener('ended', onEnded, { once: true });
      void a.play().catch(() => {
        if (orderAlertEndedHandlerRef.current === onEnded) {
          a.removeEventListener('ended', onEnded);
          orderAlertEndedHandlerRef.current = null;
        }
        if (ordersNeedingVoiceAlertRef.current.size === 0) {
          stopOrderAlertPlayback();
          return;
        }
        orderAlertGapTimeoutRef.current = window.setTimeout(() => {
          orderAlertGapTimeoutRef.current = null;
          step();
        }, 2000);
      });
    };

    step();
  }, [stopOrderAlertPlayback]);

  useEffect(() => {
    if (!user?.isAdmin) {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!user?.isAdmin) return;
    const raw = sessionStorage.getItem(ADMIN_ORDER_ACK_KEY);
    if (raw !== null) setLastAckOrderId(parseInt(raw, 10) || 0);
  }, [user?.isAdmin]);

  /** First visit: no key yet — treat current orders as baseline so the badge is not flooded. */
  useEffect(() => {
    if (!user?.isAdmin || orders.length === 0) return;
    if (sessionStorage.getItem(ADMIN_ORDER_ACK_KEY) === null) {
      const m = maxNumericOrderId(orders);
      sessionStorage.setItem(ADMIN_ORDER_ACK_KEY, String(m));
      setLastAckOrderId(m);
    }
  }, [user?.isAdmin, orders]);

  useEffect(() => {
    if (!user?.isAdmin) return;
    const tick = () => {
      void pollRef.current();
    };
    const id = window.setInterval(tick, 12000);
    const onVis = () => {
      tick();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [user?.isAdmin]);

  useEffect(() => {
    if (!user?.isAdmin) {
      ordersAlertBaselineDoneRef.current = false;
      knownOrderIdsRef.current.clear();
      ordersNeedingVoiceAlertRef.current.clear();
      stopOrderAlertPlayback();
      return;
    }

    if (!ordersAlertBaselineDoneRef.current) {
      knownOrderIdsRef.current = new Set(orders.map((o) => String(o.id)));
      ordersAlertBaselineDoneRef.current = true;
      return;
    }

    let spokeForNew = false;
    for (const o of orders) {
      const id = String(o.id);
      if (!knownOrderIdsRef.current.has(id)) {
        knownOrderIdsRef.current.add(id);
        if (o.status === 'pending') {
          ordersNeedingVoiceAlertRef.current.add(id);
          spokeForNew = true;
        }
      }
    }

    const byId = new Map(orders.map((o) => [String(o.id), o]));
    for (const id of Array.from(ordersNeedingVoiceAlertRef.current)) {
      const o = byId.get(id);
      if (!o || o.status === 'confirmed' || o.status === 'cancelled') {
        ordersNeedingVoiceAlertRef.current.delete(id);
      }
    }

    if (ordersNeedingVoiceAlertRef.current.size === 0) {
      queueMicrotask(() => stopOrderAlertPlayback());
    }

    if (spokeForNew) {
      queueMicrotask(() => startOrderAlertLoopIfNeeded());
    }
  }, [user?.isAdmin, orders, stopOrderAlertPlayback, startOrderAlertLoopIfNeeded]);

  useEffect(() => {
    return () => {
      stopOrderAlertPlayback();
    };
  }, [stopOrderAlertPlayback]);

  const unseenOrderCount = useMemo(() => {
    if (!orders.length) return 0;
    return orders.filter((o) => (Number(o.id) || 0) > lastAckOrderId).length;
  }, [orders, lastAckOrderId]);

  const acknowledgeOrdersSeen = () => {
    const m = maxNumericOrderId(orders);
    sessionStorage.setItem(ADMIN_ORDER_ACK_KEY, String(m));
    setLastAckOrderId(m);
  };

  const onAdminTabChange = (value: string) => {
    setAdminTab(value);
    if (value === 'orders') {
      acknowledgeOrdersSeen();
    }
  };

  if (!user?.isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Admin Panel</h1>

      <Tabs value={adminTab} onValueChange={onAdminTabChange}>
        <TabsList className="mb-6 flex-wrap h-auto min-h-9">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="menu-items">Menu Items</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="options">Options</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="delivery-zones">Delivery zones</TabsTrigger>
          <TabsTrigger value="orders" className="relative gap-1.5 pr-4">
            <Bell className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
            Orders
            {unseenOrderCount > 0 ? (
              <span
                className="ml-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white"
                aria-label={`${unseenOrderCount} new orders`}
              >
                {unseenOrderCount > 99 ? '99+' : unseenOrderCount}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="coupons">Coupons</TabsTrigger>
          <TabsTrigger value="offers">Offers</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard">
          <DashboardStats orders={orders} />
        </TabsContent>

        {/* Menu Items Tab */}
        <TabsContent value="menu-items">
          <MenuItemsManager
            menuItems={menuItems}
            categories={categories}
            addMenuItem={addMenuItem}
            updateMenuItem={updateMenuItem}
            deleteMenuItem={deleteMenuItem}
          />
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories">
          <CategoriesManager
            categories={categories}
            addCategory={addCategory}
            updateCategory={updateCategory}
            deleteCategory={deleteCategory}
          />
        </TabsContent>

        {/* Options Tab */}
        <TabsContent value="options">
          <OptionsManager
            menuItems={menuItems}
            optionGroups={optionGroups}
            options={options}
            addOptionGroup={addOptionGroup}
            updateOptionGroup={updateOptionGroup}
            deleteOptionGroup={deleteOptionGroup}
            addOption={addOption}
            updateOption={updateOption}
            deleteOption={deleteOption}
          />
        </TabsContent>

        {/* Locations Tab */}
        <TabsContent value="locations">
          <LocationsManager
            locations={locations}
            addLocation={addLocation}
            updateLocation={updateLocation}
            deleteLocation={deleteLocation}
          />
        </TabsContent>

        <TabsContent value="delivery-zones">
          <DeliveryPostalCodesManager
            rows={deliveryPostalCodesAdmin}
            addRow={addDeliveryPostalCode}
            updateRow={updateDeliveryPostalCode}
            deleteRow={deleteDeliveryPostalCode}
          />
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders">
          <OrdersManager
            orders={orders}
            locations={locations}
            fetchAdminOrders={fetchAdminOrders}
            updateOrderStatus={updateOrderStatus}
          />
        </TabsContent>

        {/* Coupons Tab */}
        <TabsContent value="coupons">
          <CouponsManager
            coupons={coupons}
            addCoupon={addCoupon}
            updateCoupon={updateCoupon}
            deleteCoupon={deleteCoupon}
          />
        </TabsContent>

        {/* Offers Tab */}
        <TabsContent value="offers">
          <OffersManager
            offers={offers}
            addOffer={addOffer}
            updateOffer={updateOffer}
            deleteOffer={deleteOffer}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Dashboard Stats Component
function DashboardStats({ orders }: any) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Calculate daily orders (today)
  const dailyOrders = orders.filter((order: any) => {
    const orderDate = new Date(order.createdAt);
    const orderDay = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate());
    return orderDay.getTime() === today.getTime();
  });

  // Calculate monthly orders (current month)
  const monthlyOrders = orders.filter((order: any) => {
    const orderDate = new Date(order.createdAt);
    return orderDate >= firstDayOfMonth;
  });

  // Calculate total sales without tax (all time)
  const totalSalesWithoutTax = orders.reduce((sum: number, order: any) => {
    return sum + order.subtotal;
  }, 0);

  // Calculate total sales with tax (all time)
  const totalSalesWithTax = orders.reduce((sum: number, order: any) => {
    return sum + order.total;
  }, 0);

  // Calculate daily sales
  const dailySalesWithoutTax = dailyOrders.reduce((sum: number, order: any) => {
    return sum + order.subtotal;
  }, 0);

  const dailySalesWithTax = dailyOrders.reduce((sum: number, order: any) => {
    return sum + order.total;
  }, 0);

  // Calculate monthly sales
  const monthlySalesWithoutTax = monthlyOrders.reduce((sum: number, order: any) => {
    return sum + order.subtotal;
  }, 0);

  const monthlySalesWithTax = monthlyOrders.reduce((sum: number, order: any) => {
    return sum + order.total;
  }, 0);

  // Order status counts
  const pendingOrders = orders.filter((order: any) => order.status === 'pending').length;
  const preparingOrders = orders.filter((order: any) => order.status === 'preparing').length;
  const completedOrders = orders.filter((order: any) => order.status === 'completed').length;

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Orders</p>
                <p className="text-3xl font-bold mt-2">{orders.length}</p>
              </div>
              <div className="bg-blue-400 bg-opacity-30 p-3 rounded-lg">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Completed</p>
                <p className="text-3xl font-bold mt-2">{completedOrders}</p>
              </div>
              <div className="bg-green-400 bg-opacity-30 p-3 rounded-lg">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Preparing</p>
                <p className="text-3xl font-bold mt-2">{preparingOrders}</p>
              </div>
              <div className="bg-orange-400 bg-opacity-30 p-3 rounded-lg">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm font-medium">Pending</p>
                <p className="text-3xl font-bold mt-2">{pendingOrders}</p>
              </div>
              <div className="bg-yellow-400 bg-opacity-30 p-3 rounded-lg">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Today's Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border-l-4 border-blue-500 pl-4">
              <p className="text-sm text-gray-600 font-medium mb-1">Daily Orders</p>
              <p className="text-3xl font-bold text-gray-900">{dailyOrders.length}</p>
              <p className="text-xs text-gray-500 mt-1">{today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <p className="text-sm text-gray-600 font-medium mb-1">Sales (Without Tax)</p>
              <p className="text-3xl font-bold text-green-600">${dailySalesWithoutTax.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">Subtotal only</p>
            </div>
            <div className="border-l-4 border-emerald-500 pl-4">
              <p className="text-sm text-gray-600 font-medium mb-1">Sales (With Tax)</p>
              <p className="text-3xl font-bold text-emerald-600">${dailySalesWithTax.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">Total including tax</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            This Month's Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border-l-4 border-purple-500 pl-4">
              <p className="text-sm text-gray-600 font-medium mb-1">Monthly Orders</p>
              <p className="text-3xl font-bold text-gray-900">{monthlyOrders.length}</p>
              <p className="text-xs text-gray-500 mt-1">{now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
            </div>
            <div className="border-l-4 border-indigo-500 pl-4">
              <p className="text-sm text-gray-600 font-medium mb-1">Sales (Without Tax)</p>
              <p className="text-3xl font-bold text-indigo-600">${monthlySalesWithoutTax.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">Subtotal only</p>
            </div>
            <div className="border-l-4 border-blue-500 pl-4">
              <p className="text-sm text-gray-600 font-medium mb-1">Sales (With Tax)</p>
              <p className="text-3xl font-bold text-blue-600">${monthlySalesWithTax.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">Total including tax</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* All Time Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            All Time Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-pink-50 to-rose-50 p-6 rounded-lg border border-pink-200">
              <p className="text-sm text-gray-600 font-medium mb-2">Total Sales (Without Tax)</p>
              <p className="text-4xl font-bold text-pink-600 mb-1">${totalSalesWithoutTax.toFixed(2)}</p>
              <p className="text-xs text-gray-500">Subtotal from all orders</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-6 rounded-lg border border-emerald-200">
              <p className="text-sm text-gray-600 font-medium mb-2">Total Sales (With Tax)</p>
              <p className="text-4xl font-bold text-emerald-600 mb-1">${totalSalesWithTax.toFixed(2)}</p>
              <p className="text-xs text-gray-500">Total revenue including tax</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Menu Items Manager Component
function MenuItemsManager({ menuItems, categories, addMenuItem, updateMenuItem, deleteMenuItem }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    basePrice: '',
    categoryId: '',
    image: '',
    available: true,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      basePrice: '',
      categoryId: '',
      image: '',
      available: true,
    });
    setEditingItem(null);
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      basePrice: item.basePrice.toString(),
      categoryId: item.categoryId,
      image: item.image,
      available: item.available,
    });
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const itemData = {
      name: formData.name,
      description: formData.description,
      basePrice: parseFloat(formData.basePrice),
      categoryId: formData.categoryId,
      image: formData.image,
      available: formData.available,
    };

    if (editingItem) {
      updateMenuItem(editingItem.id, itemData);
      toast.success('Menu item updated');
    } else {
      addMenuItem(itemData);
      toast.success('Menu item added');
    }

    setIsOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      deleteMenuItem(id);
      toast.success('Menu item deleted');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Menu Items</CardTitle>
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit' : 'Add'} Menu Item</DialogTitle>
              <DialogDescription>
                {editingItem ? 'Edit the details of the menu item.' : 'Add a new menu item to the menu.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Select value={formData.categoryId} onValueChange={(value) => setFormData({ ...formData, categoryId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat: Category) => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="basePrice">Base Price *</Label>
                    <Input
                      id="basePrice"
                      type="number"
                      step="0.01"
                      value={formData.basePrice}
                      onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="image">Image URL</Label>
                    <Input
                      id="image"
                      value={formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="available"
                    checked={formData.available}
                    onCheckedChange={(checked) => setFormData({ ...formData, available: checked })}
                  />
                  <Label htmlFor="available">Available</Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">{editingItem ? 'Update' : 'Add'} Item</Button>
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
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {menuItems.map((item: MenuItem) => {
              const category = categories.find((c: Category) => c.id === item.categoryId);
              return (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{category?.name}</TableCell>
                  <TableCell>${item.basePrice.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={item.available ? 'default' : 'secondary'}>
                      {item.available ? 'Available' : 'Unavailable'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// Categories Manager Component
function CategoriesManager({ categories, addCategory, updateCategory, deleteCategory }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
    order: '',
  });

  const resetForm = () => {
    setFormData({ name: '', description: '', image: '', order: '' });
    setEditingCategory(null);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description,
      image: category.image,
      order: category.order.toString(),
    });
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const categoryData = {
      name: formData.name,
      description: formData.description,
      image: formData.image,
      order: parseInt(formData.order) || 0,
    };

    if (editingCategory) {
      updateCategory(editingCategory.id, categoryData);
      toast.success('Category updated');
    } else {
      addCategory(categoryData);
      toast.success('Category added');
    }

    setIsOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure? This will not delete associated menu items.')) {
      deleteCategory(id);
      toast.success('Category deleted');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Categories</CardTitle>
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCategory ? 'Edit' : 'Add'} Category</DialogTitle>
              <DialogDescription>
                {editingCategory ? 'Edit the details of the category.' : 'Add a new category to the menu.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div>
                  <Label htmlFor="cat-name">Name *</Label>
                  <Input
                    id="cat-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cat-description">Description</Label>
                  <Textarea
                    id="cat-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="cat-image">Image URL</Label>
                  <Input
                    id="cat-image"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="cat-order">Display Order</Label>
                  <Input
                    id="cat-order"
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">{editingCategory ? 'Update' : 'Add'} Category</Button>
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
              <TableHead>Description</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.sort((a: Category, b: Category) => a.order - b.order).map((category: Category) => (
              <TableRow key={category.id}>
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell>{category.description}</TableCell>
                <TableCell>{category.order}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(category)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(category.id)}>
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

// Coupons Manager Component
function CouponsManager({ coupons, addCoupon, updateCoupon, deleteCoupon }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: '',
    minOrderAmount: '',
    maxDiscount: '',
    validFrom: '',
    validUntil: '',
    usageLimit: '',
    active: true,
  });

  const resetForm = () => {
    setFormData({
      code: '',
      description: '',
      discountType: 'percentage' as 'percentage' | 'fixed',
      discountValue: '',
      minOrderAmount: '',
      maxDiscount: '',
      validFrom: '',
      validUntil: '',
      usageLimit: '',
      active: true,
    });
    setEditingCoupon(null);
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue.toString(),
      minOrderAmount: coupon.minOrderAmount.toString(),
      maxDiscount: coupon.maxDiscount?.toString() || '',
      validFrom: new Date(coupon.validFrom).toISOString().split('T')[0],
      validUntil: new Date(coupon.validUntil).toISOString().split('T')[0],
      usageLimit: coupon.usageLimit.toString(),
      active: coupon.active,
    });
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const couponData = {
      code: formData.code.toUpperCase(),
      description: formData.description,
      discountType: formData.discountType,
      discountValue: parseFloat(formData.discountValue),
      minOrderAmount: parseFloat(formData.minOrderAmount) || 0,
      maxDiscount: formData.maxDiscount ? parseFloat(formData.maxDiscount) : undefined,
      validFrom: new Date(formData.validFrom),
      validUntil: new Date(formData.validUntil),
      usageLimit: parseInt(formData.usageLimit) || 100,
      active: formData.active,
    };

    if (editingCoupon) {
      updateCoupon(editingCoupon.id, couponData);
      toast.success('Coupon updated');
    } else {
      addCoupon(couponData);
      toast.success('Coupon added');
    }

    setIsOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this coupon?')) {
      deleteCoupon(id);
      toast.success('Coupon deleted');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Coupons</CardTitle>
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Coupon
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCoupon ? 'Edit' : 'Add'} Coupon</DialogTitle>
              <DialogDescription>
                {editingCoupon ? 'Edit the details of the coupon.' : 'Add a new coupon for customers to use.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="code">Code *</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="SAVE20"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="discountType">Discount Type *</Label>
                    <Select value={formData.discountType} onValueChange={(value: any) => setFormData({ ...formData, discountType: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                        <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="20% off your order"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="discountValue">
                      Discount Value * {formData.discountType === 'percentage' ? '(%)' : '($)'}
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
                  <div>
                    <Label htmlFor="minOrderAmount">Min Order Amount ($) *</Label>
                    <Input
                      id="minOrderAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.minOrderAmount}
                      onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                      required
                    />
                  </div>
                </div>
                {formData.discountType === 'percentage' && (
                  <div>
                    <Label htmlFor="maxDiscount">Max Discount Amount ($)</Label>
                    <Input
                      id="maxDiscount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.maxDiscount}
                      onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                      placeholder="Optional"
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave empty for no maximum</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="validFrom">Valid From *</Label>
                    <Input
                      id="validFrom"
                      type="date"
                      value={formData.validFrom}
                      onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="validUntil">Valid Until *</Label>
                    <Input
                      id="validUntil"
                      type="date"
                      value={formData.validUntil}
                      onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="usageLimit">Usage Limit *</Label>
                  <Input
                    id="usageLimit"
                    type="number"
                    min="1"
                    value={formData.usageLimit}
                    onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                    placeholder="100"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Total number of times this coupon can be used</p>
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
                <Button type="submit">{editingCoupon ? 'Update' : 'Add'} Coupon</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Min Order</TableHead>
              <TableHead>Valid Until</TableHead>
              <TableHead>Used/Limit</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coupons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  No coupons found. Create one to get started!
                </TableCell>
              </TableRow>
            ) : (
              coupons.map((coupon: Coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell className="font-mono font-bold">{coupon.code}</TableCell>
                  <TableCell>{coupon.description}</TableCell>
                  <TableCell>
                    {coupon.discountType === 'percentage' 
                      ? `${coupon.discountValue}%` 
                      : `$${coupon.discountValue.toFixed(2)}`
                    }
                  </TableCell>
                  <TableCell>${coupon.minOrderAmount.toFixed(2)}</TableCell>
                  <TableCell>{new Date(coupon.validUntil).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {coupon.usageCount} / {coupon.usageLimit}
                  </TableCell>
                  <TableCell>
                    <Badge variant={coupon.active ? 'default' : 'secondary'}>
                      {coupon.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(coupon)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(coupon.id)}>
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