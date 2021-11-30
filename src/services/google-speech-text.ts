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
      speechContexts: [{
        phrases: ['Sì', 'certo', 'no', 'negativo', 'male'],
        boost: 15
      } as any],
      metadata: {
        interactionType: 'VOICE_COMMAND',
        microphoneDistance: 'MIDFIELD',
        originalMediaType: 'AUDIO',
        recordingDeviceType: 'OTHER_INDOOR_DEVICE',
      }
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

const positiveAnswers = {
  'it-IT': [
    'Sì',
    'Certo',
    'OK',
    'Okey',
    'Bene',
    'Ottimo',
    'Sine'
  ],
  'nl-NL': [
    'Ja',
    'Jazeker',
    'Ja hoor',
    'Inderdaad',
    'Oké',
    'Wel'
  ]
}

const negativeAnswers = {
  'it-IT': [
    'No',
    'Male',
    'None'
  ],
  'nl-NL': [
    'Nee',
    'Nee hoor',
    'Niet',
    'Geen'
  ]
}

export async function sendBase64Audio(base64content: Buffer, languageCode = 'it-IT'): Promise<boolean | undefined> {

  const client = await getSpeechClient();
  const audio: google.cloud.speech.v1.IRecognitionAudio = {
    content: base64content
  };

  const config: google.cloud.speech.v1.IRecognitionConfig = {
    encoding: google.cloud.speech.v1.RecognitionConfig.AudioEncoding.LINEAR16,
    sampleRateHertz: 48000,
    languageCode,
    model: "command_and_search",
    useEnhanced: true,
    speechContexts: [{
      phrases: [...positiveAnswers[languageCode], ...negativeAnswers[languageCode]],
      boost: 15
    } as any],
    metadata: {
      interactionType: 'VOICE_COMMAND',
      microphoneDistance: 'MIDFIELD',
      originalMediaType: 'AUDIO',
      recordingDeviceType: 'OTHER_INDOOR_DEVICE',
    }
  }

  const request: google.cloud.speech.v1.IRecognizeRequest = {
    audio: audio,
    config: config,
  };

  try {
    // Detects speech in the audio file
    const [response] = await client.recognize(request);
    console.log(response);
    const words = response.results
      .map(result => result.alternatives[0].transcript.split(' '))
      .reduce((acc, one) => [...acc, ...one], [])
      .map(one => one.trim());

    console.log(words);
    const positive = words.some(word => positiveAnswers[languageCode].find((one: string) => one.toLocaleLowerCase() === word.toLocaleLowerCase()));
    const negative = words.some(word => negativeAnswers[languageCode].find((one: string) => one.toLocaleLowerCase() === word.toLocaleLowerCase()));
    console.log('positive', positive);
    console.log('negative', negative);
    if (positive && !negative) {
      return true;
    } else if (!positive && negative) {
      return false
    } else {
      return undefined;
    }
  } catch (e) {
    console.log(e)
  }

}

let client: SpeechClient;
async function getSpeechClient() {
  if (!client) {
    client = new SpeechClient({
      credentials: await getSecret('dev/google-transcribe-key')
    });
  }
  return client;
}