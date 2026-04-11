<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('offers', function (Blueprint $table) {
            $table->string('spend_reward_type', 32)->default('free_item')->after('reward_menu_item_id');
            $table->decimal('spend_reward_percent', 5, 2)->nullable()->after('spend_reward_type');
            $table->decimal('spend_reward_fixed', 10, 2)->nullable()->after('spend_reward_percent');
        });
    }

    public function down(): void
    {
        Schema::table('offers', function (Blueprint $table) {
            $table->dropColumn(['spend_reward_type', 'spend_reward_percent', 'spend_reward_fixed']);
        });
    }
};
