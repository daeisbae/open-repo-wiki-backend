// worker.ts
import { parentPort } from 'worker_threads';
import InsertQueue from './queue/queue';

const queue = InsertQueue.getInstance();

parentPort?.on('message', async (msg) => {
    if (msg.cmd === 'addQueue') {
        try {
            const result = await queue.add(msg.data);
            parentPort?.postMessage(result);
        } catch (error: any) {
            parentPort?.postMessage({ success: false, error: error.message });
        }
    } else if (msg.cmd === 'getQueue') {
        try {
            const time = queue.processingTime;
            const current = queue.processingItem;
            const queueList = queue.queue
            const result = { time, current, queue: queueList };
            parentPort?.postMessage(result);
        } catch (error: any) {
            parentPort?.postMessage({ success: false, error: error.message });
        }
    }
});
