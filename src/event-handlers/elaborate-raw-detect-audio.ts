import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { S3Event, S3EventRecord } from "aws-lambda";
import { Readable } from "stream";
import logEvent from "../data/log-event";
import { voiceDetected } from "../logic/voice-detected";
import { getS3 } from "../services/s3";

const lambda = new LambdaClient({});

export default async function (event: S3Event) {
  await Promise.all(event.Records.map(async one => {
    await convertAudio(one);
    const presenceDetected = await detectVoice(one);
    if(presenceDetected.length > 0) {
      const [sn] = one.s3.object.key.split('/')[1].split('_');
      await voiceDetected(sn)

      // const voiceAngle = await detectAngle(one, presenceDetected);
      // const headAngle = parseFloat(angle);
      // const rest = (voiceAngle + headAngle) % 360;
      // await sendMoveHeadCommand(await getRobotBySN(sn), rest);
    }
  }));
}


async function convertAudio(one: S3EventRecord) {
  try {
    // convert audio file to wav
    const [robot] = one.s3.object.key.split('/')[1].split('_');
    await logEvent(robot, 'robot_file_upload', { filename: one.s3.object.key });
    const data = await getS3().send(new GetObjectCommand({
      Bucket: one.s3.bucket.name,
      Key: one.s3.object.key
    }));

    const content = (data.Body as Readable);
    const chunks = [] as string[];
    for await (let chunk of content) {
      chunks.push(chunk)
    }
    const buffer = Buffer.from(chunks.join(), 'base64');
    const res = await getS3().send(new PutObjectCommand({
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
      const [sn ] = one.s3.object.key.split('/')[1].split('_');
      await logEvent(sn, 'voice_detected', JSON.stringify({
        seg
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