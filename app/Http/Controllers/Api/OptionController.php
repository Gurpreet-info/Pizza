<?php

namespace App\Http\Controllers\Api;

use App\Models\Option;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

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
                ->with(['optionGroups:id,name'])
                ->orderBy('name')
                ->orderBy('id')
                ->get()
                ->map(fn (Option $option) => $this->formatOption($option))
        );
    }

    public function show(int|string $id): JsonResponse
    {
        $option = Option::query()->with(['optionGroups:id,name'])->findOrFail($id);

        return response()->json($this->formatOption($option));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validateOptionPayload($request);
        $groupIds = $validated['option_group_ids'];
        unset($validated['option_group_ids']);

        $option = Option::query()->create($validated);
        $option->optionGroups()->sync($groupIds);

        return response()->json(
            $this->formatOption($option->fresh()->load('optionGroups:id,name')),
            201
        );
    }

    public function update(Request $request, int|string $id): JsonResponse
    {
        $option = Option::query()->findOrFail($id);
        $validated = $this->validateOptionPayload($request, true);
        $groupIds = null;
        if (array_key_exists('option_group_ids', $validated)) {
            $groupIds = $validated['option_group_ids'];
            unset($validated['option_group_ids']);
        }

        $option->update($validated);

        if ($groupIds !== null) {
            $option->optionGroups()->sync($groupIds);
        }

        return response()->json(
            $this->formatOption($option->fresh()->load('optionGroups:id,name'))
        );
    }

    protected function rules(bool $isUpdate = false): array
    {
        return [
            'name' => [$isUpdate ? 'sometimes' : 'required', 'string', 'max:255'],
            'price' => ['nullable', 'numeric', 'min:0'],
            'active' => ['nullable', 'boolean'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function validateOptionPayload(Request $request, bool $isUpdate = false): array
    {
        $rules = $this->rules($isUpdate);
        $rules['option_group_ids'] = [
            $isUpdate ? 'sometimes' : 'required_without:option_group_id',
            'array',
            'min:1',
        ];
        $rules['option_group_ids.*'] = ['integer', 'exists:option_groups,id'];
        $rules['option_group_id'] = ['sometimes', 'integer', 'exists:option_groups,id'];

        $validated = $request->validate($rules);

        if (empty($validated['option_group_ids'] ?? null) && ! empty($validated['option_group_id'] ?? null)) {
            $validated['option_group_ids'] = [(int) $validated['option_group_id']];
        }
        unset($validated['option_group_id']);

        if (empty($validated['option_group_ids'] ?? null)) {
            if ($isUpdate) {
                unset($validated['option_group_ids']);
            } else {
                throw ValidationException::withMessages([
                    'option_group_ids' => ['Select at least one option group.'],
                ]);
            }
        } else {
            $validated['option_group_ids'] = array_values(array_unique(array_map('intval', $validated['option_group_ids'])));
        }

        return $validated;
    }

    /**
     * @return array<string, mixed>
     */
    protected function formatOption(Option $option): array
    {
        $option->loadMissing('optionGroups:id,name');
        $data = $option->toArray();
        $data['option_groups'] = $option->optionGroups;
        $data['option_group_id'] = $option->optionGroups->first()?->id;

        return $data;
    }
}
