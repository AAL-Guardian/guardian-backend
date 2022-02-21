import { checkTokenValidity } from "../data/access-token";


export default async function (event: IoTAuthorizerEvent, context: any) {
  console.log('Input');
  console.log(event);
  const extract = /arn:aws:lambda:(?<region>[a-z0-9\-]+):(?<account>[0-9]+):/.exec(context.invokedFunctionArn);
  // const region = 'eu-west-1';
  // const account = '517697470599';
  const region = extract.groups.region;
  const account = extract.groups.account;
  const baseArn = `arn:aws:iot:${region}:${account}`;

  const token = await checkTokenValidity(event.protocolData.mqtt.username);
  const response = {
    isAuthenticated: true, //A Boolean that determines whether client can connect.
    principalId: token.id.toFixed(),  //A string that identifies the connection in logs.
    disconnectAfterInSeconds: 86400,
    refreshAfterInSeconds: 300,
    policyDocuments: [
      {
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
          }
        ]
      }
    ]
  } as IoTAuthorizeResponse;
  console.log('Output');
  console.log(response);
  return response;
}

type IoTAuthorizerEvent = {
  token: string,
  signatureVerified: boolean,
  protocols: "tls" | "http" | "mqtt",
  protocolData: {
    tls: {
      serverName: string
    },
    http: {
      headers: {
        [key: string]: string
      },
      queryString: string
    },
    mqtt: {
      username: string,
      password: string,
      clientId: string
    }
  },
  connectionMetadata: {
    id: string
  }
}

type IoTAuthorizeResponse = {
  isAuthenticated: boolean, //A Boolean that determines whether client can connect.
  principalId: string,  //A string that identifies the connection in logs.
  disconnectAfterInSeconds: number,
  refreshAfterInSeconds: number,
  policyDocuments:
  {
    Version: string,
    Statement: any[]
  }[]
}