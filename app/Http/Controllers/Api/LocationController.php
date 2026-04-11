<?php

namespace App\Http\Controllers\Api;

use App\Models\Location;

class LocationController extends BaseCrudController
{
    protected function modelClass(): string
    {
        return Location::class;
    }

    protected function rules(bool $isUpdate = false): array
    {
        return [
            'name' => [$isUpdate ? 'sometimes' : 'required', 'string', 'max:255'],
            'address' => [$isUpdate ? 'sometimes' : 'required', 'string', 'max:255'],
            'phone' => [$isUpdate ? 'sometimes' : 'required', 'string', 'max:30'],
            'hours' => ['nullable', 'string', 'max:255'],
            'timing' => ['nullable', 'string', 'max:255'],
            'opens_at' => ['nullable', 'date_format:H:i'],
            'closes_at' => ['nullable', 'date_format:H:i'],
            'store_status_mode' => ['nullable', 'in:auto,force_open,force_closed'],
            'image' => ['nullable', 'string', 'max:500'],
        ];
    }
}

