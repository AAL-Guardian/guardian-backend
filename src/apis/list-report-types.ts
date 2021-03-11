import { APIGatewayEvent } from "aws-lambda";
import { getResponseV2 } from "../common/response.template";
import { executeStatement } from "../data/dao";

export default async function (event: APIGatewayEvent) {
  const response = getResponseV2();
  
  const list = await executeStatement("SELECT * FROM report_type ORDER BY sort_order");

  response.body = JSON.stringify(list);

  return response;
}