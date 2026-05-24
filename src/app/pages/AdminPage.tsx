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
import { Pencil, Trash2, Plus, Bell, Search } from 'lucide-react';
import { MenuItem, Category, OptionGroup, Option, Location, Coupon, Offer, Order } from '../types';
import { OptionsManager, LocationsManager, OrdersManager } from '../components/AdminComponents';
import {
  AdminFormSheet,
  ADMIN_SHEET_SELECT_CONTENT_CLASS,
  CategoriesMultiSelect,
  formatMenuItemCategoryNames,
  getLinkedOptionGroupIdsForMenuItem,
  getOptionGroupMenuItemIds,
  LinkedOptionGroupsSortableList,
  MenuItemNewOptionGroupsEditor,
  mergeOptionGroupSelection,
  NewOptionGroupDraft,
  optionGroupToRulesForm,
  OptionGroupRulesForm,
  OptionGroupsMultiSelect,
  rulesFormToPartialOptionGroup,
} from '../components/AdminFormSheet';
import { Separator } from '../components/ui/separator';
import { OffersManager } from '../components/OffersManager';
import { DeliveryPostalCodesManager } from '../components/DeliveryPostalCodesManager';
import orderReadySoundUrl from '../../assets/order-ready.mpeg?url';
import { usePageMeta } from '../hooks/usePageMeta';

const ADMIN_ORDER_ACK_KEY = 'pizza_admin_orders_last_ack_id';

type AdminUserRecord = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: 'admin' | 'manager' | 'user';
  createdAt: string;
};

function maxNumericOrderId(orderList: Order[]): number {
  if (!orderList.length) return 0;
  return Math.max(...orderList.map((o) => Number(o.id) || 0));
}

type UserFormData = {
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'manager' | 'user';
  password: string;
};

