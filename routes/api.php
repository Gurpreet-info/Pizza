<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\CouponController;
use App\Http\Controllers\Api\DeliveryPostalCodeController;
use App\Http\Controllers\Api\LocationController;
use App\Http\Controllers\Api\MenuItemController;
use App\Http\Controllers\Api\OfferController;
use App\Http\Controllers\Api\OptionController;
use App\Http\Controllers\Api\OptionGroupController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\OtpController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\SeoSettingController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/login-phone', [AuthController::class, 'loginByPhone'])->middleware('throttle:20,1');
Route::post('/auth/login-email-otp', [AuthController::class, 'loginByEmailOtp'])->middleware('throttle:20,1');
Route::post('/auth/checkout-account', [AuthController::class, 'checkoutAccount'])->middleware('throttle:20,1');

Route::middleware(['optional.sanctum', 'throttle:10,1'])->group(function () {
    Route::post('/otp/send', [OtpController::class, 'send']);
});

Route::middleware(['optional.sanctum', 'throttle:30,1'])->group(function () {
    Route::post('/otp/verify', [OtpController::class, 'verify']);
});

Route::middleware(['throttle:120,1'])->group(function () {
    Route::get('/otp/trusted', [OtpController::class, 'trusted']);
});

Route::post('/orders', [OrderController::class, 'store'])->middleware(['optional.sanctum']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::get('/orders/my', [OrderController::class, 'myOrders']);

    Route::middleware('admin_or_manager')->group(function () {
        Route::apiResource('categories', CategoryController::class);
        Route::apiResource('menu-items', MenuItemController::class)->except(['index', 'show']);
        Route::get('/menu-items/without-offers', [MenuItemController::class, 'withoutOffers']);
        Route::apiResource('option-groups', OptionGroupController::class);
        Route::apiResource('options', OptionController::class);
        Route::apiResource('locations', LocationController::class);
        Route::get('/delivery-postal-codes/admin', [DeliveryPostalCodeController::class, 'adminIndex']);
        Route::post('/delivery-postal-codes', [DeliveryPostalCodeController::class, 'store']);
        Route::patch('/delivery-postal-codes/{delivery_postal_code}', [DeliveryPostalCodeController::class, 'update']);
        Route::delete('/delivery-postal-codes/{delivery_postal_code}', [DeliveryPostalCodeController::class, 'destroy']);
        Route::apiResource('coupons', CouponController::class);
        Route::get('/offers/{offer}/menu-items', [OfferController::class, 'attachedMenuItems']);
        Route::get('/offers/{offer}/bogo-free-menu-items', [OfferController::class, 'attachedBogoFreeMenuItems']);
        Route::apiResource('offers', OfferController::class)->except(['index', 'show']);
        Route::get('/orders', [OrderController::class, 'index']);
        Route::get('/orders/dashboard-stats', [OrderController::class, 'dashboardStats']);
        Route::patch('/orders/{order}/status', [OrderController::class, 'updateStatus']);
    });

    Route::middleware('admin')->group(function () {
        Route::apiResource('users', UserController::class)->except(['show']);
        Route::put('/seo-settings', [SeoSettingController::class, 'upsert']);
    });
});

Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/option-groups', [OptionGroupController::class, 'index']);
Route::get('/options', [OptionController::class, 'index']);
Route::get('/coupons', [CouponController::class, 'index']);
Route::get('/menu-items', [MenuItemController::class, 'index']);
Route::get('/menu-items/{menu_item}', [MenuItemController::class, 'show']);
Route::get('/locations', [LocationController::class, 'index']);
Route::get('/delivery-postal-codes', [DeliveryPostalCodeController::class, 'publicIndex']);
Route::get('/offers', [OfferController::class, 'index']);
Route::get('/seo-settings', [SeoSettingController::class, 'index']);
Route::get('/coupons/validate/{code}', [CouponController::class, 'validateCode']);

