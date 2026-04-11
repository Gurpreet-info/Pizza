<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderItemOption extends Model
{
    protected $fillable = [
        'order_item_id',
        'option_group_id',
        'option_id',
        'option_price',
    ];

    public function orderItem(): BelongsTo
    {
        return $this->belongsTo(OrderItem::class);
    }

    public function optionGroup(): BelongsTo
    {
        return $this->belongsTo(OptionGroup::class);
    }

    public function option(): BelongsTo
    {
        return $this->belongsTo(Option::class);
    }
}
