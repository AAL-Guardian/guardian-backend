import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { getResponse } from "../common/response.template";

export default async function (event: APIGatewayEvent) {
  const response = getResponse() as APIGatewayProxyResult;
  const body = JSON.parse(event.body);
  const robot = body.robotId;

  response.body = JSON.stringify({
    token: robot
  });

  return response;
}