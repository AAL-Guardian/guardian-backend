import { APIGatewayProxyResult, APIGatewayProxyResultV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";

const template = {
  statusCode: 200,
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json"
  },
  body: undefined
};

/** @deprecated */
export const getResponseV2 = () =>  ( { ...template } as APIGatewayProxyStructuredResultV2 );
export const getResponse = ( overrides: Partial<APIGatewayProxyResult> = {} ) =>  ( { ...template, ...overrides } as APIGatewayProxyResult );
