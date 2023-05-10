import { Cors } from 'aws-cdk-lib/aws-apigateway'

export const defaultPreflightOptions = {
  allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key'],
  allowMethods: ['OPTIONS', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowCredentials: true,
  allowOrigins: Cors.ALL_ORIGINS,
}
