<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('image')->nullable();
            $table->unsignedInteger('display_order')->default(0);
            $table->timestamps();
        });

        Schema::create('menu_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->decimal('base_price', 10, 2);
            $table->string('image')->nullable();
            $table->boolean('available')->default(true);
            $table->timestamps();
        });

        Schema::create('option_groups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('menu_item_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->enum('type', ['single', 'multiple'])->default('single');
            $table->boolean('required')->default(false);
            $table->unsignedInteger('min_selections')->nullable();
            $table->unsignedInteger('max_selections')->nullable();
            $table->timestamps();
        });

        Schema::create('options', function (Blueprint $table) {
            $table->id();
            $table->foreignId('option_group_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->decimal('price', 10, 2)->default(0);
            $table->timestamps();
        });

        Schema::create('locations', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('address');
            $table->string('phone', 30);
            $table->string('hours')->nullable();
            $table->string('image')->nullable();
            $table->timestamps();
        });

        Schema::create('coupons', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('description');
            $table->enum('discount_type', ['percentage', 'fixed']);
            $table->decimal('discount_value', 10, 2);
            $table->decimal('min_order_amount', 10, 2)->default(0);
            $table->decimal('max_discount', 10, 2)->nullable();
            $table->dateTime('valid_from');
            $table->dateTime('valid_until');
            $table->unsignedInteger('usage_limit')->default(100);
            $table->unsignedInteger('usage_count')->default(0);
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('offers', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('image')->nullable();
            $table->enum('discount_type', ['percentage', 'fixed']);
            $table->decimal('discount_value', 10, 2);
            $table->dateTime('valid_from');
            $table->dateTime('valid_until');
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('offer_menu_item', function (Blueprint $table) {
            $table->id();
            $table->foreignId('offer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('menu_item_id')->constrained()->cascadeOnDelete();
            $table->unique(['offer_id', 'menu_item_id']);
        });

        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->enum('order_type', ['pickup', 'delivery']);
            $table->foreignId('location_id')->nullable()->constrained()->nullOnDelete();
            $table->string('delivery_address')->nullable();
            $table->enum('status', ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'])->default('pending');
            $table->decimal('subtotal', 10, 2);
            $table->decimal('tax', 10, 2)->default(0);
            $table->decimal('total', 10, 2);
            $table->string('customer_name');
            $table->string('customer_email');
            $table->string('customer_phone', 30);
            $table->string('coupon_code')->nullable();
            $table->decimal('coupon_discount', 10, 2)->default(0);
            $table->decimal('offer_discount', 10, 2)->default(0);
            $table->timestamps();
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('menu_item_id')->constrained()->restrictOnDelete();
            $table->unsignedInteger('quantity')->default(1);
            $table->decimal('unit_price', 10, 2);
            $table->decimal('line_total', 10, 2);
            $table->string('special_instructions')->nullable();
            $table->string('offer_title')->nullable();
            $table->decimal('offer_discount', 10, 2)->default(0);
            $table->timestamps();
        });

        Schema::create('order_item_options', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_item_id')->constrained()->cascadeOnDelete();
            $table->foreignId('option_group_id')->constrained()->restrictOnDelete();
            $table->foreignId('option_id')->constrained()->restrictOnDelete();
            $table->decimal('option_price', 10, 2)->default(0);
            $table->timestamps();
        });

        Schema::create('otp_verifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('phone', 30);
            $table->string('code');
            $table->dateTime('expires_at');
            $table->dateTime('verified_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('otp_verifications');
        Schema::dropIfExists('order_item_options');
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('offer_menu_item');
        Schema::dropIfExists('offers');
        Schema::dropIfExists('coupons');
        Schema::dropIfExists('locations');
        Schema::dropIfExists('options');
        Schema::dropIfExists('option_groups');
        Schema::dropIfExists('menu_items');
        Schema::dropIfExists('categories');
    }
};