export function AdminPage() {
  usePageMeta(
    'Admin',
    'Pizza Offers admin — manage menu, locations, coupons, offers, delivery zones, and order history.',
    'admin'
  );

  const navigate = useNavigate();
  const { 
    user, 
    menuItems, categories, optionGroups, options, locations, orders, coupons, offers,
    seoSettings,
    addMenuItem, updateMenuItem, deleteMenuItem,
    addCategory, updateCategory, deleteCategory,
    addOptionGroup, updateOptionGroup, deleteOptionGroup, syncMenuItemOptionGroupOrder,
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
    ensureSeoSettingsLoaded,
    updateSeoSettings,
    apiRequest,
  } = useApp();

  const [adminUsers, setAdminUsers] = useState<AdminUserRecord[]>([]);

  const loadAdminUsers = useCallback(async () => {
    const list = (await apiRequest('/users', {}, { silent: true })) as any[];
    const mapped = (list || []).map((u) => ({
      id: String(u.id),
      name: String(u.name ?? ''),
      email: String(u.email ?? ''),
      phone: u.phone != null ? String(u.phone) : null,
      role: (u.role === 'admin' || u.role === 'manager' ? u.role : 'user') as
        | 'admin'
        | 'manager'
        | 'user',
      createdAt: String(u.created_at ?? ''),
    }));
    setAdminUsers(mapped);
  }, [apiRequest]);

  const canAccessAdmin = user?.role === 'admin' || user?.role === 'manager';
  const isAdminOnly = user?.role === 'admin';

  useEffect(() => {
    if (!canAccessAdmin) return;
    void ensureAdminWorkspaceLoaded();
    if (isAdminOnly) {
      void ensureSeoSettingsLoaded();
    }
    if (isAdminOnly) {
      void loadAdminUsers();
    } else {
      setAdminUsers([]);
    }
  }, [canAccessAdmin, isAdminOnly]);

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
    if (!canAccessAdmin) {
      navigate('/');
    }
  }, [canAccessAdmin, navigate]);

  useEffect(() => {
    if (!canAccessAdmin) return;
    const raw = sessionStorage.getItem(ADMIN_ORDER_ACK_KEY);
    if (raw !== null) setLastAckOrderId(parseInt(raw, 10) || 0);
  }, [canAccessAdmin]);

  /** First visit: no key yet — treat current orders as baseline so the badge is not flooded. */
  useEffect(() => {
    if (!canAccessAdmin || orders.length === 0) return;
    if (sessionStorage.getItem(ADMIN_ORDER_ACK_KEY) === null) {
      const m = maxNumericOrderId(orders);
      sessionStorage.setItem(ADMIN_ORDER_ACK_KEY, String(m));
      setLastAckOrderId(m);
    }
  }, [canAccessAdmin, orders]);

  useEffect(() => {
    if (!canAccessAdmin) return;
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
  }, [canAccessAdmin]);

  useEffect(() => {
    if (!canAccessAdmin) {
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
  }, [canAccessAdmin, orders, stopOrderAlertPlayback, startOrderAlertLoopIfNeeded]);

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

  const addAdminUser = async (payload: {
    name: string;
    email: string;
    phone?: string;
    role: 'admin' | 'manager' | 'user';
    password: string;
  }) => {
    await apiRequest('/users', {
      method: 'POST',
      body: JSON.stringify({
        name: payload.name,
        email: payload.email,
        phone: payload.phone?.trim() ? payload.phone.trim() : null,
        role: payload.role,
        password: payload.password,
      }),
    });
    await loadAdminUsers();
  };

  const updateAdminUser = async (
    userId: string,
    payload: {
      name: string;
      email: string;
      phone?: string;
      role: 'admin' | 'manager' | 'user';
      password?: string;
    }
  ) => {
    await apiRequest(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: payload.name,
        email: payload.email,
        phone: payload.phone?.trim() ? payload.phone.trim() : null,
        role: payload.role,
        password: payload.password?.trim() ? payload.password : undefined,
      }),
    });
    await loadAdminUsers();
  };

  const deleteAdminUser = async (userId: string) => {
    await apiRequest(`/users/${userId}`, { method: 'DELETE' });
    await loadAdminUsers();
  };

  const onAdminTabChange = (value: string) => {
    setAdminTab(value);
    if (value === 'orders') {
      acknowledgeOrdersSeen();
    }
  };

  if (!canAccessAdmin) {
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
          {isAdminOnly ? <TabsTrigger value="seo">SEO</TabsTrigger> : null}
          {isAdminOnly ? <TabsTrigger value="users">Users</TabsTrigger> : null}
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard">
          <DashboardStats apiRequest={apiRequest} isAdmin={isAdminOnly} />
        </TabsContent>

        {/* Menu Items Tab */}
        <TabsContent value="menu-items">
          <MenuItemsManager
            menuItems={menuItems}
            categories={categories}
            optionGroups={optionGroups}
            options={options}
            addMenuItem={addMenuItem}
            updateMenuItem={updateMenuItem}
            deleteMenuItem={deleteMenuItem}
            addOptionGroup={addOptionGroup}
            updateOptionGroup={updateOptionGroup}
            syncMenuItemOptionGroupOrder={syncMenuItemOptionGroupOrder}
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

        {isAdminOnly ? (
          <TabsContent value="seo">
            <SeoSettingsManager
              rows={seoSettings}
              saveRows={updateSeoSettings}
            />
          </TabsContent>
        ) : null}

        {isAdminOnly ? (
          <TabsContent value="users">
            <UsersManager
              users={adminUsers}
              currentUserId={user.id}
              addUser={addAdminUser}
              updateUser={updateAdminUser}
              deleteUser={deleteAdminUser}
            />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}

const SEO_PAGE_OPTIONS = [
  { key: 'home', label: 'Home' },
  { key: 'menu', label: 'Menu' },
  { key: 'menu_item', label: 'Menu item' },
  { key: 'offers', label: 'Offers' },
  { key: 'coupons', label: 'Coupons' },
  { key: 'cart', label: 'Cart' },
  { key: 'checkout', label: 'Checkout' },
  { key: 'locations', label: 'Locations' },
  { key: 'login', label: 'Login' },
  { key: 'user_dashboard', label: 'User dashboard' },
  { key: 'order_confirmation', label: 'Order confirmation' },
  { key: 'admin', label: 'Admin' },
  { key: 'not_found', label: 'Not found (404)' },
] as const;

type SeoEditorRow = {
  page_key: string;
  label: string;
  meta_title: string;
  meta_description: string;
};

function SeoSettingsManager({
  rows,
  saveRows,
}: {
  rows: Array<{ pageKey: string; metaTitle: string; metaDescription: string }>;
  saveRows: (
    payload: Array<{ page_key: string; meta_title: string; meta_description: string }>
  ) => Promise<any>;
}) {
  const [saving, setSaving] = useState(false);
  const [editorRows, setEditorRows] = useState<SeoEditorRow[]>([]);

  useEffect(() => {
    const byKey = new Map(rows.map((r) => [r.pageKey, r]));
    setEditorRows(
      SEO_PAGE_OPTIONS.map((p) => ({
        page_key: p.key,
        label: p.label,
        meta_title: byKey.get(p.key)?.metaTitle ?? '',
        meta_description: byKey.get(p.key)?.metaDescription ?? '',
      }))
    );
  }, [rows]);

  const updateRow = (
    pageKey: string,
    field: 'meta_title' | 'meta_description',
    value: string
  ) => {
    setEditorRows((prev) =>
      prev.map((r) => (r.page_key === pageKey ? { ...r, [field]: value } : r))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveRows(
        editorRows.map((r) => ({
          page_key: r.page_key,
          meta_title: r.meta_title.trim(),
          meta_description: r.meta_description.trim(),
        }))
      );
      toast.success('SEO metadata saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save SEO settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>SEO metadata</CardTitle>
        <p className="text-sm text-gray-600">
          Set page-wise meta title and description. Leave blank to use existing page defaults.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {editorRows.map((row) => (
          <div key={row.page_key} className="rounded-lg border p-4">
            <p className="mb-3 text-sm font-semibold text-gray-700">{row.label}</p>
            <div className="grid gap-3">
              <div>
                <Label htmlFor={`seo-title-${row.page_key}`}>Meta title</Label>
                <Input
                  id={`seo-title-${row.page_key}`}
                  value={row.meta_title}
                  onChange={(e) => updateRow(row.page_key, 'meta_title', e.target.value)}
                  placeholder="Optional"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor={`seo-desc-${row.page_key}`}>Meta description</Label>
                <Textarea
                  id={`seo-desc-${row.page_key}`}
                  value={row.meta_description}
                  onChange={(e) => updateRow(row.page_key, 'meta_description', e.target.value)}
                  placeholder="Optional"
                  rows={3}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        ))}
        <Button onClick={() => void handleSave()} disabled={saving}>
          {saving ? 'Saving…' : 'Save SEO Settings'}
        </Button>
      </CardContent>
    </Card>
  );
}

// Dashboard Stats Component
type DashboardStatsPayload = {
  scope_role: 'admin' | 'manager';
  period_filter: 'today' | 'last_week' | 'last_month' | 'custom';
  period_label: string;
  overview: {
    total_orders: number;
    completed_orders: number;
    preparing_orders: number;
    pending_orders: number;
  };
  today: {
    orders: number;
    sales_without_tax: number;
    sales_with_tax: number;
    date_label: string;
  };
  period: {
    orders: number;
    sales_without_tax: number;
    sales_with_tax: number;
  };
};

function DashboardStats({
  apiRequest,
  isAdmin,
}: {
  apiRequest: (path: string, options?: RequestInit, meta?: { silent?: boolean }) => Promise<unknown>;
  isAdmin: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<DashboardStatsPayload | null>(null);
  const [dateFilter, setDateFilter] = useState<'today' | 'last_week' | 'last_month' | 'custom'>('today');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const showPeriodCard = isAdmin || stats?.period_filter !== 'today';

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (isAdmin) {
        if (dateFilter === 'last_week' || dateFilter === 'last_month') {
          params.set('date_filter', dateFilter);
        } else if (dateFilter === 'custom') {
          if (!fromDate || !toDate) {
            toast.error('Please select both from and to dates for custom filter');
            setLoading(false);
            return;
          }
          if (fromDate > toDate) {
            toast.error('From date cannot be after to date');
            setLoading(false);
            return;
          }
          params.set('date_filter', 'custom');
          params.set('from_date', fromDate);
          params.set('to_date', toDate);
        }
      }
      const qs = params.toString();
      const path = qs ? `/orders/dashboard-stats?${qs}` : '/orders/dashboard-stats';
      const payload = (await apiRequest(path, {}, { silent: true })) as DashboardStatsPayload;
      setStats(payload);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  }, [apiRequest, isAdmin, dateFilter, fromDate, toDate]);

  useEffect(() => {
    void loadStats();
  }, []);

  if (!stats) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-gray-500">
          {loading ? 'Loading dashboard statistics…' : 'No dashboard data available.'}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {isAdmin ? (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div>
                <Label htmlFor="dashboard-date-filter">Date filter</Label>
                <Select
                  value={dateFilter}
                  onValueChange={(value: 'today' | 'last_week' | 'last_month' | 'custom') =>
                    setDateFilter(value)
                  }
                >
                  <SelectTrigger id="dashboard-date-filter" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="last_week">Last week</SelectItem>
                    <SelectItem value="last_month">Last month</SelectItem>
                    <SelectItem value="custom">Custom date</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {dateFilter === 'custom' ? (
                <>
                  <div>
                    <Label htmlFor="dashboard-from-date">From</Label>
                    <Input
                      id="dashboard-from-date"
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dashboard-to-date">To</Label>
                    <Input
                      id="dashboard-to-date"
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div />
                  <div />
                </>
              )}
            </div>
            <div className="mt-4">
              <Button onClick={() => void loadStats()} disabled={loading}>
                {loading ? 'Loading…' : 'Apply Filter'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Orders</p>
                <p className="text-3xl font-bold mt-2">{stats.overview.total_orders}</p>
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
                <p className="text-3xl font-bold mt-2">{stats.overview.completed_orders}</p>
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
                <p className="text-3xl font-bold mt-2">{stats.overview.preparing_orders}</p>
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
                <p className="text-3xl font-bold mt-2">{stats.overview.pending_orders}</p>
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
              <p className="text-3xl font-bold text-gray-900">{stats.today.orders}</p>
              <p className="text-xs text-gray-500 mt-1">{stats.today.date_label}</p>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <p className="text-sm text-gray-600 font-medium mb-1">Sales (Without Tax)</p>
              <p className="text-3xl font-bold text-green-600">${stats.today.sales_without_tax.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">Subtotal only</p>
            </div>
            <div className="border-l-4 border-emerald-500 pl-4">
              <p className="text-sm text-gray-600 font-medium mb-1">Sales (With Tax)</p>
              <p className="text-3xl font-bold text-emerald-600">${stats.today.sales_with_tax.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">Total including tax</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {showPeriodCard ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {stats.period_label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="border-l-4 border-purple-500 pl-4">
                <p className="text-sm text-gray-600 font-medium mb-1">Orders</p>
                <p className="text-3xl font-bold text-gray-900">{stats.period.orders}</p>
                <p className="text-xs text-gray-500 mt-1">{stats.period_label}</p>
              </div>
              <div className="border-l-4 border-indigo-500 pl-4">
                <p className="text-sm text-gray-600 font-medium mb-1">Sales (Without Tax)</p>
                <p className="text-3xl font-bold text-indigo-600">${stats.period.sales_without_tax.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">Subtotal only</p>
              </div>
              <div className="border-l-4 border-blue-500 pl-4">
                <p className="text-sm text-gray-600 font-medium mb-1">Sales (With Tax)</p>
                <p className="text-3xl font-bold text-blue-600">${stats.period.sales_with_tax.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">Total including tax</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Summary Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Summary Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-pink-50 to-rose-50 p-6 rounded-lg border border-pink-200">
              <p className="text-sm text-gray-600 font-medium mb-2">Today's Sales (Without Tax)</p>
              <p className="text-4xl font-bold text-pink-600 mb-1">${stats.today.sales_without_tax.toFixed(2)}</p>
              <p className="text-xs text-gray-500">Today subtotal</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-6 rounded-lg border border-emerald-200">
              <p className="text-sm text-gray-600 font-medium mb-2">{stats.period_label} Sales (With Tax)</p>
              <p className="text-4xl font-bold text-emerald-600 mb-1">${stats.period.sales_with_tax.toFixed(2)}</p>
              <p className="text-xs text-gray-500">Selected period total</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function UsersManager({
  users,
  currentUserId,
  addUser,
  updateUser,
  deleteUser,
}: {
  users: AdminUserRecord[];
  currentUserId: string;
  addUser: (payload: UserFormData) => Promise<void>;
  updateUser: (userId: string, payload: UserFormData) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'manager' | 'user'>('all');
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    phone: '',
    role: 'user',
    password: '',
  });

  const resetForm = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'user',
      password: '',
    });
  };

  const onOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) resetForm();
  };

  const handleEdit = (u: AdminUserRecord) => {
    setEditingUser(u);
    setFormData({
      name: u.name,
      email: u.email,
      phone: u.phone ?? '',
      role: u.role,
      password: '',
    });
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser && !formData.password.trim()) {
      toast.error('Password is required for new users');
      return;
    }

    setSaving(true);
    try {
      if (editingUser) {
        await updateUser(editingUser.id, formData);
        toast.success('User updated');
      } else {
        await addUser(formData);
        toast.success('User created');
      }
      setIsOpen(false);
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await deleteUser(id);
      toast.success('User deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const filteredUsers = users.filter((u) => {
    const roleOk = roleFilter === 'all' ? true : u.role === roleFilter;
    if (!roleOk) return false;
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.phone ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Users</CardTitle>
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingUser ? 'Edit User' : 'Add User'}</DialogTitle>
              <DialogDescription>
                {editingUser
                  ? 'Update user details and role.'
                  : 'Create a new admin, manager, or standard user account.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div>
                  <Label htmlFor="user-name">Name *</Label>
                  <Input
                    id="user-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="user-email">Email *</Label>
                  <Input
                    id="user-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="user-phone">Phone</Label>
                  <Input
                    id="user-phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <Label htmlFor="user-role">Role *</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: 'admin' | 'manager' | 'user') =>
                      setFormData({ ...formData, role: value })
                    }
                  >
                    <SelectTrigger id="user-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="user-password">
                    {editingUser ? 'Password (leave blank to keep current)' : 'Password *'}
                  </Label>
                  <Input
                    id="user-password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={!editingUser}
                    minLength={6}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving…' : editingUser ? 'Update User' : 'Create User'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Label htmlFor="users-search">Search users</Label>
            <Input
              id="users-search"
              placeholder="Search by name, email, or phone"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="users-role-filter">Role filter</Label>
            <Select
              value={roleFilter}
              onValueChange={(value: 'all' | 'admin' | 'manager' | 'user') => setRoleFilter(value)}
            >
              <SelectTrigger id="users-role-filter" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.phone || '—'}</TableCell>
                <TableCell>
                  <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                    {u.role}
                  </Badge>
                </TableCell>
                <TableCell>{u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-CA') : '—'}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(u)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(u.id)}
                      disabled={u.id === currentUserId}
                      title={u.id === currentUserId ? 'You cannot delete your own account' : 'Delete user'}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-gray-500">
                  No users found for the current search/filter.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// Menu Items Manager Component
function MenuItemsManager({
  menuItems,
  categories,
  optionGroups,
  options,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
    addOptionGroup,
    updateOptionGroup,
    syncMenuItemOptionGroupOrder,
  }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuItemTableSearch, setMenuItemTableSearch] = useState('');
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [linkedOptionGroupIds, setLinkedOptionGroupIds] = useState<string[]>([]);
  const [initialLinkedOptionGroupIds, setInitialLinkedOptionGroupIds] = useState<string[]>([]);
  const [newOptionGroups, setNewOptionGroups] = useState<NewOptionGroupDraft[]>([]);
  const [linkedGroupRules, setLinkedGroupRules] = useState<Record<string, OptionGroupRulesForm>>({});
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    basePrice: '',
    categoryIds: [] as string[],
    image: '',
    available: true,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      basePrice: '',
      categoryIds: [],
      image: '',
      available: true,
    });
    setEditingItem(null);
    setLinkedOptionGroupIds([]);
    setInitialLinkedOptionGroupIds([]);
    setNewOptionGroups([]);
    setLinkedGroupRules({});
  };

  const buildRulesMapForLinkedIds = (ids: string[]) => {
    const map: Record<string, OptionGroupRulesForm> = {};
    for (const groupId of ids) {
      const group = optionGroups.find((g: OptionGroup) => g.id === groupId);
      if (group) map[groupId] = optionGroupToRulesForm(group);
    }
    return map;
  };

  const handleLinkedOptionGroupIdsChange = (ids: string[]) => {
    setLinkedOptionGroupIds(ids);
    setLinkedGroupRules((prev) => {
      const next: Record<string, OptionGroupRulesForm> = {};
      for (const groupId of ids) {
        next[groupId] = prev[groupId] ?? optionGroupToRulesForm(
          optionGroups.find((g: OptionGroup) => g.id === groupId)!
        );
      }
      return next;
    });
  };

  const handleEdit = (item: MenuItem) => {
    const linked = getLinkedOptionGroupIdsForMenuItem(item.id, optionGroups);
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      basePrice: item.basePrice.toString(),
      categoryIds:
        item.categoryIds?.length > 0
          ? [...item.categoryIds]
          : item.categoryId
            ? [item.categoryId]
            : [],
      image: item.image,
      available: item.available,
    });
    setLinkedOptionGroupIds(linked);
    setInitialLinkedOptionGroupIds(linked);
    setLinkedGroupRules(buildRulesMapForLinkedIds(linked));
    setNewOptionGroups([]);
    setIsOpen(true);
  };

  const syncOptionGroupsForMenuItem = async (menuItemId: string) => {
    for (const groupId of linkedOptionGroupIds) {
      const group = optionGroups.find((g: OptionGroup) => g.id === groupId);
      if (!group) continue;
      const ids = getOptionGroupMenuItemIds(group);
      const rules = linkedGroupRules[groupId] ?? optionGroupToRulesForm(group);
      const rulesPatch = rulesFormToPartialOptionGroup(rules);
      if (!ids.includes(menuItemId)) {
        await updateOptionGroup(groupId, { ...rulesPatch, menuItemIds: [...ids, menuItemId] });
      } else {
        await updateOptionGroup(groupId, rulesPatch);
      }
    }

    for (const groupId of initialLinkedOptionGroupIds) {
      if (linkedOptionGroupIds.includes(groupId)) continue;
      const group = optionGroups.find((g: OptionGroup) => g.id === groupId);
      if (!group) continue;
      const ids = getOptionGroupMenuItemIds(group).filter((id) => id !== menuItemId);
      await updateOptionGroup(groupId, { menuItemIds: ids });
    }

    const orderedIds = [...linkedOptionGroupIds];
    for (const draft of newOptionGroups) {
      if (!draft.name.trim()) {
        throw new Error('Each new option group needs a name');
      }
      const payload: Omit<OptionGroup, 'id'> = {
        name: draft.name.trim(),
        menuItemIds: [menuItemId],
        menuItemId: menuItemId,
        order: 0,
        ...rulesFormToPartialOptionGroup(draft),
      };
      const newId = await addOptionGroup(payload);
      orderedIds.push(newId);
    }

    if (orderedIds.length > 0) {
      await syncMenuItemOptionGroupOrder(menuItemId, orderedIds);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.categoryIds.length === 0) {
      toast.error('Select at least one category');
      return;
    }

    const itemData = {
      name: formData.name,
      description: formData.description,
      basePrice: parseFloat(formData.basePrice),
      categoryIds: formData.categoryIds,
      image: formData.image,
      available: formData.available,
    };

    try {
      let menuItemId: string;
      if (editingItem) {
        await updateMenuItem(editingItem.id, itemData);
        menuItemId = editingItem.id;
        toast.success('Menu item updated');
      } else {
        menuItemId = await addMenuItem(itemData);
        toast.success('Menu item added');
      }

      if (
        linkedOptionGroupIds.length > 0 ||
        newOptionGroups.length > 0 ||
        initialLinkedOptionGroupIds.length > 0
      ) {
        await syncOptionGroupsForMenuItem(menuItemId);
        if (newOptionGroups.some((d) => d.name.trim())) {
          toast.success('Option groups saved for this item');
        }
      }

      setIsOpen(false);
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save menu item');
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      deleteMenuItem(id);
      toast.success('Menu item deleted');
    }
  };

  const openAddSheet = () => {
    resetForm();
    setIsOpen(true);
  };

  const menuItemsTableRows = useMemo(() => {
    const q = menuItemTableSearch.trim().toLowerCase();
    if (!q) return menuItems;
    return menuItems.filter((item: MenuItem) => {
      const categoryName = formatMenuItemCategoryNames(item, categories);
      const hay = [
        item.name,
        item.description,
        categoryName,
        item.basePrice.toFixed(2),
        String(item.basePrice),
        item.available ? 'available' : 'unavailable',
        item.id,
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [menuItems, categories, menuItemTableSearch]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Menu Items</CardTitle>
        <Button type="button" onClick={openAddSheet}>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
        <AdminFormSheet
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) resetForm();
          }}
          title={editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
          description={
            editingItem
              ? 'Edit item details and manage option groups shown on the customize page.'
              : 'Add a menu item and optionally link or create option groups.'
          }
          footer={
            <Button type="submit" form="menu-item-form" className="w-full sm:w-auto">
              {editingItem ? 'Update' : 'Add'} Item
            </Button>
          }
        >
          <form id="menu-item-form" onSubmit={handleSubmit} className="grid gap-4">
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
                    <CategoriesMultiSelect
                      categories={categories}
                      value={formData.categoryIds}
                      onChange={(categoryIds) => setFormData((prev) => ({ ...prev, categoryIds }))}
                      label="Categories *"
                      description="Item appears under each selected category on the menu."
                    />
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
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, available: checked }))}
                  />
                  <Label htmlFor="available">Available</Label>
                </div>

                <Separator />
                <div className="space-y-4">
                  <div>
                    <Label className="text-base">Option groups</Label>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Link existing groups or create new ones. Drag linked groups to set the order on the customize page.
                    </p>
                  </div>
                  <OptionGroupsMultiSelect
                    optionGroups={optionGroups}
                    value={linkedOptionGroupIds}
                    onChange={(ids) =>
                      handleLinkedOptionGroupIdsChange(mergeOptionGroupSelection(linkedOptionGroupIds, ids))
                    }
                    label="Link existing groups"
                    description="Groups already used on other items can be shared with this item."
                    showSelectedBadges={false}
                  />
                  <div className="space-y-2">
                    <Label className="text-sm">Linked groups (drag to reorder)</Label>
                    <LinkedOptionGroupsSortableList
                      optionGroups={optionGroups}
                      options={options}
                      orderedIds={linkedOptionGroupIds}
                      onReorder={setLinkedOptionGroupIds}
                      onRemove={(groupId) => {
                        setLinkedOptionGroupIds((prev) => prev.filter((id) => id !== groupId));
                        setLinkedGroupRules((prev) => {
                          const next = { ...prev };
                          delete next[groupId];
                          return next;
                        });
                      }}
                      rulesByGroupId={linkedGroupRules}
                      onRulesChange={(groupId, patch) =>
                        setLinkedGroupRules((prev) => ({
                          ...prev,
                          [groupId]: { ...(prev[groupId] ?? optionGroupToRulesForm(
                            optionGroups.find((g: OptionGroup) => g.id === groupId)!
                          )), ...patch },
                        }))
                      }
                    />
                  </div>
                  <MenuItemNewOptionGroupsEditor
                    drafts={newOptionGroups}
                    onChange={setNewOptionGroups}
                  />
                </div>
          </form>
        </AdminFormSheet>
      </CardHeader>
      <CardContent>
        <div className="relative mb-4">
          <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" aria-hidden />
          <Input
            type="search"
            value={menuItemTableSearch}
            onChange={(e) => setMenuItemTableSearch(e.target.value)}
            placeholder="Search by name, category, price, status…"
            className="pl-9"
            aria-label="Search menu items"
          />
        </div>
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
            {menuItemsTableRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground text-center py-8">
                  No menu items match your search.
                </TableCell>
              </TableRow>
            ) : (
              menuItemsTableRows.map((item: MenuItem) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{formatMenuItemCategoryNames(item, categories) || '—'}</TableCell>
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
              ))
            )}
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