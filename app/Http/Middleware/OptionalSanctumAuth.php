<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

class OptionalSanctumAuth
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->bearerToken()) {
            $accessToken = PersonalAccessToken::findToken($request->bearerToken());
            if ($accessToken && $accessToken->tokenable) {
                auth()->guard('sanctum')->setUser($accessToken->tokenable);
            }
        }

        return $next($request);
    }
}
