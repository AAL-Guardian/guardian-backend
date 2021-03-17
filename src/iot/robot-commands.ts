import { IoTDataPlaneClient, PublishCommand } from "@aws-sdk/client-iot-data-plane";
import { PollyClient, SynthesizeSpeechInput } from "@aws-sdk/client-polly";
import { getSynthesizeSpeechUrl } from "@aws-sdk/polly-request-presigner";
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

  await iotData.send(new PublishCommand({
    topic: robot.topic  + '/command',
    payload: (new TextEncoder()).encode(JSON.stringify({
      command: 'speak',
      data: {
        url
      }
    }))
  }))
} 

export async function sendListenCommand(robot: Robot) {
  await iotData.send(new PublishCommand({
    topic: robot.topic  + '/command',
    payload: (new TextEncoder()).encode(JSON.stringify({
      command: 'listen',
    }))
  }))
}