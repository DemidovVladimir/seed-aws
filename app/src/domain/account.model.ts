import { IReward } from './reward.model'

export interface IAccountProps {
  id: string
  username: string
  refUsername?: string
  updatedAt?: Date
  xp?: number
}

export class Account {
  id: string
  username: string
  refUsername?: string
  updatedAt: Date
  _xp: number = 0

  constructor({ id, username, xp, updatedAt, refUsername }: IAccountProps) {
    this.id = id
    this.username = username
    this._xp = xp || 0
    this.updatedAt = updatedAt || new Date()
    this.refUsername = refUsername
  }

  grantReward(reward: IReward<any>) {
    this._xp += reward.reward
    this.updatedAt = new Date()
  }

  get xp() {
    return this._xp
  }

  static fromRegisteredUser({ id, username, refUsername }: any) {
    return new Account({
      id,
      username,
      xp: 0,
      updatedAt: new Date(),
      refUsername,
    })
  }
}
