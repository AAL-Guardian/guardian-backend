import { RDSDataService } from "aws-sdk";
import { SqlParametersList } from "aws-sdk/clients/rdsdataservice";

const rdsDataService = new RDSDataService();

export async function executeStatement(sql: string, parameters?: SqlParametersList) {
  try {
    const res = await rdsDataService.executeStatement({
      resourceArn: process.env.auroraDBArn,
      secretArn: process.env.secretArn,
      sql,
      database: 'guardian',
      parameters
    }).promise();
    return res;
  } catch (e) {
    if (e.code === 'BadRequestException') {
      if ((e.message as string).startsWith('Communications link failure')) {
        console.warn('Request timed out, cold start?');
        return await executeStatement(sql, parameters);
      }
    }
  }
}