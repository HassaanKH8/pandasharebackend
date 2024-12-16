const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const crypto = require('crypto');

const app = express();

app.use(cors({ origin: '*', methods: ['GET', 'POST'], credentials: true }));

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
    }
});

const fileCache = new Map();

const generateCode = () => crypto.randomInt(100000, 999999).toString();

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('send-files', (files) => {
        const sessionId = generateCode();
        fileCache.set(sessionId, files);
        socket.emit('files-sent', sessionId);
        console.log(`Files cached with session ID: ${sessionId}`);
    });

    socket.on('fetch-files', (sessionId) => {
        const files = fileCache.get(sessionId);
        if (files) {
            socket.emit('receive-files', files);
            fileCache.delete(sessionId);
            console.log(`Files delivered and removed for session ID: ${sessionId}`);
        } else {
            socket.emit('error', 'Files not found or expired.');
        }
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

app.get('/', (req, res) => {
    res.send("WORKING...")
})

server.listen(5000, () => console.log('Server running on port 5000'));
