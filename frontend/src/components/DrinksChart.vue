<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { io } from 'socket.io-client';
import Chart from 'chart.js/auto';
import 'chartjs-adapter-date-fns'; // Important pour l'axe du temps

// --- State ---
const chartCanvas = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;
const drinkState = reactive<{ names: string[] }>({ names: [] });

// --- Fonctions ---
const buyDrink = async (drinkName: string) => {
  try {
    await fetch(`http://localhost:3000/buy/${encodeURIComponent(drinkName)}`);
    console.log(`Achat de ${drinkName} envoyé !`);
  } catch (error) {
    console.error("Erreur lors de l'achat:", error);
  }
};

// Fonction pour générer une couleur aléatoire pour chaque courbe
const getRandomColor = () => {
  const r = Math.floor(Math.random() * 255);
  const g = Math.floor(Math.random() * 255);
  const b = Math.floor(Math.random() * 255);
  return `rgba(${r}, ${g}, ${b}, 0.8)`;
};

// --- Lifecycle Hooks ---
onMounted(() => {
  if (!chartCanvas.value) return;
  const ctx = chartCanvas.value.getContext('2d');
  if (!ctx) return;

  // 1. Initialiser le graphique de type 'line'
  chartInstance = new Chart(ctx, {
    type: 'line', // CHANGEMENT ICI
    data: {
      datasets: [] // Les datasets seront ajoutés dynamiquement
    },
    options: {
      animation: { duration: 200 },
      scales: {
        x: {
          type: 'time', // Axe X basé sur le temps
          time: {
            unit: 'second',
            displayFormats: {
              second: 'HH:mm:ss'
            }
          },
          title: {
            display: true,
            text: 'Temps'
          }
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Prix (€)'
          }
        }
      }
    }
  });

  // 2. Connexion au serveur
  const socket = io('http://localhost:3000');

  // 3. Écoute des mises à jour (logique entièrement refaite)
  socket.on('updatePrices', (drinks: { [key: string]: { price: number, history: {x: number, y: number}[] } }) => {
    if (!chartInstance) return;

    drinkState.names = Object.keys(drinks);

    // Pour chaque boisson reçue, on met à jour ou on crée sa courbe
    for (const drinkName in drinks) {
      const drinkData = drinks[drinkName];
      let dataset = chartInstance.data.datasets.find(ds => ds.label === drinkName);

      if (dataset) {
        // La courbe existe, on met juste à jour ses données
        dataset.data = drinkData.history as any;
      } else {
        // Nouvelle boisson, on crée une nouvelle courbe
        chartInstance.data.datasets.push({
          label: drinkName,
          data: drinkData.history as any,
          borderColor: getRandomColor(),
          fill: false,
          tension: 0.1
        });
      }
    }
    
    chartInstance.update();
  });
});
</script>

<template>
  <div class="main-container">
    <div class="chart-container">
      <h1>Bar de la Bourse 📈</h1>
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
/* Les styles restent les mêmes */
.main-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;
  padding: 20px;
}
.chart-container {
  width: 100%;
  max-width: 900px;
}
.controls-container {
  width: 100%;
  max-width: 800px;
  background-color: var(--color-background-soft);
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
  border: 1px solid var(--color-border);
  border-radius: 5px;
  background-color: var(--color-background);
  color: var(--color-text);
  transition: background-color 0.2s;
}
button:hover {
  background-color: var(--color-background-mute);
}
</style>
