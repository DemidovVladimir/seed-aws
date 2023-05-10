import { v4 as uuid } from 'uuid'
import { Account } from './account.model'
import { Contest } from './contest.model'
import { Contestant } from './contestant.model'
import { IRepository } from './repository'
import { IReward, IRewardReason, Reward } from './reward.model'
import { RewardService } from './service'

jest.mock('../lib/amplitude', () => {
  return {
    default: {
      identify: jest.fn(),
    },
  }
})

class MockRepository implements IRepository {
  accounts: Map<string, Account>
  accountsByName: Map<string, Account>

  constructor(accounts: Account[]) {
    this.accounts = new Map(accounts.map((account) => [account.id, account]))
    this.accountsByName = new Map(
      accounts.map((account) => [account.username, account])
    )
  }

  async loadReward(): Promise<Reward<IRewardReason> | null> {
    return null
  }

  async isDailyRewardActive(): Promise<boolean> {
    return false
  }

  async isMilestoneRewardGranted(): Promise<boolean> {
    return false
  }

  async loadAccount(userId: string) {
    return this.accounts.get(userId) || null
  }

  async loadAccountByName(username: string): Promise<Account | null> {
    return this.accountsByName.get(username) || null
  }

  async loadXpMilestoneRewardsGranted(): Promise<IReward | null> {
    return null
  }

  async saveAccount(account: Account): Promise<Account> {
    return account
  }

  async saveAccountAndReward(): Promise<void> {}

  async saveContest(): Promise<void> {}
  async loadContest(): Promise<Contest | null> {
    return null
  }

  async removeContest(): Promise<void> {}
  async saveContestant(): Promise<void> {}
  async loadContestantByContestIdAndName(): Promise<Contestant | null> {
    return null
  }

  async loadContestants(): Promise<{
    items: Contestant[]
    lastEvaluatedKey?: any
  }> {
    return { items: [] }
  }

  async removeContestant(): Promise<void> {}
  async removeContestantsBatch(): Promise<void> {}
}

describe('service', () => {
  describe('add account', () => {
    it('should not overwrite xp', async () => {
      const id = uuid()
      const username = 'username'
      const xp = 100
      const savedAccount = new Account({
        id,
        username,
        xp,
      })
      const service = new RewardService(
        new MockRepository([savedAccount]),
        new Map()
      )
      const result = await service.addAccount({ id, username })

      expect(result.id).toEqual(savedAccount.id)
      expect(result.username).toEqual(savedAccount.username)
      expect(result._xp).toEqual(savedAccount.xp)
    })
  })
})
