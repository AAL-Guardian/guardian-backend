import { InvokeCommand } from '@aws-sdk/client-lambda';
import { S3EventRecord } from 'aws-lambda';
import logEvent from '../data/log-event';
import { handleVoiceDetected } from '../logic/guardian-event-logic';
import { lambda } from './lambda';

export async function detectVoice(one: S3EventRecord, robot_code: string) {
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
      await handleVoiceDetected(robot_code);
      await detectEmotion(one, robot_code, 'detect');
      return true;
    }
  } catch (e) {
    console.log(e);
  }
  return false;
}

export async function detectEmotion(one: S3EventRecord, robot_code: string, type: 'detect' | 'answer') {
    //handle event audio
    console.log('ill invoke Alexandre voices');
    const visualization = await lambda.send(new InvokeCommand({
      FunctionName: 'emotions',
      Payload: (new TextEncoder()).encode(JSON.stringify({
        bucket: one.s3.bucket.name,
        key: one.s3.object.key,
        type,
      }))
    }));
    const response = new TextDecoder('utf-8').decode(visualization.Payload).toString();
    const responseObj = JSON.parse(response);
    console.log(responseObj);
    await logEvent(robot_code, 'emotion_detections', {
      type,
      key: one.s3.object.key,
      response: responseObj
    });
}