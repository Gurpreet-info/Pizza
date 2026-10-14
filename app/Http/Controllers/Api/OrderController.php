<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DeliveryPostalCode;
use App\Models\Order;
use App\Models\OrderItem;
use App\Support\CouponPhoneUse;
use App\Support\PhoneNumber;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class OrderController extends Controller
{
    private const ORDER_WITH = [
        'location',
        'items.menuItem',
        'items.options.optionGroup',
        'items.options.option',
    ];

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'phone' => ['sometimes', 'nullable', 'string', 'max:30'],
            'email' => ['sometimes', 'nullable', 'string', 'max:255'],
            'coupon_code' => ['sometimes', 'nullable', 'string', 'max:100'],
            'date_filter' => ['sometimes', 'nullable', Rule::in(['yesterday', 'last_week', 'last_month', 'this_week', 'this_month', 'custom'])],
            'from_date' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'to_date' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
        ]);

        $query = Order::query()
            ->with(self::ORDER_WITH)
            ->latest();

        $dateFilter = $request->query('date_filter');
        $dateFilter = is_string($dateFilter) ? trim($dateFilter) : '';

        $phone = $request->query('phone');
        $phone = is_string($phone) ? trim($phone) : '';
        $normalizedPhone = $phone !== '' ? PhoneNumber::normalize($phone) : '';

        $email = $request->query('email');
        $email = is_string($email) ? trim($email) : '';

        $coupon = $request->query('coupon_code');
        $coupon = is_string($coupon) ? trim($coupon) : '';

        $hasCustomerSearch = $normalizedPhone !== '' || $email !== '' || $coupon !== '';

        if ($dateFilter === '') {
            // Phone, email, or coupon alone should return every matching order.
            // With no search and no date, show today only.
            if (! $hasCustomerSearch) {
                [$start, $end] = $this->orderListDateBounds('');
                $query->whereBetween('created_at', [$start, $end]);
            }
        } elseif ($dateFilter === 'custom') {
            $fromDate = $request->query('from_date');
            $toDate = $request->query('to_date');

            if (! is_string($fromDate) || ! is_string($toDate) || trim($fromDate) === '' || trim($toDate) === '') {
                return response()->json([
                    'message' => 'Custom date filter requires both from and to dates.',
                ], 422);
            }

            if ($fromDate > $toDate) {
                return response()->json([
                    'message' => 'From date must be before or equal to to date.',
                ], 422);
            }

            $query->whereBetween('created_at', [
                $fromDate.' 00:00:00',
                $toDate.' 23:59:59',
            ]);
        } else {
            [$start, $end] = $this->orderListDateBounds($dateFilter);
            $query->whereBetween('created_at', [$start, $end]);
        }

        if ($normalizedPhone !== '') {
            $query->whereRaw(
                "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(customer_phone, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') LIKE ?",
                ['%'.$normalizedPhone.'%']
            );
        }

        if ($email !== '') {
            $like = '%'.addcslashes($email, '%_\\').'%';
            $query->where('customer_email', 'like', $like);
        }

        if ($coupon !== '') {
            $like = '%'.addcslashes($coupon, '%_\\').'%';
            $query->where('coupon_code', 'like', $like);
        }

        $orders = $query->get();
        $phonesOnPage = $orders
            ->map(fn (Order $order) => PhoneNumber::normalize($order->customer_phone))
            ->filter(fn (string $phone) => $phone !== '')
            ->unique()
            ->values()
            ->all();
        $completedByPhone = $this->completedOrdersForPhones($phonesOnPage);
        $notesByPhone = $this->adminNotesForPhones($phonesOnPage);

        $payload = $orders->map(function (Order $order) use ($completedByPhone, $notesByPhone) {
            $data = $order->toArray();
            $data['past_completed_orders'] = $this->pastCompletedOrdersFor($order, $completedByPhone);
            $data['prior_admin_notes'] = $this->priorAdminNotesFor($order, $notesByPhone);

            return $data;
        });

        return response()->json($payload);
    }

    /**
     * Calendar window for the admin order list.
     * Last week and last month are the previous period, not the current one.
     * Weeks run Monday through Sunday.
     *
     * @return array{0: Carbon, 1: Carbon}
     */
    private function orderListDateBounds(string $dateFilter): array
    {
        $now = now();

        return match ($dateFilter) {
            'yesterday' => [
                $now->copy()->subDay()->startOfDay(),
                $now->copy()->subDay()->endOfDay(),
            ],
            'this_week' => [
                $now->copy()->startOfWeek(Carbon::MONDAY)->startOfDay(),
                $now->copy()->endOfWeek(Carbon::SUNDAY)->endOfDay(),
            ],
            'last_week' => [
                $now->copy()->subWeek()->startOfWeek(Carbon::MONDAY)->startOfDay(),
                $now->copy()->subWeek()->endOfWeek(Carbon::SUNDAY)->endOfDay(),
            ],
            'this_month' => [
                $now->copy()->startOfMonth()->startOfDay(),
                $now->copy()->endOfMonth()->endOfDay(),
            ],
            'last_month' => [
                $now->copy()->subMonthNoOverflow()->startOfMonth()->startOfDay(),
                $now->copy()->subMonthNoOverflow()->endOfMonth()->endOfDay(),
            ],
            default => [
                $now->copy()->startOfDay(),
                $now->copy()->endOfDay(),
            ],
        };
    }

    /**
     * Completed orders for the phones already on this result list.
     *
     * @param  list<string>  $normalizedPhones
     * @return array<string, list<Order>>
     */
    private function completedOrdersForPhones(array $normalizedPhones): array
    {
        $phones = array_values(array_unique(array_filter(
            $normalizedPhones,
            fn ($phone) => is_string($phone) && $phone !== ''
        )));

        if ($phones === []) {
            return [];
        }

        $phoneKey = "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(customer_phone, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '')";
        $placeholders = implode(',', array_fill(0, count($phones), '?'));

        $grouped = [];
        Order::query()
            ->where('status', 'completed')
            ->whereNotNull('customer_phone')
            ->whereRaw("{$phoneKey} IN ({$placeholders})", $phones)
            ->get(['id', 'customer_phone', 'created_at'])
            ->each(function (Order $row) use (&$grouped) {
                $key = PhoneNumber::normalize($row->customer_phone);
                if ($key === '') {
                    return;
                }
                $grouped[$key][] = $row;
            });

        return $grouped;
    }

    /**
     * Completed orders for this phone that were placed before this order.
     *
     * @param  array<string, list<Order>>  $completedByPhone
     */
    private function pastCompletedOrdersFor(Order $order, array $completedByPhone): int
    {
        $key = PhoneNumber::normalize($order->customer_phone);
        if ($key === '' || $order->created_at === null) {
            return 0;
        }

        $count = 0;
        foreach ($completedByPhone[$key] ?? [] as $earlier) {
            if ($earlier->id === $order->id || $earlier->created_at === null) {
                continue;
            }
            if ($earlier->created_at->lt($order->created_at) || ($earlier->created_at->equalTo($order->created_at) && $earlier->id < $order->id)) {
                $count++;
            }
        }

        return $count;
    }

    /**
     * Orders that already have a staff note, for the phones on this list.
     *
     * @param  list<string>  $normalizedPhones
     * @return array<string, list<Order>>
     */
    private function adminNotesForPhones(array $normalizedPhones): array
    {
        $phones = array_values(array_unique(array_filter(
            $normalizedPhones,
            fn ($phone) => is_string($phone) && $phone !== ''
        )));

        if ($phones === []) {
            return [];
        }

        $phoneKey = "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(customer_phone, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '')";
        $placeholders = implode(',', array_fill(0, count($phones), '?'));

        $grouped = [];
        Order::query()
            ->whereNotNull('admin_note')
            ->where('admin_note', '!=', '')
            ->whereNotNull('customer_phone')
            ->whereRaw("{$phoneKey} IN ({$placeholders})", $phones)
            ->get(['id', 'customer_phone', 'admin_note', 'created_at'])
            ->each(function (Order $row) use (&$grouped) {
                $key = PhoneNumber::normalize($row->customer_phone);
                if ($key === '') {
                    return;
                }
                $grouped[$key][] = $row;
            });

        return $grouped;
    }

    /**
     * Staff notes from earlier orders with this phone.
     *
     * @param  array<string, list<Order>>  $notesByPhone
     * @return list<array{order_id: int, note: string}>
     */
    private function priorAdminNotesFor(Order $order, array $notesByPhone): array
    {
        $key = PhoneNumber::normalize($order->customer_phone);
        if ($key === '' || $order->created_at === null) {
            return [];
        }

        $notes = [];
        foreach ($notesByPhone[$key] ?? [] as $earlier) {
            $note = trim((string) $earlier->admin_note);
            if ($note === '' || $earlier->id === $order->id || $earlier->created_at === null) {
                continue;
            }
            $isEarlier = $earlier->created_at->lt($order->created_at)
                || ($earlier->created_at->equalTo($order->created_at) && $earlier->id < $order->id);
            if (! $isEarlier) {
                continue;
            }
            $notes[] = [
                'order_id' => $earlier->id,
                'note' => $note,
            ];
        }

        return $notes;
    }

    public function dashboardStats(Request $request): JsonResponse
    {
        $request->validate([
            'date_filter' => ['sometimes', 'nullable', Rule::in(['last_week', 'last_month', 'custom'])],
            'from_date' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'to_date' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
        ]);

        $user = $request->user();
        $isManager = $user?->role === 'manager';

        $periodQuery = Order::query();
        $todayStart = now()->startOfDay();
        $todayEnd = now()->endOfDay();

        $periodLabel = "Today's Statistics";
        $periodFilter = 'today';

        if ($isManager) {
            $periodQuery->whereBetween('created_at', [$todayStart, $todayEnd]);
        } else {
            $dateFilter = $request->query('date_filter');
            $dateFilter = is_string($dateFilter) ? trim($dateFilter) : '';

            if ($dateFilter === 'last_week') {
                $periodFilter = 'last_week';
                $periodLabel = 'Last 7 Days';
                $periodQuery->where('created_at', '>=', now()->subDays(7));
            } elseif ($dateFilter === 'last_month') {
                $periodFilter = 'last_month';
                $periodLabel = 'Last 30 Days';
                $periodQuery->where('created_at', '>=', now()->subDays(30));
            } elseif ($dateFilter === 'custom') {
                $fromDate = $request->query('from_date');
                $toDate = $request->query('to_date');

                if (! is_string($fromDate) || ! is_string($toDate) || trim($fromDate) === '' || trim($toDate) === '') {
                    return response()->json([
                        'message' => 'Custom date filter requires both from and to dates.',
                    ], 422);
                }

                if ($fromDate > $toDate) {
                    return response()->json([
                        'message' => 'From date must be before or equal to to date.',
                    ], 422);
                }

                $periodFilter = 'custom';
                $periodLabel = sprintf('Custom Range (%s to %s)', $fromDate, $toDate);
                $periodQuery->whereBetween('created_at', [
                    $fromDate.' 00:00:00',
                    $toDate.' 23:59:59',
                ]);
            } else {
                $periodQuery->whereBetween('created_at', [$todayStart, $todayEnd]);
            }
        }

        $periodOrders = $periodQuery->get(['status', 'subtotal', 'total']);
        $todayOrders = Order::query()
            ->whereBetween('created_at', [$todayStart, $todayEnd])
            ->get(['subtotal', 'total']);

        $sumSubtotal = static fn ($orders) => (float) $orders->sum('subtotal');
        $sumTotal = static fn ($orders) => (float) $orders->sum('total');

        return response()->json([
            'scope_role' => $isManager ? 'manager' : 'admin',
            'period_filter' => $periodFilter,
            'period_label' => $periodLabel,
            'overview' => [
                'total_orders' => $periodOrders->count(),
                'completed_orders' => $periodOrders->where('status', 'completed')->count(),
                'preparing_orders' => $periodOrders->where('status', 'preparing')->count(),
                'pending_orders' => $periodOrders->where('status', 'pending')->count(),
            ],
            'today' => [
                'orders' => $todayOrders->count(),
                'sales_without_tax' => $sumSubtotal($todayOrders),
                'sales_with_tax' => $sumTotal($todayOrders),
                'date_label' => now()->format('M d, Y'),
            ],
            'period' => [
                'orders' => $periodOrders->count(),
                'sales_without_tax' => $sumSubtotal($periodOrders),
                'sales_with_tax' => $sumTotal($periodOrders),
            ],
        ]);
    }

    public function myOrders(Request $request): JsonResponse
    {
        $orders = Order::query()
            ->with(self::ORDER_WITH)
            ->where('user_id', $request->user()->id)
            ->latest()
            ->get()
            ->map(function (Order $order) {
                $data = $order->toArray();
                unset($data['admin_note']);

                return $data;
            });

        return response()->json($orders);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'order_type' => ['required', 'in:pickup,delivery'],
            'location_id' => ['nullable', 'integer', 'exists:locations,id'],
            'delivery_address' => ['nullable', 'string', 'max:255'],
            'delivery_postal_code' => ['nullable', 'string', 'max:32'],
            'subtotal' => ['required', 'numeric', 'min:0'],
            'tax' => ['required', 'numeric', 'min:0'],
            'total' => ['required', 'numeric', 'min:0'],
            'customer_name' => ['required', 'string', 'max:255'],
            'customer_email' => ['required', 'email'],
            'customer_phone' => ['required', 'string', 'max:30'],
            'coupon_code' => ['nullable', 'string', 'max:100'],
            'coupon_discount' => ['nullable', 'numeric', 'min:0'],
            'offer_discount' => ['nullable', 'numeric', 'min:0'],
            'items' => ['sometimes', 'array'],
            'items.*.menu_item_id' => ['required_with:items', 'integer', 'exists:menu_items,id'],
            'items.*.quantity' => ['required_with:items', 'integer', 'min:1'],
            'items.*.unit_price' => ['required_with:items', 'numeric', 'min:0'],
            'items.*.line_total' => ['required_with:items', 'numeric', 'min:0'],
            'items.*.special_instructions' => ['nullable', 'string', 'max:255'],
            'items.*.offer_title' => ['nullable', 'string', 'max:255'],
            'items.*.offer_discount' => ['nullable', 'numeric', 'min:0'],
            'items.*.options' => ['sometimes', 'array'],
            'items.*.options.*.option_group_id' => ['required_with:items.*.options', 'integer', 'exists:option_groups,id'],
            'items.*.options.*.option_id' => ['required_with:items.*.options', 'integer', 'exists:options,id'],
            'items.*.options.*.option_price' => ['nullable', 'numeric', 'min:0'],
        ]);

        $user = auth('sanctum')->user();

        if ($user) {
            $userId = $user->id;
        } else {
            // Guest checkout: require a plausible phone number only. OTP / verified_phones can be enforced again later.
            $normalized = PhoneNumber::normalize($data['customer_phone']);
            if (strlen($normalized) < 10) {
                return response()->json([
                    'message' => 'Please enter a valid phone number.',
                ], 422);
            }
            $userId = null;
        }

        $deliveryZonesActive = DeliveryPostalCode::query()->where('active', true)->exists();

        if ($data['order_type'] === 'delivery') {
            if (! $deliveryZonesActive) {
                return response()->json([
                    'message' => 'Delivery is not available.',
                ], 422);
            }

            if (empty(trim((string) ($data['delivery_address'] ?? '')))) {
                return response()->json([
                    'message' => 'Please enter a delivery address.',
                ], 422);
            }

            if (empty(trim((string) ($data['delivery_postal_code'] ?? '')))) {
                return response()->json([
                    'message' => 'Please enter a postal code.',
                ], 422);
            }

            $normalizedPostal = DeliveryPostalCode::normalizeCode($data['delivery_postal_code']);
            if (! DeliveryPostalCode::query()
                ->where('active', true)
                ->where('code', $normalizedPostal)
                ->exists()) {
                return response()->json([
                    'message' => 'No delivery available in your area.',
                ], 422);
            }

            $data['delivery_postal_code'] = $normalizedPostal;
        } else {
            $data['delivery_address'] = null;
            $data['delivery_postal_code'] = null;
        }

        $couponCode = isset($data['coupon_code']) ? trim((string) $data['coupon_code']) : '';
        if ($couponCode !== '' && CouponPhoneUse::alreadyUsed($couponCode, $data['customer_phone'])) {
            return response()->json([
                'message' => 'This phone number has already used this coupon.',
            ], 422);
        }

        $items = $data['items'] ?? [];
        unset($data['items']);

        $order = DB::transaction(function () use ($data, $items, $userId) {
            $order = Order::create([
                ...$data,
                'user_id' => $userId,
                'status' => 'pending',
                'coupon_discount' => $data['coupon_discount'] ?? 0,
                'offer_discount' => $data['offer_discount'] ?? 0,
            ]);

            foreach ($items as $item) {
                $orderItem = OrderItem::query()->create([
                    'order_id' => $order->id,
                    'menu_item_id' => $item['menu_item_id'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'line_total' => $item['line_total'],
                    'special_instructions' => $item['special_instructions'] ?? null,
                    'offer_title' => $item['offer_title'] ?? null,
                    'offer_discount' => $item['offer_discount'] ?? 0,
                ]);

                foreach (($item['options'] ?? []) as $selectedOption) {
                    $orderItem->options()->create([
                        'option_group_id' => $selectedOption['option_group_id'],
                        'option_id' => $selectedOption['option_id'],
                        'option_price' => $selectedOption['option_price'] ?? 0,
                    ]);
                }
            }

            return $order->load(self::ORDER_WITH);
        });

        return response()->json($order, 201);
    }

    public function updateStatus(Request $request, Order $order): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'in:pending,confirmed,preparing,ready,completed,cancelled'],
        ]);

        $order->update(['status' => $data['status']]);

        return response()->json($order->fresh()->load(self::ORDER_WITH));
    }

    public function updateNote(Request $request, Order $order): JsonResponse
    {
        $data = $request->validate([
            'admin_note' => ['nullable', 'string', 'max:2000'],
        ]);

        $note = trim((string) ($data['admin_note'] ?? ''));
        $order->update(['admin_note' => $note === '' ? null : $note]);

        return response()->json($order->fresh()->load(self::ORDER_WITH));
    }
}
