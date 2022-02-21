import { DescribeEndpointCommand, IoTClient } from '@aws-sdk/client-iot';
import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { selectStatement } from '../data/dao';
import { getResponse } from "../common/response.template";
import { saveSeniorClient } from "../data/access-token";
import { assignRobot, getRobotAssignment, getRobotAssignmentById, getRobotBySN } from "../data/robot";
import { Client } from '../data/models/client.model';
import { Person } from '../data/models/person.model';

const iot = new IoTClient({
  region: 'eu-west-1'
});

export default async function (event: APIGatewayEvent, context: any) {
  const response = getResponse() as APIGatewayProxyResult;
  const body = JSON.parse(event.body);
  const robotCode = body.robotCode;
  const clientId = body.clientId;

  let [ assignment, robot, clients ] = await Promise.all([
    getRobotAssignment(robotCode, clientId),
    getRobotBySN(robotCode),
    selectStatement<Client>('clients', [
      {
        name: 'id',
        value: {
          stringValue: clientId
        }
      }
    ])
  ]);
  const [ client ] = clients;
  const [ person ] = await selectStatement<Person>('persons', [
    {
      name: 'id',
      value: {
        stringValue: client.person_id
      }
    }
  ])
  if (!assignment) {
    const assignmentId = await assignRobot(robot.serial_number, clientId);
    assignment = await getRobotAssignmentById(assignmentId);
  }

  const token = await saveSeniorClient(assignment.id);

  const endpoint = await iot.send(new DescribeEndpointCommand({
    endpointType: 'iot:Data-ATS'
  }));

  const responseBody = {
    endpoint: endpoint.endpointAddress,
    authorizer: `GuardianIotAuthorizer-${process.env.stage}`,
    clientId: 'senior-' + body.clientId,
    clientLang: person.language,
    robotTopic: robot.topic,
    token,
    clientName: person.name,
  };
  response.body = JSON.stringify(responseBody);
  return response;
}