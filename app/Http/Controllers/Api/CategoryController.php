<?php

namespace App\Http\Controllers\Api;

use App\Models\Category;

class CategoryController extends BaseCrudController
{
    protected function modelClass(): string
    {
        return Category::class;
    }

    protected function rules(bool $isUpdate = false): array
    {
        return [
            'name' => [$isUpdate ? 'sometimes' : 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'image' => ['nullable', 'string', 'max:500'],
            'display_order' => ['nullable', 'integer', 'min:0'],
        ];
    }
}

