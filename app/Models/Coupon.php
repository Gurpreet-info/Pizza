<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Coupon extends Model
{
    protected $fillable = [
        'code', 'description', 'discount_type', 'discount_value', 'min_order_amount',
        'max_discount', 'valid_from', 'valid_until', 'usage_limit', 'usage_count', 'active',
    ];

    protected function casts(): array
    {
        return ['valid_from' => 'datetime', 'valid_until' => 'datetime', 'active' => 'boolean'];
    }
}

