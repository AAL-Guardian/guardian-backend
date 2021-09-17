import { APIGatewayTokenAuthorizerEvent } from 'aws-lambda';
import { selectStatement } from '../data/dao';
import { checkTokenValidity } from '../data/access-token';
import { Client } from '../data/models/client.model';
import { getRobotAssignmentById } from '../data/robot';

interface Policy {
  principalId: any,
  policyDocument: {
    Version: "2012-10-17",
    Statement: {
      Action: "execute-api:Invoke",
      Effect: "Allow" | "Deny",
      Resource: string
    }[]
  }
  context: {
    [key: string]: any
  }
}

export default async function (event: APIGatewayTokenAuthorizerEvent) {
  const policy = {
    principalId: undefined,
    policyDocument: {
      Version: "2012-10-17",
      Statement: []
    },
    context: {
      userId: undefined,
      token: undefined,
    },
  } as Policy;
  try {
    const authHeader = event.authorizationToken;

    const authToken = authHeader.split(' ', 2)[1];
    const token = await checkTokenValidity(authToken);
    const assignment = await getRobotAssignmentById(token.robot_assignment_id);
    const [ client ] = await selectStatement<Client>('clients', [{
      name: 'id',
      value: {
        stringValue: assignment.clients_id
      }
    }]);
    policy.principalId = authToken;
    
    policy.context.clientId = client.id;
    policy.context.personId = client.person_id;
    policy.context.robotSN = assignment.robot_serial_number;
    policy.context.assignmentId = assignment.id;
    policy.context.token = authToken;

    const [arn, aws, command, region, account, endpoint] = event.methodArn.split(':', 6);
    const [key, env, path] = endpoint.split('/', 3);
    const wildcard = [arn, aws, command, region, account, `${key}/${env}/*`].join(':');

    policy.policyDocument.Statement.push({
      Action: "execute-api:Invoke",
      Effect: "Allow",
      Resource: wildcard
    });

    return policy;

  } catch (catchErr) {
    console.log('error');

    throw 'Unauthorized';
  }
}