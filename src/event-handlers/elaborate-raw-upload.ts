import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { S3Event } from "aws-lambda";
import logEvent from "../data/log-event";
import { Readable } from "stream";

const s3 = new S3Client({});

if (process.env.IS_OFFLINE === 'true') {
  s3.config.credentialDefaultProvider = require('@aws-sdk/credential-provider-ini').fromIni({ profile: process.env.profile })
}

export default async function (event: S3Event) {
  await Promise.all(event.Records.map(async one => {
    try {
      const [robot] = one.s3.object.key.split('-', 2);
      await logEvent(robot, 'robot_file_upload', { filename: one.s3.object.key });
      const data = await s3.send(new GetObjectCommand({
        Bucket: one.s3.bucket.name,
        Key: one.s3.object.key
      }));

      // const content = (data.Body as ReadableStream<string>);
      // const readed = await content.getReader().read();
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
      console.log(event);
      console.log(e);
    }
  }));
}
