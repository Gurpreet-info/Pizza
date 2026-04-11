<?php

namespace App\Http\Controllers\Api;

use App\Models\Option;

class OptionController extends BaseCrudController
{
    protected function modelClass(): string
    {
        return Option::class;
    }

    protected function rules(bool $isUpdate = false): array
    {
        return [
            'option_group_id' => [$isUpdate ? 'sometimes' : 'required', 'integer', 'exists:option_groups,id'],
            'name' => [$isUpdate ? 'sometimes' : 'required', 'string', 'max:255'],
            'price' => ['nullable', 'numeric', 'min:0'],
        ];
    }
}

