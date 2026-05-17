<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SeoSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SeoSettingController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(
            SeoSetting::query()
                ->orderBy('page_key')
                ->get(['id', 'page_key', 'meta_title', 'meta_description', 'updated_at'])
        );
    }

    public function upsert(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'settings' => ['required', 'array', 'min:1'],
            'settings.*.page_key' => ['required', 'string', 'max:80'],
            'settings.*.meta_title' => ['nullable', 'string', 'max:255'],
            'settings.*.meta_description' => ['nullable', 'string', 'max:500'],
        ]);

        foreach ($validated['settings'] as $row) {
            $metaTitle = isset($row['meta_title']) ? trim((string) $row['meta_title']) : null;
            $metaDescription = isset($row['meta_description']) ? trim((string) $row['meta_description']) : null;

            SeoSetting::query()->updateOrCreate(
                ['page_key' => $row['page_key']],
                [
                    'meta_title' => $metaTitle !== '' ? $metaTitle : null,
                    'meta_description' => $metaDescription !== '' ? $metaDescription : null,
                ]
            );
        }

        return $this->index();
    }
}

