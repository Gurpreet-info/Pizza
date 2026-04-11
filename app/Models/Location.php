<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Location extends Model
{
    protected $fillable = [
        'name',
        'address',
        'phone',
        'hours',
        'timing',
        'opens_at',
        'closes_at',
        'store_status_mode',
        'image',
    ];

    protected function casts(): array
    {
        return [];
    }
}

