import { RDSDataClient, ExecuteStatementCommand, SqlParameter } from '@aws-sdk/client-rds-data';
// import { fromIni } from '@aws-sdk/credential-provider-ini';

const client = new RDSDataClient({
  region: 'eu-west-1'
});

if (process.env.IS_OFFLINE === 'true') {
  client.config.credentialDefaultProvider = require('@aws-sdk/credential-provider-ini').fromIni({ profile: process.env.profile })
}

export async function executeStatement(sql: string, parameters?: SqlParameter[], mapResults = true) {
  try {
    let res;
    if (process.env.IS_OFFLINE === 'true') {
      res = await require('./connected-dao').executeStatement(sql, parameters);
    } else {
      res = await client.send(new ExecuteStatementCommand({
        resourceArn: process.env.auroraDBArn,
        secretArn: process.env.secretArn,
        sql,
        database: process.env.auroraSchema,
        parameters,
        includeResultMetadata: true,
      }));
    }

    if (mapResults) {
      let mapped = res.records?.map(one => {
        const obj = {} as { [key: string]: any };
        res.columnMetadata.forEach((meta, i) => {
          if(one[i].isNull) {
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
    if (e.code === 'BadRequestException') {
      if ((e.message as string).startsWith('Communications link failure')) {
        console.warn('Request timed out, cold start?');
        return await executeStatement(sql, parameters);
      }
    }
    console.log(e);
    throw e;
  }
}