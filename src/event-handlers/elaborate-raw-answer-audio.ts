import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { S3Event } from "aws-lambda";
import { Readable } from "stream";
import logEvent from "../data/log-event";
import { sendBase64Audio } from "../services/google-speech-text";
import { handleAnswerDetected } from "../logic/guardian-event-logic";
import { getS3 } from "../services/s3";

export default async function (event: S3Event) {
  await Promise.all(event.Records.map(async one => {
    const [robot_code] = one.s3.object.key.split('/')[1].split('_');
    await logEvent(robot_code, 'robot_file_upload', { filename: one.s3.object.key });

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
    await getS3().send(new PutObjectCommand({
      Bucket: one.s3.bucket.name,
      Key: one.s3.object.key + '.wav',
      ContentType: "audio/wav",
      Body: buffer
    }));
    console.log('sending audio to transcription');
    const res = await sendBase64Audio(buffer);
    console.log('answer: ', res);
    if (res === true || res === false) {
      await handleAnswerDetected(robot_code, res);
    }
  }));
}