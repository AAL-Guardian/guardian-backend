import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { getReportRequestById } from "../data/schedule";
import { getResponse } from "../common/response.template";
import { GetItemCommand, DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import * as dayjs from 'dayjs';

const dynamoClient = new DynamoDBClient({
  region: 'eu-west-1'
});

export default async function (event: APIGatewayEvent) {
  const response = getResponse() as APIGatewayProxyResult;

  const scheduled = await getReportRequestById(event.pathParameters.eventId);

  if(scheduled) {
    await dynamoClient.send(
      new PutItemCommand({
        TableName: process.env.dynamodbScheduler,
        Item: {
          eventId: { S: scheduled.id },
          clientId: { S: scheduled.client_id },
          dateDeleted: { S: scheduled.date_deleted },
          time: { N: dayjs(scheduled.date_scheduled).unix().toFixed() }
        }
      })
    );
  }

  return response;
}