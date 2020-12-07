import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { Iot } from 'aws-sdk';
import { getResponse } from "../common/response.template";
import { InstallationRequest, InstallationResponse } from "../data/models/installation.model";

export default async function (event: APIGatewayEvent) {
  const response = getResponse() as APIGatewayProxyResult;
  const body = JSON.parse(event.body) as InstallationRequest;
  const robot = body.robotCode;

  const iot = new Iot();
  const endpoint = await iot.describeEndpoint().promise();
  const thing = await iot.createThing({
    thingName: 'misty-' + robot
  }).promise();
  const group = await iot.addThingToThingGroup({ thingName: thing.thingName, thingGroupName: 'Guardian' }).promise();

  const responseBody = {
    token: robot,
    clientId: thing.thingName,
    endpoint: endpoint.endpointAddress,
    robotCode: robot,
    robotTopic: thing.thingName
  } as InstallationResponse;
  console.log('robotResponse', responseBody);
  response.body = JSON.stringify(responseBody);

  return response;
}