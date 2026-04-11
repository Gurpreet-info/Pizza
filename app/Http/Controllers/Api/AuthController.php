<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OtpVerification;
use App\Models\User;
use App\Models\VerifiedPhone;
use App\Support\PhoneNumber;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'phone' => ['required', 'string', 'max:30', 'unique:users,phone'],
            'password' => ['required', 'string', 'min:6', 'confirmed'],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'],
            'role' => 'user',
            'password' => Hash::make($data['password']),
        ]);

        return response()->json([
            'user' => $user,
            'token' => $user->createToken('api')->plainTextToken,
        ], 201);
    }

    /**
     * After OTP-verified checkout: create a user with a random password, or log in if email + phone already match one account.
     */
    public function checkoutAccount(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email'],
            'phone' => ['required', 'string', 'max:30'],
        ]);

        $email = strtolower(trim($data['email']));
        $phoneNorm = PhoneNumber::normalize($data['phone']);

        if (strlen($phoneNorm) < 10) {
            return response()->json(['message' => 'Please enter a valid phone number.'], 422);
        }

        $userByEmail = User::query()
            ->whereRaw('LOWER(TRIM(email)) = ?', [$email])
            ->first();

        if ($userByEmail !== null) {
            if (PhoneNumber::normalize($userByEmail->phone) === $phoneNorm) {
                return response()->json([
                    'user' => $userByEmail,
                    'token' => $userByEmail->createToken('api')->plainTextToken,
                    'generated_password' => null,
                ]);
            }

            return response()->json([
                'message' => 'An account with this email is already registered with a different phone number. Sign in or use the phone from that account.',
            ], 422);
        }

        $userByPhone = User::query()
            ->whereRaw(
                "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(phone, ''), ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') = ?",
                [$phoneNorm]
            )
            ->first();

        if ($userByPhone !== null) {
            return response()->json([
                'message' => 'This phone number is already registered with a different email. Sign in or use the email on that account.',
            ], 422);
        }

        $plain = Str::password(12, true, true, false, false);

        $user = User::create([
            'name' => trim($data['name']),
            'email' => $email,
            'phone' => trim($data['phone']),
            'role' => 'user',
            'password' => $plain,
        ]);

        return response()->json([
            'user' => $user,
            'token' => $user->createToken('api')->plainTextToken,
            'generated_password' => $plain,
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::query()->where('email', $data['email'])->first();
        if (! $user || ! Hash::check($data['password'], $user->password)) {
            return response()->json(['message' => 'Invalid credentials'], 422);
        }

        return response()->json([
            'user' => $user,
            'token' => $user->createToken('api')->plainTextToken,
        ]);
    }

    public function loginByPhone(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone' => ['required', 'string', 'max:30'],
        ]);

        $normalized = PhoneNumber::normalize($data['phone']);
        if (strlen($normalized) < 10) {
            return response()->json(['message' => 'Please enter a valid phone number.'], 422);
        }

        $trusted = VerifiedPhone::query()->where('phone', $normalized)->exists();
        if (! $trusted) {
            return response()->json(['message' => 'Phone is not verified yet.'], 422);
        }

        $user = User::query()
            ->whereRaw(
                "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(phone, ''), ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') = ?",
                [$normalized]
            )
            ->first();

        if (! $user) {
            return response()->json(['message' => 'No account found with this phone number.'], 422);
        }

        if (! $user->phone_verified_at) {
            $user->update(['phone_verified_at' => now()]);
        }

        return response()->json([
            'user' => $user,
            'token' => $user->createToken('api')->plainTextToken,
        ]);
    }

    /**
     * After email OTP verification (forgot password flow): issue token when a code was verified recently.
     */
    public function loginByEmailOtp(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $email = strtolower(trim($data['email']));

        $verifiedRecently = OtpVerification::query()
            ->whereRaw('LOWER(TRIM(email)) = ?', [$email])
            ->whereNotNull('verified_at')
            ->where('verified_at', '>=', now()->subMinutes(15))
            ->exists();

        if (! $verifiedRecently) {
            return response()->json(['message' => 'Please verify the code sent to your email first.'], 422);
        }

        $user = User::query()
            ->whereRaw('LOWER(TRIM(email)) = ?', [$email])
            ->first();

        if (! $user) {
            return response()->json(['message' => 'No account found with this email.'], 422);
        }

        return response()->json([
            'user' => $user,
            'token' => $user->createToken('api')->plainTextToken,
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json($request->user());
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();
        return response()->json(['message' => 'Logged out']);
    }
}

