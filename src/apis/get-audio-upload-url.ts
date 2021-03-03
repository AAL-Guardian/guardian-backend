import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import logEvent from "../data/log-event";
import { getResponse } from "../common/response.template";

const s3 = new S3Client({});

if (process.env.IS_OFFLINE === 'true') {
  s3.config.credentialDefaultProvider = require('@aws-sdk/credential-provider-ini').fromIni({ profile: process.env.profile })
}

export default async function (event: APIGatewayEvent) {
  const robotCode = event.pathParameters.robotCode;
  const response = getResponse() as APIGatewayProxyResult;

  await logEvent(robotCode, 'robot_file_upload_request');

  const signedUrl = await getSignedUrl(s3, new PutObjectCommand({
    Bucket: process.env.bucketName,
    Key: robotCode + '-' + new Date().getTime() + '.base64'
  }), { expiresIn: 3600 })
  response.body = JSON.stringify({
    signedUrl
  })
  return response;
}