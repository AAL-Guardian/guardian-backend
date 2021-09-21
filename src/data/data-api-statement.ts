import { ExecuteStatementCommand, ExecuteStatementResponse, RDSDataClient, RDSDataClientConfig, SqlParameter } from '@aws-sdk/client-rds-data';
import { fromIni } from '@aws-sdk/credential-provider-ini';
let client: RDSDataClient;
const rdsOptions = {
  region: 'eu-west-1'
} as RDSDataClientConfig;
if (process.env.IS_OFFLINE === 'true') {
  rdsOptions.credentials = fromIni({ profile: process.env.profile });
  rdsOptions.endpoint = async () => ({
    hostname: `rds-data.${rdsOptions.region}.amazonaws.com`,
    port: undefined,
    protocol: 'https:',
    path: '/',
    query: undefined
  })
}

export const DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss'
export const DATE_FORMAT = 'YYYY-MM-DD'

export async function executeStatement(sql: string, parameters?: SqlParameter[], mapResults = true): Promise<ExecuteStatementResponse> {
  try {
    let res;
    console.log('statement', sql, parameters);

    if (!client) {
      client = new RDSDataClient(rdsOptions);
    }
    const start = Date.now();
    res = await client.send(new ExecuteStatementCommand({
      resourceArn: process.env.auroraDBArn,
      secretArn: process.env.secretArn,
      sql,
      database: process.env.auroraSchema,
      parameters,
      includeResultMetadata: true,
    }));

    console.log('Statement Time: ' + (Date.now() - start));
    return res;
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

