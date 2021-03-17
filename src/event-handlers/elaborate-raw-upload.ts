import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { S3Event, S3EventRecord } from "aws-lambda";
import { Readable } from "stream";
import logEvent from "../data/log-event";
import { voiceDetected } from "../logic/voice-detected";

const s3 = new S3Client({});
const lambda = new LambdaClient({});

if (process.env.IS_OFFLINE === 'true') {
  s3.config.credentialDefaultProvider = require('@aws-sdk/credential-provider-ini').fromIni({ profile: process.env.profile })
}

export default async function (event: S3Event) {
  await Promise.all(event.Records.map(async one => {
    await convertAudio(one);
    const presenceDetected = await detectVoice(one);
    await detectAngle(one);
    if(presenceDetected) {
      const [sn, timestamp] = one.s3.object.key.split('-');
      await voiceDetected(sn, timestamp)
    }
  }));
}


async function convertAudio(one: S3EventRecord) {
  try {
    // convert audio file to wav
    const [robot] = one.s3.object.key.split('-', 2);
    await logEvent(robot, 'robot_file_upload', { filename: one.s3.object.key });
    const data = await s3.send(new GetObjectCommand({
      Bucket: one.s3.bucket.name,
      Key: one.s3.object.key
    }));

    const content = (data.Body as Readable);
    const chunks = [] as string[];
    for await (let chunk of content) {
      chunks.push(chunk)
    }
    const buffer = Buffer.from(chunks.join(), 'base64');
    const res = await s3.send(new PutObjectCommand({
      Bucket: one.s3.bucket.name,
      Key: one.s3.object.key + '.wav',
      ContentType: "audio/wav",
      Body: buffer
    }));
  } catch (e) {
    console.log(e);
  }
}

async function detectVoice(one: S3EventRecord) {
  try {
    //handle event audio
    console.log('ill invoke Alexandre');
    const visualization = await lambda.send(new InvokeCommand({
      FunctionName: 'gardian-detect',
      Payload: (new TextEncoder()).encode(JSON.stringify({
        bucket: one.s3.bucket.name,
        key: one.s3.object.key,
      }))
    }));
    const response = new TextDecoder('utf-8').decode(visualization.Payload).toString();
    const responseObj = JSON.parse(response);
    console.log(responseObj);
    const seg = JSON.parse(responseObj.seg);
    const hasMaleOrFemale = seg.some(single => ['male', 'female'].includes(single[0]));
    if (hasMaleOrFemale) {
      const [sn, timestamp] = one.s3.object.key.split('.');
      await logEvent(sn, 'voice_detected', JSON.stringify(seg));
      return true;
    }
  } catch (e) {
    console.log(e);
  }
  return false;
}

async function detectAngle(one: S3EventRecord) {
  try {
    //handle event audio
    console.log('ill invoke Alexandre');
    const visualization = await lambda.send(new InvokeCommand({
      FunctionName: 'gardian-angle',
      Payload: (new TextEncoder()).encode(JSON.stringify({
        bucket: one.s3.bucket.name,
        key: one.s3.object.key,
      }))
    }));
    const response = new TextDecoder('utf-8').decode(visualization.Payload).toString();

    console.log(response);
  } catch (e) {
    console.log(e);
  }
}