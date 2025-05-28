// Configuration & Constantes
const WSS_URL = 'ws://localhost:3007';
const API_URL = 'https://api.composteur.cielnewton.fr/';
const API_CONNEXION = 'https://api.composteur.cielnewton.fr/login';

// Seuils de température et d'humidité
const TEMP_MIN = 40;
const TEMP_MAX = 60;
const HUMIDITY_MIN = 40;
const HUMIDITY_MAX = 60;

// Intervalles de mise à jour
const DATA_UPDATE_INTERVAL = 5000;
const PUMP_CHECK_INTERVAL = 10000;

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

   const logoutBtn = document.getElementById('logout-btn');
   if (logoutBtn) {
       logoutBtn.style.display = isAuthenticated === 'true' ? 'block' : 'none';
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
const password = document.getElementById('password').value;

fetch('https://api.composteur.cielnewton.fr/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      password: password
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
       showNotification('Succès', 'Connexion API établie', 'success');
       
       return {
           temperature: data.temperature,
           humidite: data.humidity
       };

   } catch (error) {
       console.error('Erreur lors de la récupération des données:', error);
       updateConnectionStatus('api', 'error');
       
       if (!navigator.onLine) {
           showNotification('Erreur réseau', 'Pas de connexion Internet', 'error');
       } else if (error.message.includes('401')) {
           showNotification('Erreur d\'authentification', 'Token invalide ou expiré', 'error');
       } else if (error.message.includes('404')) {
           showNotification('Erreur serveur', 'Ressource non trouvée', 'error');
       } else if (error.message.includes('500')) {
           showNotification('Erreur serveur', 'Erreur interne du serveur', 'error');
       } else {
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
       });
      
       if (!response.ok) {
           throw new Error(`Erreur HTTP: ${response.status}`);
       }
      
       const data = await response.json();
       console.log('Données historiques brutes reçues:', data);
      
       // Correction du mapping pour garantir une date ISO valide
       const formattedData = data.map(item => {
           let time = item._time;
           // Si c'est un timestamp numérique, convertir en ISO
           if (typeof time === 'number') {
               time = new Date(time).toISOString();
           } else if (typeof time === 'string' && isNaN(Date.parse(time))) {
               // Si la string n'est pas reconnue, essayer de la parser (à adapter si besoin)
               // Ici, on laisse tel quel, mais on pourrait ajouter un parseur custom
           }
           return {
               _time: time,
               temperature: parseFloat(item.temperature),
               humidite: parseFloat(item.humidite)
           };
       });
      
       // Vérifier si les données sont valides
       if (!Array.isArray(formattedData) || formattedData.length === 0) {
           console.warn('Aucune donnée historique disponible');
           return [];
       }
      
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
   
   window.lastHistoricalData = data;
   window.selectedPeriod = period;
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
                       displayFormats: {
                           hour: 'HH:mm',
                           day: 'dd/MM',
                           week: 'dd/MM',
                           month: 'MM/yyyy'
                       }
                   },
                   title: {
                       display: true,
                       text: 'Date et Heure',
                       font: {
                           size: 14,
                           weight: 'bold'
                       }
                   },
                   ticks: {
                       autoSkip: true,
                       maxRotation: 45,
                       minRotation: 20
                   }
               },
               y: {
                   beginAtZero: true,
                   title: {
                       display: true,
                       text: 'Valeur',
                       font: {
                           size: 14,
                           weight: 'bold'
                       }
                   }
               }
           },
           plugins: {
               legend: {
                   display: true,
                   position: 'top',
                   labels: {
                       font: {
                           size: 14,
                           weight: 'bold'
                       }
                   }
               },
               tooltip: {
                   mode: 'index',
                   intersect: false,
                   callbacks: {
                       label: function(context) {
                           let label = context.dataset.label || '';
                           if (label) {
                               label += ': ';
                           }
                           if (context.parsed.y !== null) {
                               label += context.parsed.y.toFixed(1);
                           }
                           return label;
                       }
                   }
               }
           }
       }
   };

   // Graphique de température (stem plot)
   window.tempChart = new Chart(ctxTemp, {
       type: 'scatter',
       data: {
           datasets: [
               // Tiges verticales
               {
                   type: 'line',
                   label: 'Tiges',
                   data: [], // sera rempli dynamiquement
                   borderColor: 'rgba(255, 99, 132, 1)',
                   borderWidth: 2,
                   showLine: true,
                   fill: false,
                   pointRadius: 0,
                   segment: {
                       borderDash: [],
                   },
                   order: 1,
               },
               // Points
               {
                   type: 'scatter',
                   label: 'Température (°C)',
                   data: [],
                   backgroundColor: 'rgba(255, 99, 132, 0.85)',
                   borderColor: 'rgba(255, 99, 132, 1)',
                   borderWidth: 2,
                   pointRadius: 5,
                   pointHoverRadius: 7,
                   order: 2,
               }
           ]
       },
       options: {
           ...chartConfig.options,
           plugins: {
               ...chartConfig.options.plugins,
               legend: {
                   display: true,
                   position: 'top',
                   labels: {
                       font: {
                           size: 14,
                           weight: 'bold'
                       }
                   }
               }
           },
           scales: {
               ...chartConfig.options.scales,
               x: {
                   ...chartConfig.options.scales.x,
                   type: 'time',
                   time: chartConfig.options.scales.x.time,
                   ticks: chartConfig.options.scales.x.ticks
               },
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

   // Graphique d'humidité (stem plot)
   window.humidityChart = new Chart(ctxHum, {
       type: 'scatter',
       data: {
           datasets: [
               // Tiges verticales
               {
                   type: 'line',
                   label: 'Tiges',
                   data: [], // sera rempli dynamiquement
                   borderColor: 'rgba(54, 162, 235, 1)',
                   borderWidth: 2,
                   showLine: true,
                   fill: false,
                   pointRadius: 0,
                   segment: {
                       borderDash: [],
                   },
                   order: 1,
               },
               // Points
               {
                   type: 'scatter',
                   label: 'Humidité (%)',
                   data: [],
                   backgroundColor: 'rgba(54, 162, 235, 0.85)',
                   borderColor: 'rgba(54, 162, 235, 1)',
                   borderWidth: 2,
                   pointRadius: 5,
                   pointHoverRadius: 7,
                   order: 2,
               }
           ]
       },
       options: {
           ...chartConfig.options,
           plugins: {
               ...chartConfig.options.plugins,
               legend: {
                   display: true,
                   position: 'top',
                   labels: {
                       font: {
                           size: 14,
                           weight: 'bold'
                       }
                   }
               }
           },
           scales: {
               ...chartConfig.options.scales,
               x: {
                   ...chartConfig.options.scales.x,
                   type: 'time',
                   time: chartConfig.options.scales.x.time,
                   ticks: chartConfig.options.scales.x.ticks
               },
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

function updateHistoricalCharts(dataArray) {
    try {
        if (!window.tempChart || !window.humidityChart) {
            console.error('Les graphiques ne sont pas initialisés');
            return;
        }

        // Préparation des données pour stem plot
        const now = Date.now();
        const oneMonth = 31 * 24 * 60 * 60 * 1000;
        const minValidDate = new Date('2025-01-01').getTime();
        const tempMap = new Map();
        const humMap = new Map();
        if (Array.isArray(dataArray)) {
            dataArray.forEach(data => {
                const timestamp = new Date(data._time);
                const t = timestamp.getTime();
                const tempVal = (isFinite(data.temperature) && data.temperature >= TEMP_MIN && data.temperature <= TEMP_MAX) ? data.temperature : null;
                const humVal = (isFinite(data.humidite) && data.humidite >= HUMIDITY_MIN && data.humidite <= HUMIDITY_MAX) ? data.humidite : null;
                if (
                    !isNaN(t) &&
                    t > minValidDate &&
                    t < now + oneMonth &&
                    t !== 0
                ) {
                    tempMap.set(t, { x: timestamp, y: tempVal });
                    humMap.set(t, { x: timestamp, y: humVal });
                }
            });
        } else if (dataArray && dataArray._time) {
            const timestamp = new Date(dataArray._time);
            const t = timestamp.getTime();
            const tempVal = (isFinite(dataArray.temperature) && dataArray.temperature >= TEMP_MIN && dataArray.temperature <= TEMP_MAX) ? dataArray.temperature : null;
            const humVal = (isFinite(dataArray.humidite) && dataArray.humidite >= HUMIDITY_MIN && dataArray.humidite <= HUMIDITY_MAX) ? dataArray.humidite : null;
            if (
                !isNaN(t) &&
                t > minValidDate &&
                t < now + oneMonth &&
                t !== 0
            ) {
                tempMap.set(t, { x: timestamp, y: tempVal });
                humMap.set(t, { x: timestamp, y: humVal });
            }
        }
        const tempData = Array.from(tempMap.values());
        const humData = Array.from(humMap.values());

        // Préparer les tiges pour stem plot
        const tempStems = tempData.flatMap(pt => pt.y !== null ? [{ x: pt.x, y: 0 }, { x: pt.x, y: pt.y }, { x: null, y: null }] : []);
        const humStems = humData.flatMap(pt => pt.y !== null ? [{ x: pt.x, y: 0 }, { x: pt.x, y: pt.y }, { x: null, y: null }] : []);

        window.tempChart.data.datasets[0].data = tempStems; // tiges
        window.tempChart.data.datasets[1].data = tempData;  // points
        window.humidityChart.data.datasets[0].data = humStems;
        window.humidityChart.data.datasets[1].data = humData;

        // Régler dynamiquement la date de début de l'axe X
        if (tempData.length > 0) {
            window.tempChart.options.scales.x.min = tempData[0].x;
        }
        if (humData.length > 0) {
            window.humidityChart.options.scales.x.min = humData[0].x;
        }

        // Forcer l'axe Y du graphique d'humidité à [0, 100]
        if (window.humidityChart.options.scales && window.humidityChart.options.scales.y) {
            window.humidityChart.options.scales.y.min = 0;
            window.humidityChart.options.scales.y.max = 100;
        }
        // Améliorer l'affichage de l'axe X (rotation, autoSkip)
        if (window.tempChart.options.scales && window.tempChart.options.scales.x) {
            window.tempChart.options.scales.x.ticks = {
                autoSkip: true,
                maxRotation: 45,
                minRotation: 20
            };
        }
        if (window.humidityChart.options.scales && window.humidityChart.options.scales.x) {
            window.humidityChart.options.scales.x.ticks = {
                autoSkip: true,
                maxRotation: 45,
                minRotation: 20
            };
        }
        window.tempChart.update();
        window.humidityChart.update();
    } catch (error) {
        console.error('Erreur lors de la mise à jour des graphiques:', error);
    }
}

function createHistoricalTableHTML(selectedPeriod) {
    console.log('Initialisation de l\'interface historique avec la période:', selectedPeriod);
    
    const html = `
        <div class="period-selector">
            <label for="period-select">Période :</label>
            <select id="period-select">
                <option value="day" ${selectedPeriod === 'day' ? 'selected' : ''}>Dernier jour</option>
                <option value="week" ${selectedPeriod === 'week' ? 'selected' : ''}>Dernière semaine</option>
                <option value="month" ${selectedPeriod === 'month' ? 'selected' : ''}>Dernier mois</option>
            </select>
        </div>
    `;

    // Initialiser le sélecteur de période après l'insertion du HTML
    requestAnimationFrame(() => {
        const periodSelect = document.getElementById('period-select');
        if (periodSelect) {
            periodSelect.addEventListener('change', async () => {
                const period = periodSelect.value;
                const data = await fetchHistoricalData(period);
                if (data && data.length > 0) {
                    handleHistoricalData(data, period);
                }
            });
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
       const formattedDate = isNaN(date.getTime()) ? '--' : date.toLocaleDateString();
       const formattedTime = isNaN(date.getTime()) ? '--' : date.toLocaleTimeString();
       const tempColor = getColor(data.temperature, { low: TEMP_MIN, high: TEMP_MAX });
       const humColor = getColor(data.humidite, { low: HUMIDITY_MIN, high: HUMIDITY_MAX });

       tbody.innerHTML += `
           <tr>
               <td>${formattedDate} ${formattedTime}</td>
               <td style="color: ${tempColor}; font-weight: bold;">${isFinite(data.temperature) ? data.temperature.toFixed(1) : '--'}</td>
               <td style="color: ${humColor}; font-weight: bold;">${isFinite(data.humidite) ? data.humidite.toFixed(1) : '--'}</td>
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

function updateModeUI(isAutomatic) {
    const modeSwitch = document.getElementById('mode-switch');
    const modeLabel = document.getElementById('mode-label');
    const waterControl = document.getElementById('water-control');
    if (modeSwitch && modeLabel) {
        modeSwitch.classList.toggle('active', isAutomatic);
        modeLabel.textContent = isAutomatic ? 'Mode Automatique' : 'Mode Manuel';
    }
    if (waterControl) {
        waterControl.disabled = isAutomatic;
        waterControl.title = isAutomatic ? 'Désactivé en mode automatique' : '';
    }
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
       updateModeUI(isAutomatic);
       
       // Envoyer l'état du mode au serveur via WebSocket
       if (ws && ws.readyState === WebSocket.OPEN) {
           ws.send(JSON.stringify({
               mode: isAutomatic ? 'auto' : 'manuel'
           }));
           console.log('Changement de mode envoyé:', isAutomatic ? 'auto' : 'manuel');
       } else {
           showNotification('Erreur', 'WebSocket non connecté', 'error');
           // Revenir à l'état précédent si la connexion a échoué
           isAutomatic = !isAutomatic;
           modeSwitch.classList.toggle('active');
           modeLabel.textContent = isAutomatic ? 'Mode Automatique' : 'Mode Manuel';
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
      
       // Charger les données historiques initiales
       const historicalData = await fetchHistoricalData('week');
       if (historicalData) {
           handleHistoricalData(historicalData, 'week');
       }

       // Brancher l'écouteur sur le sélecteur de période (historique)
       const periodSelect = document.getElementById('period-select');
       if (periodSelect) {
           periodSelect.addEventListener('change', async () => {
               const period = periodSelect.value;
               const data = await fetchHistoricalData(period);
               if (data && data.length > 0) {
                   handleHistoricalData(data, period);
               } else {
                   showNotification('Attention', 'Aucune donnée disponible pour cette période', 'warning');
               }
           });
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
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      const errorMessage = document.getElementById('error-message');

      try {
        const res = await fetch('https://api.composteur.cielnewton.fr/loginn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        if (res.ok) {
          const data = await res.json();
          sessionStorage.setItem('isAuthenticated', 'true');
          sessionStorage.setItem('username', username);
          // Optionnel : stocker le token d'auth
          sessionStorage.setItem('token', data.token);
          errorMessage.textContent = '';
          checkAuth();
          initApp();
        } else {
          errorMessage.textContent = 'Identifiants incorrects';
          document.getElementById('password').value = '';
        }
      } catch (err) {
        errorMessage.textContent = 'Erreur serveur ou réseau';
        console.error(err);
      }
    });
  }

  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.style.display = sessionStorage.getItem('isAuthenticated') === 'true' ? 'block' : 'none';
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem('isAuthenticated');
      sessionStorage.removeItem('username');
      sessionStorage.removeItem('token');
      if (typeof ws !== 'undefined' && ws) {
        ws.close();
      }
      checkAuth();
      logoutBtn.style.display = 'none';
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

   const tempColors = getColors(temperature, { low: TEMP_MIN, high: TEMP_MAX });
   const humColors = getColors(humidite, { low: HUMIDITY_MIN, high: HUMIDITY_MAX });
  
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
  
   updateValue('current-temp', temperature, '°C', { low: TEMP_MIN, high: TEMP_MAX });
   updateValue('current-humidity', humidity, '%', { low: HUMIDITY_MIN, high: HUMIDITY_MAX });
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
       else if (data.capteur === 'pompe') {
           const waterControl = document.getElementById('water-control');
           if (waterControl) {
               waterControl.disabled = false;
               clearTimeout(waterControl.dataset.timeoutId);
               
               const isOn = data.etat === 'on';
               updateWaterControlState(isOn);
               
               showNotification(
                   'Succès', 
                   `Pompe ${isOn ? 'activée' : 'désactivée'} avec succès`, 
                   'success'
               );

               // Si la pompe est activée, on programme une vérification après 10 secondes
               if (isOn) {
                   setTimeout(() => {
                       if (ws && ws.readyState === WebSocket.OPEN) {
                           ws.send(JSON.stringify({ 
                               type: 'get_pump_state'
                           }));
                           console.log('Vérification de l\'état de la pompe après 10 secondes');
                       }
                   }, 10000);
               }
           }
       }
       // Traitement du changement de mode
       else if (data.mode) {
           const isAuto = data.mode === 'auto';
           updateModeUI(isAuto);
           showNotification(
               'Information',
               `Mode ${isAuto ? 'automatique' : 'manuel'} activé`,
               'info'
           );
       }
       // Traitement de la réponse à la vérification d'état
       else if (data.type === 'get_pump_state') {
           const waterControl = document.getElementById('water-control');
           if (waterControl) {
               updateWaterControlState(false);
               showNotification(
                   'Information', 
                   'La pompe a été automatiquement désactivée après 10 secondes', 
                   'info'
               );
           }
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
