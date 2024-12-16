const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
app.use(cors({ origin: '*', methods: ['GET', 'POST'], credentials: true }));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'], credentials: true } });

const fileSessions = {};

const generateSessionId = () => {
    return (Date.now().toString(36) + Math.random().toString(36).substr(2, 6)).toUpperCase();
};

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('send-files', (files) => {
        const sessionId = generateSessionId();
        fileSessions[sessionId] = { files, createdAt: Date.now() };

        socket.emit('files-sent', sessionId);
        console.log(`Files cached with session ID: ${sessionId}`);
    });

    socket.on('fetch-files', (sessionId) => {
        const sessionData = fileSessions[sessionId];
        if (sessionData && Date.now() - sessionData.createdAt < 3600000) {
            socket.emit('receive-files', sessionData.files);
            delete fileSessions[sessionId];
            console.log(`Files delivered for session ID: ${sessionId}`);
        } else {
            socket.emit('error', 'Session expired or not found.');
        }
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

app.get('/', (req, res) => {
    res.send("WORKING...");
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
