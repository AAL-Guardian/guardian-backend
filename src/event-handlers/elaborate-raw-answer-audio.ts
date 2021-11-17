import { LambdaClient } from "@aws-sdk/client-lambda";
import { GetObjectCommand, GetObjectCommandOutput, PutObjectCommand } from "@aws-sdk/client-s3";
import { S3Event, S3EventRecord } from "aws-lambda";
import { sendBase64Audio } from "../services/google-speech-text";
import { Readable } from "stream";
import logEvent from "../data/log-event";
import { getS3 } from "../services/s3";

export default async function (event: S3Event) {
  await Promise.all(event.Records.map(async one => {
    const [robot] = one.s3.object.key.split('_', 3);
    await logEvent(robot, 'robot_file_upload', { filename: one.s3.object.key });
    
    const data = await getS3().send(new GetObjectCommand({
      Bucket: one.s3.bucket.name,
      Key: one.s3.object.key
    }));

    // convert audio file to wav
    const content = (data.Body as Readable);
    const chunks = [] as string[];
    for await (let chunk of content) {
      chunks.push(chunk)
    }

    const buffer = Buffer.from(chunks.join(), 'base64');
    // const res = await getS3().send(new PutObjectCommand({
    //   Bucket: one.s3.bucket.name,
    //   Key: one.s3.object.key + '.wav',
    //   ContentType: "audio/wav",
    //   Body: buffer
    // }));
    console.log('sending audio to transcription');
    await sendBase64Audio(buffer);
  }));
}