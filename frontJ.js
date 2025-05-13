// Configuration & Constantes
const WSS_URL = 'ws://localhost:3007';
const API_URL = 'https://api.composteur.cielnewton.fr/';
const users = [{ username: 'admin', password: 'nEwton92' }];
let ws = null;
const historicalData = [];


// Configuration des requêtes API
const apiConfig = {
   headers: {
       'Content-Type': 'application/json',
       'Accept': 'application/json'
   }
};


// Importer le module WebSocket client
// const wsClient = require('./wsClient.js');
// Le module wsClient est chargé globalement via window.wsClient dans wsClient.js


// Interface utilisateur
function setTheme(theme) {
   document.documentElement.setAttribute('data-theme', theme);
   localStorage.setItem('theme', theme);
}


function toggleTheme() {
   setTheme(localStorage.getItem('theme') === 'light' ? 'dark' : 'light');
}


function checkAuth() {
   const isAuthenticated = sessionStorage.getItem('isAuthenticated');
   const loginContainer = document.getElementById('login-container');
   const appContainer = document.getElementById('app-container');
  
   if (isAuthenticated === 'true') {
       loginContainer.style.display = 'none';
       appContainer.style.display = 'block';
       const username = sessionStorage.getItem('username');
       const usernameDisplay = document.getElementById('username-display');
       if (usernameDisplay) usernameDisplay.textContent = `Bienvenue, ${username}`;
       return true;
   } else {
       loginContainer.style.display = 'block';
       appContainer.style.display = 'none';
       return false;
   }
}


function showNotification(title, message, type = 'info') {
   let notification = document.querySelector('.notification');
   if (!notification) {
       notification = document.createElement('div');
       document.body.appendChild(notification);
   }
  
   notification.innerHTML = `<div class="notification-title">${title}</div>
                            <div class="notification-message">${message}</div>`;
   notification.className = `notification ${type}`;
  
   setTimeout(() => notification.classList.add('show'), 10);
   setTimeout(() => {
       notification.classList.remove('show');
       setTimeout(() => notification.remove(), 300);
   }, 3000);
}


// Gestion des connexions
function updateConnectionStatus(type, status) {
   const connectionIcon = document.getElementById('connection-icon');
   const connectionText = document.getElementById('connection-text');
   if (!connectionIcon || !connectionText) return;
  
   connectionIcon.className = 'status-icon';
   const statusConfig = {
       'api': {
           'connected': { icon: '<i class="fas fa-link"></i>', text: 'API Connectée', class: 'connected' },
           'disconnected': { icon: '<i class="fas fa-unlink"></i>', text: 'API Déconnectée', class: 'disconnected' },
           'connecting': { icon: '<i class="fas fa-sync"></i>', text: 'Connexion API...', class: 'connecting' },
           'error': { icon: '<i class="fas fa-exclamation-triangle"></i>', text: 'Erreur API', class: 'disconnected' }
       },
       'websocket': {
           'connected': { icon: '<i class="fas fa-plug"></i>', text: 'WebSocket Connecté', class: 'connected' },
           'disconnected': { icon: '<i class="fas fa-plug"></i>', text: 'WebSocket Déconnecté', class: 'disconnected' },
           'connecting': { icon: '<i class="fas fa-sync"></i>', text: 'Connexion WebSocket...', class: 'connecting' },
           'error': { icon: '<i class="fas fa-exclamation-triangle"></i>', text: 'Erreur WebSocket', class: 'disconnected' }
       }
   };
  
   const config = statusConfig[type][status] || statusConfig[type]['error'];
   connectionIcon.classList.add(config.class);
   connectionIcon.innerHTML = config.icon;
   connectionText.textContent = config.text;
}


