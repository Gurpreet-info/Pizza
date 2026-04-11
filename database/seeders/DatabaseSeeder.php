<?php

namespace Database\Seeders;

use App\Models\DeliveryPostalCode;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::query()->updateOrCreate(
            ['email' => 'admin@restaurant.com'],
            [
                'name' => 'Admin User',
                'phone' => '5550000',
                'role' => 'admin',
                'password' => 'admin123',
            ]
        );

        User::query()->updateOrCreate(
            ['email' => 'user@restaurant.com'],
            [
                'name' => 'Demo User',
                'phone' => '5551111',
                'role' => 'user',
                'password' => 'user12345',
            ]
        );

        foreach ([
            ['M5V3A8', 'Downtown Toronto'],
            ['M6J2Y3', 'West Queen West'],
            ['K1A0A6', 'Parliament Hill'],
        ] as [$code, $label]) {
            DeliveryPostalCode::query()->updateOrCreate(
                ['code' => $code],
                ['label' => $label, 'active' => true]
            );
        }
    }
}
