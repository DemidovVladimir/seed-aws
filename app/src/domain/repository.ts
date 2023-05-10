import { TransactionCanceledException } from '@aws-sdk/client-dynamodb'
import {
  BatchWriteCommand,
  BatchWriteCommandInput,
  DeleteCommand,
  DeleteCommandInput,
  DynamoDBDocumentClient,
  GetCommand,
  GetCommandInput,
  PutCommand,
  PutCommandInput,
  QueryCommand,
  QueryCommandInput,
  TransactWriteCommand,
  TransactWriteCommandInput,
} from '@aws-sdk/lib-dynamodb'
import { chunk } from 'lodash'
import { logger } from '../lib/logger'
import { IRepositoryAdapter } from '../lib/repository-adapter'
import { chunkArrayInGroups } from '../lib/utils'
import { Account } from './account.model'
import { Contest } from './contest.model'
import { Contestant } from './contestant.model'
import { IReward, Reward, RewardType } from './reward.model'

export interface IRepository {
  loadReward(userId: string, rewardType: RewardType): Promise<Reward | null>
  isDailyRewardActive(userId: string, rewardType: RewardType): Promise<boolean>
  isMilestoneRewardGranted(
    userId: string,
    followerCount: number
  ): Promise<boolean>
  loadAccount(userId: string): Promise<Account | null>
  loadAccountByName(username: string): Promise<Account | null>
  saveAccount(account: Account): Promise<Account>
  saveAccountAndReward(account: Account, reward: IReward): Promise<void>
  saveContest(contest: Contest): Promise<void>
  loadContest(contestId: string): Promise<Contest | null>
  removeContest(contestId: string): Promise<void>
  saveContestant(contestant: Contestant): Promise<void>
  loadXpMilestoneRewardsGranted(
    userId: string,
    sourceUserId: string
  ): Promise<IReward | null>
  loadContestantByContestIdAndName(
    contestId: string,
    username: string
  ): Promise<Contestant | null>
  loadContestants(
    contestId: string,
    limit?: number
  ): Promise<{ items: Contestant[]; lastEvaluatedKey?: any }>
  removeContestant(contestantId: string): Promise<void>
  removeContestantsBatch(contestantIds: string[]): Promise<void>
}

export interface IRepositoryProps {
  client: DynamoDBDocumentClient
  tableName: string
  accountAdapter: IRepositoryAdapter<Account>
  rewardAdapter: IRepositoryAdapter<IReward>
  contestAdapter: IRepositoryAdapter<Contest>
  contestantAdapter: IRepositoryAdapter<Contestant>
}

export class Repository implements IRepository {
  client: DynamoDBDocumentClient
  tableName: string
  accountAdapter: IRepositoryAdapter<Account>
  rewardAdapter: IRepositoryAdapter<IReward>
  contestAdapter: IRepositoryAdapter<Contest>
  contestantAdapter: IRepositoryAdapter<Contestant>

  constructor({
    client,
    tableName,
    accountAdapter,
    rewardAdapter,
    contestAdapter,
    contestantAdapter,
  }: IRepositoryProps) {
    this.client = client
    this.tableName = tableName
    this.accountAdapter = accountAdapter
    this.rewardAdapter = rewardAdapter
    this.contestAdapter = contestAdapter
    this.contestantAdapter = contestantAdapter
  }

  async loadReward(userId: string, rewardType: RewardType) {
    const input: QueryCommandInput = {
      TableName: this.tableName,
      IndexName: 'g2k',
      KeyConditionExpression: '#g2h = :rewardType AND #g2s = :userId',
      ExpressionAttributeNames: {
        '#g2h': '_g2h',
        '#g2s': '_g2s',
      },
      ExpressionAttributeValues: {
        ':rewardType': `${this.rewardAdapter.getTypename()}#${rewardType}`,
        ':userId': `${this.rewardAdapter.getTypename()}#${userId}`,
      },
      Limit: 1,
    }

    const { Items } = await this.client.send(new QueryCommand(input))

    if (!Items?.[0]) {
      return null
    }

    return this.rewardAdapter.toDomain(Items[0])
  }

