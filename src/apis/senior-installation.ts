import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { Iot } from "aws-sdk";
import { getResponse } from "../common/response.template";
import { saveSeniorClient } from "../data/access-token";
import { InstallationRequest, InstallationResponse } from "../data/models/installation.model";

export default async function (event: APIGatewayEvent, context: any) {
  const response = getResponse() as APIGatewayProxyResult;
  const body = JSON.parse(event.body) as InstallationRequest;
  const robot = body.robotCode;
  const iot = new Iot();
  const endpoint = await iot.describeEndpoint({
    endpointType: 'iot:Data-ATS'
  }).promise();
  const token = await saveSeniorClient();
  const responseBody: InstallationResponse = {
    endpoint: endpoint.endpointAddress,
    clientId: body.clientId,
    robotCode: robot,
    robotTopic: 'misty-' + robot,
    token
  };
  response.body = JSON.stringify(responseBody);
  return response;
}