import { AzureTableAdapter } from '../src/index'
import Keyv from 'keyv'

const { AZURE_TABLE_CONNECTION_STRING } = process.env
const localTestConnectionString = AZURE_TABLE_CONNECTION_STRING as string

test('can store and retrieve a string', async () => {
  const azureTableAdapter = new AzureTableAdapter({
    connectionString: localTestConnectionString,
    tableName: 'test',
    clientOptions: { allowInsecureConnection: true },
  })
  await azureTableAdapter.createTable()
  const options = azureTableAdapter.getKeyvConfig()
  const keyv = new Keyv(options)
  await keyv.set('test-key', 'this is a string')
  const value = await keyv.get('test-key')
  expect(value).toEqual('this is a string')
  await keyv.clear()
})

test('can store and retrieve an object', async () => {
  const azureTableAdapter = new AzureTableAdapter({
    connectionString: localTestConnectionString,
    tableName: 'test',
    clientOptions: { allowInsecureConnection: true },
  })
  await azureTableAdapter.createTable()
  const options = azureTableAdapter.getKeyvConfig()
  const keyv = new Keyv(options)
  await keyv.set('test-obj', {
    foo: 'bar',
    nested: { fruits: ['apple', 'banana'] },
  })
  const value = await keyv.get('test-obj')
  expect(value).toMatchObject({
    foo: 'bar',
    nested: { fruits: ['apple', 'banana'] },
  })
  await keyv.clear()
})

test('(namespaced) can store and retrieve an object', async () => {
  const azureTableAdapter = new AzureTableAdapter({
    connectionString: localTestConnectionString,
    tableName: 'test',
    clientOptions: { allowInsecureConnection: true },
    namespace: 'test-retrieval',
  })
  await azureTableAdapter.createTable()
  const options = azureTableAdapter.getKeyvConfig()
  const keyv = new Keyv(options)
  await keyv.set('test-obj', {
    foo: 'bar',
    nested: { fruits: ['apple', 'banana'] },
  })
  const value = await keyv.get('test-obj')
  expect(value).toMatchObject({
    foo: 'bar',
    nested: { fruits: ['apple', 'banana'] },
  })
  await keyv.clear()
})

test('(namespaced) can store and delete an object', async () => {
  const azureTableAdapter = new AzureTableAdapter({
    connectionString: localTestConnectionString,
    tableName: 'test',
    clientOptions: { allowInsecureConnection: true },
    namespace: 'test-deletion',
  })
  await azureTableAdapter.createTable()
  const options = azureTableAdapter.getKeyvConfig()
  const keyv = new Keyv(options)
  await keyv.set('test-obj2', {
    foo: 'bar',
    nested: { fruits: ['apple', 'banana'] },
  })
  const value = await keyv.get('test-obj2')
  expect(value).toMatchObject({
    foo: 'bar',
    nested: { fruits: ['apple', 'banana'] },
  })
  await keyv.delete('test-obj2')
  const deletedValue = await keyv.get('test-obj2')
  expect(deletedValue).toBeUndefined()
  await keyv.clear()
})

test('can clear the store', async () => {
  const azureTableAdapter = new AzureTableAdapter({
    connectionString: localTestConnectionString,
    tableName: 'test',
    clientOptions: { allowInsecureConnection: true },
    namespace: 'test-clear',
  })
  const data = {
    foo: 'bar',
    nested: { fruits: ['apple', 'banana'] },
  }
  await azureTableAdapter.createTable()
  const keyv = new Keyv(azureTableAdapter.getKeyvConfig())
  await Promise.all([
    keyv.set('test-obj1', data),
    keyv.set('test-obj2', data),
    keyv.set('test-obj3', data),
    keyv.set('test-obj4', data),
  ])
  const value1 = await keyv.get('test-obj1')
  expect(value1).toMatchObject({
    ...data,
  })
  const value2 = await keyv.get('test-obj2')
  expect(value2).toMatchObject({
    ...data,
  })
  const value3 = await keyv.get('test-obj3')
  expect(value3).toMatchObject({
    ...data,
  })
  const value4 = await keyv.get('test-obj4')
  expect(value4).toMatchObject({
    ...data,
  })
  await keyv.clear()
  const deletedValue1 = await keyv.get('test-obj1')
  const deletedValue2 = await keyv.get('test-obj2')
  const deletedValue3 = await keyv.get('test-obj3')
  const deletedValue4 = await keyv.get('test-obj4')
  expect(deletedValue1).toBeUndefined()
  expect(deletedValue2).toBeUndefined()
  expect(deletedValue3).toBeUndefined()
  expect(deletedValue4).toBeUndefined()
})

test('can clear empty store', async () => {
  const azureTableAdapter = new AzureTableAdapter({
    connectionString: localTestConnectionString,
    tableName: 'test',
    clientOptions: { allowInsecureConnection: true },
    namespace: 'test-clear-noop',
  })

  await azureTableAdapter.createTable()
  const keyv = new Keyv(azureTableAdapter.getKeyvConfig())

  await keyv.clear()
  const empty = await keyv.get('test-obj1')
  expect(empty).toBeUndefined()
})

test('can set ttl expiry', async () => {
  const azureTableAdapter = new AzureTableAdapter({
    connectionString: localTestConnectionString,
    tableName: 'test',
    clientOptions: { allowInsecureConnection: true },
    namespace: 'test-expiry',
  })
  const data = {
    foo: 'bar',
    nested: { fruits: ['apple', 'banana'] },
  }
  await azureTableAdapter.createTable()
  const keyv = new Keyv(azureTableAdapter.getKeyvConfig())
  await Promise.all([
    keyv.set('test-obj1', data, 1000),
    keyv.set('test-obj2', data, 3000),
    keyv.set('test-obj3', data),
  ])
  await new Promise(resolve => {
    setTimeout(() => resolve(undefined), 2000)
  })

  const expired = await keyv.get('test-obj1')
  const notExpired = await keyv.get('test-obj2')
  const neverExpires = await keyv.get('test-obj3')

  expect(expired).toBeUndefined()
  expect(notExpired).toMatchObject(data)
  expect(neverExpires).toMatchObject(data)
  await keyv.clear()
})
