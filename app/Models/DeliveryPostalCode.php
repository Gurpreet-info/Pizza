<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DeliveryPostalCode extends Model
{
    protected $fillable = [
        'code',
        'label',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
        ];
    }

    /**
     * Normalize postal / ZIP input for comparison (strip spaces/symbols, uppercase).
     */
    public static function normalizeCode(string $input): string
    {
        return strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $input) ?? '');
    }
}
