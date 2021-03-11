import { APIGatewayProxyEventV2 } from "aws-lambda";
import { getResponseV2 } from "../common/response.template";
import { getReportSetup } from "../data/report";

export default async function (event: APIGatewayProxyEventV2) {
  const response = getResponseV2();
  const report_type_id = event.pathParameters.id

  response.body = JSON.stringify(await getReportSetup(parseInt(report_type_id)));
  return response;
}