import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { getResponse } from "../../common/response.template";
import { getReportRequestById } from "../../data/schedule";
import { launchReportRequest } from "../../logic/launch-report-request";

export default async function (event: APIGatewayEvent) {
  const response = getResponse() as APIGatewayProxyResult;
  const reportRequest = await getReportRequestById(event.pathParameters.requestId);
  await launchReportRequest(reportRequest)

  response.body = JSON.stringify(true);

  return response;
}