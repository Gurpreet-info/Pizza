<?php

namespace App\Support;

use App\Models\Order;

class CouponPhoneUse
{
    /**
     * True when this phone already has a non-cancelled order with this coupon code.
     */
    public static function alreadyUsed(string $code, string $phone): bool
    {
        $normalizedCode = strtoupper(trim($code));
        $normalizedPhone = PhoneNumber::normalize($phone);
        if ($normalizedCode === '' || $normalizedPhone === '') {
            return false;
        }

        $phoneKey = "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(customer_phone, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '')";

        return Order::query()
            ->whereRaw('UPPER(coupon_code) = ?', [$normalizedCode])
            ->where('status', '!=', 'cancelled')
            ->whereRaw("{$phoneKey} = ?", [$normalizedPhone])
            ->exists();
    }
}
