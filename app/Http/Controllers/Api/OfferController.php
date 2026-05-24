<?php

namespace App\Http\Controllers\Api;

use App\Models\Offer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class OfferController extends BaseCrudController
{
    /**
     * Enforce one-offer-per-item across paid list, bogo free list, and spend reward item.
     *
     * @param  array<int>  $menuItemIds
     */
    protected function assertMenuItemsAvailable(array $menuItemIds, ?int $currentOfferId = null): void
    {
        $ids = array_values(array_unique(array_map('intval', $menuItemIds)));
        if ($ids === []) {
            return;
        }

        $conflictExists = Offer::query()
            ->when($currentOfferId !== null, fn ($q) => $q->where('id', '!=', $currentOfferId))
            ->where(function ($q) use ($ids) {
                $q->whereIn('reward_menu_item_id', $ids)
                    ->orWhereHas('menuItems', fn ($x) => $x->whereIn('menu_items.id', $ids))
                    ->orWhereHas('bogoFreeMenuItems', fn ($x) => $x->whereIn('menu_items.id', $ids));
            })
            ->exists();

        if ($conflictExists) {
            throw ValidationException::withMessages([
                'menu_item_ids' => ['One or more selected items already belong to another offer.'],
            ]);
        }
    }

    protected function offerSupportsMultipleMenuItems(string $kind): bool
    {
        return in_array($kind, ['standard', 'bogo_same'], true);
    }

    /**
     * Resolve paid-menu-item ids for standard / bogo_same (full list + optional append).
     *
     * @return array<int>
     */
    protected function resolveMenuItemIdsForMultiItemOffer(
        Request $request,
        ?int $currentOfferId,
        bool $isUpdate
    ): array {
        $existing = [];
        if ($currentOfferId !== null) {
            $offer = Offer::query()->find($currentOfferId);
            if ($offer) {
                $existing = $offer->menuItems()->pluck('menu_items.id')->map(fn ($id) => (int) $id)->all();
            }
        }

        $fromMenuItemIds = $request->has('menu_item_ids')
            ? array_map('intval', $request->input('menu_item_ids', []))
            : ($isUpdate ? $existing : []);

        $toAdd = array_map('intval', $request->input('add_menu_item_ids', []));

        return array_values(array_unique(array_merge($fromMenuItemIds, $toAdd)));
    }

    protected function assertMultiItemMenuIdsPresent(array $menuItemIds): void
    {
        if ($menuItemIds === []) {
            throw ValidationException::withMessages([
                'menu_item_ids' => ['Select at least one menu item for this offer.'],
            ]);
        }
    }

    protected function modelClass(): string
    {
        return Offer::class;
    }

    /** Include linked menu items so clients can show badges / apply discounts. */
    public function index(Request $request): JsonResponse
    {
        return response()->json(
            Offer::query()->with(['menuItems', 'rewardMenuItem', 'bogoFreeMenuItems'])->latest()->get()
        );
    }

    /** Admin: menu items currently attached to this offer (for edit-offer picker). */
    public function attachedMenuItems(Offer $offer): JsonResponse
    {
        return response()->json(
            $offer->menuItems()->orderBy('name')->get()
        );
    }

    /** Admin: BOGO “free” pool for bogo_any offers. */
    public function attachedBogoFreeMenuItems(Offer $offer): JsonResponse
    {
        return response()->json(
            $offer->bogoFreeMenuItems()->orderBy('name')->get()
        );
    }

    protected function rules(bool $isUpdate = false): array
    {
        return [
            'title' => [$isUpdate ? 'sometimes' : 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'image' => ['nullable', 'string', 'max:500'],
            'offer_kind' => [$isUpdate ? 'sometimes' : 'required', 'in:standard,bogo_same,bogo_any,spend_get_free'],
            'discount_type' => ['nullable', 'in:percentage,fixed'],
            'discount_value' => ['nullable', 'numeric', 'min:0'],
            'min_spend' => ['nullable', 'numeric', 'min:0'],
            'reward_menu_item_id' => ['nullable', 'integer', 'exists:menu_items,id'],
            'show_on_slider' => ['nullable', 'boolean'],
            'valid_from' => [$isUpdate ? 'sometimes' : 'required', 'date'],
            'valid_until' => [$isUpdate ? 'sometimes' : 'required', 'date', 'after_or_equal:valid_from'],
            'active' => ['nullable', 'boolean'],
        ];
    }

    /**
     * @return array{0: array<string, mixed>, 1: array<int>, 2: array<int>}
     */
    protected function validatedPayloadForKind(Request $request, string $kind, array $base, ?int $currentOfferId = null): array
    {
        if ($kind === 'standard') {
            $isUpdate = $currentOfferId !== null;
            $extra = $request->validate([
                'discount_type' => ['required', 'in:percentage,fixed'],
                'discount_value' => ['required', 'numeric', 'min:0'],
                'menu_item_ids' => [
                    $isUpdate ? 'sometimes' : 'required_without:add_menu_item_ids',
                    'array',
                    'min:1',
                ],
                'menu_item_ids.*' => ['integer', 'exists:menu_items,id'],
                'add_menu_item_ids' => [
                    $isUpdate ? 'sometimes' : 'required_without:menu_item_ids',
                    'array',
                    'min:1',
                ],
                'add_menu_item_ids.*' => ['integer', 'exists:menu_items,id'],
            ]);
            $attrs = array_merge($base, $extra);
            unset($attrs['menu_item_ids'], $attrs['add_menu_item_ids']);
            $sync = $this->resolveMenuItemIdsForMultiItemOffer($request, $currentOfferId, $isUpdate);
            $this->assertMultiItemMenuIdsPresent($sync);
            $this->assertMenuItemsAvailable($sync, $currentOfferId);
            $attrs['min_spend'] = null;
            $attrs['reward_menu_item_id'] = null;

            return [$attrs, $sync, []];
        }

        if ($kind === 'bogo_same') {
            $isUpdate = $currentOfferId !== null;
            $request->validate([
                'menu_item_ids' => [
                    $isUpdate ? 'sometimes' : 'required_without:add_menu_item_ids',
                    'array',
                    'min:1',
                ],
                'menu_item_ids.*' => ['integer', 'exists:menu_items,id'],
                'add_menu_item_ids' => [
                    $isUpdate ? 'sometimes' : 'required_without:menu_item_ids',
                    'array',
                    'min:1',
                ],
                'add_menu_item_ids.*' => ['integer', 'exists:menu_items,id'],
            ]);
            $base['discount_type'] = 'fixed';
            $base['discount_value'] = 0;
            $base['min_spend'] = null;
            $base['reward_menu_item_id'] = null;
            $sync = $this->resolveMenuItemIdsForMultiItemOffer($request, $currentOfferId, $isUpdate);
            $this->assertMultiItemMenuIdsPresent($sync);
            $this->assertMenuItemsAvailable($sync, $currentOfferId);

            return [$base, $sync, []];
        }

        if ($kind === 'bogo_any') {
            $request->validate([
                'menu_item_ids' => ['required', 'array', 'min:1'],
                'menu_item_ids.*' => ['integer', 'exists:menu_items,id'],
                'bogo_free_menu_item_ids' => ['required', 'array', 'min:1'],
                'bogo_free_menu_item_ids.*' => ['integer', 'exists:menu_items,id'],
            ]);
            $buy = array_map('intval', $request->input('menu_item_ids', []));
            $free = array_map('intval', $request->input('bogo_free_menu_item_ids', []));
            if (count(array_intersect($buy, $free)) > 0) {
                throw ValidationException::withMessages([
                    'bogo_free_menu_item_ids' => ['Free items must be different from paid items for this offer type.'],
                ]);
            }
            $base['discount_type'] = 'fixed';
            $base['discount_value'] = 0;
            $base['min_spend'] = null;
            $base['reward_menu_item_id'] = null;
            $this->assertMenuItemsAvailable(array_merge($buy, $free), $currentOfferId);

            return [$base, $buy, $free];
        }

        if ($kind === 'spend_get_free') {
            $extra = $request->validate([
                'min_spend' => ['required', 'numeric', 'min:0.01'],
                'spend_reward_type' => ['required', 'in:free_item,percent_off,fixed_amount'],
                'spend_reward_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
                'spend_reward_fixed' => ['nullable', 'numeric', 'min:0'],
                'reward_menu_item_id' => ['nullable', 'integer', 'exists:menu_items,id'],
                'menu_item_ids' => ['nullable', 'array'],
                'menu_item_ids.*' => ['integer', 'exists:menu_items,id'],
            ]);
            $type = $extra['spend_reward_type'];
            if ($type === 'free_item' && empty($extra['reward_menu_item_id'])) {
                throw ValidationException::withMessages([
                    'reward_menu_item_id' => ['Choose the free reward menu item for this reward type.'],
                ]);
            }
            if ($type === 'percent_off') {
                $p = $extra['spend_reward_percent'] ?? null;
                if ($p === null || (float) $p <= 0) {
                    throw ValidationException::withMessages([
                        'spend_reward_percent' => ['Enter a percentage greater than 0 (max 100).'],
                    ]);
                }
            }
            if ($type === 'fixed_amount') {
                $f = $extra['spend_reward_fixed'] ?? null;
                if ($f === null || (float) $f <= 0) {
                    throw ValidationException::withMessages([
                        'spend_reward_fixed' => ['Enter a fixed discount amount greater than 0.'],
                    ]);
                }
            }
            $attrs = array_merge($base, [
                'min_spend' => $extra['min_spend'],
                'spend_reward_type' => $type,
                'spend_reward_percent' => $type === 'percent_off' ? $extra['spend_reward_percent'] : null,
                'spend_reward_fixed' => $type === 'fixed_amount' ? $extra['spend_reward_fixed'] : null,
                'reward_menu_item_id' => $type === 'free_item' ? $extra['reward_menu_item_id'] : null,
            ]);
            $sync = array_map('intval', $extra['menu_item_ids'] ?? []);
            $checkIds = $sync;
            if ($type === 'free_item' && !empty($extra['reward_menu_item_id'])) {
                $checkIds[] = (int) $extra['reward_menu_item_id'];
            }
            $this->assertMenuItemsAvailable($checkIds, $currentOfferId);
            $attrs['discount_type'] = 'fixed';
            $attrs['discount_value'] = 0;

            return [$attrs, $sync, []];
        }

        return [$base, [], []];
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate($this->rules());
        $kind = $validated['offer_kind'];
        $image = $validated['image'] ?? null;
        if ($image === '') {
            $image = null;
        }
        $base = [
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'image' => $image,
            'offer_kind' => $kind,
            'valid_from' => $validated['valid_from'],
            'valid_until' => $validated['valid_until'],
            'active' => $validated['active'] ?? true,
            'show_on_slider' => $validated['show_on_slider'] ?? false,
        ];

        [$attrs, $menuSync, $bogoFreeSync] = $this->validatedPayloadForKind($request, $kind, $base, null);
        if (($attrs['image'] ?? '') === '') {
            $attrs['image'] = null;
        }
        $offer = Offer::create($attrs);
        $offer->menuItems()->sync($menuSync);
        $offer->bogoFreeMenuItems()->sync($bogoFreeSync);

        return response()->json($offer->load(['menuItems', 'rewardMenuItem', 'bogoFreeMenuItems']), 201);
    }

    public function update(Request $request, int|string $id): JsonResponse
    {
        $validated = $request->validate($this->rules(true));
        $offer = Offer::query()->findOrFail($id);
        $kind = $validated['offer_kind'] ?? $offer->offer_kind;

        $base = [
            'title' => $validated['title'] ?? $offer->title,
            'description' => array_key_exists('description', $validated) ? $validated['description'] : $offer->description,
            'image' => array_key_exists('image', $validated) ? $validated['image'] : $offer->image,
            'offer_kind' => $kind,
            'valid_from' => $validated['valid_from'] ?? $offer->valid_from,
            'valid_until' => $validated['valid_until'] ?? $offer->valid_until,
            'active' => $validated['active'] ?? $offer->active,
            'show_on_slider' => $validated['show_on_slider'] ?? $offer->show_on_slider,
        ];
        if (($base['image'] ?? '') === '') {
            $base['image'] = null;
        }

        [$attrs, $menuSync, $bogoFreeSync] = $this->validatedPayloadForKind($request, $kind, $base, (int) $offer->id);
        if (($attrs['image'] ?? '') === '') {
            $attrs['image'] = null;
        }
        $offer->update($attrs);
        $offer->menuItems()->sync($menuSync);
        $offer->bogoFreeMenuItems()->sync($bogoFreeSync);

        return response()->json($offer->fresh()->load(['menuItems', 'rewardMenuItem', 'bogoFreeMenuItems']));
    }

    /**
     * Attach more menu items to an existing standard or bogo_same offer (merge, no replace).
     */
    public function attachMenuItems(Request $request, int|string $offer): JsonResponse
    {
        $model = Offer::query()->findOrFail($offer);

        if (! $this->offerSupportsMultipleMenuItems($model->offer_kind)) {
            throw ValidationException::withMessages([
                'offer_kind' => [
                    'Only standard and buy-one-get-one-same offers support multiple menu items on one offer.',
                ],
            ]);
        }

        $validated = $request->validate([
            'menu_item_ids' => ['required', 'array', 'min:1'],
            'menu_item_ids.*' => ['integer', 'exists:menu_items,id'],
        ]);

        $existing = $model->menuItems()->pluck('menu_items.id')->map(fn ($id) => (int) $id)->all();
        $incoming = array_map('intval', $validated['menu_item_ids']);
        $merged = array_values(array_unique(array_merge($existing, $incoming)));

        $this->assertMenuItemsAvailable($merged, (int) $model->id);
        $model->menuItems()->sync($merged);

        return response()->json(
            $model->fresh()->load(['menuItems', 'rewardMenuItem', 'bogoFreeMenuItems'])
        );
    }
}
