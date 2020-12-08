import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { getResponse } from "../common/response.template";
import { executeStatement } from "../data/dao";

export default async function (event: APIGatewayEvent) {
  const response = getResponse() as APIGatewayProxyResult;
  const body = JSON.parse(event.body) as any;
  const iterations = body.iterations;

  const init = new Date();
  for(let i = 0; i< iterations; i++) {
    await executeStatement("SELECT RAND()");
  }
  const end = new Date();
  const tot = end.valueOf() - init.valueOf();
  response.body = JSON.stringify({
    init,
    end,
    tot,
    avg: tot / iterations
  });

  return response;
}