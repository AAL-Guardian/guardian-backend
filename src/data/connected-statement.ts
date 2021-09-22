import { Connection, createConnection } from 'mysql2/promise';
import { SqlParameter, ExecuteStatementResponse, Field } from '@aws-sdk/client-rds-data';
import { getDbSecret } from '../services/secret-manager';
import { ConnectionOptions, OkPacket } from 'mysql2/typings/mysql';

let connection: Connection;
export async function executeStatement(sql: string, parameters: SqlParameter[] = []): Promise<ExecuteStatementResponse> {
  if (!connection) {
    const secret = await getDbSecret()
    connection = await createConnection({
      host: secret.host,
      port: secret.port,
      database: process.env.auroraSchema,
      user: secret.username,
      password: secret.password
    } as ConnectionOptions);

    connection.config.queryFormat = (query, values: SqlParameter[]) => {
      if (!values || values.length === 0) return query;
      query = query.replace(/\:(\w+)/g, (txt, key) => {
        const value = values.find(one => one.name === key);
        if (value) {
          return connection.escape(Object.values(value.value)[0]);
        }
        return txt;
      });
      console.log(query);
      return query;
    };
  }

  // const values: { [keys: string]: any } = {};
  // for(let one of parameters) {
  //   values[one.name] = one.value;
  // }
  const res = await connection.query(queryFormat(sql, parameters));

  /** mapping per emulare RDS Data Service */
  return {
    numberOfRecordsUpdated: res[0] && 'affectedRows' in res[0] ? (res[0] as OkPacket).affectedRows : 0,
    generatedFields: res[0] && 'insertId' in res[0] ? [
      {
        longValue: (res[0] as OkPacket).insertId
      }
    ] : undefined,
    columnMetadata: res[1] ? res[1].map(column => ({ ...column })) : [],
    records: res[0] && !res[0].hasOwnProperty('affectedRows') ? (res[0] as any).map(one => Object.values(one).map(raw => {
      switch (typeof raw) {
        case 'string':
          return {
            stringValue: raw
          }
        case 'number':
          return {
            longValue: raw
          }
        case null:
          return {
            isNull: true
          }
        default:
          return {
            stringValue: raw
          }
      }
    })) : undefined
  };
}


function queryFormat(query: string, values: SqlParameter[]) {
  if (!values || values.length === 0) return query;
  query = query.replace(/\:(\w+)/g, (txt, key) => {
    const value = values.find(one => one.name === key);
    if (value) {
      return connection.escape(Object.values(value.value)[0]);
    }
    return txt;
  });
  console.log(query);
  return query;
}