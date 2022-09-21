import { IoTDataPlaneClient, PublishCommand } from "@aws-sdk/client-iot-data-plane";
import { PollyClient, SynthesizeSpeechCommand, SynthesizeSpeechInput, TextType } from "@aws-sdk/client-polly";
import { getSynthesizeSpeechUrl } from "@aws-sdk/polly-request-presigner";
import { getPutSignedUrl } from "../services/s3";
import logEvent from "../data/log-event";
import { Robot } from "../data/models/robot.model";

const iotData = new IoTDataPlaneClient({});
const pollyClient = new PollyClient({});

export async function sendSpeakCommand(robot: Robot, message: string, language: string) {
  let volume: number = 100;
  let rate: 'x-slow' | 'slow' | 'medium' | 'fast' | 'x-fast' | 0 | 1 | 2 | 3 | 4;
  let gender: string = 'female';
  try {
    const extra = JSON.parse(robot.extra);
    volume = extra.volume;
    if (extra.rate !== undefined) {
      rate = extra.rate;
    }
    if (extra.gender) {
      gender = extra.gender;
    }
  } finally {
    console.log('now what?')
  }
  switch (rate) {
    case 0:
      rate = 'x-slow'
      break;
    case 1:
      rate = 'slow'
      break;
    case 3:
      rate = 'fast'
      break;
    case 4:
      rate = 'x-fast'
      break;
    case 2:
    default:
      rate = 'medium'
  }

  const params = {
    OutputFormat: "mp3",
    SampleRate: "16000",
    Text: `<speak>
    <prosody rate="${rate}">${message}</prosody>
    </speak>`,
    TextType: TextType.SSML,
  } as SynthesizeSpeechInput;

  switch (language) {
    case 'it':
    case 'it-IT':
      params.LanguageCode = 'it-IT';
      params.VoiceId = gender === 'male' ? 'Giorgio' : 'Carla'
      params.Engine = "standard"
      break;
    case 'en':
    case 'en-GB':
      params.LanguageCode = 'en-GB';
      params.VoiceId = gender === 'male' ? 'Brian' : 'Amy'
      params.Engine = "neural"
      break;
    case 'nl':
    case 'nl-NL':
      params.LanguageCode = 'nl-NL';
      params.VoiceId = gender === 'male' ? 'Ruben' : 'Lotte';
      params.Engine = 'standard';
      break;
    case 'fr':
    case 'fr-FR':
      params.LanguageCode = 'fr-FR';
      params.VoiceId = gender === 'male' ? 'Mathieu' : 'Celine'
      params.Engine = 'standard';
      break;
  }

  const url = await getSynthesizeSpeechUrl({
    client: pollyClient,
    params
  });

  await iotData.send(new PublishCommand({
    topic: robot.topic + '/command',
    payload: (new TextEncoder()).encode(JSON.stringify({
      guardian_command: 'speak_from_url',
      guardian_data: {
        url,
        volume: Math.round(volume)
      }
    }))
  }));

  await logEvent(robot.serial_number, 'sent_speak_command', { message, language, url });

}

export async function sendListenCommand(robot: Pick<Robot, 'topic' | 'serial_number'>, time = 10) {
  await iotData.send(new PublishCommand({
    topic: robot.topic + '/command',
    payload: (new TextEncoder()).encode(JSON.stringify({
      guardian_command: 'record_audio',
      guardian_data: {
        upload_url: await getPutSignedUrl('detections/' + robot.serial_number + '_' + new Date().getTime() + '.base64'),
        time
      },
    }))
  }))
  await logEvent(robot.serial_number, 'record_audio');
}

export async function sendListenAnswerCommand(robot: Pick<Robot, 'topic' | 'serial_number'>, time = 5) {
  await iotData.send(new PublishCommand({
    topic: robot.topic + '/command',
    payload: (new TextEncoder()).encode(JSON.stringify({
      guardian_command: 'listen_answers',
      guardian_data: {
        upload_url: await getPutSignedUrl('answers/' + robot.serial_number + '_' + new Date().getTime() + '.base64'),
        time,
        command: "listen_answers"
      },
    }))
  }))
  await logEvent(robot.serial_number, 'record_answer');
}

export async function sendPhotoCaptureCommand(robot: Pick<Robot, 'topic' | 'serial_number'>, head_angle: number) {
  await iotData.send(new PublishCommand({
    topic: robot.topic + '/command',
    payload: (new TextEncoder()).encode(JSON.stringify({
      guardian_command: 'take_photo',
      guardian_data: {
        upload_url: await getPutSignedUrl('photos/' + robot.serial_number + '_' + new Date().getTime() + '.jpg.base64'),
        head_position: head_angle
      },
    }))
  }))
  await logEvent(robot.serial_number, 'take_photo');
}

export async function sendTouchDetectStatusCommand(robot: Pick<Robot, 'topic' | 'serial_number'>, on: boolean) {
  await iotData.send(new PublishCommand({
    topic: robot.topic + '/command',
    payload: (new TextEncoder()).encode(JSON.stringify({
      guardian_command: 'sense_touch',
      guardian_data: on ? 'on' : 'off',
    }))
  }))
}

export async function sendMoveHeadCommand(robot: Pick<Robot, 'topic' | 'serial_number'>, angle: number) {
  await iotData.send(new PublishCommand({
    topic: robot.topic + '/command',
    payload: (new TextEncoder()).encode(JSON.stringify({
      guardian_command: 'move_head',
      guardian_data: {
        angle
      },
    }))
  }))
  await logEvent(robot.serial_number, 'moved_head', angle);
}

export async function sendEyeContactCommand(robot: Pick<Robot, 'topic' | 'serial_number'>, status: 'sleep' | 'on' | 'off') {
  await iotData.send(new PublishCommand({
    topic: robot.topic + '/command',
    payload: (new TextEncoder()).encode(JSON.stringify({
      guardian_command: 'eye_contact',
      guardian_data: status,
    }))
  }))
  await logEvent(robot.serial_number, 'eye_contact', status);
}

export async function sendChangeLedCommand(robot: Pick<Robot, 'topic' | 'serial_number'>) {
  await iotData.send(new PublishCommand({
    topic: robot.topic + '/command',
    payload: (new TextEncoder()).encode(JSON.stringify({
      guardian_command: 'change_led',
      guardian_data: undefined,
    }))
  }))
  await logEvent(robot.serial_number, 'change_led');
}

export type Emotions = 'how_are_you' | 'sleep' | 'yes' | 'medication' | 'yesmedication' | 'meal' | 'activitysuggestion' | 'dormi' | 'sveglia';
export async function sendEmotion(robot: Pick<Robot, 'topic' | 'serial_number'>, emotion: Emotions) {
  await iotData.send(new PublishCommand({
    topic: robot.topic + '/command',
    payload: (new TextEncoder()).encode(JSON.stringify({
      guardian_command: 'emotion_' + emotion,
      guardian_data: undefined,
    }))
  }))
  await logEvent(robot.serial_number, 'emotion_' + emotion);
}