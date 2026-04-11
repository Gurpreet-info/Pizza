<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('otp_verifications', function (Blueprint $table) {
            $table->string('email')->nullable()->after('phone');
        });

        Schema::table('otp_verifications', function (Blueprint $table) {
            $table->string('phone', 30)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('otp_verifications', function (Blueprint $table) {
            $table->dropColumn('email');
        });

        Schema::table('otp_verifications', function (Blueprint $table) {
            $table->string('phone', 30)->nullable(false)->change();
        });
    }
};
