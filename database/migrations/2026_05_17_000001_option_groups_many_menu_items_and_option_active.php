<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('menu_item_option_group', function (Blueprint $table) {
            $table->id();
            $table->foreignId('menu_item_id')->constrained()->cascadeOnDelete();
            $table->foreignId('option_group_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['menu_item_id', 'option_group_id']);
        });

        if (Schema::hasColumn('option_groups', 'menu_item_id')) {
            $rows = DB::table('option_groups')
                ->whereNotNull('menu_item_id')
                ->orderBy('id')
                ->get(['id', 'menu_item_id']);

            foreach ($rows as $row) {
                DB::table('menu_item_option_group')->insertOrIgnore([
                    'menu_item_id' => $row->menu_item_id,
                    'option_group_id' => $row->id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            Schema::table('option_groups', function (Blueprint $table) {
                $table->dropForeign(['menu_item_id']);
                $table->dropColumn('menu_item_id');
            });
        }

        Schema::table('options', function (Blueprint $table) {
            $table->boolean('active')->default(true)->after('price');
        });
    }

    public function down(): void
    {
        Schema::table('options', function (Blueprint $table) {
            $table->dropColumn('active');
        });

        if (! Schema::hasColumn('option_groups', 'menu_item_id')) {
            Schema::table('option_groups', function (Blueprint $table) {
                $table->foreignId('menu_item_id')->nullable()->after('id');
            });

            $pivot = DB::table('menu_item_option_group')
                ->orderBy('option_group_id')
                ->orderBy('id')
                ->get();

            $seen = [];
            foreach ($pivot as $row) {
                if (isset($seen[$row->option_group_id])) {
                    continue;
                }
                $seen[$row->option_group_id] = true;
                DB::table('option_groups')
                    ->where('id', $row->option_group_id)
                    ->update(['menu_item_id' => $row->menu_item_id]);
            }

            Schema::table('option_groups', function (Blueprint $table) {
                $table->unsignedBigInteger('menu_item_id')->nullable(false)->change();
                $table->foreign('menu_item_id')->references('id')->on('menu_items')->cascadeOnDelete();
            });
        }

        Schema::dropIfExists('menu_item_option_group');
    }
};
