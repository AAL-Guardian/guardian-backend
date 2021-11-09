import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import dayjs = require("dayjs");
import { getResponse } from "../common/response.template";
import { getReportRequestById } from "../data/schedule";
import { scheduleNextEvent } from '../logic/event-scheduler';

export default async function (event: APIGatewayEvent) {
  const response = getResponse() as APIGatewayProxyResult;

  const scheduled = await getReportRequestById(event.pathParameters.eventId);
  console.log(`Asked recheck for`, scheduled);
  console.log(`Now: `, dayjs().format());
  await scheduleNextEvent();
  response.statusCode = 204;
  return response;
}