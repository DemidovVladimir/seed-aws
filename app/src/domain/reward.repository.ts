import {
  GlobalKeyGenerator,
  IStorable,
  PrimaryKeyGenerator,
  RepositoryAdapter,
  standardKey,
} from '../lib/repository-adapter'
import {
  IReferredUserXpMilestoneReachedRewardDetails,
  IReward,
  Reward,
} from './reward.model'

export class RewardRepositoryAdapter extends RepositoryAdapter<IReward> {
  toStorage(entity: IReward): IStorable {
    const { id, userId, reward, timestamp, details } = entity

    return {
      id,
      userId,
      reward,
      timestamp: timestamp.toISOString(),
      details,
      ...this.serviceData(entity),
    }
  }

  toDomain(item: any): IReward {
    return new Reward({
      id: item.id,
      userId: item.userId,
      reward: item.reward,
      timestamp: new Date(item.timestamp),
      details: item.details,
    })
  }
}

const pk = new PrimaryKeyGenerator({
  hash: standardKey,
  sort: standardKey,
})

const g1k = new GlobalKeyGenerator<IReward>({
  hash(typename: string, entity: IReward) {
    return `${typename}#${entity.userId}`
  },
  sort(typename: string, entity: IReward) {
    return `${typename}#${entity.timestamp.toISOString()}`
  },
})

const g2k = new GlobalKeyGenerator<IReward>({
  hash(typename: string, entity: IReward) {
    return `${typename}#${entity.details.type}`
  },
  sort(typename: string, entity: IReward) {
    return `${typename}#${entity.userId}`
  },
})

const g3k = new GlobalKeyGenerator<IReward>({
  hash(typename: string, entity: IReward) {
    return `${typename}#${entity.userId}`
  },
  sort(typename: string, entity: IReward) {
    const rewardDetails =
      entity as unknown as IReward<IReferredUserXpMilestoneReachedRewardDetails>
    return [
      typename,
      rewardDetails.details.type,
      rewardDetails.details.sourceUserId,
      rewardDetails.timestamp.toISOString(),
    ]
      .filter(Boolean)
      .join('#')
  },
})

export const rewardRepository = new RewardRepositoryAdapter({
  typename: 'REWARD',
  pk,
  gk: [g1k, g2k, g3k],
})
