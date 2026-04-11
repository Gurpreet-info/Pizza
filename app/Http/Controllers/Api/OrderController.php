<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DeliveryPostalCode;
use App\Models\Order;
use App\Models\OrderItem;
use App\Support\PhoneNumber;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
        ]);

        $query = Order::query()->with(self::ORDER_WITH)->latest();

        $phone = $request->query('phone');
        if (is_string($phone) && trim($phone) !== '') {
            $normalized = PhoneNumber::normalize($phone);
            if ($normalized !== '') {
                $query->whereRaw(
                    "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(customer_phone, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') LIKE ?",
                    ['%'.$normalized.'%']
                );
            }
        }

        $email = $request->query('email');
        if (is_string($email) && trim($email) !== '') {
            $like = '%'.addcslashes(trim($email), '%_\\').'%';
            $query->where('customer_email', 'like', $like);
        }

        $coupon = $request->query('coupon_code');
        if (is_string($coupon) && trim($coupon) !== '') {
            $like = '%'.addcslashes(trim($coupon), '%_\\').'%';
            $query->where('coupon_code', 'like', $like);
        }

        return response()->json($query->get());
    }

    public function myOrders(Request $request): JsonResponse
    {
        return response()->json(
            Order::query()
                ->with(self::ORDER_WITH)
                ->where('user_id', $request->user()->id)
                ->latest()
                ->get()
        );
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
}
