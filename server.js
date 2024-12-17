const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors({ origin: '*', methods: ['GET', 'POST'], credentials: true }));

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'], credentials: true },
    maxHttpBufferSize: 10 * 1024 * 1024,
});

const fileSessions = {};
const chunkedFiles = {};

const generateSessionId = () => {
    return (Date.now().toString(36) + Math.random().toString(36).substr(2, 6)).toUpperCase();
};

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('send-file-chunk', ({ sessionId, fileName, chunkIndex, totalChunks, chunkData }) => {
        if (!chunkedFiles[sessionId]) {
            chunkedFiles[sessionId] = {};
        }

        if (!chunkedFiles[sessionId][fileName]) {
            chunkedFiles[sessionId][fileName] = {
                chunks: [],
                totalChunks,
            };
        }

        const file = chunkedFiles[sessionId][fileName];
        file.chunks[chunkIndex] = Buffer.from(chunkData, 'base64');

        if (file.chunks.filter(Boolean).length === totalChunks) {
            const completeFile = Buffer.concat(file.chunks);

            if (!fileSessions[sessionId]) {
                fileSessions[sessionId] = { files: [], createdAt: Date.now() };
            }

            fileSessions[sessionId].files.push({
                fileName,
                fileData: completeFile.toString('base64'),
            });

            delete chunkedFiles[sessionId][fileName];
            console.log(`Received complete file: ${fileName} for session ID: ${sessionId}`);

            socket.emit('file-received', { sessionId, fileName });
        }
    });

    socket.on('start-session', () => {
        const sessionId = generateSessionId();
        socket.emit('session-created', sessionId);
        console.log(`Session created: ${sessionId}`);
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
    res.send('WORKING...');
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
