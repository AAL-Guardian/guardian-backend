import { SqlParameter } from "@aws-sdk/client-rds-data";

export type QueryRequest = {
  sql: string;
  data: SqlParameter[];
  database?: string;
}

export type QueryResponse = Promise<any>;