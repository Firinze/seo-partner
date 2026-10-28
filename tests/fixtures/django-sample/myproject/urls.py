from django.urls import path
from myapp import views

urlpatterns = [
    path('', views.home_view, name='home'),
    path('boutique/', views.ShopView.as_view(), name='shop'),
    path('articles/<slug:slug>/', views.article_detail, name='article_detail'),
    path('contact/', views.contact_view, name='contact'),
]

