<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('locations', function (Blueprint $table) {
            $table->string('timing', 255)->nullable();
            $table->boolean('show_special_note')->default(false);
            $table->string('special_note', 255)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('locations', function (Blueprint $table) {
            $table->dropColumn(['timing', 'show_special_note', 'special_note']);
        });
    }
};

