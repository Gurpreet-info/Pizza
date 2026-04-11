<?php

namespace App\Http\Controllers\Api;

use App\Models\OptionGroup;

class OptionGroupController extends BaseCrudController
{
    protected function modelClass(): string
    {
        return OptionGroup::class;
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
        ];
    }
}

