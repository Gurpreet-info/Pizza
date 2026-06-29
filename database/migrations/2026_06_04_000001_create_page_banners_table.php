<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('page_banners', function (Blueprint $table): void {
            $table->id();
            $table->string('page_key', 80)->unique();
            $table->string('image_url', 1000)->nullable();
            $table->timestamps();
        });

        $now = now();
        $pages = ['home', 'menu', 'offers', 'coupons'];
        $rows = array_map(fn (string $page) => [
            'page_key' => $page,
            'image_url' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ], $pages);

        DB::table('page_banners')->insert($rows);
    }

    public function down(): void
    {
        Schema::dropIfExists('page_banners');
    }
};
