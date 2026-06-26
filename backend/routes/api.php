<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BarcodeController;
use App\Http\Controllers\MealController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/login', [AuthController::class, 'login'])
    ->middleware('throttle:5,1');
Route::post('/auth/logout', [AuthController::class, 'logout'])
    ->middleware('auth:sanctum');
Route::get('/barcodes/{uid}.png', [BarcodeController::class, 'show'])
    ->where('uid', '[A-Z0-9-]+')
    ->middleware('throttle:30,1');

Route::middleware(['auth:sanctum', 'role:admin'])->group(function () {
    Route::get('/admin/employees', [AdminController::class, 'indexEmployees']);
    Route::post('/admin/employees', [AdminController::class, 'storeEmployee']);
    Route::post('/admin/employees/bulk', [AdminController::class, 'bulkStore']);
    Route::patch('/admin/employees/{employee}', [AdminController::class, 'update']);
    Route::patch('/admin/employees/{employee}/quota', [AdminController::class, 'updateQuota']);
    Route::patch('/admin/employees/{employee}/status', [AdminController::class, 'updateStatus']);
    Route::patch('/admin/employees/{employee}/reset-barcode', [AdminController::class, 'resetBarcode']);

    Route::get('/admin/meal-logs', [MealController::class, 'indexLogs']);
    Route::get('/admin/analytics', [AdminController::class, 'analytics']);
    Route::get('/admin/reports', [AdminController::class, 'report']);
});

Route::middleware(['auth:sanctum', 'role:operator'])->group(function () {
    Route::get('/meals/logs', [MealController::class, 'indexLogs']);
    Route::post('/meals/verify', [MealController::class, 'verify'])
        ->middleware('throttle:60,1');
});
