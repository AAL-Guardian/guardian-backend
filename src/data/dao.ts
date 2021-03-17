import { RDSDataClient, ExecuteStatementCommand, SqlParameter, ExecuteStatementResponse } from '@aws-sdk/client-rds-data';
// import { fromIni } from '@aws-sdk/credential-provider-ini';

const client = new RDSDataClient({
  region: 'eu-west-1'
});

if (process.env.IS_OFFLINE === 'true') {
  client.config.credentialDefaultProvider = require('@aws-sdk/credential-provider-ini').fromIni({ profile: process.env.profile })
}

export const DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss'
export const DATE_FORMAT = 'YYYY-MM-DD'

export async function executeStatement(sql: string, parameters?: SqlParameter[], mapResults = true): Promise< { [key: string]: any }[] | ExecuteStatementResponse> {
  try {
    let res;
    if (process.env.IS_OFFLINE === 'true') {
      res = await require('./connected-dao').executeStatement(sql, parameters);
    } else {
      const start = Date.now();
      res = await client.send(new ExecuteStatementCommand({
        resourceArn: process.env.auroraDBArn,
        secretArn: process.env.secretArn,
        sql,
        database: process.env.auroraSchema,
        parameters,
        includeResultMetadata: true,
      }));
      
      console.log('Statement Time: ' + (Date.now()-start));
    }
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
    if (e.code === 'BadRequestException') {
      if ((e.message as string).startsWith('Communications link failure')) {
        console.warn('Request timed out, cold start?');
        return await executeStatement(sql, parameters);
      }
    }
    console.log(e, sql, parameters);
    throw e;
  }
}

export async function insertStatement(table_name: string, parameters?: SqlParameter[]) {
  const sql = `INSERT INTO ${table_name} (${parameters.map(one => one.name).join(', ')}) VALUES (${parameters.map(one => ':' + one.name).join(', ')})`;
  console.log(table_name, parameters)
  const res = await executeStatement(sql, parameters, false) as ExecuteStatementResponse;
  return res.generatedFields.map(raw => Object.values(raw)[0]);
}

export async function updateStatement(table_name: string, set: SqlParameter[], where: SqlParameter[]) {
  const sql = `UPDATE ${table_name} SET ${set.map(one => `${one.name} = :${one.name}`).join(', ')} WHERE ${where.map(one => `${one.name} = :${one.name}`).join(' AND ')}`;
  console.log(sql, set, where);
  const res = await executeStatement(sql, [...set, ...where]);
  return res;
}

export async function selectStatement(table_name: string, parameters?: SqlParameter[], mapResults = true) {
  const sql = `SELECT * FROM ${table_name} WHERE ${parameters.map(one => `${one.name} = :${one.name}`).join(' AND ')}`;
  console.log(sql, parameters);
  return await executeStatement(sql, parameters, mapResults);
}

