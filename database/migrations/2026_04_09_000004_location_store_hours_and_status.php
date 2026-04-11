<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('locations', function (Blueprint $table) {
            $table->string('opens_at', 5)->nullable()->after('timing');
            $table->string('closes_at', 5)->nullable()->after('opens_at');
            $table->string('store_status_mode', 20)->default('auto')->after('closes_at');
        });

        Schema::table('locations', function (Blueprint $table) {
            $table->dropColumn(['show_special_note', 'special_note']);
        });
    }

    public function down(): void
    {
        Schema::table('locations', function (Blueprint $table) {
            $table->dropColumn(['opens_at', 'closes_at', 'store_status_mode']);
        });

        Schema::table('locations', function (Blueprint $table) {
            $table->boolean('show_special_note')->default(false);
            $table->string('special_note', 255)->nullable();
        });
    }
};
