import {
  IStorable,
  PrimaryKeyGenerator,
  RepositoryAdapter,
  standardKey,
} from '../lib/repository-adapter'
import { Contest } from './contest.model'

class ContestRepositoryAdapter extends RepositoryAdapter<Contest> {
  toStorage(contest: Contest): IStorable {
    const { id, configurationId, name, status } = contest

    return {
      id,
      configurationId,
      name,
      status,
      ...this.serviceData(contest),
    }
  }

  toDomain({ id, configurationId, name, status }: any): Contest {
    return new Contest({
      id,
      configurationId,
      name,
      status,
    })
  }
}

const pk = new PrimaryKeyGenerator({
  hash: standardKey,
  sort: standardKey,
})

export const contestRepository = new ContestRepositoryAdapter({
  typename: 'CONTEST',
  pk,
  gk: [],
})
