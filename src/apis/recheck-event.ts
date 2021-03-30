import { AttributeValue, DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import * as dayjs from 'dayjs';
import { getResponse } from "../common/response.template";
import { getReportRequestById } from "../data/schedule";

const dynamoClient = new DynamoDBClient({
  region: 'eu-west-1'
});

export default async function (event: APIGatewayEvent) {
  const response = getResponse() as APIGatewayProxyResult;

  const scheduled = await getReportRequestById(event.pathParameters.eventId);

  if (scheduled) {
    const time = dayjs(scheduled.date_scheduled);

    const item = {
      eventId: { S: scheduled.id },
      clientId: { S: scheduled.client_id },
      time: { N: time.unix().toFixed() }
    } as { [key: string]: AttributeValue };

    if (scheduled.date_deleted) {
      item.dateDeleted = { S: scheduled.date_deleted };
    }

    const res = await dynamoClient.send(
      new PutItemCommand({
        TableName: process.env.dynamodbScheduler,
        Item: item
      })
    );
  }
  response.statusCode = 204;
  return response;
}