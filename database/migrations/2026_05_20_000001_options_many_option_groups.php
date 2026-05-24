<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('option_group_option', function (Blueprint $table) {
            $table->id();
            $table->foreignId('option_group_id')->constrained()->cascadeOnDelete();
            $table->foreignId('option_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['option_group_id', 'option_id']);
        });

        if (Schema::hasColumn('options', 'option_group_id')) {
            $rows = DB::table('options')
                ->whereNotNull('option_group_id')
                ->orderBy('id')
                ->get(['id', 'option_group_id']);

            foreach ($rows as $row) {
                DB::table('option_group_option')->insertOrIgnore([
                    'option_group_id' => $row->option_group_id,
                    'option_id' => $row->id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            Schema::table('options', function (Blueprint $table) {
                $table->dropForeign(['option_group_id']);
                $table->dropColumn('option_group_id');
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasColumn('options', 'option_group_id')) {
            Schema::table('options', function (Blueprint $table) {
                $table->foreignId('option_group_id')->nullable()->after('id');
            });

            $pivot = DB::table('option_group_option')
                ->orderBy('option_id')
                ->orderBy('id')
                ->get();

            $seen = [];
            foreach ($pivot as $row) {
                if (isset($seen[$row->option_id])) {
                    continue;
                }
                $seen[$row->option_id] = true;
                DB::table('options')
                    ->where('id', $row->option_id)
                    ->update(['option_group_id' => $row->option_group_id]);
            }

            Schema::table('options', function (Blueprint $table) {
                $table->unsignedBigInteger('option_group_id')->nullable(false)->change();
                $table->foreign('option_group_id')->references('id')->on('option_groups')->cascadeOnDelete();
            });
        }

        Schema::dropIfExists('option_group_option');
    }
};
