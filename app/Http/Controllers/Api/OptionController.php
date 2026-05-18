<?php

namespace App\Http\Controllers\Api;

use App\Models\Option;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OptionController extends BaseCrudController
{
    protected function modelClass(): string
    {
        return Option::class;
    }

    public function index(Request $request): JsonResponse
    {
        return response()->json(
            Option::query()
                ->orderBy('option_group_id')
                ->orderBy('id')
                ->get()
        );
    }

    protected function rules(bool $isUpdate = false): array
    {
        return [
            'option_group_id' => [$isUpdate ? 'sometimes' : 'required', 'integer', 'exists:option_groups,id'],
            'name' => [$isUpdate ? 'sometimes' : 'required', 'string', 'max:255'],
            'price' => ['nullable', 'numeric', 'min:0'],
            'active' => ['nullable', 'boolean'],
        ];
    }
}

