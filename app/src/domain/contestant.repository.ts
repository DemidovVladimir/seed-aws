import {
  PrimaryKeyGenerator,
  standardKey,
  GlobalKeyGenerator,
  RepositoryAdapter,
  IStorable,
} from '../lib/repository-adapter'
import { Contestant } from './contestant.model'

class ContestantRepositoryAdapter extends RepositoryAdapter<Contestant> {
  toDomain(item: any): Contestant {
    return new Contestant({
      id: item.id,
      name: item.name,
      userId: item.userId,
      contestId: item.contestId,
      createdAt: item.createdAt,
      timestamp: new Date(item.timestamp),
    })
  }

  toStorage(contestant: Contestant): IStorable {
    const { id, userId, contestId, name, createdAt } = contestant

    return {
      id,
      userId,
      name,
      contestId,
      createdAt,
      ...this.serviceData(contestant),
      timestamp: contestant.timestamp.getTime(),
    }
  }
}

const pk = new PrimaryKeyGenerator({
  hash: standardKey,
  sort: standardKey,
})

export const g1k = new GlobalKeyGenerator({
  hash(typename: string, entity: Contestant) {
    return `${typename}#${entity.contestId}`
  },
  sort(typename: string, entity: Contestant) {
    return `${typename}#${entity.name}`
  },
})

export const contestantRepository = new ContestantRepositoryAdapter({
  typename: 'CONTESTANT',
  pk,
  gk: [g1k],
})
