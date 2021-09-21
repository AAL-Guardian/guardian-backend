import { ExecuteStatementResponse, SqlParameter } from '@aws-sdk/client-rds-data';
import { executeStatement as connectedStatement } from './connected-statement';
// import { executeStatement as dataApiStatement } from './data-api-statement';
export const DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss'
export const DATE_FORMAT = 'YYYY-MM-DD'

export async function executeStatement(sql: string, parameters?: SqlParameter[], mapResults = true): Promise<{ [key: string]: any }[] | ExecuteStatementResponse> {
  try {
    const start = Date.now();
    const res = await connectedStatement(sql, parameters);
    // const res = await dataApiStatement(sql, parameters);
    console.log('Statement Time: ' + (Date.now() - start));

    if (mapResults) {
      let mapped = res.records?.map(one => {
        const obj = {} as { [key: string]: any };
        res.columnMetadata.forEach((meta, i) => {
          if (one[i].isNull) {
            obj[meta.name] = null;
          } else {
            obj[meta.name] = Object.values(one[i])[0]
          }

        });
        return obj;
      })
      return mapped;
    } else {
      return res;
    }

  } catch (e) {
    console.log('logga errore?');
    console.log(e, sql, parameters);
    if (e?.code === 'BadRequestException') {
      if ((e?.message as string).startsWith('Communications link failure')) {
        console.warn('Request timed out, cold start?');
        return await executeStatement(sql, parameters);
      }
    }
    throw e;
  }
}

export async function insertStatement(table_name: string, parameters?: SqlParameter[]) {
  const sql = `INSERT INTO ${table_name} (${parameters.map(one => one.name).join(', ')}) VALUES (${parameters.map(one => ':' + one.name).join(', ')})`;
  // console.log(table_name, parameters)
  const res = await executeStatement(sql, parameters, false) as ExecuteStatementResponse;
  return res.generatedFields.map(raw => Object.values(raw)[0]);
}

export async function updateStatement(table_name: string, set: SqlParameter[], where: SqlParameter[]) {
  const sql = `UPDATE ${table_name} SET ${set.map(one => `${one.name} = :${one.name}`).join(', ')} WHERE ${where.map(one => `${one.name} = :${one.name}`).join(' AND ')}`;
  // console.log(sql, set, where);
  const res = await executeStatement(sql, [...set, ...where], false);
  return res;
}

export async function selectStatement<T = { [key: string]: any }>(table_name: string, parameters?: SqlParameter[]): Promise<T[]> {
  const sql = `SELECT * FROM ${table_name} WHERE ${parameters?.length > 0 ? parameters.map(one => `${one.name} = :${one.name}`).join(' AND ') : '1 = 1'}`;
  // console.log(sql, parameters);
  return await executeStatement(sql, parameters, true) as T[];
}

