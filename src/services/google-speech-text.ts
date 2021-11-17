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
  const client = new SpeechClient({
    credentials: {
      "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQC7OfPz49w9koBN\nFoyPcoThWlilhKzxhbhpAjIsoxsl9uIhi+RnelvyICmpxP8bsWHZjl7dwgbKKEBU\nAPOS52MF6crflOp/+t0NbVff9rNgCtIjSY0H2MlWqh0mH6E5ACVM+xqF2LMgsGMn\nWfsjG4p5s/oLLnK4PKrk6Kxfdk40kp5UU31v90qURKtlNAgI4ieMQMPcvXDukP1L\nG8ARSjn66+493JWEFFAj4gd17IbvDXPn9aGwW9BE805j/D23ExLnJKNRdI5fu+TO\nPUUjxOwThJQCNaIc21DDsj4nRvFxOQbhQNou2BuzGmw74PcStUsdZohVpWORjfJ+\np9rA4WnhAgMBAAECgf9KXVz6JOzbyPtuBJslQn/24fwCjXto7RmvqAsQ/PUAYFRt\nL2yNXBSOyi95FnzgGVuv8YdTD52KZS1gwp52fiRMnqA/MiwKwanvEPUTVXP6H48e\n5sKbkBo/4D1qja/NHMvcq03lu3Hsvs1ukulV/E09Hib+GTPZTys0Ux4cEc03NFXF\nSZyLQXUisNptwxu14yr5Y4nFZiFDz7B49Cd8hs70++FQHdrkIn3D5mVckEyz6W5q\nmS8vl1I0HT+H7EOvZVw5NmpN//Bh97TwIAI2QWhEuX5Gtx/zMDydW6BeGYm4Klnf\nW35QlEVP55sLMRyCcZl7xpENqYyow7t9x42Ti4ECgYEA+zWfu6me45BEI84gDoA8\nhX2Y0V7u35nwRGLT6gpaqSb9HF14RbB88joF7PBB5SgxTL+XgllPIPI2xkKxgbXw\n2MhOz6m3EbN/7Ccdoq6G7L+BbFFKOOxW6SZLTNxKZs+CMJ1ENuAZ5GCz4bNIFIYh\n8bK/m/Po3dFRlH8JFstZMBkCgYEAvsv4h4iyoktSPcxHA35Ox+4+Wuka01sXAblY\nFNvmgtzElwYLc6dCM/cFf6XwI/u3sHEayq7aahDH+45RkFAn09C+uASHAQZilvE8\n5tMg53hdq69vb78xsRUIBiAJaFHRCOwp9A7cJw0QOrLJunWO6ySxL/1A9Y5KkSVL\nfeNXoQkCgYEA93IDzIuxWgDiTc6dXwtMEkX8QMhdTd3JgONEULYwRYyFJ+qeLS9C\ndCtZaOHkVsC3hxz2NcyZGB/een55cQZxnmf40a8gCAyjBlAlbfiyKQQejT6peNa8\naV5yL9ySYSEn4ZEX/2HRv1bN+ZVqe+UADJ+BBDJHADBORpK3tj9JtAkCgYAqZ983\nEHTTiXYf8hUee6Y63YLSZdjmfOpiIbWn/TAAidzPzDIjZFtcfVylgFYdSUcMWjcg\nMTiuNkicaodKUeZoN48MC0WOPsMO1VM54lb/20rGa9mStqXuu8PqyJgOrZCOMR8p\n9VuM+mRPB4m6fYJkVOVkyx7y9Msx814R/sNtMQKBgQCXYUDU4s6zkancIHO31D1e\nZ6R9yzCfx0p5jc8AVhuylxw4MNTmAcfOPV6NaCpteZrlqLFajjh7pRzTLaii65Xo\nSHX2VSbLWvxnXjLacNFSf9x/cauHaDNry9lqWPZEw4C7mYOrq4w0U9JOhy21zeOB\nnicbxEYJtLdJoudfLqCwdA==\n-----END PRIVATE KEY-----\n",
      "client_email": "guardian-transliteration@api-project-348494864129.iam.gserviceaccount.com",
    }
  });

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
  ]
}

const negativeAnswers = {
  'it-IT': [
    'No',
    'Male',
    'None'
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
      phrases: positiveAnswers[languageCode] + negativeAnswers[languageCode],
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
      .reduce((acc, one) => [ ...acc, ...one ], []);

    console.log(words);
    const positive = words.some(word => positiveAnswers[languageCode].find(word));
    const negative = words.some(word => negativeAnswers[languageCode].find(word));

    if(positive && !negative) {
      return true;
    } else if(!positive && negative) {
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