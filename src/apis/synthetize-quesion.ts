import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { Polly } from "aws-sdk";
import { SynthesizeSpeechInput } from "aws-sdk/clients/polly";
import { getResponse } from "../common/response.template";

export default async function (event: APIGatewayEvent, context: any) {
  const response = getResponse() as APIGatewayProxyResult;
  const body = JSON.parse(event.body) as any;
  const text = body.text;
  const language = body.language;

  const params = {
    OutputFormat: "mp3",
    SampleRate: "16000",
    Text: text,
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

  const presigner = new Polly.Presigner();
  const url = presigner.getSynthesizeSpeechUrl(params);

  response.body = JSON.stringify({ url });
  return response;
}