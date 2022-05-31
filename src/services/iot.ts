import { GetRetainedMessageCommand, IoTDataPlaneClient, PublishCommand } from "@aws-sdk/client-iot-data-plane";

const iotDataClient = new IoTDataPlaneClient({

});
if (process.env.IS_OFFLINE === 'true') {
  iotDataClient.config.credentialDefaultProvider = require('@aws-sdk/credential-provider-ini').fromIni({ profile: process.env.profile })
}

export async function getRetainedMessage<T>(topic: string): Promise<T | null> {
  const res = await iotDataClient.send(new GetRetainedMessageCommand({
    topic
  }))
  const decodedPayload = new TextDecoder().decode(res.payload);
  return decodedPayload ? JSON.parse(decodedPayload) : null;
}

export async function sendRetainedMessage(topic: string, payload: unknown): Promise<void> {
  await iotDataClient.send(new PublishCommand({
    topic,
    payload: new TextEncoder().encode(JSON.stringify(payload)),
    retain: true
  }))
}

export {
  iotDataClient
};