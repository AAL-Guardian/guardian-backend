import { IoTDataPlaneClient } from "@aws-sdk/client-iot-data-plane";

const iotDataClient = new IoTDataPlaneClient({

});
if (process.env.IS_OFFLINE === 'true') {
  iotDataClient.config.credentialDefaultProvider = require('@aws-sdk/credential-provider-ini').fromIni({ profile: process.env.profile })
}

export {
  iotDataClient
};