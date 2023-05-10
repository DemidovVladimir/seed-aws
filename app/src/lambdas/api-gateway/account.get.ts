import jsonBodyParser from '@middy/http-json-body-parser'
import { APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda'
import cors from '@middy/http-cors'
import httpErrorHandler from '@middy/http-error-handler'
import middy from '@middy/core'
import { CREATED, NOT_FOUND, UNPROCESSABLE_ENTITY } from 'http-status'
import createHttpError from 'http-errors'
import { ddbDocClient } from '../../lib/db-client'
import 'source-map-support/register'
import { identity, IEventIdentity } from '../../middleware/identity'
import { accountRepository } from '../../domain/account.repository'
import { rewardRepository } from '../../domain/reward.repository'
import { Repository } from '../../domain/repository'
import { RewardService } from '../../domain/service'
import { rules } from '../../domain/rules'
import { logger } from '../../lib/logger'
import { injectLambdaContext } from '@aws-lambda-powertools/logger'
import { contestRepository } from '../../domain/contest.repository'
import { contestantRepository } from '../../domain/contestant.repository'

type EventType = APIGatewayEvent & IEventIdentity

export const getAccount = async (
  event: EventType
): Promise<APIGatewayProxyResult> => {
  logger.debug('getAccount', { event })
  const repository = new Repository({
    client: ddbDocClient,
    tableName: process.env.TABLE_NAME!,
    accountAdapter: accountRepository,
    rewardAdapter: rewardRepository,
    contestAdapter: contestRepository,
    contestantAdapter: contestantRepository,
  })
  const service = new RewardService(repository, rules)

  const accountId = event?.pathParameters?.accountId

  if (!accountId) {
    throw createHttpError(UNPROCESSABLE_ENTITY)
  }

  const account = await service.getAccount(accountId)

  if (!account) {
    return {
      statusCode: NOT_FOUND,
      body: JSON.stringify({
        status: NOT_FOUND,
      }),
    }
  }

  return {
    statusCode: CREATED,
    body: JSON.stringify(account),
  }
}

export const handler = middy<EventType>(getAccount)
  .use(identity())
  .use(jsonBodyParser())
  .use(cors({ credentials: true }))
  .use(httpErrorHandler({ fallbackMessage: 'Internal server error' }))
  .use(injectLambdaContext(logger))
