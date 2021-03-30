import { DynamoDBStreamEvent } from "aws-lambda";
import { checkUserAndLaunchReportRequest } from "../logic/launch-report-request";

export default async function (event: DynamoDBStreamEvent) {
  await Promise.all(event.Records.map(async record => {

    const eventName = record.eventName;
    const dynamodbRecord = record.dynamodb;

    if (eventName === 'REMOVE') {
      console.log('REMOVE');
      
      console.log(dynamodbRecord);
      await checkUserAndLaunchReportRequest(dynamodbRecord.OldImage.eventId.S);
    } else {
      console.log("Event is " + eventName + ", Skipping execution");
    }
  }));
  const response = {
    statusCode: 200,
    body: JSON.stringify('Success'),
  };
  return response;
}
