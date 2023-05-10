export interface IContestantProps {
  id: string
  userId: string
  name: string
  contestId: string
  createdAt: number
  timestamp?: Date
}

export class Contestant {
  readonly id: string
  readonly userId: string
  readonly contestId: string
  readonly name: string
  readonly createdAt: number
  readonly timestamp: Date

  constructor({
    id,
    userId,
    contestId,
    name,
    createdAt,
    timestamp,
  }: IContestantProps) {
    this.id = id
    this.userId = userId
    this.contestId = contestId
    this.name = name
    this.createdAt = createdAt
    this.timestamp = timestamp || new Date()
  }
}
