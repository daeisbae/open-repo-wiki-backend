import path from 'path';
import express from 'express';
import { Worker } from 'worker_threads';
import cors from 'cors';

const app = express();
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'], // Specify the methods you want to allow
    allowedHeaders: ['Content-Type'], // Specify the headers you want to allow
  }));
  
  app.use(express.json());
// Path to your compiled worker.js (if using TypeScript, build first)
const workerPath = path.join(__dirname, '../dist/worker.js');
const insertWorker = new Worker(workerPath);

insertWorker.on('error', (err) => {
    console.error('Worker thread error:', err);
});

// @ts-ignore
app.post('/api/queue', (req, res) => {
    console.log('POST /api/queue');
    const { owner, repo } = req.body;
    if (!owner || !repo) {
        return res.status(400).json({ success: false, error: 'Missing owner or repo' });
    }

    insertWorker.once('message', (result) => {
        return res.json(result);
    });

    insertWorker.postMessage({ cmd: 'addQueue', data: { owner, repo } });
});

app.get('/api/queue', (req, res) => {
    insertWorker.once('message', (result) => {
        return res.json(result);
    });

    insertWorker.postMessage({ cmd: 'getQueue' });
})

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});