import {
  AddThingToThingGroupCommand, AttachPolicyCommand, DescribeThingCommandOutput, IoTClient,
  AttachThingPrincipalCommand, CreateKeysAndCertificateCommand, CreatePolicyCommand,
  CreateThingCommand, CreateThingCommandOutput, DescribeEndpointCommand, DescribeThingCommand, CreatePolicyResponse, GetPolicyCommand,
} from '@aws-sdk/client-iot';
import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import logEvent from '../data/log-event';
import { getResponse } from "../common/response.template";
import { saveRobotClient } from "../data/access-token";
import { InstallationRequest, InstallationResponse } from "../data/models/installation.model";
import { promises } from 'fs';
import shellExec = require('shell-exec');
require('./../AmazonRootCA1.pem');

const iot = new IoTClient({
  region: 'eu-west-1'
});
if (process.env.IS_OFFLINE === 'true') {
  iot.config.credentialDefaultProvider = require('@aws-sdk/credential-provider-ini').fromIni({ profile: process.env.profile })
}

export default async function (event: APIGatewayEvent) {
  const response = getResponse() as APIGatewayProxyResult;
  const body = JSON.parse(event.body) as InstallationRequest;

  const robot = body.robotCode;

  await logEvent(robot, 'robot_install_requested');

  // const token = await saveRobotClient(robot);

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
    const baseArn = `arn:aws:iot:eu-west-1:*`;
    policy = await iot.send(new CreatePolicyCommand({
      policyName: 'misty-policy-' + robot,
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
      pfx: (await promises.readFile(`/tmp/${thing.thingName}.pfx`)).toString()
    }
  } as InstallationResponse;

  response.body = JSON.stringify(responseBody);

  return response;
}