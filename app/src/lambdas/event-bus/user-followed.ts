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

export enum FollowStatus {
  Following = 'FOLLOWING', // a user is followed by the current user
  FollowBack = 'FOLLOW_BACK', // a user is following the current user
  Friends = 'FRIENDS', // users follow each other
  None = 'NONE', // no relations
}

export interface IFollowerMilestoneEvent {
  followedProfileId: string
  followingProfileId: string
  followStatus: FollowStatus
  followerCount: number
}

// TODO: store and fetch this data from db
const getFollowerMilestoneReward = (followerCount: number) => {
  return {
    1: 1,
    5: 4,
    10: 5,
    15: 5,
    20: 5,
    25: 5,
    30: 5,
    35: 5,
    40: 5,
    45: 5,
    50: 5,
    55: 5,
    60: 5,
    65: 5,
    70: 5,
    75: 5,
    80: 5,
    85: 5,
    90: 5,
    95: 5,
    100: 5,
  }[followerCount]
}

export type DetailType = 'USER_FOLLOWED'
export type EventType = EventBridgeEvent<DetailType, IFollowerMilestoneEvent>

export const userFollowedEventHandler = async ({ detail }: EventType) => {
  const { followedProfileId, followerCount } = detail
  const repository = new Repository({
    client: ddbDocClient,
    tableName: process.env.TABLE_NAME!,
    accountAdapter: accountRepository,
    rewardAdapter: rewardRepository,
    contestAdapter: contestRepository,
    contestantAdapter: contestantRepository,
  })
  const service = new RewardService(repository, rules)

  const milestoneReward = getFollowerMilestoneReward(followerCount)

  if (milestoneReward) {
    await service.grantReward({
      userId: followedProfileId,
      reason: {
        type: RewardType.FollowerMilestoneReached,
        milestone: {
          followerCount,
          reward: milestoneReward,
        },
      },
    })
  }
}

export const handler = middy<EventType>(userFollowedEventHandler).use(
  injectLambdaContext(logger)
)
