<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Option extends Model
{
    protected $fillable = ['name', 'price', 'active', 'is_popular'];

    protected $casts = [
        'price' => 'decimal:2',
        'active' => 'boolean',
        'is_popular' => 'boolean',
    ];

    public function optionGroups(): BelongsToMany
    {
        return $this->belongsToMany(
            OptionGroup::class,
            'option_group_option',
            'option_id',
            'option_group_id',
        )->withTimestamps();
    }
}
