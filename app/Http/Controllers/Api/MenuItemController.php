<?php

namespace App\Http\Controllers\Api;

use App\Models\MenuItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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

        $query = MenuItem::query()->latest();

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

        return response()->json($query->get());
    }

    /** Admin: menu items not linked to any offer (for “Add offer” picker). */
    public function withoutOffers(Request $request): JsonResponse
    {
        $forOfferId = $request->query('for_offer_id');

        $query = MenuItem::query()
            ->whereDoesntHave('offers')
            ->whereDoesntHave('bogoFreeOffers')
            ->whereDoesntHave('rewardInOffers');

        if ($forOfferId !== null && $forOfferId !== '' && ctype_digit((string) $forOfferId)) {
            $oid = (int) $forOfferId;
            $query->orWhere(function ($q) use ($oid) {
                $q->whereHas('offers', fn ($x) => $x->where('offers.id', $oid))
                    ->orWhereHas('bogoFreeOffers', fn ($x) => $x->where('offers.id', $oid))
                    ->orWhereHas('rewardInOffers', fn ($x) => $x->where('offers.id', $oid));
            });
        }

        return response()->json(
            $query->orderBy('name')->get()
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
            'category_id' => [$isUpdate ? 'sometimes' : 'required', 'integer', 'exists:categories,id'],
            'name' => [$isUpdate ? 'sometimes' : 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'base_price' => [$isUpdate ? 'sometimes' : 'required', 'numeric', 'min:0'],
            'image' => ['nullable', 'string', 'max:500'],
            'available' => ['nullable', 'boolean'],
        ];
    }
}

