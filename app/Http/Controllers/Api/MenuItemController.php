<?php

namespace App\Http\Controllers\Api;

use App\Models\MenuItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class MenuItemController extends BaseCrudController
{
    protected function modelClass(): string
    {
        return MenuItem::class;
    }

    /**
     * @param  ?string  $excludeOfferId  When editing an offer, include items only tied to this offer (or none).
     */
    public function index(Request $request): JsonResponse
    {
        $eligibleOnly = $request->boolean('eligible_for_offer');
        $excludeOfferId = $request->query('for_offer_id');

        $query = MenuItem::query()->with(['categories:id,name'])->latest();

        if ($eligibleOnly) {
            if ($excludeOfferId !== null && $excludeOfferId !== '' && ctype_digit((string) $excludeOfferId)) {
                $oid = (int) $excludeOfferId;
                $query->where(function ($q) use ($oid) {
                    $q->whereDoesntHave('offers', fn ($x) => $x->where('offers.id', '!=', $oid))
                        ->whereDoesntHave('bogoFreeOffers', fn ($x) => $x->where('offers.id', '!=', $oid))
                        ->whereDoesntHave('rewardInOffers', fn ($x) => $x->where('offers.id', '!=', $oid));
                });
            } else {
                $query->whereDoesntHave('offers')
                    ->whereDoesntHave('bogoFreeOffers')
                    ->whereDoesntHave('rewardInOffers');
            }
        }

        return response()->json(
            $query->get()->map(fn (MenuItem $item) => $this->formatMenuItem($item))
        );
    }

    public function show(int|string $id): JsonResponse
    {
        $item = MenuItem::query()->with(['categories:id,name'])->findOrFail($id);

        return response()->json($this->formatMenuItem($item));
    }

    /** Admin: menu items not linked to any offer (for “Add offer” picker). */
    public function withoutOffers(Request $request): JsonResponse
    {
        $forOfferId = $request->query('for_offer_id');

        $query = MenuItem::query()->with(['categories:id,name']);

        if ($forOfferId !== null && $forOfferId !== '' && ctype_digit((string) $forOfferId)) {
            $oid = (int) $forOfferId;
            $query->where(function ($q) use ($oid) {
                $q->where(function ($free) {
                    $free->whereDoesntHave('offers')
                        ->whereDoesntHave('bogoFreeOffers')
                        ->whereDoesntHave('rewardInOffers');
                })->orWhere(function ($linked) use ($oid) {
                    $linked->whereHas('offers', fn ($x) => $x->where('offers.id', $oid))
                        ->orWhereHas('bogoFreeOffers', fn ($x) => $x->where('offers.id', $oid))
                        ->orWhereHas('rewardInOffers', fn ($x) => $x->where('offers.id', $oid));
                });
            });
        } else {
            $query->whereDoesntHave('offers')
                ->whereDoesntHave('bogoFreeOffers')
                ->whereDoesntHave('rewardInOffers');
        }

        return response()->json(
            $query->orderBy('name')->get()->map(fn (MenuItem $item) => $this->formatMenuItem($item))
        );
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validateMenuItemPayload($request);
        $categoryIds = $validated['category_ids'];
        unset($validated['category_ids']);

        $item = MenuItem::query()->create($validated);
        $item->categories()->sync($categoryIds);

        return response()->json(
            $this->formatMenuItem($item->fresh()->load('categories:id,name')),
            201
        );
    }

    public function update(Request $request, int|string $id): JsonResponse
    {
        $item = MenuItem::query()->findOrFail($id);
        $validated = $this->validateMenuItemPayload($request, true);
        $categoryIds = null;
        if (array_key_exists('category_ids', $validated)) {
            $categoryIds = $validated['category_ids'];
            unset($validated['category_ids']);
        }

        $item->update($validated);

        if ($categoryIds !== null) {
            $item->categories()->sync($categoryIds);
        }

        return response()->json(
            $this->formatMenuItem($item->fresh()->load('categories:id,name'))
        );
    }

    public function syncOptionGroupOrder(Request $request, int|string $menu_item): JsonResponse
    {
        $validated = $request->validate([
            'option_group_ids' => ['required', 'array'],
            'option_group_ids.*' => ['integer', 'exists:option_groups,id'],
        ]);

        MenuItem::query()->findOrFail($menu_item);

        foreach ($validated['option_group_ids'] as $index => $groupId) {
            DB::table('menu_item_option_group')
                ->where('menu_item_id', $menu_item)
                ->where('option_group_id', $groupId)
                ->update(['display_order' => $index]);
        }

        return response()->json(['message' => 'Option group order updated']);
    }

    protected function rules(bool $isUpdate = false): array
    {
        return [
            'name' => [$isUpdate ? 'sometimes' : 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'base_price' => [$isUpdate ? 'sometimes' : 'required', 'numeric', 'min:0'],
            'image' => ['nullable', 'string', 'max:500'],
            'available' => ['nullable', 'boolean'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function validateMenuItemPayload(Request $request, bool $isUpdate = false): array
    {
        $rules = $this->rules($isUpdate);
        $rules['category_ids'] = [
            $isUpdate ? 'sometimes' : 'required_without:category_id',
            'array',
            'min:1',
        ];
        $rules['category_ids.*'] = ['integer', 'exists:categories,id'];
        $rules['category_id'] = ['sometimes', 'integer', 'exists:categories,id'];

        $validated = $request->validate($rules);

        if (empty($validated['category_ids'] ?? null) && ! empty($validated['category_id'] ?? null)) {
            $validated['category_ids'] = [(int) $validated['category_id']];
        }
        unset($validated['category_id']);

        if (empty($validated['category_ids'] ?? null)) {
            if ($isUpdate) {
                unset($validated['category_ids']);
            } else {
                throw ValidationException::withMessages([
                    'category_ids' => ['Select at least one category.'],
                ]);
            }
        } else {
            $validated['category_ids'] = array_values(array_unique(array_map('intval', $validated['category_ids'])));
        }

        return $validated;
    }

    /**
     * @return array<string, mixed>
     */
    protected function formatMenuItem(MenuItem $item): array
    {
        $item->loadMissing('categories:id,name');
        $data = $item->toArray();
        $data['categories'] = $item->categories;
        $data['category_id'] = $item->categories->first()?->id;

        return $data;
    }
}
