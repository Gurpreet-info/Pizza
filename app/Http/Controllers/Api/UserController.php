<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index(): JsonResponse
    {
        $users = User::query()
            ->orderBy('name')
            ->orderBy('id')
            ->get();

        return response()->json($users);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:30', 'unique:users,phone'],
            'role' => ['required', Rule::in(['admin', 'manager', 'user'])],
            'password' => ['required', 'string', 'min:6'],
        ]);

        $user = User::query()->create([
            'name' => $data['name'],
            'email' => strtolower(trim($data['email'])),
            'phone' => isset($data['phone']) && trim((string) $data['phone']) !== ''
                ? trim((string) $data['phone'])
                : null,
            'role' => $data['role'],
            'password' => $data['password'],
        ]);

        return response()->json($user, 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => [
                'sometimes',
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
            'phone' => [
                'sometimes',
                'nullable',
                'string',
                'max:30',
                Rule::unique('users', 'phone')->ignore($user->id),
            ],
            'role' => ['sometimes', 'required', Rule::in(['admin', 'manager', 'user'])],
            'password' => ['sometimes', 'nullable', 'string', 'min:6'],
        ]);

        if ($request->user()?->id === $user->id && array_key_exists('role', $data) && $data['role'] !== 'admin') {
            return response()->json([
                'message' => 'You cannot remove your own admin role.',
            ], 422);
        }

        if (array_key_exists('email', $data)) {
            $data['email'] = strtolower(trim((string) $data['email']));
        }

        if (array_key_exists('phone', $data)) {
            $data['phone'] = $data['phone'] !== null && trim((string) $data['phone']) !== ''
                ? trim((string) $data['phone'])
                : null;
        }

        if (array_key_exists('password', $data)) {
            if ($data['password'] === null || trim((string) $data['password']) === '') {
                unset($data['password']);
            }
        }

        $user->update($data);

        return response()->json($user->fresh());
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($request->user()?->id === $user->id) {
            return response()->json([
                'message' => 'You cannot delete your own account.',
            ], 422);
        }

        $user->delete();

        return response()->json(['message' => 'User deleted']);
    }
}

