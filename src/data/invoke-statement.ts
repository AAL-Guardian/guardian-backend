import { InvokeCommand, LambdaClient, LambdaClientConfig } from "@aws-sdk/client-lambda";
import { ExecuteStatementResponse, SqlParameter } from "@aws-sdk/client-rds-data";
import { fromIni } from "@aws-sdk/credential-provider-ini";
import { QueryRequest } from "./models/query";

const lambdaOptions = {
  // region: process.env.AWS_REGION,
} as LambdaClientConfig;

if (process.env.IS_OFFLINE === 'true') {
  lambdaOptions.credentials = fromIni({ profile: process.env.profile });
  // lambdaOptions.region = process.env.AWS_REGION,
  lambdaOptions.endpoint = 'http://localhost:3002';
  // lambdaOptions.endpoint = async () => ({
  //     hostname: `lambda.${lambdaOptions.region}.amazonaws.com`,
  //     port: undefined,
  //     protocol: 'https:',
  //     path: '/',
  //     query: undefined
  //   })
}
const lambdaClient = new LambdaClient(lambdaOptions);

export async function executeStatement(sql: string, parameters?: SqlParameter[], mapResults = true): Promise<ExecuteStatementResponse> {
  try {
    const start = Date.now();
    const rawRes = await lambdaClient.send(new InvokeCommand({
      FunctionName: `${process.env.stackName}-${process.env.stage}-dataApi`,
      InvocationType: 'RequestResponse',
      Payload: (new TextEncoder()).encode(JSON.stringify({
        sql,
        data: parameters
      } as QueryRequest))
    }))
    console.log('Statement Time: ' + (Date.now() - start));
    const stringRes = new TextDecoder('utf-8').decode(rawRes.Payload).toString();
    return JSON.parse(stringRes) as ExecuteStatementResponse;
  } catch (e) {
    console.log('Error Executing invocation statement');
    console.log(e, sql, parameters, mapResults);
    throw e;
  }
}