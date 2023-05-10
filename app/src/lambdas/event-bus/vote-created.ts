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

export interface IVoteCreatedEvent {
  voter: {
    id: string
    remainVotes: number
  }
  contest: {
    id: string
  }
}

export type DetailType = 'VOTE_CREATED'
export type EventType = EventBridgeEvent<DetailType, IVoteCreatedEvent>

export const voteCreatedEventHandler = async ({ detail }: EventType) => {
  const repository = new Repository({
    client: ddbDocClient,
    tableName: process.env.TABLE_NAME!,
    accountAdapter: accountRepository,
    rewardAdapter: rewardRepository,
    contestAdapter: contestRepository,
    contestantAdapter: contestantRepository,
  })
  const service = new RewardService(repository, rules)
  const {
    voter: { id: userId, remainVotes },
  } = detail

  if (remainVotes === 0) {
    await service.grantReward({
      userId,
      reason: {
        type: RewardType.UserDailyVotesConsumed,
      },
    })
  }
}

export const handler = middy<EventType>(voteCreatedEventHandler)
