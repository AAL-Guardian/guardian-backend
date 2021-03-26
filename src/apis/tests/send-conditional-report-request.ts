import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { getResponse } from "../../common/response.template";
import { checkUserAndLaunchReportRequest } from "../../logic/launch-report-request";

export default async function (event: APIGatewayEvent) {
  const response = getResponse() as APIGatewayProxyResult;
  await checkUserAndLaunchReportRequest(event.pathParameters.requestId)

  response.body = JSON.stringify(true);

  return response;
}