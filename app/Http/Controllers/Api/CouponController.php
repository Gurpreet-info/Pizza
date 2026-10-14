<?php

namespace App\Http\Controllers\Api;

use App\Models\Coupon;
use App\Support\CouponPhoneUse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CouponController extends BaseCrudController
{
    protected function modelClass(): string
    {
        return Coupon::class;
    }

    protected function rules(bool $isUpdate = false): array
    {
        return [
            'code' => [$isUpdate ? 'sometimes' : 'required', 'string', 'max:100'],
            'description' => [$isUpdate ? 'sometimes' : 'required', 'string', 'max:255'],
            'discount_type' => [$isUpdate ? 'sometimes' : 'required', 'in:percentage,fixed'],
            'discount_value' => [$isUpdate ? 'sometimes' : 'required', 'numeric', 'min:0'],
            'min_order_amount' => ['nullable', 'numeric', 'min:0'],
            'max_discount' => ['nullable', 'numeric', 'min:0'],
            'valid_from' => [$isUpdate ? 'sometimes' : 'required', 'date'],
            'valid_until' => [$isUpdate ? 'sometimes' : 'required', 'date', 'after_or_equal:valid_from'],
            'usage_limit' => ['nullable', 'integer', 'min:1'],
            'usage_count' => ['nullable', 'integer', 'min:0'],
            'active' => ['nullable', 'boolean'],
            'popup_pages' => ['nullable', 'array'],
            'popup_pages.*' => ['string', Rule::in(['home', 'menu', 'cart', 'checkout', 'offers', 'coupons', 'locations', 'about', 'privacy'])],
        ];
    }

    public function validateCode(Request $request, string $code): JsonResponse
    {
        $coupon = Coupon::query()->whereRaw('UPPER(code) = ?', [strtoupper($code)])->first();
        if (! $coupon) {
            return response()->json(['valid' => false, 'message' => 'Invalid coupon code']);
        }

        $phone = $request->query('phone');
        if (is_string($phone) && trim($phone) !== '' && CouponPhoneUse::alreadyUsed($code, $phone)) {
            return response()->json([
                'valid' => false,
                'message' => 'This phone number has already used this coupon.',
            ]);
        }

        return response()->json(['valid' => true, 'coupon' => $coupon]);
    }
}

