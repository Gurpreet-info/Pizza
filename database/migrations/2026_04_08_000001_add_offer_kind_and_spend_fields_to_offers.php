<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('offers', function (Blueprint $table) {
            $table->string('offer_kind', 32)->default('standard');
            $table->decimal('min_spend', 10, 2)->nullable();
            $table->foreignId('reward_menu_item_id')->nullable()->constrained('menu_items')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('offers', function (Blueprint $table) {
            $table->dropForeign(['reward_menu_item_id']);
            $table->dropColumn(['offer_kind', 'min_spend', 'reward_menu_item_id']);
        });
    }
};
