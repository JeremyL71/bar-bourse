<script setup lang="ts">
// 1. On importe notre nouveau composant
import DrinksChart from './components/DrinksChart.vue'
</script>

<template>
  <main>
    <DrinksChart />
  </main>
</template>

<style scoped>
/* On peut garder un peu de style pour centrer le contenu si besoin */
main {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}
</style>
