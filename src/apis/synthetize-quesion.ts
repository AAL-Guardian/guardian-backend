import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { Polly } from "aws-sdk";
import { getResponse } from "../common/response.template";

const polly = new Polly();

export default async function (event: APIGatewayEvent, context: any) {
  const response = getResponse() as APIGatewayProxyResult;
  const body = JSON.parse(event.body) as any;
  const text = body.text;
  const language = body.language;
  const params = {
    Engine: "standard",
    OutputFormat: "mp3",
    SampleRate: "16000",
    Text: text,
    TextType: 'text',
    VoiceId: "Brian",
    // LanguageCode: "en-GB"
  };
  const presigner = new Polly.Presigner();
  const url = presigner.getSynthesizeSpeechUrl(params);

  response.body = JSON.stringify({ url }); 
  return response;
}