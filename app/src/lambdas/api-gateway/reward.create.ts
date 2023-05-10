import jsonBodyParser from '@middy/http-json-body-parser'
import { APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda'
import Joi from 'joi'
import cors from '@middy/http-cors'
import httpErrorHandler from '@middy/http-error-handler'
import middy from '@middy/core'
import { CREATED, UNPROCESSABLE_ENTITY } from 'http-status'
import createHttpError from 'http-errors'
import { ddbDocClient } from '../../lib/db-client'
import { identity, IEventIdentity } from '../../middleware/identity'
import { validator } from '../../middleware/joi-validator'
import { accountRepository } from '../../domain/account.repository'
import { rewardRepository } from '../../domain/reward.repository'
import { Repository } from '../../domain/repository'
import { RewardService } from '../../domain/service'
import { rules } from '../../domain/rules'
import { RewardType } from '../../domain/reward.model'
import { publishEvent } from '../../lib/event-bus'
import { logger } from '../../lib/logger'
import { injectLambdaContext } from '@aws-lambda-powertools/logger'
import { contestRepository } from '../../domain/contest.repository'
import { contestantRepository } from '../../domain/contestant.repository'
import { createNotificationCommand } from '../../lib/sqs'
import compact from 'lodash/compact'
import take from 'lodash/take'

export interface IRewardDTO {
  usernames: string[]
  activityMessage: string
  reward: number
  contestId?: string
  postMessage?: string
}

const schema = Joi.object({
  body: Joi.object({
    usernames: Joi.array().items(Joi.string()).required(),
    contestId: Joi.string(),
    postMessage: Joi.string(),
    activityMessage: Joi.string().required(),
    reward: Joi.number().required(),
  }),
})

type EventType = APIGatewayEvent & IEventIdentity & { body: IRewardDTO }

export const createCustomReward = async (
  event: EventType
): Promise<APIGatewayProxyResult> => {
  logger.debug('createCustomReward', { event })

  const repository = new Repository({
    client: ddbDocClient,
    tableName: process.env.TABLE_NAME!,
    accountAdapter: accountRepository,
    rewardAdapter: rewardRepository,
    contestAdapter: contestRepository,
    contestantAdapter: contestantRepository,
  })

  const service = new RewardService(repository, rules)

  const { usernames, contestId, postMessage, activityMessage, reward } =
    event.body

  if (contestId && !postMessage) {
    throw createHttpError(UNPROCESSABLE_ENTITY, {
      message: 'Post message is a required field if a contest id is specified',
    })
  }

  const accounts = await Promise.all(
    usernames.map((username) => service.getAccountByName(username))
  )

  const missingNames: string[] = usernames
    .map((name, idx) => (accounts[idx] ? '' : name))
    .filter(Boolean)

  if (missingNames.length) {
    throw createHttpError(UNPROCESSABLE_ENTITY, {
      message: `Accounts for usernames ${missingNames} are not found`,
    })
  }

  for (const account of accounts) {
    await service.grantReward({
      userId: account!.id,
      reason: {
        type: RewardType.Custom,
        reward,
        activityMessage,
        contestId,
      },
    })
  }

  if (contestId) {
    const contest = await service.loadContest(contestId)

    if (!contest) {
      throw createHttpError(UNPROCESSABLE_ENTITY, {
        message: `Contest with ID ${contestId} does not exist`,
      })
    }

    if (contest.status !== 'SUBMISSION_VOTING' && contest.status !== 'VOTING') {
      throw createHttpError(UNPROCESSABLE_ENTITY, {
        message: `Contest with ID ${contestId} is not in voting state`,
      })
    }
    const contestants = await Promise.all(
      usernames.map((username) =>
        service.getContestantByContestIdAndName(contestId, username)
      )
    )

    const missingNames: string[] = usernames
      .map((name, idx) => (contestants[idx] ? '' : name))
      .filter(Boolean)

    if (missingNames.length) {
      throw createHttpError(UNPROCESSABLE_ENTITY, {
        message: `Accounts with usernames ${missingNames} are not participants of the contest with ID: ${contestId}`,
      })
    }

    await publishEvent(
      {
        contestId,
        winners: accounts.slice(0, 3).map((account) => {
          const contestant = contestants.find(
            (c) => c!.name === account?.username
          )
          return {
            userId: account!.id,
            username: account?.username,
            contestantId: contestant?.id,
            contestantCreatedAt: contestant?.createdAt,
          }
        }),
        postMessage,
      },
      'CUSTOM_WINNERS'
    )

    await createNotificationCommand(process.env.NOTIFICATION_QUEUE_URL!, {
      message: activityMessage,
      participants: take(compact(accounts.map((account) => account?.id)), 3),
      url: `contest/${contestId}`,
    })
  }

  return {
    statusCode: CREATED,
    body: JSON.stringify(true),
  }
}

export const handler = middy<EventType>(createCustomReward)
  .use(identity())
  .use(jsonBodyParser())
  .use(validator({ schema, options: { stripUnknown: true } }))
  .use(cors({ credentials: true }))
  .use(httpErrorHandler({ fallbackMessage: 'Internal server error' }))
  .use(injectLambdaContext(logger))
