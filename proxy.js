const http = require('http');
const WebSocket = require('ws');

// Configuration du serveur
const PORT = 3007;
const REMOTE_WS_URL = 'wss://api.composteur.cielnewton.fr/ws';
const API_USERNAME = 'admin';
const API_PASSWORD = 'nEwton92';
let TOKEN = '';

// Stocker les connexions actives 
const activeConnections = new Set();

// Créer le serveur WebSocket
const wss = new WebSocket.Server({ noServer: true });

// Fonction pour obtenir un nouveau token
async function getNewToken() {
    try {
        const response = await fetch('https://api.composteur.cielnewton.fr/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: API_USERNAME, password: API_PASSWORD })
        });
        const data = await response.json();
        TOKEN = data.token;
        console.log('Token obtenu');
    } catch (error) {
        console.error('Erreur token:', error);
        TOKEN = '';
    }
}

// Fonction pour créer une connexion au serveur distant
function connectToRemoteServer(ws) {
    let isConnected = false;
    const remoteSocket = new WebSocket(REMOTE_WS_URL, {
        headers: { 
            'Authorization': `Bearer ${TOKEN}`,
            'User-Agent': 'Mozilla/5.0',
            'Accept': '*/*',
            'Connection': 'Upgrade',
            'Upgrade': 'websocket',
            'Sec-WebSocket-Version': '13'
        },
        followRedirects: true,
        rejectUnauthorized: false,
        handshakeTimeout: 10000
    });

    remoteSocket.on('open', () => {
        console.log('Connexion établie');
        isConnected = true;
        // Attendre que la connexion soit stable avant d'envoyer le message
        setTimeout(() => {
            if (isConnected && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'connection_established' }));
            }
        }, 1000);
    });

    remoteSocket.on('error', (error) => {
        console.error('Erreur WebSocket:', error.message);
        isConnected = false;
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'error', message: error.message }));
        }
    });

    ws.on('message', (data) => {
        if (isConnected && remoteSocket.readyState === WebSocket.OPEN) {
            remoteSocket.send(data);
        }
    });

    remoteSocket.on('message', (data) => {
        if (isConnected && ws.readyState === WebSocket.OPEN) {
            ws.send(data);
        }
    });

    ws.on('close', () => {
        isConnected = false;
        if (remoteSocket.readyState < WebSocket.CLOSING) {
            remoteSocket.close();
        }
        activeConnections.delete(ws);
    });

    remoteSocket.on('close', () => {
        isConnected = false;
        if (ws.readyState < WebSocket.CLOSING) {
            ws.close();
        }
    });

    return remoteSocket;
}

// Démarrer le serveur
(async () => {
    await getNewToken();
    if (!TOKEN) {
        console.error("ERREUR: Pas de token");
        process.exit(1);
    }

    const server = http.createServer();
    server.on('upgrade', (request, socket, head) => {
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    });

    wss.on('connection', (ws) => {
        activeConnections.add(ws);
        connectToRemoteServer(ws);
        ws.on('close', () => activeConnections.delete(ws));
    });

    server.listen(PORT, () => {
        console.log(`Proxy WebSocket sur ws://localhost:${PORT}`);
    });
})();
