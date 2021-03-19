import {
  AddThingToThingGroupCommand, AttachPolicyCommand,
  AttachThingPrincipalCommand, CreateKeysAndCertificateCommand, CreatePolicyCommand,
  CreatePolicyResponse, CreateThingCommand, CreateThingCommandOutput, DescribeEndpointCommand, DescribeThingCommand, DescribeThingCommandOutput,
  GetPolicyCommand, IoTClient
} from '@aws-sdk/client-iot';
import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { promises } from 'fs';
import { getResponse } from "../common/response.template";
import logEvent from '../data/log-event';
import { InstallationRequest, InstallationResponse } from "../data/models/installation.model";
import shellExec = require('shell-exec');
import { getRobotBySN, insertRobot } from '../data/robot';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import dayjs = require('dayjs');
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
require('./../AmazonRootCA1.pem');

const iot = new IoTClient({
  region: 'eu-west-1'
});
const s3 = new S3Client({
  region: 'eu-west-1'
})
if (process.env.IS_OFFLINE === 'true') {
  iot.config.credentialDefaultProvider = require('@aws-sdk/credential-provider-ini').fromIni({ profile: process.env.profile })
}

export default async function (event: APIGatewayEvent) {
  const response = getResponse() as APIGatewayProxyResult;
  const body = JSON.parse(event.body) as InstallationRequest;

  const robot = body.robotCode;

  await logEvent(robot, 'robot_install_requested');

  const robotObject = await getRobotBySN(robot);

  const endpoint = await iot.send(new DescribeEndpointCommand({ endpointType: 'iot:Data-ATS' }));
  let thing: DescribeThingCommandOutput | CreateThingCommandOutput,
    policy: CreatePolicyResponse;

  try {
    thing = await iot.send(new DescribeThingCommand({
      thingName: 'misty-' + robot
    }));
    policy = await iot.send(new GetPolicyCommand({
      policyName: 'misty-policy-' + robot,
    }));
  } catch (e) {
    console.log(e)
  }

  if (!thing?.thingId) {
    thing = await iot.send(new CreateThingCommand({
      thingName: 'misty-' + robot
    }));
    const group = await iot.send(new AddThingToThingGroupCommand({ thingName: thing.thingName, thingGroupName: 'Guardian' }));
    policy = await createPolicy(robot)
  }

  const cert = await iot.send(new CreateKeysAndCertificateCommand({
    setAsActive: true
  }));
  await iot.send(new AttachThingPrincipalCommand({
    thingName: thing.thingName,
    principal: cert.certificateArn
  }));

  await iot.send(new AttachPolicyCommand({
    policyName: policy.policyName,
    target: cert.certificateArn
  }))

  await promises.writeFile(`/tmp/${thing.thingName}.pem`, cert.certificatePem);
  await promises.writeFile(`/tmp/${thing.thingName}.key`, cert.keyPair.PrivateKey);

  console.log(await shellExec("openssl version"));
  await shellExec("export RANDFILE=/tmp/.random");
  const command = `openssl pkcs12 -export -in /tmp/${thing.thingName}.pem -inkey /tmp/${thing.thingName}.key -out /tmp/${thing.thingName}.pfx -passout pass: -certfile ${__dirname}/../AmazonRootCA1.pem`;
  await shellExec(command);

  await s3.send(new PutObjectCommand({
    Bucket: process.env.bucketName,
    Key: cert.certificateId + '.pfx',
    Expires: dayjs().add(3600, 'seconds').toDate(),
    Body: await promises.readFile(`/tmp/${thing.thingName}.pfx`)
  }));

  const signedUrl = await getSignedUrl(s3, new GetObjectCommand({
    Bucket: process.env.bucketName,
    Key: cert.certificateId + '.pfx'
  }), { expiresIn: 3600 })

  const responseBody = {
    // token,
    clientId: thing.thingName,
    endpoint: endpoint.endpointAddress,
    robotCode: robot,
    robotTopic: thing.thingName,
    websocket: {
      path: '/mqtt?x-amz-customauthorizer-name=GuardianAuthorizer',
      // username: token
    },
    certificate: {
      certificateId: cert.certificateId,
      certificatePem: cert.certificatePem,
      keyPair: cert.keyPair,
      pfxBase64: (await promises.readFile(`/tmp/${thing.thingName}.pfx`)).toString('base64'),
      pfxUrl: signedUrl
    }
  } as InstallationResponse;

  if (!robotObject) {
    await insertRobot(robot, thing.thingName, thing.thingName, undefined, true);
  }
  response.body = JSON.stringify(responseBody);

  return response;
}

async function createPolicy(robotCode: string) {
  const baseArn = `arn:aws:iot:eu-west-1:*`;
  return await iot.send(new CreatePolicyCommand({
    policyName: 'misty-policy-' + robotCode,
    policyDocument: JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Action: [
            "iot:Connect"
          ],
          Resource: [
            `${baseArn}:client/*`,
          ]
        },
        {
          Effect: "Allow",
          Action: [
            "iot:Subscribe",
          ],
          Resource: [
            `${baseArn}:topicfilter/*`,
          ]
        },
        {
          Effect: "Allow",
          Action: [
            "iot:Publish",
            "iot:Receive"
          ],
          Resource: [
            `${baseArn}:topic/*`,
          ]
        },
        {
          Effect: "Allow",
          Action: [
            "iot:UpdateThingShadow",
            "iot:GetThingShadow"
          ],
          Resource: [
            `${baseArn}:thing/*`,
          ]
        }
      ]
    })
  }));
}