import { describe, it, expect } from 'vitest';
import { patchLaravelBladeTemplate } from '../../../packages/adapters/src/laravel-adapter.js';

describe('Laravel Blade Adapter', () => {
  it('enriches Blade view with @section("title") and meta tags', () => {
    const bladeTemplate = `@extends('layouts.app')\n\n@section('content')\n  <h1>Bienvenue sur notre SaaS</h1>\n@endsection\n`;

    const patched = patchLaravelBladeTemplate(bladeTemplate, {
      title: 'Titre Expert Laravel',
      description: 'Description pour le référencement naturel sous Laravel Blade.',
      canonical: 'https://example.com/saas',
    });

    expect(patched).toContain("@section('title', 'Titre Expert Laravel')");
    expect(patched).toContain("<meta name=\"description\" content=\"Description pour le référencement naturel sous Laravel Blade.\">");
    expect(patched).toContain("@push('meta')");
  });

  it('preserves existing @section("title") if already declared', () => {
    const existing = `@extends('layouts.app')\n@section('title', 'Mon Titre Existant')\n@section('content')\n  <h1>Hello</h1>\n@endsection`;

    const patched = patchLaravelBladeTemplate(existing, {
      title: 'Nouveau Titre',
      description: 'Nouvelle Description',
    });

    expect(patched).toContain("@section('title', 'Mon Titre Existant')");
    expect(patched).not.toContain("@section('title', 'Nouveau Titre')");
  });
});

