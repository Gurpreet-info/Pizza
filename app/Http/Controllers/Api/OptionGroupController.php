<?php

namespace App\Http\Controllers\Api;

use App\Models\OptionGroup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OptionGroupController extends BaseCrudController
{
    protected function modelClass(): string
    {
        return OptionGroup::class;
    }

    public function index(Request $request): JsonResponse
    {
        return response()->json(
            OptionGroup::query()
                ->orderBy('menu_item_id')
                ->orderBy('display_order')
                ->orderBy('id')
                ->get()
        );
    }

    protected function rules(bool $isUpdate = false): array
    {
        return [
            'menu_item_id' => [$isUpdate ? 'sometimes' : 'required', 'integer', 'exists:menu_items,id'],
            'name' => [$isUpdate ? 'sometimes' : 'required', 'string', 'max:255'],
            'type' => [$isUpdate ? 'sometimes' : 'required', 'in:single,multiple'],
            'required' => ['nullable', 'boolean'],
            'min_selections' => ['nullable', 'integer', 'min:0'],
            'max_selections' => ['nullable', 'integer', 'min:0'],
            'display_order' => ['nullable', 'integer', 'min:0'],
        ];
    }
}

