<script setup>
const route = useRoute();
useSeoMeta({
  title: `Produit ${route.params.id} - Boutique`,
  description: 'Fiche descriptive détaillée du produit',
});
</script>

<template>
  <div>
    <h1>Fiche Produit</h1>
    <p>Détail technique et prix.</p>
  </div>
</template>

