import { injectLambdaContext } from '@aws-lambda-powertools/logger'
import middy from '@middy/core'
import { EventBridgeEvent } from 'aws-lambda'
import { accountRepository } from '../../domain/account.repository'
import { contestRepository } from '../../domain/contest.repository'
import { contestantRepository } from '../../domain/contestant.repository'
import { Repository } from '../../domain/repository'
import { rewardRepository } from '../../domain/reward.repository'
import { rules } from '../../domain/rules'
import { RewardService } from '../../domain/service'
import { ddbDocClient } from '../../lib/db-client'
import { logger } from '../../lib/logger'

export interface IUserUpdatedEvent {
  id: string
  username: string
}

export type DetailType = 'USER_UPDATED'
export type EventType = EventBridgeEvent<DetailType, IUserUpdatedEvent>

export const userUpdatedEventHandler = async ({ detail }: EventType) => {
  logger.debug('userUpdatedHandler', { detail })

  const repository = new Repository({
    client: ddbDocClient,
    tableName: process.env.TABLE_NAME!,
    accountAdapter: accountRepository,
    rewardAdapter: rewardRepository,
    contestAdapter: contestRepository,
    contestantAdapter: contestantRepository,
  })
  const service = new RewardService(repository, rules)
  const { id, username } = detail

  await service.addAccount({ id, username })
}

export const handler = middy<EventType>(userUpdatedEventHandler).use(
  injectLambdaContext(logger)
)