  async isDailyRewardActive(
    userId: string,
    rewardType: RewardType
  ): Promise<boolean> {
    const input: QueryCommandInput = {
      TableName: this.tableName,
      IndexName: 'g2k',
      KeyConditionExpression: '#g2h = :rewardType AND #g2s = :userId',
      FilterExpression: `#ts >= :timestamp`,
      ExpressionAttributeNames: {
        '#g2h': '_g2h',
        '#g2s': '_g2s',
        '#ts': 'timestamp',
      },
      ExpressionAttributeValues: {
        ':rewardType': `${this.rewardAdapter.getTypename()}#${rewardType}`,
        ':userId': `${this.rewardAdapter.getTypename()}#${userId}`,
        ':timestamp': new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24h ago
      },
    }
    const { Items } = await this.client.send(new QueryCommand(input))
    return !!Items?.length
  }

  async isMilestoneRewardGranted(
    userId: string,
    followerCount: number
  ): Promise<boolean> {
    const input: QueryCommandInput = {
      TableName: this.tableName,
      IndexName: 'g2k',
      KeyConditionExpression: '#g2h = :rewardType AND #g2s = :userId',
      ExpressionAttributeNames: {
        '#g2h': '_g2h',
        '#g2s': '_g2s',
      },
      ExpressionAttributeValues: {
        ':rewardType': `${this.rewardAdapter.getTypename()}#FOLLOWER_MILESTONE_REACHED`,
        ':userId': `${this.rewardAdapter.getTypename()}#${userId}`,
        ':followerCount': followerCount,
      },
      FilterExpression: 'details.milestone.followerCount = :followerCount',
    }
    const { Items } = await this.client.send(new QueryCommand(input))
    return !!Items?.length
  }

  async loadXpMilestoneRewardsGranted(
    userId: string,
    sourceUserId: string
  ): Promise<IReward | null> {
    const input: QueryCommandInput = {
      TableName: this.tableName,
      IndexName: 'g3k',
      KeyConditionExpression:
        '#g3h = :userId AND begins_with(#g3s, :sourceUserId)',
      ExpressionAttributeNames: {
        '#g3h': '_g3h',
        '#g3s': '_g3s',
      },
      ExpressionAttributeValues: {
        ':userId': `${this.rewardAdapter.getTypename()}#${userId}`,
        ':sourceUserId': `${this.rewardAdapter.getTypename()}#${
          RewardType.ReferredUserXpMilestoneReached
        }#${sourceUserId}`,
      },
    }
    const { Items } = await this.client.send(new QueryCommand(input))
    return Items && Items.length
      ? this.rewardAdapter.toDomain(Items[Items.length - 1])
      : null
  }

  async loadAccount(userId: string): Promise<Account | null> {
    const input: GetCommandInput = {
      TableName: this.tableName,
      Key: this.accountAdapter.primaryKey({
        id: userId,
      } as Account),
    }
    const { Item } = await this.client.send(new GetCommand(input))

    if (!Item) {
      return null
    }

    const account = this.accountAdapter.toDomain(Item)

    return account
  }

  async loadAccountByName(username: string): Promise<Account | null> {
    const input: QueryCommandInput = {
      TableName: this.tableName,
      IndexName: 'g1k',
      KeyConditionExpression: '#g1h = :username',
      ExpressionAttributeNames: {
        '#g1h': '_g1h',
      },
      ExpressionAttributeValues: {
        ':username': `${this.accountAdapter.getTypename()}#${username}`,
      },
      Limit: 1,
    }

    const { Items } = await this.client.send(new QueryCommand(input))

    if (!Items?.[0]) {
      return null
    }

    return this.accountAdapter.toDomain(Items[0])
  }

  async saveAccount(account: Account) {
    const input: PutCommandInput = {
      TableName: this.tableName,
      Item: this.accountAdapter.toStorage(account),
    }

    logger.debug('saveAccount', {
      input,
    })

    await this.client.send(new PutCommand(input))

    return account
  }

