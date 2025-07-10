<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { io } from 'socket.io-client';
import Chart from 'chart.js/auto';

// --- State ---
const chartCanvas = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;
// On utilise un 'reactive' pour que la liste des boissons se mette à jour dans le template
const drinkState = reactive<{ names: string[] }>({
  names: []
});

// --- Fonctions ---
const buyDrink = async (drinkName: string) => {
  try {
    // On appelle l'API du backend pour simuler un achat
    const response = await fetch(`http://localhost:3000/buy/${encodeURIComponent(drinkName)}`);
    if (!response.ok) {
      throw new Error('La requête a échoué');
    }
    console.log(`Achat de ${drinkName} envoyé !`);
  } catch (error) {
    console.error("Erreur lors de l'achat:", error);
  }
};

// --- Lifecycle Hooks ---
onMounted(() => {
  if (!chartCanvas.value) return;
  const ctx = chartCanvas.value.getContext('2d');
  if (!ctx) return;

  // 1. Initialisation du graphique
  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: [],
      datasets: [{
        label: 'Prix en temps réel (€)',
        data: [],
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1
      }]
    },
    options: {
      animation: { duration: 400 },
      scales: { y: { beginAtZero: true } }
    }
  });

  // 2. Connexion au serveur
  const socket = io('http://localhost:3000');

  // 3. Écoute des mises à jour
  socket.on('updatePrices', (drinks: { [key: string]: { price: number } }) => {
    if (!chartInstance) return;

    const drinkNames = Object.keys(drinks);
    const drinkPrices = Object.values(drinks).map(d => d.price);

    // Mise à jour de la liste des boissons pour les boutons
    drinkState.names = drinkNames;

    // Mise à jour des données du graphique
    chartInstance.data.labels = drinkNames;
    chartInstance.data.datasets[0].data = drinkPrices;
    chartInstance.update();
  });
});
</script>

<template>
  <div class="main-container">
    <div class="chart-container">
      <h1>Bar de la Bourse 🍻</h1>
      <canvas ref="chartCanvas"></canvas>
    </div>
    
    <div class="controls-container">
      <h2>Acheter une boisson</h2>
      <div class="buttons-grid">
        <button v-for="name in drinkState.names" :key="name" @click="buyDrink(name)">
          {{ name }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.main-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;
  padding: 20px;
}

.chart-container {
  width: 100%;
  max-width: 800px;
}

.controls-container {
  width: 100%;
  max-width: 800px;
  background-color: #f9f9f9;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.buttons-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
}

button {
  padding: 10px 15px;
  font-size: 16px;
  cursor: pointer;
  border: 1px solid #ccc;
  border-radius: 5px;
  background-color: #fff;
  transition: background-color 0.2s;
}

button:hover {
  background-color: #e9e9e9;
}
</style>
