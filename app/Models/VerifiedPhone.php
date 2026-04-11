<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VerifiedPhone extends Model
{
    protected $fillable = ['phone', 'verified_at'];

    protected function casts(): array
    {
        return ['verified_at' => 'datetime'];
    }
}
