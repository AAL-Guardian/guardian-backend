import { SpeechClient } from '@google-cloud/speech';
import { google } from '@google-cloud/speech/build/protos/protos';
import { getSecret } from './secret-manager';

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
    'Jà',
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

export async function sendBase64Audio(base64content: Buffer, language: string): Promise<boolean | undefined> {
  let languageCode: 'it-IT' | 'en-GB' | 'nl-NL' | 'fr-FR';
  switch (language) {
    case 'it':
    case 'it-IT':
      languageCode = 'it-IT';
      break;
    case 'en':
    case 'en-GB':
      languageCode = 'en-GB';
      break;
    case 'nl':
    case 'nl-NL':
      languageCode = 'nl-NL';
      break;
    case 'fr':
    case 'fr-FR':
      languageCode = 'fr-FR';
      break;
  }
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