function showConnectionNotification(type, status) {
   const notifications = {
       'api': {
           'connected': { title: 'Succès', message: 'Connexion API établie', type: 'success' },
           'disconnected': { title: 'Attention', message: 'Déconnecté de l\'API', type: 'warning' },
           'error': { title: 'Erreur', message: 'Erreur de connexion API', type: 'error' }
       },
       'websocket': {
           'connected': { title: 'Succès', message: 'Connexion WebSocket établie', type: 'success' },
           'disconnected': { title: 'Attention', message: 'Déconnecté du WebSocket', type: 'warning' },
           'error': { title: 'Erreur', message: 'Erreur de connexion WebSocket', type: 'error' }
       }
   };


   const notification = notifications[type][status];
   if (notification) {
       showNotification(notification.title, notification.message, notification.type);
   }
}


// Gestion de l'authentification
async function authenticateWithServer() {
   // Désactivation temporaire de l'authentification
   console.log('Authentification désactivée temporairement');
   return true;
  
   // Code original commenté
   /*
   try {
       console.log('Tentative d\'authentification...');
       const response = await fetch(`${API_URL}/auth`, {
           method: 'POST',
           mode: 'no-cors', // Désactive les vérifications CORS
           headers: {
               ...apiConfig.headers
           }
       });
       console.log('Authentification réussie');
       return true;
   } catch (error) {
       console.error('Erreur lors de l\'authentification:', error);
       showNotification('Erreur d\'authentification', 'Impossible de s\'authentifier', 'error');
       return false;
   }
   */
}

let TOKEN = '';

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



// Gestion des données
async function fetchSensorData() {
   try {
       updateConnectionStatus('api', 'connecting');
       const urlComplete = `${API_URL}data`;
      
       console.log('Tentative de récupération des données depuis:', urlComplete);

       const response = await fetch(urlComplete, {
           method: 'GET',
           headers: {
               ...apiConfig.headers,
               'Authorization': `Bearer ${sessionStorage.getItem('token')}`
           }
       });

       if (!response.ok) {
           throw new Error(`HTTP error! status: ${response.status}`);
       }

       const data = await response.json();
       updateConnectionStatus('api', 'connected');
       showConnectionNotification('api', 'connected');
       
       return {
           temperature: data.temperature,
           humidite: data.humidity
       };

   } catch (error) {
       console.error('Erreur lors de la récupération des données:', error);
       updateConnectionStatus('api', 'error');
       showConnectionNotification('api', 'error');
       if (!navigator.onLine) {
           console.error('Pas de connexion Internet');
           showNotification('Erreur réseau', 'Pas de connexion Internet', 'error');
       } else {
           console.error('Serveur inaccessible');
           showNotification('Erreur serveur', 'Impossible d\'accéder aux données', 'error');
       }
       return null;
   }
}


// Récupération des données historiques
async function fetchHistoricalData(period = 'week') {
   try {
       updateConnectionStatus('api', 'connecting');
      
       // Construire l'URL de l'API en fonction de la période
       const apiUrl = `${API_URL}${period}`;
      
       // Effectuer la requête à l'API en POST
       const response = await fetch(apiUrl, {
           method: 'POST',
           headers: {
               'Content-Type': 'application/json',
               'Authorization': `Bearer ${TOKEN}`
           }
           // Pas de body, sauf si l'API en attend un
       });
      
       if (!response.ok) {
           throw new Error(`Erreur HTTP: ${response.status}`);
       }
      
       const data = await response.json();
      
       // Vérifier si les données sont valides
       if (!Array.isArray(data) || data.length === 0) {
           console.warn('Aucune donnée historique disponible');
           return [];
       }
      
       // Formater les données pour la compatibilité avec les fonctions existantes
       const formattedData = data.map(item => ({
           _time: item.timestamp,
           temperature: parseFloat(item.temperature),
           humidite: parseFloat(item.humidity)
       }));
      
       updateConnectionStatus('api', 'connected');
       showConnectionNotification('api', 'connected');
      
       return formattedData;
   } catch (error) {
       console.error('Erreur lors de la récupération des données historiques:', error);
       updateConnectionStatus('api', 'error');
       showConnectionNotification('api', 'error');
       showNotification('Erreur', 'Impossible de charger l\'historique', 'error');
       return [];
   }
}


