import { omit } from 'lodash'

export type KeyAttributeValue = string | number
export type KeyGenerator<T> = (typename: string, entity: T) => KeyAttributeValue

export interface IKeyGeneratorProps<T> {
  hash: KeyGenerator<T>
  sort?: KeyGenerator<T>
}

export class PrimaryKeyGenerator<T> {
  hash: KeyGenerator<T>
  sort?: KeyGenerator<T>

  constructor({ hash, sort }: IKeyGeneratorProps<T>) {
    this.hash = hash
    this.sort = sort
  }

  apply(entity: T, typename: string) {
    return Object.assign(
      {
        _ph: this.hash(typename, entity),
      },
      this.sort && { _ps: this.sort(typename, entity) }
    )
  }

  keys(): string[] {
    return ['_ph', this.sort && '_ps'].filter(Boolean) as string[]
  }
}

export class GlobalKeyGenerator<T> {
  hash: KeyGenerator<T>
  sort?: KeyGenerator<T>

  constructor({ hash, sort }: IKeyGeneratorProps<T>) {
    this.hash = hash
    this.sort = sort
  }

  apply(entity: T, typename: string, index: number) {
    return Object.assign(
      {
        [`_g${index}h`]: this.hash(typename, entity),
      },
      this.sort && { [`_g${index}s`]: this.sort(typename, entity) }
    )
  }

  keys(index: number): string[] {
    return [`_g${index}h`, this.sort && `_g${index}s`].filter(
      Boolean
    ) as string[]
  }
}

export interface IStorable extends Record<string, any> {
  _type: string
  _ph: KeyAttributeValue
  _ps?: KeyAttributeValue
}

export interface IRepositoryAdapterProps<T> {
  typename: string
  pk: PrimaryKeyGenerator<T>
  gk?: (GlobalKeyGenerator<T> | undefined)[]
}

export interface IRepositoryAdapter<D> {
  toStorage(entity: D): IStorable
  toDomain(item: any): D
  primaryKey(entity: D): Record<string, KeyAttributeValue>
  globalKey(entity: D): Record<string, KeyAttributeValue>
  getTypename(): string
}

export class RepositoryAdapter<D> implements IRepositoryAdapter<D> {
  protected typename: string
  private pk: PrimaryKeyGenerator<D>
  private gk?: (GlobalKeyGenerator<D> | undefined)[]
  private keys: string[]

  constructor({ typename, pk, gk }: IRepositoryAdapterProps<D>) {
    this.typename = typename.toUpperCase()
    this.pk = pk
    this.gk = gk
    this.keys = [
      '_type',
      ...this.pk.keys(),
      ...(this.gk || []).flatMap((item, i) => (item ? item.keys(i + 1) : [])),
    ]
  }

  inject(entity: D): IStorable {
    return {
      _type: this.typename,
      ...entity,
      ...this.primaryKey(entity),
      ...this.globalKey(entity),
    }
  }

  toStorage(entity: D) {
    return this.inject(entity)
  }

  toDomain(item: any): D {
    return this.clean(item)
  }

  serviceData(entity: D) {
    return {
      _type: this.typename,
      ...this.primaryKey(entity),
      ...this.globalKey(entity),
    }
  }

  clean(item: D & Record<string, KeyAttributeValue>): D {
    return omit(item, this.keys) as unknown as D
  }

  primaryKey(entity: D) {
    return this.pk.apply(entity, this.typename)
  }

  globalKey(entity: D) {
    const keys: Record<string, KeyAttributeValue> = {}

    if (!this.gk) {
      return keys
    }

    for (let i = 0, len = this.gk.length || 0; i < len; i += 1) {
      const keyGenerator = this.gk[i]

      if (!keyGenerator) {
        continue
      }

      Object.assign(keys, keyGenerator.apply(entity, this.typename, i + 1))
    }

    return keys
  }

  getTypename() {
    return this.typename
  }
}

export interface IIdentifiable {
  id: any
}

export function standardKey(typename: string, entity: IIdentifiable) {
  return `${typename.toUpperCase()}#${entity.id}`
}
