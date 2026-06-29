<?php

namespace App\Http\Middleware;

use App\Models\SystemSetting;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckMaintenanceMode
{
    /**
     * Block the API with HTTP 503 when maintenance mode is on, except for IT
     * and auth routes so IT can still log in and disable maintenance.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->is('api/v1/it/*') || $request->is('api/v1/auth/*')) {
            return $next($request);
        }

        try {
            $maintenance = SystemSetting::getValue('maintenance_mode', false);
        } catch (\Throwable) {
            return $next($request);
        }

        if ($maintenance === true) {
            return response()->json([
                'message' => 'MAINTENANCE',
            ], 503);
        }

        return $next($request);
    }
}
