import { InvokeCommand } from '@aws-sdk/client-lambda';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { S3EventRecord } from 'aws-lambda';
import { Readable } from 'stream';
import logEvent from '../data/log-event';
import { getClientByRobotSN } from '../data/robot';
import { handleVoiceDetected } from '../logic/guardian-event-logic';
import { lambda } from './lambda';
import { getS3 } from './s3';

export async function detectVoice(bucket: string, key: string, robot_code: string) {

  //handle event audio
  console.log('ill invoke Alexandre voices');
  const visualization = await lambda.send(new InvokeCommand({
    FunctionName: 'gardian-detect',
    Payload: (new TextEncoder()).encode(JSON.stringify({
      bucket,
      key,
    }))
  }));
  const response = new TextDecoder('utf-8').decode(visualization.Payload).toString();
  const responseObj = JSON.parse(response);
  console.log(responseObj);
  const seg = JSON.parse(responseObj.seg);
  const hasMaleOrFemale = seg.filter(([who, start, end]) => ['male', 'female'].includes(who));
  if (hasMaleOrFemale.length > 0) {
    await handleVoiceDetected(robot_code);
    return true;
  }
  return false;
}

export async function detectEmotion(bucket: string, key: string, robot_code: string, type: 'detect' | 'answer') {
  //handle event audio
  console.log('ill invoke Alexandre emotions');
  const visualization = await lambda.send(new InvokeCommand({
    FunctionName: 'emotions',
    Payload: (new TextEncoder()).encode(JSON.stringify({
      bucket,
      key,
      type,
    }))
  }));
  const response = new TextDecoder('utf-8').decode(visualization.Payload).toString();
  const responseObj = JSON.parse(response);
  console.log(responseObj);
  if (responseObj?.errorMessage !== undefined) {
    throw responseObj;
  }
  const responseTrue = JSON.parse(responseObj);
  const client = await getClientByRobotSN(robot_code);
  await logEvent(robot_code, 'emotion_detections', {
    type,
    key,
    response: responseTrue,
  }, client.id);
}

/**
 * @param one S3EventRecord
 */
 export async function convertAudio(one: S3EventRecord) {
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
    return one.s3.object.key + '.wav';
  } catch (e) {
    console.log(e);
    throw e;
  }
}