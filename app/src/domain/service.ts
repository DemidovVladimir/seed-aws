import { omit, pick } from 'lodash'
import amplitude from '../lib/amplitude'
import { publishEvent } from '../lib/event-bus'
import { logger } from '../lib/logger'
import { Account } from './account.model'
import { Contest } from './contest.model'
import { Contestant } from './contestant.model'
import { IRepository } from './repository'
import {
  IReward,
  IRewardCommand,
  IRewardReason,
  oneTimeRewardTypes,
  Reward,
  RewardType,
} from './reward.model'

export interface IRewardRule {
  (...params: any): IReward
}

export class RewardService {
  rules: Map<RewardType, IRewardRule>
  repository: IRepository

  constructor(repository: IRepository, rules: Map<RewardType, IRewardRule>) {
    this.repository = repository
    this.rules = rules
  }

  async addAccount(dto: {
    id: string
    username: string
    refUsername?: string
  }) {
    const account = Account.fromRegisteredUser(dto)
    logger.debug('addAccount', { account })
    const currentAccount = await this.repository.loadAccount(account.id)
    logger.debug('currentAccount', { currentAccount })
    const newAccount = currentAccount
      ? new Account({
          ...currentAccount,
          ...omit(account, ['_xp']),
          xp: currentAccount.xp,
        })
      : account
    logger.debug('newAccount', { newAccount })
    return this.repository.saveAccount(newAccount)
  }

  async getAccount(
    accountId: string
  ): Promise<{ id?: string; xp?: number; refUsername?: string } | null> {
    const account = await this.repository.loadAccount(accountId)

    return account ? pick(account, ['id', 'xp', 'refUsername']) : null
  }

  async getAccountByName(
    username: string
  ): Promise<{ id?: string; xp?: number; username?: string } | null> {
    const account = await this.repository.loadAccountByName(username)

    return account ? pick(account, ['id', 'username', 'xp']) : null
  }

  async getXpMilestoneRewardsGranted(
    username: string,
    sourceUserId: string,
    milestoneReward: number
  ) {
    const rewards = await this.repository.loadXpMilestoneRewardsGranted(
      username,
      sourceUserId
    )

    return !rewards || (rewards && rewards.reward < milestoneReward)
  }

  async grantReward(command: IRewardCommand): Promise<Reward | undefined> {
    logger.debug('Grant reward for', command.reason.type)
    const account = await this.repository.loadAccount(command.userId)

    if (!account) {
      throw new Error(`Account (id: ${command.userId}) is not found`)
    }

    const rewardType = command.reason.type

    logger.debug('Reward Type:', rewardType)

    if (oneTimeRewardTypes.includes(rewardType)) {
      const existingReward = await this.repository.loadReward(
        command.userId,
        rewardType
      )
      if (existingReward) {
        logger.warn('existingReward', {
          userId: command.userId,
          rewardType,
        })
        return
      }
    }

    if (
      rewardType === RewardType.FollowerMilestoneReached &&
      (await this.repository.isMilestoneRewardGranted(
        command.userId,
        command.reason.milestone.followerCount
      ))
    ) {
      return
    }

    if (
      rewardType === RewardType.ContestantJoined &&
      (await this.repository.isDailyRewardActive(command.userId, rewardType))
    ) {
      return
    }

    const reward = this.requestReward(account.id, command.reason)
    account.grantReward(reward)
    await this.repository.saveAccountAndReward(account, reward)
    logger.debug('Publish event for REWARD_GRANTED, reason:', rewardType)
    await this.publishEvents(reward, 'REWARD_GRANTED')

    // enhances user properties with given props without dispatching a tracking event
    await amplitude.identify({
      userId: command.userId,
      user_properties: {
        userTotalXP: account.xp,
      },
    })

    return reward
  }

  requestReward(userId: string, reason: IRewardReason): IReward {
    const rule = this.rules.get(reason.type)
    if (!rule) {
      throw new Error('There is no rule for this reward reason')
    }

    return rule(userId, reason)
  }

  async addContest(dto: {
    id: string
    configurationId: string
    name: string
    status: string
  }) {
    const contest = new Contest(dto)
    await this.repository.saveContest(contest)
  }

  async updateContest(dto: {
    id: string
    configurationId: string
    name: string
    status: string
  }): Promise<void> {
    const updated = new Contest(dto)
    const current = await this.repository.loadContest(updated.id)

    logger.debug('updateContest', {
      updated,
      current,
    })

    if (!current) {
      throw new Error(`Contest with id ${updated.id} is not found`)
    }

    await this.repository.saveContest(updated)
  }

  async removeContest(contestId: string) {
    logger.debug('removeContest', {
      contestId,
    })
    await this.repository.removeContest(contestId)
  }

  async loadContest(contestId: string) {
    logger.debug('loadContest', {
      contestId,
    })
    return this.repository.loadContest(contestId)
  }

  async addContestant(dto: {
    id: string
    userId: string
    contestId: string
    name: string
    createdAt: number
  }) {
    const { id, userId, name, contestId, createdAt } = dto

    const contestant = new Contestant({
      id,
      userId,
      contestId,
      name,
      createdAt,
    })
    logger.debug('addContestant', {
      contestant,
    })

    await this.repository.saveContestant(contestant)
  }

  async loadContestants(contestId: string, limit?: number) {
    logger.debug('loadContestants', { contestId, limit })
    return this.repository.loadContestants(contestId, limit)
  }

  async getContestantByContestIdAndName(contestId: string, username: string) {
    const contestant = await this.repository.loadContestantByContestIdAndName(
      contestId,
      username
    )

    logger.debug('getContestantByContestIdAndName', {
      contestId,
      username,
      contestant,
    })

    return contestant || null
  }

  async removeContestant(contestantId: string) {
    logger.debug('removeContestant', { contestantId })
    await this.repository.removeContestant(contestantId)
  }

  async removeContestantBatch(contestantIds: string[]) {
    logger.debug('removeContestantBatch', { contestantIds })
    await this.repository.removeContestantsBatch(contestantIds)
  }

  async publishEvents(reward: IReward, eventType: string) {
    const event = reward.toEvent()
    await publishEvent(event, eventType)
  }
}
