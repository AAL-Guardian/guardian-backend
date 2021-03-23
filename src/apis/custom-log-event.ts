import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { getResponse } from "../common/response.template";
import logEvent from "../data/log-event";

export default async function (event: APIGatewayEvent) {
  const robotCode = event.pathParameters.robotCode;
  const { eventName, eventData } = JSON.parse(event.body);
  const response = getResponse() as APIGatewayProxyResult;
  response.statusCode = 204;

  await logEvent(robotCode, eventName, eventData);
  return response;
}