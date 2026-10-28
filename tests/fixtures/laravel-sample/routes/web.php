<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ServiceController;

Route::view('/', 'welcome');
Route::get('/services', function () {
    return view('services');
});
Route::view('/contact', 'pages.contact');

