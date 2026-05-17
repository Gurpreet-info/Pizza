<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OptionGroup extends Model
{
    protected $fillable = [
        'menu_item_id',
        'name',
        'type',
        'required',
        'min_selections',
        'max_selections',
        'display_order',
    ];
}

