export interface QueryResult<T = any> {
    rows: T[];
    rowCount: number;
}

export interface IDBClient {
    query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
    transaction<T>(callback: (client: IDBClient) => Promise<T>): Promise<T>;
}
