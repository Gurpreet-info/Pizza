<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('offer_bogo_free_menu_item', function (Blueprint $table) {
            $table->foreignId('offer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('menu_item_id')->constrained()->cascadeOnDelete();
            $table->primary(['offer_id', 'menu_item_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('offer_bogo_free_menu_item');
    }
};
