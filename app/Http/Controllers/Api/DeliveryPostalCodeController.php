<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DeliveryPostalCode;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class DeliveryPostalCodeController extends Controller
{
    /** Active codes only (checkout / public). */
    public function publicIndex(): JsonResponse
    {
        return response()->json(
            DeliveryPostalCode::query()
                ->where('active', true)
                ->orderBy('code')
                ->get(['id', 'code', 'label'])
        );
    }

    /** All codes for admin UI. */
    public function adminIndex(): JsonResponse
    {
        return response()->json(
            DeliveryPostalCode::query()->orderBy('code')->get()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:32'],
            'label' => ['nullable', 'string', 'max:255'],
            'active' => ['sometimes', 'boolean'],
        ]);

        $normalized = DeliveryPostalCode::normalizeCode($validated['code']);
        if (strlen($normalized) < 3) {
            throw ValidationException::withMessages([
                'code' => ['Enter a valid postal code.'],
            ]);
        }

        if (DeliveryPostalCode::query()->where('code', $normalized)->exists()) {
            throw ValidationException::withMessages([
                'code' => ['This postal code is already registered.'],
            ]);
        }

        $validated['code'] = $normalized;
        $validated['active'] = array_key_exists('active', $validated) ? (bool) $validated['active'] : true;

        return response()->json(DeliveryPostalCode::create($validated), 201);
    }

    public function update(Request $request, DeliveryPostalCode $delivery_postal_code): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['sometimes', 'string', 'max:32'],
            'label' => ['nullable', 'string', 'max:255'],
            'active' => ['sometimes', 'boolean'],
        ]);

        if (array_key_exists('code', $validated)) {
            $normalized = DeliveryPostalCode::normalizeCode($validated['code']);
            if (strlen($normalized) < 3) {
                throw ValidationException::withMessages([
                    'code' => ['Enter a valid postal code.'],
                ]);
            }

            if (DeliveryPostalCode::query()
                ->where('code', $normalized)
                ->where('id', '!=', $delivery_postal_code->id)
                ->exists()) {
                throw ValidationException::withMessages([
                    'code' => ['This postal code is already registered.'],
                ]);
            }
            $validated['code'] = $normalized;
        }

        $delivery_postal_code->update($validated);

        return response()->json($delivery_postal_code->fresh());
    }

    public function destroy(DeliveryPostalCode $delivery_postal_code): JsonResponse
    {
        $delivery_postal_code->delete();

        return response()->json(['message' => 'Deleted']);
    }
}
