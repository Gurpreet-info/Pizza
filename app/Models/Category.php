<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Category extends Model
{
    protected $fillable = ['name', 'description', 'image', 'display_order'];

    public function menuItems(): BelongsToMany
    {
        return $this->belongsToMany(
            MenuItem::class,
            'category_menu_item',
            'category_id',
            'menu_item_id',
        )->withTimestamps();
    }
}
