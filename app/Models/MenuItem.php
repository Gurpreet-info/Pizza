<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class MenuItem extends Model
{
    protected $fillable = ['category_id', 'name', 'description', 'base_price', 'image', 'available'];

    public function offers(): BelongsToMany
    {
        return $this->belongsToMany(
            Offer::class,
            'offer_menu_item',
            'menu_item_id',
            'offer_id'
        );
    }

    public function bogoFreeOffers(): BelongsToMany
    {
        return $this->belongsToMany(
            Offer::class,
            'offer_bogo_free_menu_item',
            'menu_item_id',
            'offer_id'
        );
    }

    public function rewardInOffers(): HasMany
    {
        return $this->hasMany(Offer::class, 'reward_menu_item_id');
    }

    public function optionGroups(): BelongsToMany
    {
        return $this->belongsToMany(OptionGroup::class, 'menu_item_option_group')
            ->withPivot('display_order')
            ->withTimestamps();
    }
}

