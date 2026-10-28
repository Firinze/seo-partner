from django.shortcuts import render
from django.views.generic import TemplateView

def home_view(request):
    return render(request, 'home.html', {'title': 'Accueil Django'})

class ShopView(TemplateView):
    template_name = 'shop.html'

def article_detail(request, slug):
    return render(request, 'article_detail.html', {'slug': slug})

def contact_view(request):
    return render(request, 'contact.html')

