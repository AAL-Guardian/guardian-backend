import { IoTDataPlaneClient, PublishCommand } from "@aws-sdk/client-iot-data-plane";
import { PollyClient, SynthesizeSpeechCommand, SynthesizeSpeechInput } from "@aws-sdk/client-polly";
import { getSynthesizeSpeechUrl } from "@aws-sdk/polly-request-presigner";
import { getPutSignedUrl } from "../services/s3";
import logEvent from "../data/log-event";
import { Robot } from "../data/models/robot.model";

const iotData = new IoTDataPlaneClient({});
const pollyClient = new PollyClient({});

export async function sendSpeakCommand(robot: Robot, message: string, language: string) {
  const params = {
    OutputFormat: "mp3",
    SampleRate: "16000",
    Text: message,
    TextType: 'text',
  } as SynthesizeSpeechInput;

  switch (language) {
    case 'it':
    case 'it-IT':
      params.LanguageCode = 'it-IT';
      params.VoiceId = 'Carla'
      params.Engine = "standard"
      break;
    case 'en':
    case 'en-GB':
      params.LanguageCode = 'en-GB';
      params.VoiceId = 'Amy'
      params.Engine = "neural"
      break;
    case 'nl':
    case 'nl-NL':
      params.LanguageCode = 'nl-NL';
      params.VoiceId = 'Lotte';
      params.Engine = 'standard';
      break;
    case 'fr':
    case 'fr-FR':
      params.LanguageCode = 'fr-FR';
      params.VoiceId = 'Celine';
      params.Engine = 'standard';
      break;
  }

  const url = await getSynthesizeSpeechUrl({
    client: pollyClient,
    params
  });
  let volume = 100;
  try {
    volume = JSON.parse(robot.extra)?.volume;
  } catch (e) {

  }

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

export async function sendEyeContactCommand(robot: Pick<Robot, 'topic' | 'serial_number'>, status: 'sleep' | 'normal' | 'off') {
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
export async function sendEmotion(robot: Pick<Robot, 'topic' | 'serial_number'>, emotion: Emotions ) {
  await iotData.send(new PublishCommand({
    topic: robot.topic + '/command',
    payload: (new TextEncoder()).encode(JSON.stringify({
      guardian_command: 'emotion_'+emotion,
      guardian_data: undefined,
    }))
  }))
  await logEvent(robot.serial_number, 'emotion_'+emotion);
}