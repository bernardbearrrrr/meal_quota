<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BarcodeController;
use App\Http\Controllers\MealController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/login', [AuthController::class, 'login']);
Route::get('/barcodes/{uid}.png', [BarcodeController::class, 'show'])
    ->where('uid', '[A-Z0-9-]+');

Route::middleware(['auth:sanctum', 'role:admin'])->group(function () {
    Route::get('/admin/employees', [AdminController::class, 'indexEmployees']);
    Route::post('/admin/employees', [AdminController::class, 'storeEmployee']);
    Route::patch('/admin/employees/{employee}/quota', [AdminController::class, 'updateQuota']);

    Route::get('/admin/meal-logs', [MealController::class, 'indexLogs']);
    Route::get('/admin/analytics', [AdminController::class, 'analytics']);
    Route::get('/admin/reports', [AdminController::class, 'report']);
});

Route::middleware(['auth:sanctum', 'role:operator'])->group(function () {
    Route::get('/meals/logs', [MealController::class, 'indexLogs']);
    Route::post('/meals/verify', [MealController::class, 'verify'])
        ->middleware('throttle:60,1');
});