function handleHistoricalData(data, period = 'week') {
   if (!Array.isArray(data) || data.length === 0) return;
  
   // Les données sont déjà formatées dans fetchHistoricalData
   window.lastHistoricalData = data;
   window.selectedPeriod = period;
   updateHistoricalTable();
   updateHistoricalCharts(data);
}


// Charts et visualisation
function initializeCharts() {
   const ctxTemp = document.getElementById('tempChart');
   const ctxHum = document.getElementById('humidityChart');
   if (!ctxTemp || !ctxHum) return;


   // Configuration commune pour les graphiques
   const chartConfig = {
       type: 'line',
       options: {
           responsive: true,
           maintainAspectRatio: false,
           scales: {
               x: {
                   type: 'time',
                   time: {
                       unit: 'hour',
                       displayFormats: {
                           hour: 'HH:mm'
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
                       text: 'Valeur'
                   }
               }
           },
           plugins: {
               legend: {
                   display: true
               },
               tooltip: {
                   mode: 'index',
                   intersect: false
               }
           }
       }
   };


   // Graphique de température
   window.tempChart = new Chart(ctxTemp, {
       ...chartConfig,
       data: {
           datasets: [{
               label: 'Température (°C)',
               data: [],
               borderColor: 'rgba(255, 99, 132, 1)',
               backgroundColor: 'rgba(255, 99, 132, 0.2)',
               borderWidth: 2,
               tension: 0.1,
               fill: true
           }]
       },
       options: {
           ...chartConfig.options,
           scales: {
               ...chartConfig.options.scales,
               y: {
                   ...chartConfig.options.scales.y,
                   title: {
                       display: true,
                       text: 'Température (°C)'
                   }
               }
           }
       }
   });


   // Graphique d'humidité
   window.humidityChart = new Chart(ctxHum, {
       ...chartConfig,
       data: {
           datasets: [{
               label: 'Humidité (%)',
               data: [],
               borderColor: 'rgba(54, 162, 235, 1)',
               backgroundColor: 'rgba(54, 162, 235, 0.2)',
               borderWidth: 2,
               tension: 0.1,
               fill: true
           }]
       },
       options: {
           ...chartConfig.options,
           scales: {
               ...chartConfig.options.scales,
               y: {
                   ...chartConfig.options.scales.y,
                   title: {
                       display: true,
                       text: 'Humidité (%)'
                   }
               }
           }
       }
   });
}


function updateHistoricalCharts(newData) {
   try {
       // Vérifier si les graphiques sont initialisés
       if (!window.tempChart || !window.humidityChart) {
           console.error('Les graphiques ne sont pas initialisés');
           return;
       }


       // Créer un point de données avec timestamp
       const timestamp = new Date(newData._time);
      
       // Mettre à jour le graphique de température
       window.tempChart.data.datasets[0].data.push({
           x: timestamp,
           y: newData.temperature
       });
      
       // Limiter le nombre de points de données
       if (window.tempChart.data.datasets[0].data.length > MAX_DATA_POINTS) {
           window.tempChart.data.datasets[0].data.shift();
       }
      
       // Mettre à jour le graphique d'humidité
       window.humidityChart.data.datasets[0].data.push({
           x: timestamp,
           y: newData.humidite
       });
      
       // Limiter le nombre de points de données
       if (window.humidityChart.data.datasets[0].data.length > MAX_DATA_POINTS) {
           window.humidityChart.data.datasets[0].data.shift();
       }
      
       // Mettre à jour les graphiques
       window.tempChart.update();
       window.humidityChart.update();
      
       console.log('Graphiques mis à jour avec succès');
   } catch (error) {
       console.error('Erreur lors de la mise à jour des graphiques:', error);
   }
}


function createHistoricalTableHTML(selectedPeriod) {
   console.log('Création du tableau historique avec la période:', selectedPeriod);
   
   const html = `
       <div class="period-selector">
           <label for="period-select">Période :</label>
           <select id="period-select">
               <option value="hour" ${selectedPeriod === 'hour' ? 'selected' : ''}>Dernière heure</option>
               <option value="day" ${selectedPeriod === 'day' ? 'selected' : ''}>Dernier jour</option>
               <option value="week" ${selectedPeriod === 'week' ? 'selected' : ''}>Dernière semaine</option>
               <option value="month" ${selectedPeriod === 'month' ? 'selected' : ''}>Dernier mois</option>
               <option value="year" ${selectedPeriod === 'year' ? 'selected' : ''}>Dernière année</option>
           </select>
           <button id="refresh-history-btn" class="refresh-btn">
               <i class="fas fa-sync-alt"></i> Actualiser
           </button>
       </div>
       <table id="historical-table">
           <thead><tr><th>Date/Heure</th><th>Température (°C)</th><th>Humidité (%)</th></tr></thead>
           <tbody></tbody>
       </table>
   `;

   // Initialiser le bouton après l'insertion du HTML
   requestAnimationFrame(() => {
       const refreshBtn = document.getElementById('refresh-history-btn');
       const periodSelect = document.getElementById('period-select');
       console.log('Éléments trouvés:', { refreshBtn, periodSelect });
       
       if (refreshBtn && periodSelect) {
           setupRefreshButton(refreshBtn, periodSelect);
       } else {
           console.error('Éléments non trouvés après insertion du HTML');
       }
   });

   return html;
}


function updateHistoricalTable() {
   const tableContainer = document.getElementById('data-history');
   if (!tableContainer) return;
  
   if (!document.getElementById('historical-table')) {
       tableContainer.innerHTML = createHistoricalTableHTML(window.selectedPeriod);
   }

   const tbody = document.querySelector('#historical-table tbody');
   if (!tbody) return;
  
   tbody.innerHTML = '';
   const historicalData = window.lastHistoricalData || [];
  
   if (historicalData.length === 0) {
       tbody.innerHTML = `
           <tr>
               <td colspan="3" class="no-data">Aucune donnée disponible pour cette période</td>
           </tr>
       `;
       return;
   }
  
   const sortedData = [...historicalData].sort((a, b) => new Date(b._time) - new Date(a._time));
   const maxEntries = 100;
  
   sortedData.slice(0, maxEntries).forEach(data => {
       const date = new Date(data._time);
       const formattedDate = date.toLocaleDateString();
       const formattedTime = date.toLocaleTimeString();
       const tempColor = getColor(data.temperature, { low: 40, high: 60 });
       const humColor = getColor(data.humidite, { low: 40, high: 60 });

       tbody.innerHTML += `
           <tr>
               <td>${formattedDate} ${formattedTime}</td>
               <td style="color: ${tempColor}; font-weight: bold;">${data.temperature.toFixed(1)}</td>
               <td style="color: ${humColor}; font-weight: bold;">${data.humidite.toFixed(1)}</td>
           </tr>
       `;
   });
}


function getColor(value, thresholds) {
   if (value < thresholds.low) return '#3498db';
   if (value > thresholds.high) return '#e74c3c';
   return 'var(--primary-green)';
}


// Gestion des onglets
function initTabs() {
   const tabs = document.querySelectorAll('.tab-button');
   const contents = document.querySelectorAll('.tab-content');
  
   tabs.forEach(tab => {
       tab.addEventListener('click', () => {
           // Retirer la classe active de tous les onglets
           tabs.forEach(t => t.classList.remove('active'));
           contents.forEach(c => c.classList.remove('active'));
          
           // Ajouter la classe active à l'onglet cliqué
           tab.classList.add('active');
           const contentId = tab.getAttribute('aria-controls');
           const content = document.getElementById(contentId);
           if (content) {
               content.classList.add('active');
           }
       });
   });
}


function initModeSwitch() {
   const modeSwitch = document.getElementById('mode-switch');
   const modeLabel = document.getElementById('mode-label');
   if (!modeSwitch || !modeLabel) return;


   let isAutomatic = true;
   modeSwitch.classList.add('active');
   modeLabel.textContent = 'Mode Automatique';


   modeSwitch.addEventListener('click', function() {
       isAutomatic = !isAutomatic;
       modeSwitch.classList.toggle('active');
       modeLabel.textContent = isAutomatic ? 'Mode Automatique' : 'Mode Manuel';
      
       // Envoyer l'état du mode au serveur
       if (ws && ws.readyState === WebSocket.OPEN) {
           ws.send(JSON.stringify({
               type: 'mode_change',
               mode: isAutomatic ? 'auto' : 'manual'
           }));
       }
   });
}


// Initialisation de l'application
async function initApp() {
   try {
       // Authentification désactivée temporairement
       // const isAuthenticated = await authenticateWithServer();
       // if (!isAuthenticated) {
       //     console.error('Échec de l\'authentification');
       //     return;
       // }


       // Initialisation des composants
       initializeCharts();
       initWaterControl();
       initModeSwitch();
       initTabs();
       initWebSocket();
      
       // Récupération des données initiales
       const initialData = await fetchSensorData();
       if (initialData) {
           updateCharts(initialData.temperature, initialData.humidite);
       } else {
           showNotification('Attention', 'Données non disponibles', 'warning');
       }
      
       // Charger les données historiques initiales
       const historicalData = await fetchHistoricalData('week');
       if (historicalData) {
           handleHistoricalData(historicalData, 'week');
       }
      
       // Vérification périodique de la connexion WebSocket
       setInterval(() => {
           if (!ws || ws.readyState !== WebSocket.OPEN) {
               console.log('WebSocket non connecté, tentative de reconnexion...');
               initWebSocket();
           }
       }, 30000);
      
   } catch (error) {
       console.error('Erreur lors de l\'initialisation:', error);
       showNotification('Erreur', 'Impossible d\'initialiser l\'application', 'error');
   }
}


// Event listeners
document.addEventListener('DOMContentLoaded', () => {
   const loginForm = document.getElementById('login-form');
   if (loginForm) {
       loginForm.addEventListener('submit', (e) => {
           e.preventDefault();
          
           const username = document.getElementById('username').value;
           const password = document.getElementById('password').value;
           const errorMessage = document.getElementById('error-message');
          
           const user = users.find(u => u.username === username && u.password === password);
          
           if (user) {
               sessionStorage.setItem('isAuthenticated', 'true');
               sessionStorage.setItem('username', username);
               errorMessage.textContent = '';
               checkAuth();
               initApp();
           } else {
               errorMessage.textContent = 'Identifiants incorrects';
               document.getElementById('password').value = '';
           }
       });
   }


   const themeToggle = document.getElementById('theme-toggle');
   if (themeToggle) {
       themeToggle.addEventListener('click', toggleTheme);
   }
  
   const logoutBtn = document.getElementById('logout-btn');
   if (logoutBtn) {
       logoutBtn.style.display = 'block';
       logoutBtn.addEventListener('click', () => {
           sessionStorage.removeItem('isAuthenticated');
           sessionStorage.removeItem('username');
           if (ws) {
               ws.close();
           }
           checkAuth();
       });
   }
  
   if (checkAuth()) {
       initApp();
   }
});


function updateCharts(temperature, humidite, time) {
   const timestamp = time || new Date().toLocaleTimeString();
  
   console.log('Mise à jour des graphiques avec:', { temperature, humidite, timestamp });
  
   if (!window.tempChart || !window.humidityChart) {
       console.error('Les graphiques ne sont pas initialisés');
       return;
   }
  
   const getColors = (value, thresholds) => {
       if (value < thresholds.low) return { bg: 'rgba(52, 152, 219, 0.6)', border: 'rgba(41, 128, 185, 1)' };
       if (value > thresholds.high) return { bg: 'rgba(231, 76, 60, 0.6)', border: 'rgba(192, 57, 43, 1)' };
       return { bg: 'rgba(46, 204, 113, 0.6)', border: 'rgba(39, 174, 96, 1)' };
   };


   const tempColors = getColors(temperature, { low: 40, high: 60 });
   const humColors = getColors(humidite, { low: 40, high: 60 });
  
   const maxDataPoints = 10;
  
   // Mise à jour du graphique de température
   if (window.tempChart.data.labels.length >= maxDataPoints) {
       window.tempChart.data.labels.shift();
       window.tempChart.data.datasets[0].data.shift();
   }
   window.tempChart.data.labels.push(timestamp);
   window.tempChart.data.datasets[0].data.push(temperature);
   window.tempChart.data.datasets[0].backgroundColor = tempColors.bg;
   window.tempChart.data.datasets[0].borderColor = tempColors.border;
   window.tempChart.update('none');
  
   // Mise à jour du graphique d'humidité
   if (window.humidityChart.data.labels.length >= maxDataPoints) {
       window.humidityChart.data.labels.shift();
       window.humidityChart.data.datasets[0].data.shift();
   }
   window.humidityChart.data.labels.push(timestamp);
   window.humidityChart.data.datasets[0].data.push(humidite);
   window.humidityChart.data.datasets[0].backgroundColor = humColors.bg;
   window.humidityChart.data.datasets[0].borderColor = humColors.border;
   window.humidityChart.update('none');
  
   // Mise à jour des indicateurs
   updateTempHumidityIndicators(temperature, humidite);
}


function updateTempHumidityIndicators(temperature, humidity) {
   console.log('Mise à jour des indicateurs:', { temperature, humidity });
  
   const updateValue = (id, value, unit, thresholds) => {
       const element = document.getElementById(id);
       if (!element) {
           console.error(`Élément ${id} non trouvé`);
           return;
       }
      
       element.textContent = value;
       element.className = 'sensor-value';
       element.classList.add(value < thresholds.low ? 'value-low' : value > thresholds.high ? 'value-high' : 'value-normal');
      
       // Remove classes individually instead of using a space-separated string
       if (value < thresholds.low) {
           element.classList.remove('value-normal', 'value-high');
       } else if (value > thresholds.high) {
           element.classList.remove('value-normal', 'value-low');
       } else {
           element.classList.remove('value-low', 'value-high');
       }
      
       console.log(`Indicateur ${id} mis à jour:`, { value, unit });
   };
  
   updateValue('current-temp', temperature, '°C', { low: 40, high: 60 });
   updateValue('current-humidity', humidity, '%', { low: 40, high: 60 });
}


// WebSocket communication
function initWebSocket() {
   if (ws) {
       console.log('Fermeture de la connexion WebSocket existante');
       ws.close();
       ws = null;
   }


   try {
       updateConnectionStatus('websocket', 'connecting');
       console.log('Tentative de connexion WebSocket à:', WSS_URL);
      
       // Ajout d'un timeout pour la connexion
       const connectionTimeout = setTimeout(() => {
           if (ws && ws.readyState !== WebSocket.OPEN) {
               console.log('Timeout de connexion WebSocket');
               ws.close();
               ws = null;
               updateConnectionStatus('websocket', 'error');
               showConnectionNotification('websocket', 'error');
              
               // Tentative de reconnexion avec un délai plus long
               const delay = 15000; // 15 secondes
               console.log(`Tentative de reconnexion dans ${delay/1000} secondes...`);
               setTimeout(() => {
                   initWebSocket();
               }, delay);
           }
       }, 10000); // 10 secondes de timeout
      
       // Tentative de connexion avec gestion d'erreur
       try {
           ws = new WebSocket(WSS_URL);
           ws.binaryType = 'arraybuffer';
          
           let connectionEstablished = false;
           let dataRequestTimeout = null;
          
           ws.onopen = () => {
               clearTimeout(connectionTimeout);
               connectionEstablished = true;
               console.log('Connexion WebSocket établie');
               updateConnectionStatus('websocket', 'connected');
               showConnectionNotification('websocket', 'connected');
              
               // Attendre 5 secondes avant d'envoyer la demande de données
               dataRequestTimeout = setTimeout(() => {
                   if (ws && ws.readyState === WebSocket.OPEN) {
                       try {
                           ws.send(JSON.stringify({ type: 'get_data' }));
                           console.log('Demande de données envoyée');
                       } catch (error) {
                           console.error('Erreur lors de l\'envoi de la demande de données:', error);
                       }
                   } else {
                       console.log('Impossible d\'envoyer la demande de données: WebSocket non connecté');
                   }
               }, 5000);
           };


           ws.onclose = (event) => {
               clearTimeout(connectionTimeout);
               clearTimeout(dataRequestTimeout);
               connectionEstablished = false;
              
               console.log('Connexion WebSocket fermée:', {
                   code: event.code,
                   reason: event.reason || 'Aucune raison spécifiée',
                   wasClean: event.wasClean,
                   timestamp: new Date().toISOString(),
                   readyState: ws ? ws.readyState : 'CLOSED'
               });
              
               updateConnectionStatus('websocket', 'disconnected');
               showConnectionNotification('websocket', 'disconnected');
              
               // Tentative de reconnexion uniquement si ce n'est pas une fermeture intentionnelle
               if (event.code !== 1000 && event.code !== 1001) {
                   const delay = 15000; // 15 secondes
                   console.log(`Tentative de reconnexion dans ${delay/1000} secondes...`);
                   setTimeout(() => {
                       if (!connectionEstablished) {
                           initWebSocket();
                       }
                   }, delay);
               }
              
               ws = null;
           };


           ws.onerror = (error) => {
               clearTimeout(connectionTimeout);
               clearTimeout(dataRequestTimeout);
              
               console.error('Erreur WebSocket:', {
                   error: error,
                   readyState: ws ? ws.readyState : 'CLOSED',
                   url: WSS_URL,
                   timestamp: new Date().toISOString(),
                   protocol: ws ? ws.protocol : '',
                   extensions: ws ? ws.extensions : ''
               });
              
               updateConnectionStatus('websocket', 'error');
               showConnectionNotification('websocket', 'error');
           };


           ws.onmessage = (event) => {
               try {
                   let data;
                  
                   // Vérifier le type de données reçu
                   if (event.data instanceof ArrayBuffer) {
                       // Convertir ArrayBuffer en chaîne de caractères
                       const decoder = new TextDecoder('utf-8');
                       const jsonString = decoder.decode(event.data);
                       data = JSON.parse(jsonString);
                   } else if (typeof event.data === 'string') {
                       // Si c'est déjà une chaîne, parser directement
                       data = JSON.parse(event.data);
                   } else {
                       // Pour les autres types (Blob, etc.)
                       console.error('Type de données non supporté:', typeof event.data);
                       return;
                   }
                  
                   console.log('Message reçu:', data);
                   handleWebSocketMessage(data);
               } catch (error) {
                   console.error('Erreur lors du traitement du message:', error);
               }
           };
       } catch (connectionError) {
           clearTimeout(connectionTimeout);
           console.error('Erreur lors de la création du WebSocket:', connectionError);
           updateConnectionStatus('websocket', 'error');
           showConnectionNotification('websocket', 'error');
          
           // Tentative de reconnexion avec un délai
           const delay = 15000; // 15 secondes
           console.log(`Tentative de reconnexion dans ${delay/1000} secondes...`);
           setTimeout(() => {
               initWebSocket();
           }, delay);
       }
   } catch (error) {
       console.error('Erreur lors de l\'initialisation du WebSocket:', {
           error: error,
           stack: error.stack,
           timestamp: new Date().toISOString()
       });
       updateConnectionStatus('websocket', 'error');
       showConnectionNotification('websocket', 'error');
   }
}


function handleWebSocketMessage(data) {
   try {
       console.log('Message WebSocket reçu:', data);

       // Traitement des données MQTT avec topic ma/temperature
       if (data.topic === 'ma/temperature') {
           console.log('Données de température reçues:', {
               temperature: data.temperature,
               humidite: data.humidite
           });
           updateCharts(data.temperature, data.humidite);
           updateTempHumidityIndicators(data.temperature, data.humidite);
       }
       // Traitement de l'état de la pompe
       else if (data.topic === 'ma/pump') {
           updateWaterControlState(data.state);
       }
       // Traitement des données historiques
       else if (data.type === 'historical_data') {
           handleHistoricalData(data.data);
       }
       // Traitement des erreurs
       else if (data.error) {
           showNotification('Erreur', data.error, 'error');
       }
   } catch (error) {
       console.error('Erreur lors du traitement du message WebSocket:', error);
   }
}


// Controls
function updateWaterControlState(isActive) {
   const waterControl = document.getElementById('water-control');
   if (!waterControl) return;
  
   // Convertir la valeur en booléen si c'est une chaîne "ON" ou "OFF"
   const activeState = typeof isActive === 'string'
       ? isActive === 'ON'
       : Boolean(isActive);
  
   waterControl.textContent = activeState ? 'Désactiver la pompe' : 'Activer la pompe';
   waterControl.classList.remove('active', 'inactive');
   waterControl.classList.add(activeState ? 'active' : 'inactive');
   waterControl.dataset.active = activeState;
  
   const pumpStatus = document.getElementById('pump-status');
   if (pumpStatus) {
       pumpStatus.textContent = activeState ? 'Pompe active' : 'Pompe inactive';
       pumpStatus.className = `status-value ${activeState ? 'active' : 'inactive'}`;
   }
}


function initWaterControl() {
   const waterControl = document.getElementById('water-control');
   if (!waterControl) return;
  
   waterControl.addEventListener('click', function(e) {
       e.preventDefault();
       if (waterControl.disabled) return;
      
       const currentActive = waterControl.dataset.active === 'true';
       const newState = !currentActive;
       waterControl.disabled = true;
      
       if (ws && ws.readyState === WebSocket.OPEN) {
           ws.send(JSON.stringify({ capteur: 'pompe', etat: newState ? 'on' : 'off' }));
          
           const timeoutId = setTimeout(() => {
               waterControl.disabled = false;
               showNotification('Erreur', 'Pas de réponse du serveur', 'error');
           }, 5000);
          
           waterControl.dataset.timeoutId = timeoutId;
       } else {
           showNotification('Erreur', 'WebSocket non connecté', 'error');
           setTimeout(() => waterControl.disabled = false, 1000);
       }
   });
}


function setupPeriodSelector(select, button) {
   if (!select || !button) return;


   select.addEventListener('change', () => {
       const selectedPeriod = select.value;
       updateHistoricalTable();
       updateHistoricalCharts(window.lastHistoricalData);
   });


   button.addEventListener('click', () => {
       const selectedPeriod = select.value;
       updateHistoricalTable();
       updateHistoricalCharts(window.lastHistoricalData);
   });
}


function setupRefreshButton(button, select) {
   if (!button || !select) return;
   
   button.onclick = async () => {
       const period = select.value;
       const data = await fetch(`${API_URL}${period}`, {
           method: 'POST',
           headers: { 'Authorization': `Bearer ${TOKEN}` }
       }).then(r => r.json());
       
       if (data && data.length > 0) {
           handleHistoricalData(data, period);
           updateHistoricalTable();
       }
   };
}


function handleHistoricalUpdate(data) {
   try {
       // Vérifier si les données sont valides
       if (!data || !data.timestamp || !data.temperature || !data.humidity) {
           console.warn('Données historiques invalides reçues:', data);
           return;
       }


       // Formater les données pour la compatibilité
       const formattedData = {
           _time: data.timestamp,
           temperature: parseFloat(data.temperature),
           humidite: parseFloat(data.humidity)
       };


       // Mettre à jour les graphiques et le tableau
       updateHistoricalCharts(formattedData);
       updateHistoricalTable(formattedData);


       // Mettre à jour le statut de connexion
       updateConnectionStatus('websocket', 'connected');
   } catch (error) {
       console.error('Erreur lors du traitement des données historiques:', error);
       updateConnectionStatus('websocket', 'error');
       showConnectionNotification('websocket', 'error');
   }
}


function isJsonString(str) {
    try {
        JSON.parse(str);
        return true;
    } catch {
        return false;
    }
}

// Constantes pour la gestion des données
const MAX_DATA_POINTS = 100; // Nombre maximum de points de données dans les graphiques
const MAX_TABLE_ROWS = 50;   // Nombre maximum de lignes dans le tableau
