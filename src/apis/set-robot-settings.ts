import { APIGatewayProxyEventBase } from "aws-lambda";
import { getResponse } from "../common/response.template";
import { updateStatement } from "../data/dao";
import { AuthContext } from "../data/models/auth";
import { Robot } from "../data/models/robot.model";

export default async function (event: APIGatewayProxyEventBase<AuthContext>) {

  const response = getResponse();
  const robot = JSON.parse(event.body) as Robot;
  await updateStatement('robot', [{
    name: 'extra',
    value: {
      stringValue: typeof robot.extra === 'string' ? robot.extra : JSON.stringify(robot.extra)
    }
  }], [{
    name: 'serial_number',
    value: {
      stringValue: event.requestContext.authorizer.robotSN
    }
  }]);
  
  response.body = JSON.stringify(robot);
  return response;
}
