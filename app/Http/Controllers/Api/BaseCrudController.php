<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

abstract class BaseCrudController extends Controller
{
    abstract protected function modelClass(): string;

    abstract protected function rules(bool $isUpdate = false): array;

    public function index(Request $request): JsonResponse
    {
        $model = $this->modelClass();
        return response()->json($model::query()->latest()->get());
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate($this->rules());
        $model = $this->modelClass();
        return response()->json($model::create($validated), 201);
    }

    public function show(int|string $id): JsonResponse
    {
        $model = $this->modelClass();
        return response()->json($model::query()->findOrFail($id));
    }

    public function update(Request $request, int|string $id): JsonResponse
    {
        $validated = $request->validate($this->rules(true));
        $modelClass = $this->modelClass();
        $model = $modelClass::query()->findOrFail($id);
        $model->update($validated);
        return response()->json($model->fresh());
    }

    public function destroy(int|string $id): JsonResponse
    {
        $modelClass = $this->modelClass();
        $model = $modelClass::query()->findOrFail($id);
        $model->delete();
        return response()->json(['message' => 'Deleted']);
    }
}

