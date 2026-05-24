export interface MenuItem {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  /** All linked categories. */
  categoryIds: string[];
  /** First linked category — backward compatibility for older paths. */
  categoryId: string;
  image: string;
  available: boolean;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  image: string;
  order: number;
}

export interface OptionGroup {
  id: string;
  name: string;
  /** Menu items linked to this shared group (pivot). */
  menuItemIds: string[];
  /** First linked item — kept for older UI paths. */
  menuItemId: string;
  type: 'single' | 'multiple'; // single select or multiple select
  required: boolean;
  minSelections?: number;
  maxSelections?: number;
  /** Multiple select only: same option can be chosen more than once (counts toward max). */
  allowRepeatSelections?: boolean;
  /** Legacy global display order on option_groups (prefer pivotOrderByMenuItem per item). */
  order: number;
  /** Per-menu-item sort order from pivot (menu_item_option_group.display_order). */
  pivotOrderByMenuItem?: Record<string, number>;
}

export interface Option {
  id: string;
  /** All option groups this choice belongs to. */
  optionGroupIds: string[];
  /** First linked group — backward compatibility. */
  optionGroupId: string;
  name: string;
  price: number;
  active: boolean;
}

/** Home banner / public status: auto uses opensAt + closesAt; force_* overrides schedule. */
export type StoreStatusMode = 'auto' | 'force_open' | 'force_closed';

export interface Location {
  id: string;
  name: string;
  address: string;
  phone: string;
  hours: string;
  timing?: string;
  /** Daily open time (local), HH:MM — used when storeStatusMode is auto */
  opensAt?: string | null;
  /** Daily close time (local), HH:MM — may be before opensAt for overnight hours */
  closesAt?: string | null;
  storeStatusMode?: StoreStatusMode;
  image: string;
}

export interface DeliveryPostalCode {
  id: string;
  code: string;
  label: string;
  active: boolean;
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed'; // percentage off or fixed amount off
  discountValue: number; // percentage (e.g., 20) or fixed amount (e.g., 5.00)
  minOrderAmount: number; // minimum order amount to apply coupon
  maxDiscount?: number; // max discount amount (for percentage coupons)
  validFrom: Date;
  validUntil: Date;
  usageLimit: number; // total times this coupon can be used
  usageCount: number; // times this coupon has been used
  active: boolean;
}

export type OfferKind = 'standard' | 'bogo_same' | 'bogo_any' | 'spend_get_free';

/** When offerKind is spend_get_free: how the reward applies after min spend is met. */
export type SpendRewardType = 'free_item' | 'percent_off' | 'fixed_amount';

export interface Offer {
  id: string;
  title: string;
  description: string;
  image: string;
  discountType: 'percentage' | 'fixed'; // used when offerKind === 'standard'
  discountValue: number;
  /** @default 'standard' */
  offerKind?: OfferKind;
  /** Minimum cart subtotal (after other line discounts) for spend_get_free. */
  minSpend?: number | null;
  /** spend_get_free: reward mode (default free_item for existing offers). */
  spendRewardType?: SpendRewardType | null;
  /** spend_get_free + percent_off: percent off entire qualifying cart (0–100). */
  spendRewardPercent?: number | null;
  /** spend_get_free + fixed_amount: dollars off entire qualifying cart. */
  spendRewardFixedAmount?: number | null;
  /** spend_get_free + free_item: reward SKU (customer must have it in the cart). */
  rewardMenuItemId?: string | null;
  showOnSlider?: boolean;
  applicableItemIds: string[]; // menu item IDs this offer applies to (or BOGO paid pool for bogo_any)
  /** bogo_any only: menu items that can be the discounted “free” line (must not overlap applicableItemIds). */
  bogoFreeItemIds?: string[];
  validFrom: Date;
  validUntil: Date;
  active: boolean;
}

export interface CartItem {
  id: string;
  menuItem: MenuItem;
  selectedOptions: SelectedOption[];
  quantity: number;
  totalPrice: number;
  specialInstructions?: string;
  appliedOffer?: Offer; // offer applied to this item
  offerDiscount?: number; // discount amount from offer
  /** Set when this line was auto-inserted as the bogo_any free item (cheapest in free pool). */
  bogoAutoFree?: { offerId: string };
  /** Auto-loaded second unit for buy-one-get-one-free on the same item + options (bogo_same). */
  bogoSameAutoFree?: { offerId: string };
}

export interface SelectedOption {
  optionGroupId: string;
  optionGroupName: string;
  options: Option[];
}

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  orderType: 'pickup' | 'delivery';
  locationId?: string;
  deliveryAddress?: string;
  deliveryPostalCode?: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  createdAt: Date;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  couponCode?: string;
  couponDiscount?: number;
  offerDiscount?: number; // total discount from offers
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: 'admin' | 'manager' | 'user';
  isAdmin: boolean;
  isManager: boolean;
  phoneVerifiedAt?: string | null;
}

export interface SeoSetting {
  id: string;
  pageKey: string;
  metaTitle: string;
  metaDescription: string;
}