import { APIGatewayProxyEventBase } from "aws-lambda";
import { getResponse } from "../common/response.template";
import { executeStatement } from "../data/dao";
import { AppointmentRecurrence } from "../data/models/appointment-recurrence.model";
import { AuthContext } from "../data/models/auth";

export default async function (event: APIGatewayProxyEventBase<AuthContext>) {
  const response = getResponse();

  const appointments = await executeStatement(`SELECT ar.*
  FROM appointment_recurrence ar
  JOIN appointments a ON ar.appointment_id = a.id
  WHERE
    date(ar.date_start) = current_date()
    AND a.client = :client
    AND a.date_deleted is null `,
    [{
      name: 'client',
      value: {
        stringValue: event.requestContext.authorizer.clientId
      }
    }]) as AppointmentRecurrence[];

  response.body = JSON.stringify(appointments);

  return response;
}