<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Model;

class Offer extends Model
{
    protected $fillable = [
        'title',
        'description',
        'image',
        'discount_type',
        'discount_value',
        'offer_kind',
        'min_spend',
        'reward_menu_item_id',
        'spend_reward_type',
        'spend_reward_percent',
        'spend_reward_fixed',
        'show_on_slider',
        'valid_from',
        'valid_until',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'valid_from' => 'datetime',
            'valid_until' => 'datetime',
            'active' => 'boolean',
            'show_on_slider' => 'boolean',
            'min_spend' => 'decimal:2',
            'spend_reward_percent' => 'decimal:2',
            'spend_reward_fixed' => 'decimal:2',
        ];
    }

    public function menuItems(): BelongsToMany
    {
        return $this->belongsToMany(
            MenuItem::class,
            'offer_menu_item',
            'offer_id',
            'menu_item_id',
        );
    }

    /** For offer_kind bogo_any only: items that can be discounted as the “free” side. */
    public function bogoFreeMenuItems(): BelongsToMany
    {
        return $this->belongsToMany(
            MenuItem::class,
            'offer_bogo_free_menu_item',
            'offer_id',
            'menu_item_id',
        );
    }

    public function rewardMenuItem(): BelongsTo
    {
        return $this->belongsTo(MenuItem::class, 'reward_menu_item_id');
    }
}

