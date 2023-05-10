import { injectLambdaContext } from '@aws-lambda-powertools/logger'
import middy from '@middy/core'
import { EventBridgeEvent } from 'aws-lambda'
import { accountRepository } from '../../domain/account.repository'
import { contestRepository } from '../../domain/contest.repository'
import { contestantRepository } from '../../domain/contestant.repository'
import { Repository } from '../../domain/repository'
import { RewardType } from '../../domain/reward.model'
import { rewardRepository } from '../../domain/reward.repository'
import { rules } from '../../domain/rules'
import { RewardService } from '../../domain/service'
import { ddbDocClient } from '../../lib/db-client'
import { logger } from '../../lib/logger'

export interface IContestantJoinedEvent {
  id: string
  userId: string
  contest: string
  name: string
  createdAt: number
  sourceId?: string
  avatar?: string
}

export type DetailType = 'CONTESTANT_JOINED'
export type EventType = EventBridgeEvent<DetailType, IContestantJoinedEvent>

export const contestantJoinedEventHandler = async ({ detail }: EventType) => {
  logger.debug('contestantJoinedEventHandler', { detail })

  const repository = new Repository({
    client: ddbDocClient,
    tableName: process.env.TABLE_NAME!,
    accountAdapter: accountRepository,
    rewardAdapter: rewardRepository,
    contestAdapter: contestRepository,
    contestantAdapter: contestantRepository,
  })
  const service = new RewardService(repository, rules)

  const { id, userId, contest: contestId, name, createdAt } = detail

  await service.addContestant({
    id,
    userId,
    contestId,
    name,
    createdAt,
  })

  await service.grantReward({
    userId,
    reason: {
      type: RewardType.ContestantJoined,
      contestId,
    },
  })
}

export const handler = middy<EventType>(contestantJoinedEventHandler).use(
  injectLambdaContext(logger)
)
