<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('category_menu_item', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained()->cascadeOnDelete();
            $table->foreignId('menu_item_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['category_id', 'menu_item_id']);
        });

        if (Schema::hasColumn('menu_items', 'category_id')) {
            $rows = DB::table('menu_items')
                ->whereNotNull('category_id')
                ->orderBy('id')
                ->get(['id', 'category_id']);

            foreach ($rows as $row) {
                DB::table('category_menu_item')->insertOrIgnore([
                    'category_id' => $row->category_id,
                    'menu_item_id' => $row->id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            Schema::table('menu_items', function (Blueprint $table) {
                $table->dropForeign(['category_id']);
                $table->dropColumn('category_id');
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasColumn('menu_items', 'category_id')) {
            Schema::table('menu_items', function (Blueprint $table) {
                $table->foreignId('category_id')->nullable()->after('id');
            });

            $pivot = DB::table('category_menu_item')
                ->orderBy('menu_item_id')
                ->orderBy('id')
                ->get();

            $seen = [];
            foreach ($pivot as $row) {
                if (isset($seen[$row->menu_item_id])) {
                    continue;
                }
                $seen[$row->menu_item_id] = true;
                DB::table('menu_items')
                    ->where('id', $row->menu_item_id)
                    ->update(['category_id' => $row->category_id]);
            }

            Schema::table('menu_items', function (Blueprint $table) {
                $table->unsignedBigInteger('category_id')->nullable(false)->change();
                $table->foreign('category_id')->references('id')->on('categories')->cascadeOnDelete();
            });
        }

        Schema::dropIfExists('category_menu_item');
    }
};
