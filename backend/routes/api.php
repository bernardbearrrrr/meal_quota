<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\MealController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware(['auth:sanctum', 'role:admin'])->group(function () {
    Route::get('/admin/employees', [AdminController::class, 'indexEmployees']);
    Route::post('/admin/employees', [AdminController::class, 'storeEmployee']);
    Route::post('/admin/employees/{employee}/resend-barcode', [AdminController::class, 'resendBarcode']);
});

Route::middleware(['auth:sanctum', 'role:operator'])->group(function () {
    Route::get('/meals/logs', [MealController::class, 'indexLogs']);
    Route::post('/meals/verify', [MealController::class, 'verify'])
        ->middleware('throttle:60,1');
});
