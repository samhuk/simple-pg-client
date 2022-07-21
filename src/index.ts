import { Client } from 'pg'
import { loop } from './common/function'
import { createDbService } from './dbService'
import { SimplePgClientOptions, SimplePgClient, ResolvedMaintenanceDbOptions } from './types'

const createDbUrl = (
  host: string,
  port: number,
  user: string,
) => `${user}@${host}:${port}`

const addExtensions = (client: Client, extensionNames: string[]) => (
  client.query(extensionNames.map(en => `create extension if not exists "${en}";`).join(';\n'))
)

const setSchema = (c: Client, schemaName: string) => (
  c.query(`set search_path to '${schemaName ?? 'public'}'`)
)

const createDefaultCreateDatabaseSql = (dbName: string) => `CREATE DATABASE "${dbName}"
  WITH 
  OWNER = postgres
  ENCODING = 'UTF8'
  TABLESPACE = pg_default
  CONNECTION LIMIT = -1;`

const createCreateDatabaseSql = (options: SimplePgClientOptions): string => {
  if (options.createDbSqlTemplate == null)
    return createDefaultCreateDatabaseSql(options.db)

  return options.createDbSqlTemplate.replace(/{db}/g, `"${options.db}"`)
}

const createDbIfNotExistsAttempt = async (
  options: SimplePgClientOptions,
  maintenanceDbOptions: ResolvedMaintenanceDbOptions,
  dbUrl: string,
  retryIndex: number,
): Promise<{ success: boolean, delayS?: number }> => {
  // Create (unconnected) client
  const c = new Client({
    user: maintenanceDbOptions.user,
    password: maintenanceDbOptions.password,
    host: options.host,
    port: options.port,
    database: maintenanceDbOptions.db,
    ...maintenanceDbOptions.additionalPgOptions,
  })

  try {
    await options.events?.onTryMaintenanceDbConnect?.(c, retryIndex, `Connecting to maintenance DB '${maintenanceDbOptions.db}' at ${dbUrl}`)
    // Try connect
    await c.connect()
    // If successful, call connect success callback
    await options.events?.onMaintenanceDbConnect?.(c, retryIndex, `Connected to maintenance DB '${maintenanceDbOptions.db}' at ${dbUrl}`)
    // Determine if db exists
    await options.events?.onDetermineIfDbExistsStart?.(c, `Ensuring DB '${options.db}' exists`)
    const result = await c.query(`SELECT 1 FROM pg_catalog.pg_database WHERE datname='${options.db}' limit 1`)
    // If db doesn't exist, create it
    if (result.rowCount === 0) {
      await options.events?.onDetermineDbDoesNotExists?.(c, `DB '${options.db}' does not already exist. Creating DB '${options.db}'`)
      const createDatabaseSql = createCreateDatabaseSql(options)
      try {
        // Try create db
        await c.query(createDatabaseSql)
        // If successful, call create success callback, close connection, and return.
        await options.events?.onCreateDb?.(c, `Created DB '${options.db}'`)
        c.end()
        return { success: true }
      }
      catch (e: any) {
        /* If create db failed, call create failed callback, close connection,
         * and return with no delay, signifying no more retries.
         */
        await options.events?.onCreateDbFail?.(c, e, `Create DB '${options.db}' failed. Error: ${e}.`)
        c.end()
        return { success: false }
      }
    }
    else {
      // If db already exists, call callback, close connection, and return.
      options.events?.onDetermineDbExists?.(c, `DB '${options.db}' already exists`)
      c.end()
      return { success: true }
    }
  }
  catch (e: any) {
    // If no more retries remain, return with no delay, signifying no more retries.
    if (retryIndex > options.maxNumRetry - 1) {
      await options.events?.onMaintenanceDbConnectNumRetryExceeded?.(c, retryIndex, `Failed to connect to maintenance DB '${maintenanceDbOptions.db}' at ${dbUrl}. Max attempts exceeded.`)
      c.end()
      return { success: false }
    }
    // Else (if more retries remain), return with delay, signifying another retry.
    const delayS = options.retryIntervalExpression?.(retryIndex) ?? (retryIndex + 1) * 2
    await options.events?.onMaintenanceDbConnectFail?.(c, retryIndex, e, `Failed to connect to maintenance DB '${maintenanceDbOptions.db}' at ${dbUrl}. Trying again in ${delayS}s... Error: ${e}`)
    c.end()
    return { success: false, delayS }
  }
}

