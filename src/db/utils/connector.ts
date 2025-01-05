import pg, {QueryResult, QueryResultRow} from 'pg'
// @ts-ignore
import {DBConfig} from '../config/config'
import {GetObjectCommand, S3Client} from '@aws-sdk/client-s3'

async function downloadCertificate() {
    const s3Client = new S3Client({
        region: DBConfig.certificateRegion,
        endpoint: DBConfig.certificateLink,
        credentials: {
            accessKeyId: DBConfig.certificateAccessKeyID || '',
            secretAccessKey: DBConfig.certificateSecretAccessKey || '',
        },
    });

    try {
        const command = new GetObjectCommand({
            Bucket: DBConfig.certificateBucket,
            Key: DBConfig.certificateFile,
        });

        const response = await s3Client.send(command);
        return await response.Body!.transformToString();
    } catch (error) {
        console.error("Failed to download certificate:", error);
        throw error;
    }
}

/**
 * Database connection handler (Instance pattern - Although not recommended due to thread issue, this is currently the best solution)
 * @class DatabaseConnector
 */
class DBConnector {
    private pool: pg.Pool | undefined
    private conn: boolean
    private static instance: DBConnector

    /**
     * Creates a new database connection pool
     * @constructor
     */
    private constructor() {
        const { Pool } = pg
        this.conn = false
        const { ...config } = DBConfig
        if (!DBConfig.certificateLink) {
            this.pool = new Pool(config)
            return
        }

        try {
            let certificate: string | undefined = undefined
            downloadCertificate().then((cert) => {
                certificate = cert
            });
            this.pool = new Pool({
                ...config,
                ssl: {
                    rejectUnauthorized: false,
                    ca: certificate,
                },
            })
        } catch (error) {
            console.error(
                `Database connection failed: ${
                    error instanceof Error ? error.message : 'Unknown error'
                }`
            )
        }
    }

    /**
     * Get the instance of the database connector
     * @returns The database connector instance
     */
    static getInstance(): DBConnector {
        if (!DBConnector.instance) {
            DBConnector.instance = new DBConnector()
        }
        return DBConnector.instance
    }

    // @ts-ignore
    /**
     * Executes a parameterized SQL query
     * @param text - SQL query text
     * @param params - Query parameters
     * @returns Results from database query
     * @throws Database query errors
     */
    async query<T extends QueryResultRow = any>(
        text: string,
        params?: any[]
    ): Promise<QueryResult<T> | null> {
        let client: pg.PoolClient | undefined = undefined
        try {
            if(!this.pool) return null
            client = await this.pool.connect()
            this.conn = true
            const result = await this.pool.query(text, params)
            await client.release()
            this.conn = false
            return result
        } catch (error) {
            this.conn && client!.release()
            console.error(
                `Database query failed: ${
                    error instanceof Error ? error.message : 'Unknown error'
                }`
            )
        }
    }
}

// eslint-disable-next-line import/no-anonymous-default-export
export default DBConnector.getInstance()
