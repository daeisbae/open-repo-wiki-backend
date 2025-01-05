import LLMFactory from '../llm/llm-factory';
import { Repository, RepositoryData } from '../db/model/repository';
import LLMConfig from '../llm/llm-config';
import { InsertRepoService } from '../service/insert-db';
import { checkRateLimit } from '../github/ratelimit';
import axios from 'axios';
import { ALLOWED_LANGUAGES } from '../service/allowed-languages';

interface InsertItem {
    owner: string;
    repo: string;
}

interface AddRepositoryQueueResult {
    success: boolean;
    error?: string;
    message?: string;
}

export default class InsertQueue {
    private _queue: InsertItem[] = [];
    private _isProcessing = false;
    private _repoService: InsertRepoService;
    private _processingItem: InsertItem | null = null;
    private _processingTime: string | null = null;
    private static _instance?: InsertQueue;

    private _rateLimitBeforeStop = 500;
    private _maxQueueSize = 25;
    private _repository: Repository;

    private constructor() {
        const llmConfig = new LLMConfig(1, 0.95, 40, 8192);
        this._repoService = new InsertRepoService(
            LLMFactory.createProvider(llmConfig)
        );
        this._repository = new Repository();
    }

    public static getInstance(): InsertQueue {
        if (!this._instance) {
            this._instance = new InsertQueue();
        }
        return this._instance;
    }

    get queue(): InsertItem[] {
        return this._queue;
    }

    public async add(item: InsertItem): Promise<AddRepositoryQueueResult> {
        // 1. Check if item already in queue
        if (this._queue.find((i) => i.owner === item.owner && i.repo === item.repo)) {
            return { success: false, error: 'Item already in queue' };
        }

        // 2. Check if item is already in database
        const existingInRepo = this._repository.select(item.owner, item.repo);
        if (!existingInRepo) {
            return { success: false, error: 'Item already in database' };
        }

        // 3. Check queue size
        if (this._queue.length >= this._maxQueueSize) {
            return { success: false, error: 'Queue is full' };
        }

        // 4. Validate GitHub repo existence
        console.log(`Asking GitHub if ${item.owner}/${item.repo} exists`);
        try {
            const repositoryStatus = await axios.get(
                `https://api.github.com/repos/${item.owner}/${item.repo}`
            );
            if (repositoryStatus.status !== 200) {
                return { success: false, error: 'Repository does not exist' };
            }
            // Check language
            const repoLanguage = repositoryStatus.data.language;
            if (!ALLOWED_LANGUAGES.includes(repoLanguage)) {
                return {
                    success: false,
                    error: `Sorry, ${repoLanguage} is not supported for analysis`,
                };
            }
        } catch (error) {
            return { success: false, error: 'Repository does not exist' };
        }

        // 5. Add item to queue
        this._queue.push(item);

        // 6. Trigger processing if not already running
        this._processQueue().catch((err) =>
            console.error('Error processing queue:', err)
        );

        return {
            success: true,
            message: `Repository ${item.owner}/${item.repo} added to queue`,
        };
    }

    get processingItem(): InsertItem | null {
        return this._processingItem;
    }

    get processingTime(): string | null {
        return this._processingTime;
    }

    /**
     * Process the queue in a loop until all items are handled.
     */
    private async _processQueue(): Promise<void> {
        if (this._isProcessing) return; // prevent re-entrancy
        this._isProcessing = true;

        try {
            while (this._queue.length > 0) {
                // Check GitHub rate limit
                const rateLimit = await checkRateLimit();
                if (rateLimit && rateLimit.remaining < this._rateLimitBeforeStop) {
                    console.warn('Rate limit reached. Stopping queue processing.');
                    const waitTime = rateLimit.reset - Date.now();
                    console.log(`Waiting for ${waitTime}ms before continuing...`);
                    await new Promise((resolve) => setTimeout(resolve, waitTime + 1000));
                }

                // Take next item off the queue
                const item = this._queue.shift();
                if (item) {
                    await this._processItem(item);
                }
            }
        } finally {
            this._isProcessing = false;
        }
    }

    private async _processItem(item: InsertItem): Promise<RepositoryData | null> {
        console.log(`Processing item: ${item.owner}/${item.repo}`);
        this._processingTime = new Date().toISOString();
        this._processingItem = item;

        let result: RepositoryData | null = null;
        try {
            result = await this._repoService.insertRepository(item.owner, item.repo);
            console.log(`Finished processing: ${item.owner}/${item.repo}`);
        } catch (error) {
            console.error(`Failed to process ${item.owner}/${item.repo}`, error);
        }

        this._processingItem = null;
        this._processingTime = null;
        return result;
    }
}