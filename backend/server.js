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
    drinks[drink.name] = {
      price: drink.price,
      lastPurchased: Date.now() // On initialise le temps du dernier achat
    };
  });
  console.log("🍻 Boissons chargées avec succès !");
} catch (error) {
  console.error("Erreur lors du chargement du fichier drinks.json:", error);
  process.exit(1); // On arrête si la config est mauvaise
}


// --- Logique de l'application ---

// Quand un client se connecte
io.on('connection', (socket) => {
  console.log('✅ Un client est connecté !');
  // On lui envoie les prix actuels dès sa connexion
  socket.emit('updatePrices', drinks);
});

// Boucle pour la baisse des prix
setInterval(() => {
  const now = Date.now();
  let pricesHaveChanged = false;

  for (const name in drinks) {
    // Si pas achetée depuis 20 secondes
    if (now - drinks[name].lastPurchased > 20000) {
      drinks[name].price *= 0.90; // Baisse de 10%
      drinks[name].lastPurchased = now; // Important: on réinitialise pour éviter une baisse continue
      pricesHaveChanged = true;
    }
  }

  if (pricesHaveChanged) {
    console.log('📉 Baisse de prix automatique, envoi des nouvelles valeurs...');
    io.emit('updatePrices', drinks);
  }
}, 5000); // On vérifie toutes les 5 secondes

// Route pour l'achat d'une boisson
app.get('/buy/:drinkName', (req, res) => {
    const { drinkName } = req.params;
    if (drinks[drinkName]) {
        drinks[drinkName].price *= 1.10; // Hausse de 10%
        drinks[drinkName].lastPurchased = Date.now(); // On met à jour le temps de l'achat !
        
        console.log(`📈 Achat de ${drinkName}, nouveau prix: ${drinks[drinkName].price.toFixed(2)}€`);
        io.emit('updatePrices', drinks); // On notifie tout le monde du nouveau prix
        
        res.status(200).json({ message: `Achat de ${drinkName} enregistré !` });
    } else {
        res.status(404).json({ message: 'Boisson inconnue' });
    }
});

server.listen(3000, () => {
  console.log('🚀 Serveur backend en écoute sur http://localhost:3000');
});
