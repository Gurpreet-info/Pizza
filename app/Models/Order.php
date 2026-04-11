<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    protected $fillable = [
        'user_id', 'order_type', 'location_id', 'delivery_address', 'delivery_postal_code', 'status',
        'subtotal', 'tax', 'total', 'customer_name', 'customer_email', 'customer_phone',
        'coupon_code', 'coupon_discount', 'offer_discount',
    ];

    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }
}

