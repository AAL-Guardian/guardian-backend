import { DescribeEndpointCommand, IoTClient } from '@aws-sdk/client-iot';
import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { getResponse } from "../common/response.template";
import { saveSeniorClient } from "../data/access-token";
import { InstallationRequest, InstallationResponse } from "../data/models/installation.model";
import { assignRobot, getRobotAssignment, getRobotAssignmentById, getRobotBySN } from "../data/robot";

const iot = new IoTClient({
  region: 'eu-west-1'
});

export default async function (event: APIGatewayEvent, context: any) {
  const response = getResponse() as APIGatewayProxyResult;
  const body = JSON.parse(event.body) as InstallationRequest;
  const robotCode = body.robotCode;
  const clientId = body.clientId;

  let [assignment, robot] = await Promise.all([
    getRobotAssignment(robotCode, clientId),
    getRobotBySN(robotCode)
  ]);

  if(!assignment) {
    const assignmentId = await assignRobot(robot.serial_number, clientId);
    assignment = await getRobotAssignmentById(assignmentId);
  }

  const token = await saveSeniorClient(assignment.id);

  const endpoint = await iot.send(new DescribeEndpointCommand({
    endpointType: 'iot:Data-ATS'
  }));

  const responseBody: InstallationResponse = {
    endpoint: endpoint.endpointAddress,
    clientId: body.clientId,
    robotTopic: 'misty-' + robot.topic,
    token
  };
  response.body = JSON.stringify(responseBody);
  return response;
}