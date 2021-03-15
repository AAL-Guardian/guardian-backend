import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { S3Client } from "@aws-sdk/client-s3";
import { S3Event } from "aws-lambda";

const s3 = new S3Client({});
const lambda = new LambdaClient({});

if (process.env.IS_OFFLINE === 'true') {
  const credentials = require('@aws-sdk/credential-provider-ini').fromIni({ profile: process.env.profile });
  s3.config.credentialDefaultProvider = credentials;
  lambda.config.credentialDefaultProvider = credentials;
}

export default async function (event: S3Event) {
  await Promise.all(event.Records.map(async one => {
    try {
      const visualization = await lambda.send(new InvokeCommand({
        FunctionName: 'gardian-detect',
        Payload: (new TextEncoder()).encode(JSON.stringify({
          Bucket: one.s3.bucket.name,
          Key: one.s3.object.key,
        }))
      }));
      console.log(visualization);
    } catch (e) {
      console.log(event);
      console.log(e);
    }
  }));
}
