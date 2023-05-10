import {
  GlobalKeyGenerator,
  IStorable,
  PrimaryKeyGenerator,
  RepositoryAdapter,
  standardKey,
} from '../lib/repository-adapter'
import { Account } from './account.model'

export class AccountRepositoryAdapter extends RepositoryAdapter<Account> {
  toStorage(entity: Account): IStorable {
    const { id, username: userName, xp, updatedAt, refUsername } = entity

    return {
      id,
      userName,
      xp,
      refUsername,
      updatedAt: updatedAt.toISOString(),
      ...this.serviceData(entity),
    }
  }

  toDomain(item: any): Account {
    return new Account({
      id: item.id,
      username: item.userName,
      xp: item.xp,
      updatedAt: new Date(item.updatedAt),
      refUsername: item.refUsername,
    })
  }
}

const pk = new PrimaryKeyGenerator({
  hash: standardKey,
  sort: standardKey,
})

const g1k = new GlobalKeyGenerator<Account>({
  hash(typename: string, entity: Account) {
    return `${typename}#${entity.username}`
  },
  sort(typename: string, entity: Account) {
    return `${typename}#${entity.updatedAt.toISOString()}`
  },
})

export const accountRepository = new AccountRepositoryAdapter({
  typename: 'ACCOUNT',
  pk,
  gk: [g1k],
})
