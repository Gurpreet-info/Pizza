<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE users MODIFY role ENUM('admin', 'manager', 'user') NOT NULL DEFAULT 'user'");
    }

    public function down(): void
    {
        // Preserve data integrity before narrowing enum choices.
        DB::table('users')->where('role', 'manager')->update(['role' => 'user']);
        DB::statement("ALTER TABLE users MODIFY role ENUM('admin', 'user') NOT NULL DEFAULT 'user'");
    }
};

