import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { getResponse } from "../common/response.template";
import { scheduleNextEvent } from "../logic/event-scheduler";

export default async function (event: APIGatewayEvent) {
  const response = getResponse() as APIGatewayProxyResult;
  console.log(`Asket recheck for any event`);
  await scheduleNextEvent();
  
  response.statusCode = 204;

  return response;
}