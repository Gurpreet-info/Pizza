<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Option extends Model
{
    protected $fillable = ['option_group_id', 'name', 'price', 'active'];

    protected $casts = [
        'price' => 'decimal:2',
        'active' => 'boolean',
    ];

    public function optionGroup(): BelongsTo
    {
        return $this->belongsTo(OptionGroup::class);
    }
}