  async saveAccountAndReward(account: Account, reward: IReward) {
    const input: TransactWriteCommandInput = {
      TransactItems: [
        {
          Update: {
            TableName: this.tableName,
            Key: this.accountAdapter.primaryKey(account),
            UpdateExpression: 'SET xp = xp + :xp, updatedAt = :updatedAt',
            ExpressionAttributeValues: {
              ':xp': reward.reward,
              ':updatedAt': account.updatedAt,
            },
          },
        },
        {
          Put: {
            TableName: this.tableName,
            Item: this.rewardAdapter.toStorage(reward),
            ConditionExpression: 'attribute_not_exists(#key)',
            ExpressionAttributeNames: {
              '#key': '_ph',
            },
          },
        },
      ],
    }

    logger.debug('saveAccountAndReward', {
      input,
    })

    try {
      const result = await this.client.send(new TransactWriteCommand(input))
      logger.debug('saveAccountAndReward:Result: ', { result })
    } catch (error) {
      logger.error('TransactWriteCommand', { error })

      if (error instanceof TransactionCanceledException) {
        const index = error.CancellationReasons?.findIndex(
          (reason) => reason.Code !== 'None'
        )

        switch (index) {
          case 0:
            throw new Error(`The reward (id: ${reward.id}) is already granted`)
        }
      }

      throw error
    }
  }

  async saveContest(contest: Contest): Promise<void> {
    const input: PutCommandInput = {
      TableName: this.tableName,
      Item: this.contestAdapter.toStorage(contest),
    }

    logger.debug('saveContest', {
      input,
    })

    await this.client.send(new PutCommand(input))
  }

  async loadContest(id: string): Promise<Contest | null> {
    const input: GetCommandInput = {
      TableName: this.tableName,
      Key: this.contestAdapter.primaryKey({ id } as Contest),
    }

    logger.debug('loadContest', {
      input,
    })

    const { Item } = await this.client.send(new GetCommand(input))

    logger.debug('loadContest', {
      Item,
    })

    if (!Item) {
      return null
    }

    const contest = this.contestAdapter.toDomain(Item)

    return contest
  }

  async removeContest(contestId: string): Promise<void> {
    const input: DeleteCommandInput = {
      TableName: this.tableName,
      Key: this.contestAdapter.primaryKey({
        id: contestId,
      } as Contest),
    }

    logger.debug('removeContest', {
      input,
    })

    await this.client.send(new DeleteCommand(input))
  }

  async saveContestant(contestant: Contestant): Promise<void> {
    const input: PutCommandInput = {
      TableName: this.tableName,
      Item: this.contestantAdapter.toStorage(contestant),
    }

    logger.debug('saveContestant', {
      input,
    })

    await this.client.send(new PutCommand(input))
  }

  async loadContestantByContestIdAndName(
    contestId: string,
    username: string
  ): Promise<Contestant | null> {
    const input: QueryCommandInput = {
      TableName: this.tableName,
      IndexName: 'g1k',
      KeyConditionExpression: '#g1h = :g1h AND #g1s = :g1s',
      ExpressionAttributeNames: {
        '#g1h': '_g1h',
        '#g1s': '_g1s',
      },
      ExpressionAttributeValues: {
        ':g1h': `${this.contestantAdapter.getTypename()}#${contestId}`,
        ':g1s': `${this.contestantAdapter.getTypename()}#${username}`,
      },
      Limit: 1,
    }

    logger.debug('loadContestantByContestIdAndName', {
      input,
    })

    const { Items } = await this.client.send(new QueryCommand(input))

    logger.debug('loadContestantByContestIdAndName', {
      Items,
    })

    if (!Items?.[0]) {
      return null
    }

    return this.contestantAdapter.toDomain(Items[0])
  }

  async loadContestants(
    contestId: string,
    limit?: number
  ): Promise<{ items: Contestant[]; lastEvaluatedKey?: any }> {
    const input: QueryCommandInput = {
      TableName: this.tableName,
      IndexName: 'g1k',
      KeyConditionExpression: '#g1h = :g1h',
      ExpressionAttributeNames: {
        '#g1h': '_g1h',
      },
      ExpressionAttributeValues: {
        ':g1h': `${this.contestantAdapter.getTypename()}#${contestId}`,
      },
      Limit: limit,
      ScanIndexForward: false,
    }

    logger.debug('loadContestants', {
      input,
    })

    const { Items } = await this.client.send(new QueryCommand(input))

    logger.debug('loadContestants', {
      Items,
    })

    return {
      items: Items
        ? Items.map((item) => this.contestantAdapter.toDomain(item))
        : [],
    }
  }

