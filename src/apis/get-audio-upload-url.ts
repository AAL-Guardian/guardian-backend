import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { getResponse } from "../common/response.template";
import logEvent from "../data/log-event";
import { getPutSignedUrl } from "../services/s3";

export default async function (event: APIGatewayEvent) {
  const robotCode = event.pathParameters.robotCode;
  const response = getResponse() as APIGatewayProxyResult;

  await logEvent(robotCode, 'robot_file_upload_request');

  const signedUrl = await getPutSignedUrl('detections/' + robotCode + '_' + new Date().getTime() + '.base64')
  response.body = JSON.stringify({
    signedUrl
  })
  return response;
}