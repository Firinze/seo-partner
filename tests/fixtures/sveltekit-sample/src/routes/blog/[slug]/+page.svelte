<script>
  export let data = { title: "Titre dynamique" };
</script>

<svelte:head>
  <title>{data.title} - SvelteKit Blog</title>
  <meta name="description" content="Article spécialisé sur SvelteKit" />
</svelte:head>

<h1>Détail de l'article</h1>
<p>Contenu du post dynamique.</p>

