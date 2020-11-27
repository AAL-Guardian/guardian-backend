
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

export async function seniorDevice(event: IoTAuthorizerEvent) {
  console.log(event);
  const region = 'eu-west-1';
  const account = '517697470599';
  const baseArn = `arn:aws:iot:${region}:${account}`;
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
  // console.log(response, context, callback);
  // callback(response);
  return response;
}