  async removeContestant(contestantId: string): Promise<void> {
    const input: DeleteCommandInput = {
      TableName: this.tableName,
      Key: this.contestantAdapter.primaryKey({
        id: contestantId,
      } as Contestant),
    }

    logger.debug('removeContestant', {
      input,
    })

    await this.client.send(new DeleteCommand(input))
  }

  // can do max of 25 requests in one batch
  async removeContestantsBatch(contestantIds: string[]): Promise<void> {
    const MAX_NUMBER_OF_REQUESTS = 25
    const chunkContestantIds = chunkArrayInGroups(
      contestantIds,
      MAX_NUMBER_OF_REQUESTS
    ) as string[][]

    for (const chunk of chunkContestantIds) {
      const requests = chunk.map((id) => ({
        DeleteRequest: {
          Key: this.contestantAdapter.primaryKey({ id } as Contestant),
        },
      }))

      logger.debug('removeContestantsBatch', {
        requests,
      })

      const input: BatchWriteCommandInput = {
        RequestItems: {
          [this.tableName]: requests,
        },
      }

      logger.debug('removeContestantsBatch', {
        input,
      })

      await this.client.send(new BatchWriteCommand(input))
    }
  }

  // can do max of 25 requests in one batch
  async saveContestantsBatch(contestants: Contestant[]): Promise<void> {
    const MAX_NUMBER_OF_REQUESTS = 25
    const chunkContestants = chunkArrayInGroups(
      contestants,
      MAX_NUMBER_OF_REQUESTS
    ) as Contestant[][]

    for (const chunk of chunkContestants) {
      const requests = chunk.map((contestant) => ({
        PutRequest: {
          Item: this.contestantAdapter.toStorage(contestant),
        },
      }))

      logger.debug('saveContestantsBatch', {
        requests,
      })

      const input: BatchWriteCommandInput = {
        RequestItems: {
          [this.tableName]: requests,
        },
      }

      logger.debug('saveContestantsBatch', {
        input,
      })

      await this.client.send(new BatchWriteCommand(input))
    }
  }

  // can do max of 25 requests in one batch
  async saveContestsBatch(contests: Contest[]): Promise<void> {
    const MAX_NUMBER_OF_REQUESTS = 25
    const chunkContests = chunkArrayInGroups(
      contests,
      MAX_NUMBER_OF_REQUESTS
    ) as Contest[][]

    for (const chunk of chunkContests) {
      const requests = chunk.map((contest) => ({
        PutRequest: {
          Item: this.contestAdapter.toStorage(contest),
        },
      }))

      logger.debug('saveContestsBatch', {
        requests,
      })

      const input: BatchWriteCommandInput = {
        RequestItems: {
          [this.tableName]: requests,
        },
      }

      logger.debug('saveContestsBatch', {
        input,
      })

      await this.client.send(new BatchWriteCommand(input))
    }
  }

  // can do max of 25 requests in one batch
  async saveAccountsBatch(accounts: Account[]): Promise<void> {
    const MAX_NUMBER_OF_ACCOUNTS = 25
    const chunkAccounts = chunk(accounts, MAX_NUMBER_OF_ACCOUNTS) as Account[][]

    for (const chunk of chunkAccounts) {
      const requests = chunk.map((account) => ({
        PutRequest: {
          Item: this.accountAdapter.toStorage(account),
        },
      }))

      logger.debug('saveAccountsBatch', {
        requests,
      })

      const input: BatchWriteCommandInput = {
        RequestItems: {
          [this.tableName]: requests,
        },
      }

      logger.debug('saveAccountsBatch', {
        input,
      })

      await this.client.send(new BatchWriteCommand(input))
    }
  }
}
