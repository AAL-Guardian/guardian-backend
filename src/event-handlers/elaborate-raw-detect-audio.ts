import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { S3Event, S3EventRecord } from "aws-lambda";
import { convertAudio, detectEmotion, detectVoice } from '../services/alex';
import { getS3 } from '../services/s3';

const lambda = new LambdaClient({});

export default async function (event: S3Event) {
  await Promise.allSettled(event.Records.map(async one => {
    const [sn] = one.s3.object.key.split('/')[1].split('_');
    const key = await convertAudio(one);
    try {
      const detected = await detectVoice(one.s3.bucket.name, key, sn);
      if (detected) {
        await detectEmotion(one.s3.bucket.name, key, sn, 'detect');
      }
    } catch (e) {
      await detectEmotion(one.s3.bucket.name, key, sn, 'detect');
    } finally {
      await getS3().send(new DeleteObjectCommand({
        Bucket: one.s3.bucket.name,
        Key: one.s3.object.key
      }));
      if (key && process.env.stage === 'prod') {
        await getS3().send(new DeleteObjectCommand({
          Bucket: one.s3.bucket.name,
          Key: key
        }));
      }
    }
  }));
}

async function detectAngle(one: S3EventRecord, presenceOutput: [string, number, number][]) {
  try {
    //handle event audio
    console.log('ill invoke Alexandre angle');
    const window = presenceOutput.filter(([who, start, end]) => ['male', 'female'].includes(who)).pop()

    const visualization = await lambda.send(new InvokeCommand({
      FunctionName: 'gardian-angle',
      Payload: (new TextEncoder()).encode(JSON.stringify({
        bucket: one.s3.bucket.name,
        key: one.s3.object.key,
        window
      }))
    }));
    const response = new TextDecoder('utf-8').decode(visualization.Payload).toString();

    console.log(response);
    return parseFloat(JSON.parse(response).angle);
  } catch (e) {
    console.log(e);
  }
}