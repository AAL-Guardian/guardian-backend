import { executeStatement } from "../../data/connected-statement";
import { QueryResponse, QueryRequest } from "../../data/models/query";


export default async function (event: QueryRequest): Promise<QueryResponse> {
  return await executeStatement(event.sql, event.data);
}