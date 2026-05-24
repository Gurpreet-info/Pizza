<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('option_groups', function (Blueprint $table) {
            $table->boolean('allow_repeat_selections')->default(false)->after('max_selections');
        });
    }

    public function down(): void
    {
        Schema::table('option_groups', function (Blueprint $table) {
            $table->dropColumn('allow_repeat_selections');
        });
    }
};
