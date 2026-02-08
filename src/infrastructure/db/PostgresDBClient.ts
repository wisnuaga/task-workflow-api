import { Pool, PoolConfig, PoolClient } from "pg";
import { IDBClient, QueryResult } from "../../application/interfaces/db/IDBClient";

export class PostgresDBClient implements IDBClient {
    private pool: Pool;

    constructor(config: PoolConfig) {
        this.pool = new Pool(config);
    }

    async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
        const client = await this.pool.connect();
        try {
            const result = await client.query(sql, params);
            return {
                rows: result.rows,
                rowCount: result.rowCount || 0,
            };
        } finally {
            client.release();
        }
    }

    async transaction<T>(callback: (client: IDBClient) => Promise<T>): Promise<T> {
        const client = await this.pool.connect();
        try {
            await client.query("BEGIN");
            const transactionClient = new PostgresTransactionClient(client);
            const result = await callback(transactionClient);
            await client.query("COMMIT");
            return result;
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    }

    async close(): Promise<void> {
        await this.pool.end();
    }
}

class PostgresTransactionClient implements IDBClient {
    constructor(private client: PoolClient) { }

    async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
        const result = await this.client.query(sql, params);
        return {
            rows: result.rows,
            rowCount: result.rowCount || 0,
        };
    }

    async transaction<T>(callback: (client: IDBClient) => Promise<T>): Promise<T> {
        throw new Error("Nested transactions are not supported");
    }
}
