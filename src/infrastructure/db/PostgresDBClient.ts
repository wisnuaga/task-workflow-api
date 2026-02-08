import { Pool, PoolConfig } from "pg";
import { DBClient, QueryResult } from "./DBClient";

export class PostgresDBClient implements DBClient {
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

    async close(): Promise<void> {
        await this.pool.end();
    }
}
