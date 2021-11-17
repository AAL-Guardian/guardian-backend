import { GetObjectCommand } from '@aws-sdk/client-s3';
import { SpeechClient } from '@google-cloud/speech';
import { google } from '@google-cloud/speech/build/protos/protos';
import { createWriteStream } from 'fs';
import { readFile } from 'fs/promises';
import { Readable } from 'stream';
import { getResponse } from '../common/response.template';
import { getS3 } from './s3';
import shellExec = require('shell-exec');
import { getSecret } from './secret-manager';

export default async function () {
  // Creates a client
  const client = await getSpeechClient();

  const s3Obj = await getS3().send(
    new GetObjectCommand({
      Bucket: process.env.bucketName,
      Key: "20194503597_-18.90760723931717_1617886820301.base64.wav"
    })
  );

  // const write = createWriteStream('/tmp/test.wav');
  // await (s3Obj.Body as ReadableStream).pipeTo(write)

  // const audioContent = await streamToString(s3Obj.Body as Readable);
  try {
    const originFilename = "/tmp/test.wav";
    await new Promise<void>((resolve, reject) => (s3Obj.Body as Readable).pipe(createWriteStream(originFilename, {
      encoding: 'binary'
    }))
      .on('error', err => reject(err))
      .on('close', () => resolve()));

    const c3 = await shellExec("ffmpeg -i /tmp/test.wav -ac 1 /tmp/output.wav");
    console.log('c3', c3);

    // The audio file's encoding, sample rate in hertz, and BCP-47 language code
    const audio: google.cloud.speech.v1.IRecognitionAudio = {
      content: Buffer.from((await readFile("/tmp/output.wav")).buffer).toString('base64')
    };

    const config: google.cloud.speech.v1.IRecognitionConfig = {
      encoding: google.cloud.speech.v1.RecognitionConfig.AudioEncoding.LINEAR16,
      sampleRateHertz: 48000,
      languageCode: 'it-IT',
    }

    const request: google.cloud.speech.v1.IRecognizeRequest = {
      audio: audio,
      config: config,
    };

    // Detects speech in the audio file
    const [response] = await client.recognize(request);
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');

    return getResponse({
      body: JSON.stringify({
        transcription
      })
    })
  } catch (e) {
    return getResponse({
      statusCode: 500,
      body: JSON.stringify(e)
    })
  }
}

export async function sendBase64Audio(base64content: Buffer, languageCode = 'it-IT') {
  const client = await getSpeechClient();
  const audio: google.cloud.speech.v1.IRecognitionAudio = {
    content: base64content
  };

  const config: google.cloud.speech.v1.IRecognitionConfig = {
    encoding: google.cloud.speech.v1.RecognitionConfig.AudioEncoding.LINEAR16,
    sampleRateHertz: 48000,
    languageCode,
  }

  const request: google.cloud.speech.v1.IRecognizeRequest = {
    audio: audio,
    config: config,
  };

  try {
    // Detects speech in the audio file
    const [response] = await client.recognize(request);
    console.log(response);
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');
    console.log(transcription);
  } catch (e) {
    console.log(e)
  }

}

let client: SpeechClient;
async function getSpeechClient() {
  if(!client) {
    client = new SpeechClient({
      credentials: await getSecret('dev/google-transcribe-key')
    });
  }
  return client;
}