export interface IContestProps {
  id: string
  configurationId: string
  name: string
  status: string
}

export class Contest {
  readonly id: string
  readonly configurationId: string
  readonly name: string
  readonly status: string

  constructor({ id, configurationId, name, status }: IContestProps) {
    this.id = id
    this.configurationId = configurationId
    this.name = name
    this.status = status
  }
}
