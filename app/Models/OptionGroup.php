<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class OptionGroup extends Model
{
    protected $fillable = [
        'name',
        'type',
        'required',
        'min_selections',
        'max_selections',
        'allow_repeat_selections',
        'display_order',
    ];

    protected $casts = [
        'required' => 'boolean',
        'allow_repeat_selections' => 'boolean',
    ];

    public function menuItems(): BelongsToMany
    {
        return $this->belongsToMany(MenuItem::class, 'menu_item_option_group')
            ->withPivot('display_order')
            ->withTimestamps();
    }

    public function options(): BelongsToMany
    {
        return $this->belongsToMany(
            Option::class,
            'option_group_option',
            'option_group_id',
            'option_id',
        )->withTimestamps();
    }
}
