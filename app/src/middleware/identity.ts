import { MiddlewareObj } from '@middy/core'
import { APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda'

export interface IIdentityMiddlewareProps {
  options?: any
}

export interface IIdentity {
  cognitoUsername: string
  phoneNumber: string
}

export interface IEventIdentity {
  user: IIdentity
}

export function identity({
  options,
}: IIdentityMiddlewareProps = {}): MiddlewareObj<
  APIGatewayEvent,
  APIGatewayProxyResult
> {
  return {
    async before({ event }): Promise<void> {
      const claims = event.requestContext?.authorizer?.claims

      if (claims) {
        ;(event as any).user = {
          cognitoUsername: claims['cognito:username'],
          phoneNumber: claims.phone_number,
        }
      }
    },
  }
}
