// proxy.js
const WebSocket = require('ws');


// Configuration
const PORT = 3007;
const REMOTE_WS_URL = 'wss://api.composteur.cielnewton.fr/ws/'; // Utilisation de wss:// au lieu de https://
let TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiY2xpZW50IiwiaWF0IjoxNzQ0MTA2MTU3LCJleHAiOjE3NDQxMDk3NTd9.Xj2HQnpHq9SyDfrA0YEJBLSF5EgV9H0CFKz0BgcrSpI';


// Créer un serveur WebSocket local qui servira de proxy
const wss = new WebSocket.Server({port: PORT});

fetch('https://api.composteur.cielnewton.fr/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      password: 'nEwton92'
    })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Identifiants incorrects');
    }
    return response.json();
  })
  .then(data => {
    console.log('Token JWT reçu :', data.token);
    // Tu peux ensuite stocker ce token, par exemple :
    TOKEN = data.token;
  })
  .catch(error => {
    console.error('Erreur de connexion :', error.message);
  });

// Fonction pour créer une connexion au serveur distant
function connectToRemoteServer(ws) {
   console.log('Tentative de connexion au serveur distant:', REMOTE_WS_URL);
  
   // Créer une connexion WebSocket vers le serveur distant avec le token dans les en-têtes
   const remoteSocket = new WebSocket(REMOTE_WS_URL, {
       headers: {
           'Authorization': `Bearer ${TOKEN}`
       }
   });


   // Quand le serveur distant est ouvert
   remoteSocket.on('open', () => {
       console.log('Connexion WebSocket avec le serveur distant ouverte');
   });


   // Quand un message est reçu du client local
   ws.on('message', (data) => {
    const message = JSON.parse(data.toString());
    console.log('Message reçu du client local:', message);
  
    if (remoteSocket.readyState === WebSocket.OPEN) {
      remoteSocket.send(JSON.stringify(message)); // ✅ envoyer une string
    } else {
      console.log('Connexion au serveur distant non établie');
      ws.send(JSON.stringify({ error: 'Connexion au serveur distant non établie' }));
    }
  });

   // Quand un message est reçu du serveur distant
   
remoteSocket.on('message', (data) => {
    const message = JSON.parse(data.toString());
    console.log('Message reçu du serveur distant:', message);
  
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message)); // ✅ envoyer une string
    } else {
      console.log('Connexion au client local non établie');
    }
  });
  


   // Gérer les fermetures de connexion
   ws.on('close', () => {
       console.log('Connexion WebSocket avec le client local fermée');
       if (remoteSocket.readyState === WebSocket.OPEN) {
           remoteSocket.close();
       }
   });


   remoteSocket.on('close', () => {
       console.log('Connexion WebSocket avec le serveur distant fermée');
       if (ws.readyState === WebSocket.OPEN) {
           ws.close();
       }
   });


   // Gérer les erreurs
   ws.on('error', (err) => {
       console.log('Erreur WebSocket du client local:', err);
   });


   remoteSocket.on('error', (err) => {
       console.log('Erreur WebSocket du serveur distant:', err);
       // Tentative de reconnexion après un délai
       setTimeout(() => {
           console.log('Tentative de reconnexion au serveur distant...');
           if (ws.readyState === WebSocket.OPEN) {
               connectToRemoteServer(ws);
           }
       }, 5000);
   });


   return remoteSocket;
}


// Quand un client se connecte au serveur proxy
wss.on('connection', (ws) => {
   console.log('Client connecté au proxy WebSocket');
  
   // Créer une connexion au serveur distant
   const remoteSocket = connectToRemoteServer(ws);
  
   // Stocker la référence à la connexion distante
   ws.remoteSocket = remoteSocket;
});


console.log(`Serveur proxy WebSocket en écoute sur ws://localhost:${PORT}`);
