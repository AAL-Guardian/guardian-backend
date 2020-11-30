import { APIGatewayProxyResult, APIGatewayProxyResultV2 } from "aws-lambda";

const template = {
  statusCode: 200,
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json"
  },
  body: undefined
};

export const getResponseV2 = () =>  ( { ...template } as APIGatewayProxyResultV2 );
export const getResponse = () =>  ( { ...template } as APIGatewayProxyResult );
