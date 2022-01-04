import {
  TableClient,
  TableServiceClientOptions,
  TableTransactionResponse,
  TransactionAction,
} from '@azure/data-tables'
import EventEmitter from 'events'
import { nanoid } from 'nanoid'

type Options = {
  connectionString: string
  tableName: string
  namespace?: string
  clientOptions?: TableServiceClientOptions
}

type Entity = {
  partitionKey: string
  rowKey: string
  expiry?: number
  value: unknown
}

type ClientError = {
  details?: {
    errorCode?: string
    odataError?: { code: string }
  }
}

const resourceNotFound = (error: ClientError) => {
  return (
    error.details?.errorCode === 'ResourceNotFound' ||
    error.details?.odataError?.code === 'ResourceNotFound'
  )
}

type KeyvConfig = {
  store: AzureTableAdapter
  namespace: string
}

class AzureTableAdapter extends EventEmitter {
  private client: TableClient
  private namespace: string

  constructor(options: Options) {
    super()
    const { connectionString, tableName, clientOptions } = options
    this.client = TableClient.fromConnectionString(
      connectionString,
      tableName,
      clientOptions
    )
    this.namespace = options.namespace ?? `keyvns-${nanoid()}`
  }

  createTable() {
    return this.client.createTable()
  }

  getClient() {
    return this.client
  }

  async get<T>(key: string) {
    try {
      const entity = await this.client.getEntity<Entity>(this.namespace, key)
      return entity.value as T
    } catch (error) {
      if (resourceNotFound(error as ClientError)) {
        return undefined
      }
      this.emit('error', error)
      throw error
    }
  }

  async set<T>(key: string, value: T, ttl?: number) {
    const entity: Entity = {
      partitionKey: this.namespace,
      rowKey: key,
      value,
      expiry: ttl,
    }

    try {
      // console.log('entity', entity)
      await this.client.upsertEntity(entity, 'Replace')
    } catch (error) {
      this.emit('error', error)
      throw error
    }
  }

  async delete(key: string) {
    try {
      await this.client.deleteEntity(this.namespace, key)
      return true
    } catch (error) {
      this.emit('error', error)
      throw error
    }
  }

  async clear() {
    const entitiesIterator = this.client.listEntities({
      queryOptions: {
        filter: `PartitionKey eq '${this.namespace}'`,
        select: ['rowKey', 'partitionKey'],
      },
    })
    const paged = entitiesIterator.byPage({ maxPageSize: 100 })

    const transactionPromises: Promise<TableTransactionResponse>[] = []

    const client = this.client
    for await (const pagedEntities of paged) {
      const transactionPayload = pagedEntities.map(_ => {
        const { partitionKey, rowKey } = _
        return ['delete', { partitionKey, rowKey }] as TransactionAction
      })
      if (transactionPayload.length > 0) {
        transactionPromises.push(client.submitTransaction(transactionPayload))
      }
    }
    try {
      await Promise.all(transactionPromises)
    } catch (error) {
      this.emit('error', error)
      throw error
    }
  }

  public getKeyvConfig(): KeyvConfig {
    return {
      store: this,
      namespace: this.namespace,
    }
  }
}

export { AzureTableAdapter }
