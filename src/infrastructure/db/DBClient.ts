export interface QueryResult<T = any> {
    rows: T[];
    rowCount: number;
}

export interface DBClient {
    query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
}
