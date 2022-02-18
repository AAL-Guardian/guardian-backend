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
import { getRobotBySN, insertRobot } from '../data/robot';
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
  const body = JSON.parse(event.body);

  const robot = body.robotCode;

  await logEvent(robot, 'robot_install_requested');

  const robotObject = await getRobotBySN(robot);

  const endpoint = await iot.send(new DescribeEndpointCommand({ endpointType: 'iot:Data-ATS' }));
  let thing: DescribeThingCommandOutput | CreateThingCommandOutput,
    policy: CreatePolicyResponse;

  const thingName =  'misty_' + process.env.stage + '-' + robot;
  const policyName =  'misty-policy-' + process.env.stage + '-' + robot;
  try {
    thing = await iot.send(new DescribeThingCommand({
      thingName
    }));
    policy = await iot.send(new GetPolicyCommand({
      policyName
    }));
  } catch (e) {
    console.log(e)
  }

  if (!thing?.thingId) {
    thing = await iot.send(new CreateThingCommand({
      thingName
    }));
    const group = await iot.send(new AddThingToThingGroupCommand({ thingName: thing.thingName, thingGroupName: 'Guardian' }));
  }
  if(!policy?.policyName) {
    policy = await createPolicy(thingName, policyName)
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
      pfxBase64: (await promises.readFile(`/tmp/${thing.thingName}.pfx`)).toString('base64'),
    }
  };

  if (!robotObject) {
    await insertRobot(robot, thing.thingName, thing.thingName, undefined, true);
  }
  response.body = JSON.stringify(responseBody);

  return response;
}

async function createPolicy(thingName: string, policyName: string) {
  const baseArn = `arn:aws:iot:eu-west-1:*`;
  return await iot.send(new CreatePolicyCommand({
    policyName: policyName,
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
            "iot:*",
          ],
          Resource: [
            `${baseArn}:topicfilter/${thingName}*`,
            `${baseArn}:topic/${thingName}*`,
            // `${baseArn}:thing/${thingName}*`,
            // `${baseArn}:topicfilter/*`,
            // `${baseArn}:topic/*`,
            // `${baseArn}:thing/*`,
          ]
        }
      ]
    })
  }));
}