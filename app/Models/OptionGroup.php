<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OptionGroup extends Model
{
    protected $fillable = [
        'name',
        'type',
        'required',
        'min_selections',
        'max_selections',
        'display_order',
    ];

    protected $casts = [
        'required' => 'boolean',
    ];

    public function menuItems(): BelongsToMany
    {
        return $this->belongsToMany(MenuItem::class, 'menu_item_option_group')
            ->withPivot('display_order')
            ->withTimestamps();
    }

    public function options(): HasMany
    {
        return $this->hasMany(Option::class);
    }
}
