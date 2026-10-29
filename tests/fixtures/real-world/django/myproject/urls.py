from django.urls import path

urlpatterns = [
    path("", home_view, name="home"),
    path("a-propos/", about_view, name="about"),
    path("blog/<slug:slug>/", blog_view, name="blog_detail"),
    path("contact/", contact_view, name="contact"),
]