<script setup>
useSeoMeta({
  title: 'Accueil Nuxt 3',
  description: 'Boutique en ligne propulsée par Nuxt 3',
  ogTitle: 'Accueil Nuxt 3',
});
</script>

<template>
  <div>
    <h1>Bienvenue sur Nuxt 3</h1>
    <p>Catalogue de produits modernes.</p>
    <NuxtLink to="/produits/42">Voir produit 42</NuxtLink>
    <NuxtLink to="/contact">Nous contacter</NuxtLink>
  </div>
</template>

