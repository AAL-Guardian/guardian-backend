import { APIGatewayProxyEventBase } from "aws-lambda";
import { AuthContext } from "../data/models/auth";
import { getResponse } from "../common/response.template";
import { selectStatement } from "../data/dao";
import { Robot } from "../data/models/robot.model";

export default async function (event: APIGatewayProxyEventBase<AuthContext>) {

  const response = getResponse();
  const [ robot ] = await selectStatement<Robot>('robot', [{
    name: 'serial_number',
    value: {
      stringValue: event.requestContext.authorizer.robotSN
    }
  }]);
  
  response.body = JSON.stringify(robot);
  return response;
}
