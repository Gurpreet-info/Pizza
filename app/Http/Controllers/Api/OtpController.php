<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\OtpCodeMail;
use App\Models\OtpVerification;
use App\Models\User;
use App\Models\VerifiedPhone;
use App\Support\PhoneNumber;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class OtpController extends Controller
{
    private const EMAIL_OTP_EXPIRY_MINUTES = 15;

    /** True when mail is configured for real delivery (not log/array sink). */
    private function mailUsesRealTransport(): bool
    {
        return ! in_array(config('mail.default'), ['log', 'array'], true);
    }

    public function send(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone' => ['sometimes', 'required_without:email', 'prohibits:email', 'string', 'max:30'],
            'email' => ['sometimes', 'required_without:phone', 'prohibits:phone', 'email', 'max:255'],
        ]);

        $code = (string) random_int(100000, 999999);
        // $code = app()->isLocal() ? '123456' : (string) random_int(100000, 999999);

        if (! empty($data['phone'] ?? null)) {
            return $this->sendForPhone($data['phone'], $code, $request);
        }

        return $this->sendForEmail($data['email'], $code, $request);
    }

    private function sendForPhone(string $phone, string $code, Request $request): JsonResponse
    {
        $normalized = PhoneNumber::normalize($phone);
        if (strlen($normalized) < 10) {
            return response()->json(['message' => 'Please enter a valid phone number'], 422);
        }

        OtpVerification::query()->create([
            'user_id' => auth('sanctum')->user()?->id,
            'phone' => $normalized,
            'email' => null,
            'code' => $code,
            'expires_at' => now()->addMinutes(5),
        ]);

        return response()->json([
            'message' => 'OTP generated',
            'otp' => app()->isLocal() ? $code : null,
        ]);
    }

    private function sendForEmail(string $email, string $code, Request $request): JsonResponse
    {
        $emailNorm = strtolower(trim($email));

        $user = User::query()
            ->whereRaw('LOWER(TRIM(email)) = ?', [$emailNorm])
            ->first();

        if ($user === null) {
            return response()->json([
                'message' => 'If an account exists for this email, a code has been sent.',
                'otp' => null,
            ]);
        }

        OtpVerification::query()->create([
            'user_id' => $user->id,
            'phone' => null,
            'email' => $emailNorm,
            'code' => $code,
            'expires_at' => now()->addMinutes(self::EMAIL_OTP_EXPIRY_MINUTES),
        ]);

        try {
            Mail::to($user->email)->send(new OtpCodeMail($code, self::EMAIL_OTP_EXPIRY_MINUTES));
        } catch (\Throwable $e) {
            Log::error('Failed to send OTP email', [
                'to' => $user->email,
                'mailer' => config('mail.default'),
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Could not send email. Ensure MAIL_MAILER=smtp in .env, MAIL_FROM_ADDRESS is valid, and check storage/logs/laravel.log.',
                'detail' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }

        return response()->json([
            'message' => 'If an account exists for this email, a code has been sent.',
            // Only expose code in API when mail goes to log/array (dev), not when using real SMTP.
            'otp' => $this->mailUsesRealTransport() ? null : $code,
        ]);
    }

    public function verify(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'size:6'],
            'phone' => ['sometimes', 'required_without:email', 'prohibits:email', 'string', 'max:30'],
            'email' => ['sometimes', 'required_without:phone', 'prohibits:phone', 'email', 'max:255'],
        ]);

        if (! empty($data['phone'] ?? null)) {
            return $this->verifyPhone($data['phone'], $data['code'], $request);
        }

        return $this->verifyEmail(strtolower(trim($data['email'])), $data['code'], $request);
    }

    private function verifyPhone(string $phone, string $code, Request $request): JsonResponse
    {
        $normalized = PhoneNumber::normalize($phone);

        $otp = OtpVerification::query()
            ->where('phone', $normalized)
            ->whereNull('email')
            ->where('code', $code)
            ->whereNull('verified_at')
            ->latest()
            ->first();

        if (! $otp || Carbon::parse($otp->expires_at)->isPast()) {
            return response()->json(['message' => 'Invalid or expired OTP'], 422);
        }

        $otp->update(['verified_at' => now()]);

        VerifiedPhone::query()->firstOrCreate(
            ['phone' => $normalized],
            ['verified_at' => now()]
        );

        $user = auth('sanctum')->user();
        if ($user) {
            $user->update([
                'phone' => $normalized,
                'phone_verified_at' => now(),
            ]);
        }

        return response()->json(['message' => 'Phone verified successfully']);
    }

    private function verifyEmail(string $emailNorm, string $code, Request $request): JsonResponse
    {
        $otp = OtpVerification::query()
            ->whereRaw('LOWER(TRIM(email)) = ?', [$emailNorm])
            ->whereNull('phone')
            ->where('code', $code)
            ->whereNull('verified_at')
            ->latest()
            ->first();

        if (! $otp || Carbon::parse($otp->expires_at)->isPast()) {
            return response()->json(['message' => 'Invalid or expired OTP'], 422);
        }

        $otp->update(['verified_at' => now()]);

        $user = User::query()
            ->whereRaw('LOWER(TRIM(email)) = ?', [$emailNorm])
            ->first();

        if ($user) {
            $user->update([
                'email_verified_at' => $user->email_verified_at ?? now(),
            ]);
        }

        return response()->json(['message' => 'Email verified successfully']);
    }
}
