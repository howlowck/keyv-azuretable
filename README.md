[<img width="100" align="right" src="docs/media/keyv_logo.svg" alt="keyv">](https://github.com/howlowck/keyv-azuretable)

# Keyv-AzureTable [![Test](https://github.com/howlowck/keyv-azuretable/actions/workflows/test.yml/badge.svg)](https://github.com/howlowck/keyv-azuretable/actions/workflows/test.yml)

An Azure Table adapter for [Keyv](https://github.com/jaredwray/keyv)

## Install

`npm install keyv-azuretable`

## Usage


```js
const Keyv = require('keyv')
const KeyvAzureTable = require('keyv-azuretable')

const azTableOption = {
  connectionString: '', // connection string for your storage account
  tableName: '', // name of the table
  namespace: '', //optional (it's the partition key for the table, if it's empty it will be generated for you)
  clientOptions: {}, // optional (azure-table TableClient-specific options. See note below.)
}

const noNsAzTable = new KeyvAzureTable()
await noNsAzTable.createTable() // if the table is not created, you can use `createTable` to create the table
const config = noNsAzTable.getKeyvConfig()
// config = {store: azTableAdatpr, namespace: `keyvns-${nanoid()}`}
const keyv = new Keyv(config)

const usersAzTable = new KeyvAzureTable({
  ...azTableOption,
  namespace: 'users',
})
// userAzTable = {store: azTableAdapter, namespace: 'users'}
const usersKeyv = new Keyv(usersAzTable)

//set
await keyv.set('foo', 'bar', 6000) //Expiring time is optional (milliseconds)

//get
const obj = await keyv.get('foo')

//delete
await keyv.delete('foo')

//clear
await keyv.clear()

```

> Note: `clientOptions` is the TableClient-specific `TableServiceClientOptions` object. (See [Azure Docs for more details](https://docs.microsoft.com/en-us/javascript/api/@azure/data-tables/tableclient?view=azure-node-latest#TableClient_string__string__NamedKeyCredential__TableServiceClientOptions_)) 
