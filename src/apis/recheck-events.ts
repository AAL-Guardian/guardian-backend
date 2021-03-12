import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { listFutureReportRequests } from "../data/schedule";
import { getResponse } from "../common/response.template";
import dayjs = require("dayjs");
import { AttributeValue, BatchWriteItemCommand, DynamoDBClient, PutItemCommand, WriteRequest } from "@aws-sdk/client-dynamodb";

const dynamoClient = new DynamoDBClient({
  region: 'eu-west-1'
});

export default async function (event: APIGatewayEvent) {
  const response = getResponse() as APIGatewayProxyResult;

  const scheduledList = await listFutureReportRequests();
  const writeRequests = [] as WriteRequest[];
  
  for (const scheduled of scheduledList) {
    const time = dayjs(scheduled.date_scheduled);
    const item = {
      eventId: { S: scheduled.id },
      clientId: { S: scheduled.client_id },
      time: { N: time.unix().toFixed() }
    } as { [key: string]: AttributeValue };

    if (scheduled.date_deleted) {
      item.dateDeleted = { S: scheduled.date_deleted };
    }
    writeRequests.push({
      PutRequest: {
        Item: item
      }
    });
  }
  if(writeRequests.length) {
    const inserts = new BatchWriteItemCommand({
      RequestItems: {
        [process.env.dynamodbScheduler]: writeRequests
      }
    })
  }
  
  response.statusCode = 204;

  return response;
}