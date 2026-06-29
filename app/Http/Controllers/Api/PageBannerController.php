<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PageBanner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PageBannerController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(
            PageBanner::query()
                ->orderBy('page_key')
                ->get(['id', 'page_key', 'image_url', 'updated_at'])
        );
    }

    public function upsert(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'banners' => ['required', 'array', 'min:1'],
            'banners.*.page_key' => ['required', 'string', 'max:80'],
            'banners.*.image_url' => ['nullable', 'string', 'max:1000'],
        ]);

        foreach ($validated['banners'] as $row) {
            $imageUrl = isset($row['image_url']) ? trim((string) $row['image_url']) : null;

            PageBanner::query()->updateOrCreate(
                ['page_key' => $row['page_key']],
                ['image_url' => $imageUrl !== '' ? $imageUrl : null]
            );
        }

        return $this->index();
    }
}
