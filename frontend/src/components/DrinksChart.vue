<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { io } from 'socket.io-client';
import Chart from 'chart.js/auto';
import 'chartjs-adapter-date-fns';

// --- State ---
const chartCanvas = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;
const drinkState = reactive<{ names: string[] }>({ names: [] });

// --- Fonctions ---
const buyDrink = async (drinkName: string) => {
  try {
    await fetch(`http://localhost:3000/buy/${encodeURIComponent(drinkName)}`);
  } catch (error) {
    console.error("Erreur lors de l'achat:", error);
  }
};

// 🎨 Palette de couleurs prédéfinie pour une meilleure lisibilité
const COLOR_PALETTE = [
  '#3e95cd', '#8e5ea2', '#3cba9f', '#e8c3b9', '#c45850',
  '#ff6384', '#36a2eb', '#ffce56', '#4bc0c0', '#9966ff'
];
let colorIndex = 0;
const getNextColor = () => {
  const color = COLOR_PALETTE[colorIndex % COLOR_PALETTE.length];
  colorIndex++;
  return color;
};

// --- Lifecycle Hooks ---
onMounted(() => {
  if (!chartCanvas.value) return;
  const ctx = chartCanvas.value.getContext('2d');
  if (!ctx) return;

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: []
    },
    options: {
      // ✅ Améliorations du responsive
      responsive: true,
      maintainAspectRatio: false, // Très important pour le responsive en hauteur

      scales: {
        x: {
          type: 'time',
          time: { unit: 'second', displayFormats: { second: 'HH:mm:ss' }},
          title: { display: true, text: 'Temps' }
        },
        y: {
          beginAtZero: false, // Permet un meilleur zoom sur les variations
          title: { display: true, text: 'Prix (€)' }
        }
      },
      // ✅ Améliorations des infobulles (tooltips)
      plugins: {
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            title: (tooltipItems) => {
              // Affiche la date et l'heure dans le titre de l'infobulle
              const date = new Date(tooltipItems[0].parsed.x);
              return date.toLocaleTimeString();
            },
            label: (context) => {
              // Affiche "Nom: Prix €"
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                label += new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(context.parsed.y);
              }
              return label;
            }
          }
        },
        legend: {
          position: 'top', // La position de la légende
        }
      },
      interaction: {
        mode: 'index',
        intersect: false,
      }
    }
  });

  const socket = io('http://localhost:3000');

  socket.on('updatePrices', (drinks: { [key: string]: { history: {x: number, y: number}[] } }) => {
    if (!chartInstance) return;
    drinkState.names = Object.keys(drinks);

    for (const drinkName in drinks) {
      const drinkData = drinks[drinkName];
      let dataset = chartInstance.data.datasets.find(ds => ds.label === drinkName);

      if (dataset) {
        dataset.data = drinkData.history as any;
      } else {
        // ✅ Améliorations du style des lignes et des points
        chartInstance.data.datasets.push({
          label: drinkName,
          data: drinkData.history as any,
          borderColor: getNextColor(),
          borderWidth: 2, // Ligne plus épaisse
          pointRadius: 2, // Ajoute des petits points
          pointBackgroundColor: 'white',
          fill: false,
          tension: 0.1
        });
      }
    }
    
    chartInstance.update('quiet'); // 'quiet' pour une animation plus subtile
  });
});
</script>

<template>
  <div class="main-container">
    <div class="chart-wrapper">
      <h1>Bar de la Bourse 📈</h1>
      <div class="chart-container">
        <canvas ref="chartCanvas"></canvas>
      </div>
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
  width: 100%;
  gap: 2rem;
  padding: 1rem;
}

.chart-wrapper {
  width: 100%;
  max-width: 1200px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* On donne une hauteur au conteneur du graphique pour le responsive */
.chart-container {
  position: relative;
  width: 100%;
  height: 50vh; /* Hauteur relative à la vue */
  min-height: 400px; /* Hauteur minimale */
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
