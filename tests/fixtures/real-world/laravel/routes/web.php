<?php
use Illuminate\Support\Facades\Route;

Route::get("/", function () {
    return view("welcome");
});
Route::view("/a-propos", "about");
Route::get("/articles/{slug}", [ArticleController::class, "show"]);
Route::get("/contact", [ContactController::class, "index"]);
