import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { S3Event, S3EventRecord } from "aws-lambda";
import { getRobotBySN } from "../data/robot";
import { sendMoveHeadCommand } from "../iot/robot-commands";
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
    if(presenceDetected.length > 0) {
      const [sn, angle, timestamp] = one.s3.object.key.split('-');
      await voiceDetected(sn, timestamp)

      const voiceAngle = await detectAngle(one, presenceDetected);
      const headAngle = parseFloat(angle);
      console.log('Must calc right angle', voiceAngle, headAngle);
      const rest = (voiceAngle + headAngle) % 360;
      console.log(rest);
      await sendMoveHeadCommand(await getRobotBySN(sn), rest);
    }
  }));
}


async function convertAudio(one: S3EventRecord) {
  try {
    // convert audio file to wav
    const [robot, angle, timestamp] = one.s3.object.key.split('-', 3);
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
    console.log('ill invoke Alexandre voices');
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
    const hasMaleOrFemale = seg.filter(([who, start, end]) => ['male', 'female'].includes(who));
    if (hasMaleOrFemale.length > 0) {
      const [sn, angle, timestamp] = one.s3.object.key.split('-');
      await logEvent(sn, 'voice_detected', JSON.stringify({
        seg,
        angle
      }));
      return hasMaleOrFemale;
    }
  } catch (e) {
    console.log(e);
  }
  return false;
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