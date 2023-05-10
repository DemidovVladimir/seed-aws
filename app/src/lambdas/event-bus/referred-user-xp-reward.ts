import { injectLambdaContext } from '@aws-lambda-powertools/logger'
import middy from '@middy/core'
import { EventBridgeEvent } from 'aws-lambda'
import { accountRepository } from '../../domain/account.repository'
import { contestRepository } from '../../domain/contest.repository'
import { contestantRepository } from '../../domain/contestant.repository'
import { Repository } from '../../domain/repository'
import { IReward, RewardType } from '../../domain/reward.model'
import { rewardRepository } from '../../domain/reward.repository'
import { rules } from '../../domain/rules'
import { RewardService } from '../../domain/service'
import { ddbDocClient } from '../../lib/db-client'
import { logger } from '../../lib/logger'
import { createNotificationCommand } from '../../lib/sqs'

export const getReferredUserXpMilestoneReachedReward = (
  xpEarned: number
): [number, number] | undefined => {
  const milestones: { [key: string]: number } = {
    100: 10,
    200: 20,
    300: 30,
    400: 40,
    500: 50,
  }
  const key = Math.floor(xpEarned / 100) * 100
  return key in milestones ? [key, milestones[key]] : undefined
}

export type DetailType = 'REWARD_GRANTED'
export type EventType = EventBridgeEvent<DetailType, IReward>

export const referredUserXpMilestoneReachedEventHandler = async ({
  detail,
}: EventType) => {
  const { userId, reward } = detail
  const repository = new Repository({
    client: ddbDocClient,
    tableName: process.env.TABLE_NAME!,
    accountAdapter: accountRepository,
    rewardAdapter: rewardRepository,
    contestAdapter: contestRepository,
    contestantAdapter: contestantRepository,
  })
  const service = new RewardService(repository, rules)
  const account = await service.getAccount(userId)
  if (account && account.refUsername && account.xp) {
    const refAccount = await service.getAccountByName(account.refUsername)
    if (refAccount && refAccount.id) {
      const milestone = getReferredUserXpMilestoneReachedReward(account.xp)
      if (milestone) {
        const [milestoneXp, milestoneReward] = milestone
        const data = await service.getXpMilestoneRewardsGranted(
          refAccount.id,
          userId,
          milestoneReward
        )
        logger.debug('referred-user-xp-milestone-reached#available-rewards', {
          data,
        })
        if (account.xp - reward < milestoneXp && data) {
          await service.grantReward({
            userId: refAccount.id,
            reason: {
              type: RewardType.ReferredUserXpMilestoneReached,
              sourceUserId: userId,
              milestone: {
                xpCount: milestoneXp,
                reward: milestoneReward,
              },
            },
          })

          logger.debug(
            'referred-user-xp-milestone-reached#send-reward',
            { account },
            { milestone }
          )

          const message = `You earned ${milestone[1]}XP because @${account.refUsername} earned ${milestone[0]}XP!`
          const participants = [refAccount.id]
          const url = `profile/${refAccount.id}`

          const result = await createNotificationCommand(
            process.env.NOTIFICATION_QUEUE_URL!,
            { message, url, participants }
          )

          logger.debug(
            'referred-user-xp-milestone-reached#send-referrer-push-notification',
            { message, url, participants },
            { result }
          )
        }
      }
    }
  }
}

export const handler = middy<EventType>(
  referredUserXpMilestoneReachedEventHandler
).use(injectLambdaContext(logger))
