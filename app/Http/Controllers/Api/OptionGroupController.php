<?php

namespace App\Http\Controllers\Api;

use App\Models\OptionGroup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
                ->with(['menuItems:id,name'])
                ->orderBy('display_order')
                ->orderBy('name')
                ->orderBy('id')
                ->get()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate($this->rules());
        $menuItemIds = $validated['menu_item_ids'];
        unset($validated['menu_item_ids']);

        $group = OptionGroup::query()->create($validated);
        $this->syncMenuItems($group, $menuItemIds);

        return response()->json($group->load('menuItems:id,name'), 201);
    }

    public function update(Request $request, int|string $id): JsonResponse
    {
        $validated = $request->validate($this->rules(true));
        $group = OptionGroup::query()->findOrFail($id);

        $menuItemIds = null;
        if (array_key_exists('menu_item_ids', $validated)) {
            $menuItemIds = $validated['menu_item_ids'];
            unset($validated['menu_item_ids']);
        }

        $group->update($validated);

        if ($menuItemIds !== null) {
            $this->syncMenuItems($group, $menuItemIds);
        }

        return response()->json($group->fresh()->load('menuItems:id,name'));
    }

    /**
     * @param  array<int, int|string>  $menuItemIds
     */
    protected function syncMenuItems(OptionGroup $group, array $menuItemIds): void
    {
        $sync = [];
        foreach ($menuItemIds as $menuItemId) {
            $menuItemId = (int) $menuItemId;
            $existing = DB::table('menu_item_option_group')
                ->where('option_group_id', $group->id)
                ->where('menu_item_id', $menuItemId)
                ->value('display_order');

            if ($existing !== null) {
                $sync[$menuItemId] = ['display_order' => (int) $existing];
            } else {
                $max = DB::table('menu_item_option_group')
                    ->where('menu_item_id', $menuItemId)
                    ->max('display_order');
                $sync[$menuItemId] = ['display_order' => (int) (($max ?? -1) + 1)];
            }
        }

        $group->menuItems()->sync($sync);
    }

    protected function rules(bool $isUpdate = false): array
    {
        return [
            'name' => [$isUpdate ? 'sometimes' : 'required', 'string', 'max:255'],
            'type' => [$isUpdate ? 'sometimes' : 'required', 'in:single,multiple'],
            'required' => ['nullable', 'boolean'],
            'min_selections' => ['nullable', 'integer', 'min:0'],
            'max_selections' => ['nullable', 'integer', 'min:0'],
            'allow_repeat_selections' => ['nullable', 'boolean'],
            'display_order' => ['nullable', 'integer', 'min:0'],
            'menu_item_ids' => [
                $isUpdate ? 'sometimes' : 'required',
                'array',
                'min:1',
            ],
            'menu_item_ids.*' => ['integer', 'exists:menu_items,id'],
        ];
    }
}
