import { checkTokenValidity } from "../data/access-token";

const cache: {
  [key: string]: {
    clientId: string,
    expiration: string,
    valid: boolean
  }
} = {}
export default async function (event: IoTAuthorizerEvent, context: any) {
  const extract = /arn:aws:lambda:(?<region>[a-z0-9\-]+):(?<account>[0-9]+):/.exec(context.invokedFunctionArn);
  // const region = 'eu-west-1';
  // const account = '517697470599';
  const region = extract.groups.region;
  const account = extract.groups.account;
  const baseArn = `arn:aws:iot:${region}:${account}`;
  let cachedValue = cache[event.protocolData.mqtt.username];
  if (!cachedValue) {
    const valid = await checkTokenValidity(event.protocolData.mqtt.username);
    cachedValue = {
      clientId: event.protocolData.mqtt.clientId,
      expiration: null,
      valid: !!valid
    }
    cache[event.protocolData.mqtt.username] = cachedValue
  }

  if (!cachedValue.valid || cachedValue?.expiration > (new Date()).toString()) {
    cachedValue.valid = false;
    return {
      isAuthenticated: false, //A Boolean that determines whether client can connect.
      principalId: event.protocolData.mqtt.clientId,  //A string that identifies the connection in logs.
    } as IoTAuthorizeResponse;
  }

  const response = {
    isAuthenticated: true, //A Boolean that determines whether client can connect.
    principalId: event.protocolData.mqtt.clientId,  //A string that identifies the connection in logs.
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

      }
    ]

  } as IoTAuthorizeResponse;
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