const createDbIfNotExists = (
  options: SimplePgClientOptions,
): Promise<void> => new Promise((resolve, reject) => {
  const maintenanceDbOptions: ResolvedMaintenanceDbOptions = {
    db: options.maintenanceDbOptions.db ?? 'postgres',
    user: options.maintenanceDbOptions.user ?? options.user,
    password: options.maintenanceDbOptions.password ?? options.password,
    maxNumRetry: options.maintenanceDbOptions.maxNumRetry ?? options.maxNumRetry,
    additionalPgOptions: options.maintenanceDbOptions.additionalPgOptions,
  }
  const dbUrl = createDbUrl(options.host, options.port, maintenanceDbOptions.user)
  loop((next, i) => {
    createDbIfNotExistsAttempt(options, maintenanceDbOptions, dbUrl, i).then(result => {
      if (result.success)
        resolve()
      else if (result.delayS != null)
        next(result.delayS * 1000)
      else
        reject()
    })
  })
})

const connectAttempt = async (
  options: SimplePgClientOptions,
  dbUrl: string,
  retryIndex: number,
): Promise<{ success: boolean, delayS?: number, c?: Client }> => {
  // Create (unconnected) client
  const c = new Client({
    user: options.user,
    password: options.password,
    host: options.host,
    port: options.port,
    database: options.db,
    ...options.additionalPgOptions,
  })

  try {
    await options.events?.onTryDbConnect?.(c, `Connecting to DB '${options.db}' at ${dbUrl}`)
    // Try connect
    await c.connect()
    // If successfully connect, call callback, return with client
    await options.events?.onDbConnect?.(c, `Connected to DB '${options.db}' at ${dbUrl}`)
    return { success: true, c }
  }
  catch (e: any) {
    // If no more retries remain, return with no delay, signifying no more retries.
    if (retryIndex > options.maxNumRetry - 1) {
      await options.events?.onDbConnectFail?.(c, retryIndex, e, `Failed to connect to DB '${options.db}' at ${dbUrl}. Max attempts exceeded.`)
      c.end()
      return { success: false }
    }
    // Else (if more retries remain), return with delay, signifying another retry.
    const delayS = options.retryIntervalExpression?.(retryIndex) ?? (retryIndex + 1) * 2
    await options.events?.onDbConnectNumRetryExceeded?.(c, retryIndex, e, `Failed to connect to DB '${options.db}' at ${dbUrl}. Trying again in ${delayS}s... Error: ${e}`)
    c.end()
    return { success: false, delayS }
  }
}

const connect = (options: SimplePgClientOptions): Promise<Client> => new Promise((resolve, reject) => {
  const dbUrl = createDbUrl(options.host, options.port, options.user)
  loop((next, i) => {
    connectAttempt(options, dbUrl, i).then(result => {
      if (result.success)
        resolve(result.c)
      else if (result.delayS != null)
        next(result.delayS * 1000)
      else
        reject()
    })
  })
})

export const createSimplePgClient = async (options: SimplePgClientOptions): Promise<SimplePgClient> => {
  // Optionally create db if it does not exist, via a defined maintenance db on the server
  if (options.createDbIfNotExists ?? true) {
    try {
      await createDbIfNotExists(options)
    }
    catch {
      throw new Error(`Failed to create DB '${options.db}'`)
    }
  }

  // Connect to db
  let c: Client
  try {
    c = await connect(options)
  }
  catch {
    throw new Error(`Failed to connect to DB '${options.db}'`)
  }

  // Set schema if given
  if (options.schemaName != null)
    await setSchema(c, options.schemaName)

  // Add extensions by name, if given
  if (options.extensions != null && options.extensions.length > 0)
    await addExtensions(c, options.extensions)

  // Create db service, providing query functions on pg client
  const dbService = createDbService({
    client: c,
    sqlLoggingTruncation: options.sqlLoggingTruncation,
    events: {
      onError: options.events?.onQueryError,
      onQuery: options.events?.onQuery,
    },
  })

  return {
    client: c,
    query: dbService.query,
    queryExists: dbService.queryExists,
    queryGetFirstRow: dbService.queryGetFirstRow,
    queryGetRows: dbService.queryGetRows,
  }
}
