import { RDSDataClient, ExecuteStatementCommand, SqlParameter } from '@aws-sdk/client-rds-data';
// import { fromIni } from '@aws-sdk/credential-provider-ini';
const client = new RDSDataClient({
  region: 'eu-west-1'
});
if(process.env.IS_OFFLINE === 'true') {
  client.config.credentialDefaultProvider = require('@aws-sdk/credential-provider-ini').fromIni({ profile: process.env.profile})
}


export async function executeStatement(sql: string, parameters?: SqlParameter[]) {
  try {
    // if(process.env.IS_OFFLINE === 'true') {
    //   return await require('./connected-dao').executeStatement(sql, parameters);
    // } else {
      const res = await client.send(new ExecuteStatementCommand({
        resourceArn: process.env.auroraDBArn,
        secretArn: process.env.secretArn,
        sql,
        database: process.env.auroraSchema,
        parameters
      }))
      return res;
    // }
    
  } catch (e) {
    if (e.code === 'BadRequestException') {
      if ((e.message as string).startsWith('Communications link failure')) {
        console.warn('Request timed out, cold start?');
        return await executeStatement(sql, parameters);
      }
    }
    console.log(e);
  }
}