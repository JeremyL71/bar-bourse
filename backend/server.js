const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors'); // Importer CORS
const fs = require('fs'); // Importer le module File System

const app = express();

// --- Configuration CORS ---
// Autorise les requêtes depuis votre frontend Vue.js
app.use(cors({
  origin: 'http://localhost:5173' // Mettez le port de votre serveur de dev Vue
}));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// --- Initialisation des boissons ---
let drinks = {};
try {
  const drinksData = fs.readFileSync('drinks.json', 'utf8');
  const drinksFromFile = JSON.parse(drinksData);
  
  drinksFromFile.forEach(drink => {
    const now = Date.now();
    drinks[drink.name] = {
      price: drink.price,
      lastPurchased: now,
      // On ajoute un historique pour chaque boisson !
      history: [{ x: now, y: drink.price }] 
    };
  });
  console.log("🍻 Boissons chargées avec succès !");
} catch (error) {
  // ... (gestion d'erreur)
}

// Fonction pour ajouter un point à l'historique et le limiter
function addToHistory(drinkName) {
  const drink = drinks[drinkName];
  const now = Date.now();
  drink.history.push({ x: now, y: drink.price });

  // Garde seulement les 50 derniers points pour ne pas surcharger la mémoire
  if (drink.history.length > 50) {
    drink.history.shift();
  }
}

// ... (logique de connexion io.on('connection', ...))

// Boucle pour la baisse des prix (MODIFIÉE)
setInterval(() => {
  const now = Date.now();
  let pricesHaveChanged = false;

  for (const name in drinks) {
    if (now - drinks[name].lastPurchased > 20000) {
      drinks[name].price *= 0.90;
      drinks[name].lastPurchased = now;
      addToHistory(name); // On sauvegarde le nouveau point
      pricesHaveChanged = true;
    }
  }

  if (pricesHaveChanged) {
    console.log('📉 Baisse de prix automatique, envoi des nouvelles valeurs...');
    io.emit('updatePrices', drinks);
  }
}, 5000);

// Route pour l'achat d'une boisson (MODIFIÉE)
app.get('/buy/:drinkName', (req, res) => {
    const { drinkName } = req.params;
    if (drinks[drinkName]) {
        drinks[drinkName].price *= 1.10;
        drinks[drinkName].lastPurchased = Date.now();
        addToHistory(drinkName); // On sauvegarde aussi le point lors d'un achat
        
        console.log(`📈 Achat de ${drinkName}, nouveau prix: ${drinks[drinkName].price.toFixed(2)}€`);
        io.emit('updatePrices', drinks);
        
        res.status(200).json({ message: `Achat de ${drinkName} enregistré !` });
    } else {
        res.status(404).json({ message: 'Boisson inconnue' });
    }
});

server.listen(3000, () => {
  console.log('🚀 Serveur backend en écoute sur http://localhost:3000');
});
