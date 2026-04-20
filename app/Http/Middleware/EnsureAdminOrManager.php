<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdminOrManager
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! in_array($user->role, ['admin', 'manager'], true)) {
            return response()->json([
                'message' => 'Forbidden: admin or manager access required.',
            ], 403);
        }

        return $next($request);
    }
}

