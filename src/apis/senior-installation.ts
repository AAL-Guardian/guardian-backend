import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { IoTClient, DescribeEndpointCommand } from '@aws-sdk/client-iot';
import { getResponse } from "../common/response.template";
import { saveSeniorClient } from "../data/access-token";
import { InstallationRequest, InstallationResponse } from "../data/models/installation.model";

const iot = new IoTClient({});
// if(process.env.IS_OFFLINE === 'true') {
//   config.credentials = new SharedIniFileCredentials({profile: process.env.profile});
// }

export default async function (event: APIGatewayEvent, context: any) {
  const response = getResponse() as APIGatewayProxyResult;
  const body = JSON.parse(event.body) as InstallationRequest;
  const robot = body.robotCode;
  
  const endpoint = await iot.send(new DescribeEndpointCommand({
    endpointType: 'iot:Data-ATS'
  }));
  const token = await saveSeniorClient(robot);
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