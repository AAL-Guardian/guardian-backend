import { InvokeCommand } from '@aws-sdk/client-lambda';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { S3Event, S3EventRecord } from "aws-lambda";
import { Readable } from "stream";
import logEvent from "../data/log-event";
import { lambda } from '../services/lambda';
import { getS3 } from "../services/s3";

export default async function (event: S3Event) {
  await Promise.all(event.Records.map(async one => {
    await convertPhoto(one);
  }));
}

async function convertPhoto(one: S3EventRecord) {
  try {
    // convert audio file to wav
    const [robot_code] = one.s3.object.key.split('/')[1].split('_');
    await logEvent(robot_code, 'robot_photo_upload', { filename: one.s3.object.key });
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
    await getS3().send(new PutObjectCommand({
      Bucket: one.s3.bucket.name,
      Key: one.s3.object.key + '.jpg',
      ContentType: "image/jpeg",
      Body: buffer
    }));

    const visualization = await lambda.send(new InvokeCommand({
      FunctionName: 'imagedetection4',
      Payload: (new TextEncoder()).encode(JSON.stringify({
        bucket: one.s3.bucket.name,
        key: one.s3.object.key + '.jpg',
      }))
    }))

    const response = new TextDecoder('utf-8').decode(visualization.Payload).toString();
    const responseObj = JSON.parse(response);
    await logEvent(robot_code, 'photo_detection', {
      key: one.s3.object.key + '.jpg',
      response: responseObj
    });
    if(responseObj?.person === '"person"') {
      await logEvent(robot_code, 'photo_detected')
    }
  } catch (e) {
    console.log(e);
  } finally {
    if (process.env.stage === 'prod') {
      await getS3().send(new DeleteObjectCommand({
        Bucket: one.s3.bucket.name,
        Key: one.s3.object.key
      }));
    }
  }
}