import React, { createContext, useContext, useCallback, useEffect, useRef, useState, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { applyOffersToCart } from '../lib/applyOffers';
import { reconcileBogoAnyAutoLines } from '../lib/bogoAnyCart';
import { reconcileBogoSameAutoLines } from '../lib/bogoSameCart';
import { CartItem, Category, Coupon, DeliveryPostalCode, Location, MenuItem, Offer, Option, OptionGroup, Order, User } from '../types';

export type ApiRequestMeta = { silent?: boolean };

interface AppContextType {
  // Cart
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (itemId: string) => void;
  updateCartItemQuantity: (itemId: string, quantity: number) => void;
  updateCartItemDetails: (
    itemId: string,
    patch: Pick<CartItem, 'selectedOptions' | 'quantity' | 'totalPrice' | 'specialInstructions'>
  ) => void;
  clearCart: () => void;
  cartTotal: number;
  
  // User
  user: User | null;
  login: (email: string, password: string) => Promise<User | null>;
  loginWithPhoneOtp: (phone: string, code: string) => Promise<{ user: User | null; error: string | null }>;
  /** Forgot password: verify email OTP then issue session (checkout still uses phone OTP). */
  loginWithEmailOtp: (email: string, code: string) => Promise<{ user: User | null; error: string | null }>;
  register: (
    email: string,
    password: string,
    name: string,
    phone: string,
    passwordConfirmation: string
  ) => Promise<boolean>;
  /** Same as `register` but returns an error message on failure, or `null` on success (for checkout toasts). */
  registerWithErrorMessage: (
    email: string,
    password: string,
    name: string,
    phone: string,
    passwordConfirmation: string
  ) => Promise<string | null>;
  /** OTP-verified checkout: register with server-generated password or log in when email+phone match. */
  checkoutEnsureAccount: (
    name: string,
    email: string,
    phone: string
  ) => Promise<{ error: string | null; generatedPassword?: string | null }>;
  /** Plain password shown once after checkout registration (for dashboard eye toggle). */
  checkoutRevealPassword: string | null;
  logout: () => void;
  
  // Menu Data
  menuItems: MenuItem[];
  categories: Category[];
  optionGroups: OptionGroup[];
  options: Option[];
  locations: Location[];
  orders: Order[];
  coupons: Coupon[];
  offers: Offer[];
  /** Active delivery postal codes (public list; used at checkout). */
  activeDeliveryPostalCodes: DeliveryPostalCode[];
  /** All delivery postal codes including inactive (admin). */
  deliveryPostalCodesAdmin: DeliveryPostalCode[];

  // Admin functions
  addMenuItem: (item: Omit<MenuItem, 'id'>) => void;
  updateMenuItem: (id: string, item: Partial<MenuItem>) => void;
  deleteMenuItem: (id: string) => void;
  
  addCategory: (category: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, category: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  
  addOptionGroup: (group: Omit<OptionGroup, 'id'>) => void;
  updateOptionGroup: (id: string, group: Partial<OptionGroup>) => void;
  deleteOptionGroup: (id: string) => void;
  
  addOption: (option: Omit<Option, 'id'>) => void;
  updateOption: (id: string, option: Partial<Option>) => void;
  deleteOption: (id: string) => void;
  
  addLocation: (location: Omit<Location, 'id'>) => void;
  updateLocation: (id: string, location: Partial<Location>) => void;
  deleteLocation: (id: string) => void;

  addDeliveryPostalCode: (row: Omit<DeliveryPostalCode, 'id'>) => void;
  updateDeliveryPostalCode: (id: string, row: Partial<DeliveryPostalCode>) => void;
  deleteDeliveryPostalCode: (id: string) => void;

  addCoupon: (coupon: Omit<Coupon, 'id' | 'usageCount'>) => void;
  updateCoupon: (id: string, coupon: Partial<Coupon>) => void;
  deleteCoupon: (id: string) => void;
  validateCoupon: (code: string, subtotal: number) => { valid: boolean; message: string; coupon?: Coupon };
  applyCoupon: (code: string) => void;
  
  addOffer: (offer: Omit<Offer, 'id'>) => void;
  updateOffer: (id: string, offer: Partial<Offer>) => void;
  deleteOffer: (id: string) => void;
  getActiveOffers: () => Offer[];
  applyOfferToCart: (cartItems: CartItem[]) => CartItem[];
  
  createOrder: (order: Omit<Order, 'id' | 'createdAt'>) => Promise<string>;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  fetchAdminOrders: (filters?: {
    phone?: string;
    email?: string;
    coupon_code?: string;
    date_filter?: 'last_week' | 'last_month' | 'custom';
    from_date?: string;
    to_date?: string;
  }) => Promise<Order[]>;
  refreshAdminOrdersList: () => Promise<void>;
  apiRequest: (path: string, options?: RequestInit, meta?: ApiRequestMeta) => Promise<unknown>;

  /** Idempotent loaders — each route calls only what it needs (no bulk fetch on app open). */
  ensureHomePageLoaded: () => Promise<void>;
  ensureMenuBrowseLoaded: () => Promise<void>;
  ensureMenuCustomizerLoaded: () => Promise<void>;
  ensureCheckoutLoaded: () => Promise<void>;
  ensureCartPricingLoaded: () => Promise<void>;
  ensureCouponsPageLoaded: () => Promise<void>;
  ensureLocationsPageLoaded: () => Promise<void>;
  ensureOffersMarketingLoaded: () => Promise<void>;
  ensureOrderConfirmationLoaded: () => Promise<void>;
  ensureUserDashboardLoaded: () => Promise<void>;
  /** Re-fetch `/orders/my` without loading overlay (for dashboard polling). */
  refreshUserOrdersQuiet: () => Promise<void>;
  ensureAdminWorkspaceLoaded: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';
const TOKEN_KEY = 'authToken';
const CHECKOUT_REVEAL_PASSWORD_KEY = 'pizzaCheckoutRevealPassword';

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([]);
  const [options, setOptions] = useState<Option[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [activeDeliveryPostalCodes, setActiveDeliveryPostalCodes] = useState<DeliveryPostalCode[]>([]);
  const [deliveryPostalCodesAdmin, setDeliveryPostalCodesAdmin] = useState<DeliveryPostalCode[]>([]);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [checkoutRevealPassword, setCheckoutRevealPassword] = useState<string | null>(null);

  const getToken = () => localStorage.getItem(TOKEN_KEY);

  const toUser = (raw: any): User => ({
    id: String(raw.id),
    email: raw.email,
    name: raw.name,
    phone: raw.phone || '',
    role: raw.role === 'admin' || raw.role === 'manager' ? raw.role : 'user',
    isAdmin: raw.role === 'admin',
    isManager: raw.role === 'manager',
    phoneVerifiedAt: raw.phone_verified_at ?? null,
  });

  /** Keep checkout-generated password visible on the dashboard after email/OTP login when it belongs to this user. */
  const syncCheckoutRevealPasswordForUser = (mappedUser: User) => {
    try {
      const raw = localStorage.getItem(CHECKOUT_REVEAL_PASSWORD_KEY);
      if (!raw) {
        setCheckoutRevealPassword(null);
        return;
      }
      const parsed = JSON.parse(raw) as { userId?: unknown; password?: unknown };
      const uid = parsed.userId != null ? String(parsed.userId) : '';
      const pwd = typeof parsed.password === 'string' ? parsed.password : '';
      if (uid === mappedUser.id && pwd.length > 0) {
        setCheckoutRevealPassword(pwd);
      } else {
        localStorage.removeItem(CHECKOUT_REVEAL_PASSWORD_KEY);
        setCheckoutRevealPassword(null);
      }
    } catch {
      localStorage.removeItem(CHECKOUT_REVEAL_PASSWORD_KEY);
      setCheckoutRevealPassword(null);
    }
  };

  const toCategory = (raw: any): Category => ({
    id: String(raw.id),
    name: raw.name,
    description: raw.description || '',
    image: raw.image || '',
    order: raw.display_order ?? 0,
  });

  const toMenuItem = (raw: any): MenuItem => ({
    id: String(raw.id),
    name: raw.name,
    description: raw.description || '',
    basePrice: Number(raw.base_price),
    categoryId: String(raw.category_id),
    image: raw.image || '',
    available: Boolean(raw.available),
  });

  const toOptionGroup = (raw: any): OptionGroup => ({
    id: String(raw.id),
    name: raw.name,
    menuItemId: String(raw.menu_item_id),
    type: raw.type,
    required: Boolean(raw.required),
    minSelections: raw.min_selections ?? undefined,
    maxSelections: raw.max_selections ?? undefined,
  });

  const toOption = (raw: any): Option => ({
    id: String(raw.id),
    optionGroupId: String(raw.option_group_id),
    name: raw.name,
    price: Number(raw.price ?? 0),
  });

  const toLocation = (raw: any): Location => ({
    id: String(raw.id),
    name: raw.name,
    address: raw.address,
    phone: raw.phone,
    hours: raw.hours || '',
    timing: raw.timing || '',
    opensAt: raw.opens_at != null ? String(raw.opens_at).slice(0, 5) : null,
    closesAt: raw.closes_at != null ? String(raw.closes_at).slice(0, 5) : null,
    storeStatusMode: (raw.store_status_mode === 'force_open' || raw.store_status_mode === 'force_closed'
      ? raw.store_status_mode
      : 'auto') as Location['storeStatusMode'],
    image: raw.image || '',
  });

  const toCoupon = (raw: any): Coupon => ({
    id: String(raw.id),
    code: raw.code,
    description: raw.description,
    discountType: raw.discount_type,
    discountValue: Number(raw.discount_value),
    minOrderAmount: Number(raw.min_order_amount ?? 0),
    maxDiscount: raw.max_discount != null ? Number(raw.max_discount) : undefined,
    validFrom: new Date(raw.valid_from),
    validUntil: new Date(raw.valid_until),
    usageLimit: Number(raw.usage_limit ?? 0),
    usageCount: Number(raw.usage_count ?? 0),
    active: Boolean(raw.active),
  });

  const toOffer = (raw: any): Offer => {
    const okind = raw.offer_kind ?? 'standard';
    return {
    id: String(raw.id),
    title: raw.title,
    description: raw.description || '',
    image: raw.image || '',
    discountType: raw.discount_type,
    discountValue: Number(raw.discount_value ?? 0),
    offerKind: okind,
    minSpend: raw.min_spend != null ? Number(raw.min_spend) : null,
    ...(okind === 'spend_get_free'
      ? {
          spendRewardType: raw.spend_reward_type ?? 'free_item',
          spendRewardPercent:
            raw.spend_reward_percent != null ? Number(raw.spend_reward_percent) : null,
          spendRewardFixedAmount:
            raw.spend_reward_fixed != null ? Number(raw.spend_reward_fixed) : null,
        }
      : {}),
    rewardMenuItemId:
      raw.reward_menu_item_id != null
        ? String(raw.reward_menu_item_id)
        : raw.reward_menu_item?.id != null
          ? String(raw.reward_menu_item.id)
          : null,
    showOnSlider: Boolean(raw.show_on_slider ?? false),
    applicableItemIds: ((raw.menu_items ?? raw.menuItems) || []).map((m: { id: number | string }) =>
      String(m.id)
    ),
    bogoFreeItemIds: ((raw.bogo_free_menu_items ?? raw.bogoFreeMenuItems) || []).map(
      (m: { id: number | string }) => String(m.id)
    ),
    validFrom: new Date(raw.valid_from),
    validUntil: new Date(raw.valid_until),
    active: Boolean(raw.active),
  };
};

  const toDeliveryPostalCode = (raw: any): DeliveryPostalCode => ({
    id: String(raw.id),
    code: String(raw.code ?? ''),
    label: raw.label ? String(raw.label) : '',
    active: Boolean(raw.active ?? true),
  });

  const toOrderItems = (rawItems: any[]): CartItem[] => {
    return (rawItems || []).map((row: any) => {
      const rawMenuItem = row.menu_item ?? row.menuItem;
      const menuItemId = String(row.menu_item_id ?? rawMenuItem?.id ?? '');
      const fromCache = menuItems.find((m) => m.id === menuItemId);
      const mappedMenuItem: MenuItem = fromCache || {
        id: menuItemId,
        name: rawMenuItem?.name ?? `Item #${menuItemId}`,
        description: rawMenuItem?.description ?? '',
        basePrice: Number(rawMenuItem?.base_price ?? rawMenuItem?.basePrice ?? row.unit_price ?? 0),
        categoryId: String(rawMenuItem?.category_id ?? rawMenuItem?.categoryId ?? ''),
        image: rawMenuItem?.image ?? '',
        available: Boolean(rawMenuItem?.available ?? true),
      };

      const selectedOptions: SelectedOption[] = [];
      const grouped = new Map<string, SelectedOption>();
      (row.options || []).forEach((optRow: any) => {
        const groupId = String(optRow.option_group_id ?? optRow.optionGroup?.id ?? '');
        if (!groupId) return;
        const existing = grouped.get(groupId) || {
          optionGroupId: groupId,
          optionGroupName: optRow.option_group?.name ?? optRow.optionGroup?.name ?? 'Options',
          options: [],
        };
        existing.options.push({
          id: String(optRow.option_id ?? optRow.option?.id ?? ''),
          optionGroupId: groupId,
          name: optRow.option?.name ?? 'Option',
          price: Number(optRow.option_price ?? 0),
        });
        grouped.set(groupId, existing);
      });
      grouped.forEach((value) => selectedOptions.push(value));

      const quantity = Number(row.quantity ?? 1);
      const lineTotal = Number(row.line_total ?? 0);
      const unitPrice = Number(row.unit_price ?? 0);
      const totalPrice = quantity > 0
        ? (lineTotal > 0 ? lineTotal / quantity : unitPrice)
        : unitPrice;

      return {
        id: String(row.id ?? ''),
        menuItem: mappedMenuItem,
        selectedOptions,
        quantity,
        totalPrice,
        specialInstructions: row.special_instructions ?? undefined,
        appliedOffer: row.offer_title
          ? {
              id: `order-item-offer-${row.id}`,
              title: row.offer_title,
              description: '',
              image: '',
              discountType: 'fixed',
              discountValue: Number(row.offer_discount ?? 0),
              applicableItemIds: [menuItemId],
              validFrom: new Date(0),
              validUntil: new Date(8640000000000000),
              active: true,
            }
          : undefined,
        offerDiscount: row.offer_discount != null ? Number(row.offer_discount) : undefined,
      };
    });
  };

  const toOrder = (raw: any): Order => ({
    id: String(raw.id),
    userId: String(raw.user_id ?? ''),
    items: toOrderItems(raw.items || []),
    subtotal: Number(raw.subtotal ?? 0),
    tax: Number(raw.tax ?? 0),
    total: Number(raw.total ?? 0),
    orderType: raw.order_type,
    locationId: raw.location_id ? String(raw.location_id) : undefined,
    deliveryAddress: raw.delivery_address ?? undefined,
    deliveryPostalCode: raw.delivery_postal_code ?? undefined,
    status: raw.status,
    createdAt: new Date(raw.created_at),
    customerName: raw.customer_name,
    customerEmail: raw.customer_email,
    customerPhone: raw.customer_phone,
    couponCode: raw.coupon_code ?? undefined,
    couponDiscount: raw.coupon_discount ? Number(raw.coupon_discount) : undefined,
    offerDiscount: raw.offer_discount ? Number(raw.offer_discount) : undefined,
  });

  const request = async (path: string, options: RequestInit = {}, meta?: ApiRequestMeta) => {
    const silent = meta?.silent === true;
    if (!silent) {
      setPendingRequests((n) => n + 1);
    }
    try {
      const token = getToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...(options.headers as Record<string, string> || {}),
      };
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const d = data as { message?: string; errors?: Record<string, string[]> } | null;
        let msg = d?.message || 'Request failed';
        if (d?.errors) {
          const first = Object.values(d.errors).flat().find(Boolean);
          if (first) msg = first;
        }
        throw new Error(msg);
      }
      return data;
    } finally {
      if (!silent) {
        setPendingRequests((n) => Math.max(0, n - 1));
      }
    }
  };

  /** Visit any page with `?clearStorage=1` to wipe app local data and reload (cart, auth token, checkout password hint). */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('clearStorage') !== '1' && params.get('clearStorage') !== 'true') return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(CHECKOUT_REVEAL_PASSWORD_KEY);
    localStorage.removeItem('cart');
    params.delete('clearStorage');
    const q = params.toString();
    window.history.replaceState(
      {},
      '',
      `${window.location.pathname}${q ? `?${q}` : ''}${window.location.hash}`
    );
    window.location.reload();
  }, []);

  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) setCart(JSON.parse(savedCart));
  }, []);

  useEffect(() => {
    if (menuItems.length === 0 || !loaded.current.offers) return;
    setCart((prev) =>
      reconcileBogoAnyAutoLines(reconcileBogoSameAutoLines(prev, offers), offers, menuItems)
    );
  }, [offers, menuItems]);

  type LoadedKey =
    | 'categories'
    | 'menuItems'
    | 'offers'
    | 'optionGroups'
    | 'options'
    | 'locations'
    | 'coupons'
    | 'deliveryPublic'
    | 'deliveryAdmin'
    | 'ordersAdmin';

  const loaded = useRef<Record<LoadedKey, boolean>>({
    categories: false,
    menuItems: false,
    offers: false,
    optionGroups: false,
    options: false,
    locations: false,
    coupons: false,
    deliveryPublic: false,
    deliveryAdmin: false,
    ordersAdmin: false,
  });

  const ensureCategories = async (force = false) => {
    if (loaded.current.categories && !force) return;
    const cats = await request('/categories');
    setCategories((cats || []).map(toCategory));
    loaded.current.categories = true;
  };

  const ensureMenuItems = async (force = false) => {
    if (loaded.current.menuItems && !force) return;
    const menu = await request('/menu-items');
    setMenuItems((menu || []).map(toMenuItem));
    loaded.current.menuItems = true;
  };

  const ensureOffers = async (force = false) => {
    if (loaded.current.offers && !force) return;
    const offs = await request('/offers');
    setOffers((offs || []).map(toOffer));
    loaded.current.offers = true;
  };

  const ensureOptionGroups = async (force = false) => {
    if (loaded.current.optionGroups && !force) return;
    const groups = await request('/option-groups');
    setOptionGroups((groups || []).map(toOptionGroup));
    loaded.current.optionGroups = true;
  };

  const ensureOptions = async (force = false) => {
    if (loaded.current.options && !force) return;
    const opts = await request('/options');
    setOptions((opts || []).map(toOption));
    loaded.current.options = true;
  };

  const ensureLocations = async (force = false) => {
    if (loaded.current.locations && !force) return;
    const locs = await request('/locations');
    setLocations((locs || []).map(toLocation));
    loaded.current.locations = true;
  };

  const ensureCoupons = async (force = false) => {
    if (loaded.current.coupons && !force) return;
    const coup = await request('/coupons');
    setCoupons((coup || []).map(toCoupon));
    loaded.current.coupons = true;
  };

  const ensureDeliveryPublic = async (force = false) => {
    if (loaded.current.deliveryPublic && !force) return;
    const postal = await request('/delivery-postal-codes');
    setActiveDeliveryPostalCodes((postal || []).map(toDeliveryPostalCode));
    loaded.current.deliveryPublic = true;
  };

  const ensureDeliveryAdmin = async (force = false) => {
    if (loaded.current.deliveryAdmin && !force) return;
    const postalAdmin = await request('/delivery-postal-codes/admin');
    setDeliveryPostalCodesAdmin((postalAdmin || []).map(toDeliveryPostalCode));
    loaded.current.deliveryAdmin = true;
  };

  const ensureAdminOrders = async (force = false) => {
    if (loaded.current.ordersAdmin && !force) return;
    const allOrders = await request('/orders');
    setOrders((prev) => {
      const next = (allOrders || []).map(toOrder);
      return next.map((o) => {
        const keep = prev.find((p) => p.id === o.id);
        return keep?.items?.length ? { ...o, items: keep.items } : o;
      });
    });
    loaded.current.ordersAdmin = true;
  };

  const reloadCustomization = () => Promise.all([ensureOptionGroups(true), ensureOptions(true)]);

  const loadUserOrders = async () => {
    loaded.current.ordersAdmin = false;
    const myOrders = await request('/orders/my');
    setOrders((prev) => {
      const next = (myOrders || []).map(toOrder);
      return next.map((o) => {
        const keep = prev.find((p) => p.id === o.id);
        return keep?.items?.length ? { ...o, items: keep.items } : o;
      });
    });
  };

  const ensureHomePageLoaded = async () => {
    await Promise.all([ensureCategories(), ensureLocations(), ensureOffers()]);
  };

  const ensureMenuBrowseLoaded = async () => {
    await Promise.all([ensureCategories(), ensureMenuItems(), ensureOffers()]);
  };

  const ensureMenuCustomizerLoaded = async () => {
    await Promise.all([ensureMenuItems(), ensureOptionGroups(), ensureOptions()]);
  };

  const ensureCheckoutLoaded = async () => {
    await Promise.all([
      ensureLocations(),
      ensureDeliveryPublic(),
      ensureCoupons(),
      ensureMenuItems(),
      ensureOffers(),
    ]);
  };

  const ensureCartPricingLoaded = async () => {
    await Promise.all([ensureMenuItems(), ensureOffers()]);
  };

  const ensureCouponsPageLoaded = async () => {
    await ensureCoupons();
  };

  const ensureLocationsPageLoaded = async () => {
    await ensureLocations();
  };

  const ensureOffersMarketingLoaded = async () => {
    await Promise.all([ensureOffers(), ensureMenuItems()]);
  };

  const ensureOrderConfirmationLoaded = async () => {
    await ensureLocations();
  };

  const ensureUserDashboardLoaded = async () => {
    await loadUserOrders();
  };

  const refreshUserOrdersQuiet = useCallback(async () => {
    try {
      const myOrders = await request('/orders/my', {}, { silent: true });
      setOrders((prev) => {
        const next = (myOrders || []).map(toOrder);
        return next.map((o) => {
          const keep = prev.find((p) => p.id === o.id);
          return keep?.items?.length ? { ...o, items: keep.items } : o;
        });
      });
    } catch {
      /* ignore poll failures (offline / expired token) */
    }
  }, []);

  const ensureAdminWorkspaceLoaded = async () => {
    await Promise.all([
      ensureCategories(),
      ensureMenuItems(),
      ensureOptionGroups(),
      ensureOptions(),
      ensureLocations(),
      ensureCoupons(),
      ensureOffers(),
      ensureDeliveryPublic(),
      ensureDeliveryAdmin(),
    ]);
    await ensureAdminOrders(true);
  };

  useEffect(() => {
    (async () => {
      try {
        const token = getToken();
        if (!token) return;
        const me = await request('/auth/me');
        setUser(toUser(me));
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        setUser(null);
      }
    })();
  }, []);

  useEffect(() => {
    if (!user) {
      setCheckoutRevealPassword(null);
      return;
    }
    try {
      const raw = localStorage.getItem(CHECKOUT_REVEAL_PASSWORD_KEY);
      if (!raw) {
        setCheckoutRevealPassword(null);
        return;
      }
      const parsed = JSON.parse(raw) as { userId?: unknown; password?: unknown };
      const uid = parsed.userId != null ? String(parsed.userId) : '';
      const pwd = typeof parsed.password === 'string' ? parsed.password : '';
      if (uid === user.id && pwd.length > 0) {
        setCheckoutRevealPassword(pwd);
      } else {
        localStorage.removeItem(CHECKOUT_REVEAL_PASSWORD_KEY);
        setCheckoutRevealPassword(null);
      }
    } catch {
      localStorage.removeItem(CHECKOUT_REVEAL_PASSWORD_KEY);
      setCheckoutRevealPassword(null);
    }
  }, [user?.id]);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  // Cart functions
  const finalizeCartWithBogo = (next: CartItem[]) => {
    if (menuItems.length === 0 || !loaded.current.offers) return next;
    return reconcileBogoAnyAutoLines(reconcileBogoSameAutoLines(next, offers), offers, menuItems);
  };

  const addToCart = (item: CartItem) => {
    setCart((prev) => finalizeCartWithBogo([...prev, { ...item, id: Date.now().toString() }]));
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => finalizeCartWithBogo(prev.filter((item) => item.id !== itemId)));
  };

  const updateCartItemQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart((prev) =>
      finalizeCartWithBogo(
        prev.map((item) => (item.id === itemId ? { ...item, quantity } : item))
      )
    );
  };

  const updateCartItemDetails = (
    itemId: string,
    patch: Pick<CartItem, 'selectedOptions' | 'quantity' | 'totalPrice' | 'specialInstructions'>
  ) => {
    if (patch.quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart((prev) =>
      finalizeCartWithBogo(
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                selectedOptions: patch.selectedOptions,
                quantity: patch.quantity,
                totalPrice: patch.totalPrice,
                specialInstructions: patch.specialInstructions,
              }
            : item
        )
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.totalPrice * item.quantity), 0);

  // Auth functions
  const login = async (email: string, password: string): Promise<User | null> => {
    try {
      const data = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem(TOKEN_KEY, data.token);
      const mappedUser = toUser(data.user);
      setUser(mappedUser);
      syncCheckoutRevealPasswordForUser(mappedUser);
      return mappedUser;
    } catch {
      return null;
    }
  };

  const loginWithPhoneOtp = async (
    phone: string,
    code: string
  ): Promise<{ user: User | null; error: string | null }> => {
    try {
      await request('/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ phone, code }),
      });
      const data = await request('/auth/login-phone', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      });
      localStorage.setItem(TOKEN_KEY, data.token);
      const mappedUser = toUser(data.user);
      setUser(mappedUser);
      syncCheckoutRevealPasswordForUser(mappedUser);
      return { user: mappedUser, error: null };
    } catch (e) {
      return { user: null, error: e instanceof Error ? e.message : 'Could not login with OTP' };
    }
  };

  const loginWithEmailOtp = async (
    email: string,
    code: string
  ): Promise<{ user: User | null; error: string | null }> => {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      await request('/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ email: normalizedEmail, code }),
      });
      const data = await request('/auth/login-email-otp', {
        method: 'POST',
        body: JSON.stringify({ email: normalizedEmail }),
      });
      localStorage.setItem(TOKEN_KEY, data.token);
      const mappedUser = toUser(data.user);
      setUser(mappedUser);
      syncCheckoutRevealPasswordForUser(mappedUser);
      return { user: mappedUser, error: null };
    } catch (e) {
      return { user: null, error: e instanceof Error ? e.message : 'Could not login with email code' };
    }
  };

  const registerWithErrorMessage = async (
    email: string,
    password: string,
    name: string,
    phone: string,
    passwordConfirmation: string
  ): Promise<string | null> => {
    try {
      const data = await request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          password_confirmation: passwordConfirmation,
          name,
          phone,
        }),
      });
      localStorage.setItem(TOKEN_KEY, data.token);
      setUser(toUser(data.user));
      localStorage.removeItem(CHECKOUT_REVEAL_PASSWORD_KEY);
      setCheckoutRevealPassword(null);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : 'Registration failed';
    }
  };

  const register = async (
    email: string,
    password: string,
    name: string,
    phone: string,
    passwordConfirmation: string
  ): Promise<boolean> => {
    const err = await registerWithErrorMessage(email, password, name, phone, passwordConfirmation);
    return err === null;
  };

  const checkoutEnsureAccount = async (
    name: string,
    email: string,
    phone: string
  ): Promise<{ error: string | null; generatedPassword?: string | null }> => {
    try {
      const data = (await request('/auth/checkout-account', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
        }),
      })) as { user: unknown; token: string; generated_password?: string | null };
      const u = toUser(data.user);
      localStorage.setItem(TOKEN_KEY, data.token);
      setUser(u);
      const gen =
        typeof data.generated_password === 'string' && data.generated_password.length > 0
          ? data.generated_password
          : null;
      if (gen) {
        localStorage.setItem(CHECKOUT_REVEAL_PASSWORD_KEY, JSON.stringify({ userId: u.id, password: gen }));
        setCheckoutRevealPassword(gen);
      } else {
        localStorage.removeItem(CHECKOUT_REVEAL_PASSWORD_KEY);
        setCheckoutRevealPassword(null);
      }
      return { error: null, generatedPassword: gen };
    } catch (e) {
      return {
        error: e instanceof Error ? e.message : 'Could not create account',
        generatedPassword: null,
      };
    }
  };

  const logout = () => {
    setUser(null);
    setCheckoutRevealPassword(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(CHECKOUT_REVEAL_PASSWORD_KEY);
    void request('/auth/logout', { method: 'POST' }).catch(() => undefined);
  };

  const addMenuItem = (item: Omit<MenuItem, 'id'>) => {
    void request('/menu-items', {
      method: 'POST',
      body: JSON.stringify({
        name: item.name,
        description: item.description,
        base_price: item.basePrice,
        category_id: Number(item.categoryId),
        image: item.image,
        available: item.available,
      }),
    }).then(() => ensureMenuItems(true));
  };

  const updateMenuItem = (id: string, item: Partial<MenuItem>) => {
    void request(`/menu-items/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: item.name,
        description: item.description,
        base_price: item.basePrice,
        category_id: item.categoryId ? Number(item.categoryId) : undefined,
        image: item.image,
        available: item.available,
      }),
    }).then(() => ensureMenuItems(true));
  };

  const deleteMenuItem = (id: string) => {
    void request(`/menu-items/${id}`, { method: 'DELETE' }).then(() => ensureMenuItems(true));
  };

  const addCategory = (category: Omit<Category, 'id'>) => {
    void request('/categories', {
      method: 'POST',
      body: JSON.stringify({
        name: category.name,
        description: category.description,
        image: category.image,
        display_order: category.order,
      }),
    }).then(() => Promise.all([ensureCategories(true), ensureMenuItems(true)]));
  };

  const updateCategory = (id: string, category: Partial<Category>) => {
    void request(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: category.name,
        description: category.description,
        image: category.image,
        display_order: category.order,
      }),
    }).then(() => Promise.all([ensureCategories(true), ensureMenuItems(true)]));
  };

  const deleteCategory = (id: string) => {
    void request(`/categories/${id}`, { method: 'DELETE' }).then(() =>
      Promise.all([ensureCategories(true), ensureMenuItems(true)])
    );
  };

  const addOptionGroup = (group: Omit<OptionGroup, 'id'>) => {
    void request('/option-groups', {
      method: 'POST',
      body: JSON.stringify({
        menu_item_id: Number(group.menuItemId),
        name: group.name,
        type: group.type,
        required: group.required,
        min_selections: group.minSelections,
        max_selections: group.maxSelections,
      }),
    }).then(reloadCustomization);
  };

  const updateOptionGroup = (id: string, group: Partial<OptionGroup>) => {
    void request(`/option-groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        menu_item_id: group.menuItemId ? Number(group.menuItemId) : undefined,
        name: group.name,
        type: group.type,
        required: group.required,
        min_selections: group.minSelections,
        max_selections: group.maxSelections,
      }),
    }).then(reloadCustomization);
  };

  const deleteOptionGroup = (id: string) => {
    void request(`/option-groups/${id}`, { method: 'DELETE' }).then(reloadCustomization);
  };

  const addOption = (option: Omit<Option, 'id'>) => {
    void request('/options', {
      method: 'POST',
      body: JSON.stringify({
        option_group_id: Number(option.optionGroupId),
        name: option.name,
        price: option.price,
      }),
    }).then(reloadCustomization);
  };

  const updateOption = (id: string, option: Partial<Option>) => {
    void request(`/options/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        option_group_id: option.optionGroupId ? Number(option.optionGroupId) : undefined,
        name: option.name,
        price: option.price,
      }),
    }).then(reloadCustomization);
  };

  const deleteOption = (id: string) => {
    void request(`/options/${id}`, { method: 'DELETE' }).then(reloadCustomization);
  };

  const addLocation = (location: Omit<Location, 'id'>) => {
    void request('/locations', {
      method: 'POST',
      body: JSON.stringify({
        name: location.name,
        address: location.address,
        phone: location.phone,
        hours: location.hours || null,
        timing: location.timing || null,
        opens_at: location.opensAt?.trim() ? location.opensAt.trim() : null,
        closes_at: location.closesAt?.trim() ? location.closesAt.trim() : null,
        store_status_mode: location.storeStatusMode ?? 'auto',
        image: location.image || null,
      }),
    }).then(() => ensureLocations(true));
  };

  const updateLocation = (id: string, location: Partial<Location>) => {
    void request(`/locations/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: location.name,
        address: location.address,
        phone: location.phone,
        hours: location.hours,
        timing: location.timing,
        opens_at: location.opensAt === undefined ? undefined : location.opensAt?.trim() ? location.opensAt.trim() : null,
        closes_at: location.closesAt === undefined ? undefined : location.closesAt?.trim() ? location.closesAt.trim() : null,
        store_status_mode: location.storeStatusMode,
        image: location.image,
      }),
    }).then(() => ensureLocations(true));
  };

  const deleteLocation = (id: string) => {
    void request(`/locations/${id}`, { method: 'DELETE' }).then(() => ensureLocations(true));
  };

  const refreshDeliveryPostalData = () =>
    Promise.all([ensureDeliveryPublic(true), ensureDeliveryAdmin(true)]).then(() => undefined);

  const addDeliveryPostalCode = (row: Omit<DeliveryPostalCode, 'id'>) => {
    void request('/delivery-postal-codes', {
      method: 'POST',
      body: JSON.stringify({
        code: row.code,
        label: row.label || null,
        active: row.active,
      }),
    }).then(refreshDeliveryPostalData);
  };

  const updateDeliveryPostalCode = (id: string, row: Partial<DeliveryPostalCode>) => {
    const body: Record<string, unknown> = {};
    if (row.code !== undefined) body.code = row.code;
    if (row.label !== undefined) body.label = row.label || null;
    if (row.active !== undefined) body.active = row.active;
    void request(`/delivery-postal-codes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }).then(refreshDeliveryPostalData);
  };

  const deleteDeliveryPostalCode = (id: string) => {
    void request(`/delivery-postal-codes/${id}`, { method: 'DELETE' }).then(refreshDeliveryPostalData);
  };

  const addCoupon = (coupon: Omit<Coupon, 'id' | 'usageCount'>) => {
    void request('/coupons', {
      method: 'POST',
      body: JSON.stringify({
        code: coupon.code,
        description: coupon.description,
        discount_type: coupon.discountType,
        discount_value: coupon.discountValue,
        min_order_amount: coupon.minOrderAmount,
        max_discount: coupon.maxDiscount,
        valid_from: coupon.validFrom,
        valid_until: coupon.validUntil,
        usage_limit: coupon.usageLimit,
        active: coupon.active,
      }),
    }).then(() => ensureCoupons(true));
  };

  const updateCoupon = (id: string, coupon: Partial<Coupon>) => {
    void request(`/coupons/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        code: coupon.code,
        description: coupon.description,
        discount_type: coupon.discountType,
        discount_value: coupon.discountValue,
        min_order_amount: coupon.minOrderAmount,
        max_discount: coupon.maxDiscount,
        valid_from: coupon.validFrom,
        valid_until: coupon.validUntil,
        usage_limit: coupon.usageLimit,
        usage_count: coupon.usageCount,
        active: coupon.active,
      }),
    }).then(() => ensureCoupons(true));
  };

  const deleteCoupon = (id: string) => {
    void request(`/coupons/${id}`, { method: 'DELETE' }).then(() => ensureCoupons(true));
  };

  const validateCoupon = (code: string, subtotal: number) => {
    const coupon = coupons.find(c => c.code.toUpperCase() === code.toUpperCase());
    if (!coupon) {
      return { valid: false, message: 'Invalid coupon code' };
    }
    if (!coupon.active) {
      return { valid: false, message: 'This coupon is no longer active' };
    }
    if (coupon.usageCount >= coupon.usageLimit) {
      return { valid: false, message: 'Coupon has reached its maximum usage limit' };
    }
    const now = new Date();
    if (new Date(coupon.validUntil) < now) {
      return { valid: false, message: 'Coupon has expired' };
    }
    if (new Date(coupon.validFrom) > now) {
      return { valid: false, message: 'Coupon is not yet valid' };
    }
    if (subtotal < coupon.minOrderAmount) {
      return { valid: false, message: `Minimum order amount of $${coupon.minOrderAmount.toFixed(2)} required to use this coupon` };
    }
    return { valid: true, message: 'Coupon applied successfully!', coupon };
  };

  const applyCoupon = (code: string) => {
    const coupon = coupons.find(c => c.code === code);
    if (coupon) {
      updateCoupon(coupon.id, { usageCount: coupon.usageCount + 1 });
    }
  };

  const addOffer = (offer: Omit<Offer, 'id'>) => {
    const kind = offer.offerKind ?? 'standard';
    const spendType = offer.spendRewardType ?? 'free_item';
    void request('/offers', {
      method: 'POST',
      body: JSON.stringify({
        title: offer.title,
        description: offer.description,
        image: offer.image,
        offer_kind: kind,
        discount_type: offer.discountType,
        discount_value: offer.discountValue,
        min_spend: offer.minSpend ?? null,
        reward_menu_item_id:
          kind === 'spend_get_free'
            ? spendType === 'free_item' && offer.rewardMenuItemId
              ? Number(offer.rewardMenuItemId)
              : null
            : offer.rewardMenuItemId
              ? Number(offer.rewardMenuItemId)
              : null,
        show_on_slider: Boolean(offer.showOnSlider),
        menu_item_ids: offer.applicableItemIds.map(Number),
        ...(kind === 'bogo_any'
          ? { bogo_free_menu_item_ids: (offer.bogoFreeItemIds ?? []).map(Number) }
          : {}),
        ...(kind === 'spend_get_free'
          ? {
              spend_reward_type: spendType,
              spend_reward_percent: spendType === 'percent_off' ? offer.spendRewardPercent ?? null : null,
              spend_reward_fixed: spendType === 'fixed_amount' ? offer.spendRewardFixedAmount ?? null : null,
            }
          : {}),
        valid_from: offer.validFrom,
        valid_until: offer.validUntil,
        active: offer.active,
      }),
    }).then(() => ensureOffers(true));
  };

  const updateOffer = (id: string, offer: Partial<Offer>) => {
    const kind = offer.offerKind;
    const spendType = offer.spendRewardType ?? 'free_item';
    void request(`/offers/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        title: offer.title,
        description: offer.description,
        image: offer.image,
        offer_kind: offer.offerKind,
        discount_type: offer.discountType,
        discount_value: offer.discountValue,
        min_spend: offer.minSpend ?? null,
        reward_menu_item_id:
          kind === 'spend_get_free'
            ? spendType === 'free_item' && offer.rewardMenuItemId
              ? Number(offer.rewardMenuItemId)
              : null
            : offer.rewardMenuItemId
              ? Number(offer.rewardMenuItemId)
              : undefined,
        show_on_slider: offer.showOnSlider,
        menu_item_ids: offer.applicableItemIds?.map(Number),
        ...(kind === 'bogo_any'
          ? { bogo_free_menu_item_ids: (offer.bogoFreeItemIds ?? []).map(Number) }
          : {}),
        ...(kind === 'spend_get_free'
          ? {
              spend_reward_type: spendType,
              spend_reward_percent: spendType === 'percent_off' ? offer.spendRewardPercent ?? null : null,
              spend_reward_fixed: spendType === 'fixed_amount' ? offer.spendRewardFixedAmount ?? null : null,
            }
          : {}),
        valid_from: offer.validFrom,
        valid_until: offer.validUntil,
        active: offer.active,
      }),
    }).then(() => ensureOffers(true));
  };

  const deleteOffer = (id: string) => {
    void request(`/offers/${id}`, { method: 'DELETE' }).then(() => ensureOffers(true));
  };

  const getActiveOffers = () => {
    const now = new Date();
    return offers.filter(o => o.active && new Date(o.validFrom) <= now && new Date(o.validUntil) >= now);
  };

  const applyOfferToCart = (cartItems: CartItem[]) =>
    applyOffersToCart(cartItems, getActiveOffers());

  const createOrder = async (order: Omit<Order, 'id' | 'createdAt'>): Promise<string> => {
    const created = await request('/orders', {
      method: 'POST',
      body: JSON.stringify({
        order_type: order.orderType,
        location_id: order.locationId ? Number(order.locationId) : null,
        delivery_address: order.deliveryAddress || null,
        delivery_postal_code: order.orderType === 'delivery' ? order.deliveryPostalCode || null : null,
        subtotal: order.subtotal,
        tax: order.tax,
        total: order.total,
        customer_name: order.customerName,
        customer_email: order.customerEmail,
        customer_phone: order.customerPhone,
        coupon_code: order.couponCode || null,
        coupon_discount: order.couponDiscount || 0,
        offer_discount: order.offerDiscount || 0,
        items: order.items.map((item) => ({
          menu_item_id: Number(item.menuItem.id),
          quantity: item.quantity,
          unit_price: item.totalPrice,
          line_total: item.totalPrice * item.quantity,
          special_instructions: item.specialInstructions || null,
          offer_title: item.appliedOffer?.title || null,
          offer_discount: item.offerDiscount || 0,
          options: item.selectedOptions.flatMap((group) =>
            group.options.map((opt) => ({
              option_group_id: Number(group.optionGroupId),
              option_id: Number(opt.id),
              option_price: opt.price || 0,
            }))
          ),
        })),
      }),
    });
    const merged: Order = toOrder(created);
    setOrders((prev) => {
      const rest = prev.filter((p) => p.id !== merged.id);
      return [merged, ...rest];
    });
    if (getToken()) {
      void loadUserOrders().catch(() => {});
    }
    return merged.id;
  };


  const fetchAdminOrders = async (filters?: {
    phone?: string;
    email?: string;
    coupon_code?: string;
    date_filter?: 'last_week' | 'last_month' | 'custom';
    from_date?: string;
    to_date?: string;
  }): Promise<Order[]> => {
    const params = new URLSearchParams();
    const phone = filters?.phone?.trim();
    const email = filters?.email?.trim();
    const coupon = filters?.coupon_code?.trim();
    const dateFilter = filters?.date_filter;
    const fromDate = filters?.from_date?.trim();
    const toDate = filters?.to_date?.trim();
    if (phone) params.set('phone', phone);
    if (email) params.set('email', email);
    if (coupon) params.set('coupon_code', coupon);
    if (dateFilter) params.set('date_filter', dateFilter);
    if (fromDate) params.set('from_date', fromDate);
    if (toDate) params.set('to_date', toDate);
    const qs = params.toString();
    const path = qs ? `/orders?${qs}` : '/orders';
    const data = await request(path);
    return (data || []).map(toOrder);
  };

  const refreshAdminOrdersList = async () => {
    try {
      const allOrders = await request('/orders', {}, { silent: true });
      setOrders((prev) => {
        const next = (allOrders || []).map(toOrder);
        return next.map((o) => {
          const keep = prev.find((p) => p.id === o.id);
          return keep?.items?.length ? { ...o, items: keep.items } : o;
        });
      });
    } catch {
      /* ignore background poll failures */
    }
  };
  const updateOrderStatus = (orderId: string, status: Order['status']) => {
    void request(`/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }).then(() => ensureAdminOrders(true));
  };

  return (
    <AppContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateCartItemQuantity,
        updateCartItemDetails,
        clearCart,
        cartTotal,
        user,
        login,
        loginWithPhoneOtp,
        loginWithEmailOtp,
        register,
        registerWithErrorMessage,
        checkoutEnsureAccount,
        checkoutRevealPassword,
        logout,
        menuItems,
        categories,
        optionGroups,
        options,
        locations,
        orders,
        coupons,
        offers,
        activeDeliveryPostalCodes,
        deliveryPostalCodesAdmin,
        addMenuItem,
        updateMenuItem,
        deleteMenuItem,
        addCategory,
        updateCategory,
        deleteCategory,
        addOptionGroup,
        updateOptionGroup,
        deleteOptionGroup,
        addOption,
        updateOption,
        deleteOption,
        addLocation,
        updateLocation,
        deleteLocation,
        addDeliveryPostalCode,
        updateDeliveryPostalCode,
        deleteDeliveryPostalCode,
        addCoupon,
        updateCoupon,
        deleteCoupon,
        validateCoupon,
        applyCoupon,
        addOffer,
        updateOffer,
        deleteOffer,
        getActiveOffers,
        applyOfferToCart,
        createOrder,
        updateOrderStatus,
        fetchAdminOrders,
        refreshAdminOrdersList,
        apiRequest: request,
        ensureHomePageLoaded,
        ensureMenuBrowseLoaded,
        ensureMenuCustomizerLoaded,
        ensureCheckoutLoaded,
        ensureCartPricingLoaded,
        ensureCouponsPageLoaded,
        ensureLocationsPageLoaded,
        ensureOffersMarketingLoaded,
        ensureOrderConfirmationLoaded,
        ensureUserDashboardLoaded,
        refreshUserOrdersQuiet,
        ensureAdminWorkspaceLoaded,
      }}
    >
      {children}
      {pendingRequests > 0 ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="rounded-lg bg-white px-6 py-5 shadow-lg flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-orange-600" aria-hidden />
            <span className="text-sm text-gray-600">Loading...</span>
          </div>
        </div>
      ) : null}
    </AppContext.Provider>
  );
};