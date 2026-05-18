<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('menu_item_option_group', function (Blueprint $table) {
            $table->unsignedInteger('display_order')->default(0)->after('option_group_id');
        });

        $rows = DB::table('menu_item_option_group')
            ->join('option_groups', 'option_groups.id', '=', 'menu_item_option_group.option_group_id')
            ->orderBy('menu_item_option_group.menu_item_id')
            ->orderBy('option_groups.display_order')
            ->orderBy('menu_item_option_group.option_group_id')
            ->get([
                'menu_item_option_group.id as pivot_id',
                'menu_item_option_group.menu_item_id',
            ]);

        $orderByMenuItem = [];
        foreach ($rows as $row) {
            $menuItemId = $row->menu_item_id;
            $orderByMenuItem[$menuItemId] = ($orderByMenuItem[$menuItemId] ?? -1) + 1;
            DB::table('menu_item_option_group')
                ->where('id', $row->pivot_id)
                ->update(['display_order' => $orderByMenuItem[$menuItemId]]);
        }
    }

    public function down(): void
    {
        Schema::table('menu_item_option_group', function (Blueprint $table) {
            $table->dropColumn('display_order');
        });
    }
};
