import { Client, ClientConfig, QueryResult } from 'pg'
import { OmitTyped } from './common/types'

/**
 * Options for connecting to the maintenance database.
 */
type MaintenanceDbOptions = {
  /**
   * Optional maintenance database name.
   *
   * @default "postgres"
   */
  db?: string
  /**
  * Optional alternative user to use to login to the maintenance database.
  *
  * If not defined, the top-level `user` is used.
  */
  user?: string
  /**
  * Optional alternative password to use to login to the maintenance database.
  *
  * If not defined, the top-level `password` is used.
  */
  password?: string
  /**
  * Optional alternative maximum number of retries for connecting to the server for
  * the maintenance database.
  *
  * If not defined, the top-level `maxNumRetry` is used.
  */
  maxNumRetry?: number
  /**
   * Optional additional pg client config to use to connect to the server for the
   * maintencance database, e.g. `keepAlive`, `query_timeout`, `ssl`, and so on.
   */
  additionalPgOptions?: OmitTyped<ClientConfig, 'host' | 'port' | 'user' | 'password' | 'database'>
}

export type ResolvedMaintenanceDbOptions = OmitTyped<Required<MaintenanceDbOptions>, 'additionalPgOptions'> & {
  additionalPgOptions?: OmitTyped<ClientConfig, 'host' | 'port' | 'user' | 'password' | 'database'>
}

type VoidOrPromiseVoid = void | Promise<void>

/**
 * Options for the creation of a SimplePg instance.
 */
export type SimplePgOptions = {
  /**
   * Host name/ip of the database server.
   */
  host: string
  /**
   * Port of the database server.
   */
  port: number
  /**
   * User name to use to login for `db`.
   */
  user: string
  /**
   * Password to use to login for `db`.
   */
  password: string
  /**
   * Database name to use.
   */
  db: string
  /**
   * Optional schema name to use.
   *
   * @default undefined
   */
  schemaName?: string
  /**
   * Maximum number of retries for connecting to the database server.
   *
   * @default 5
   */
  maxNumRetry?: number
  /**
   * Function that creates the retry interval in seconds for a given retry index.
   * This is how long will be waited before another database connection attempt is made.
   *
   * If not defined, this will default to the following linear increasing function:
   *
   * `({retryIndex} + 1) * 2`
   *
   * (E.g. 2, 4, 6, 8, ...)
   */
  retryIntervalExpression?: (retryIndex: number) => number
  /**
   * List of names of extensions to ensure exist in the database.
   *
   * @default undefined
   */
  extensions?: string[]
  /**
   * Determines if `db` will be created if it does not exist. The strategy used
   * for this is to first login to the server's maintenance database to check
   * whether `db` exists, and if not, create it using `createDbSqlTemplate`.
   *
   * @default false
   */
  createDbIfNotExists?: boolean
  /**
  * To be used if `createDbIfNotExists` is true.
  *
  * Optional CREATE DATABASE sql to use to create the database if it does not exist.
  * The string "{db}" within the template will be replaced by the defined database name.
  *
  * It is highly recommended that this is defined, as the default CREATE DATABASE sql
  * assumes many defaults such as owner, encoding, connection limit, and so on.
  */
  createDbSqlTemplate?: string
  /**
   * To be used if `createDbIfNotExists` is true.
   *
   * Options for connecting to the maintenance database. This is a database that exists by default
   * on the server.
   */
  maintenanceDbOptions?: MaintenanceDbOptions
  /**
   * Maximum number of characters in the `sql` parameter of `events.onQuery` and `events.onQueryError`.
   *
   * Leave as `undefined` or `-1` to disable truncation.
   *
   * @default undefined
   */
  sqlLoggingTruncation?: number
  /**
   * Optional additional pg client config, e.g. `keepAlive`, `query_timeout`, `ssl`, and so on.
   */
  additionalPgOptions?: OmitTyped<ClientConfig, 'host' | 'port' | 'user' | 'password' | 'database'>
  events?: {
    onTryMaintenanceDbConnect?: (c: Client, retryIndex: number, message: string) => VoidOrPromiseVoid
    onMaintenanceDbConnect?: (c: Client, retryIndex: number, message: string) => VoidOrPromiseVoid
    onMaintenanceDbConnectFail?: (c: Client, retryIndex: number, e: any, message: string) => VoidOrPromiseVoid
    onMaintenanceDbConnectNumRetryExceeded?: (c: Client, retryIndex: number, message: string) => VoidOrPromiseVoid

    onDetermineIfDbExistsStart?: (c: Client, message: string) => VoidOrPromiseVoid
    onDetermineDbExists?: (c: Client, message: string) => VoidOrPromiseVoid
    onDetermineDbDoesNotExists?: (c: Client, message: string) => VoidOrPromiseVoid

    onTryCreateDb?: (c: Client, message: string) => VoidOrPromiseVoid
    onCreateDb?: (c: Client, message: string) => VoidOrPromiseVoid
    onCreateDbFail?: (c: Client, e: any, message: string) => VoidOrPromiseVoid

    onTryDbConnect?: (c: Client, message: string) => VoidOrPromiseVoid
    onDbConnect?: (c: Client, message: string) => void | VoidOrPromiseVoid
    onDbConnectFail?: (c: Client, retryIndex: number, e: any, message: string) => VoidOrPromiseVoid
    onDbConnectNumRetryExceeded?: (c: Client, retryIndex: number, e: any, message: string) => VoidOrPromiseVoid

    onQuery?: DbServiceOptions['events']['onQuery']
    onQueryError?: DbServiceOptions['events']['onError']
  }
}

export type SimplePg = DbService & {
  client: Client
}

export type DbServiceOptions = {
  client: Client
  sqlLoggingTruncation?: number
  events?: {
    onError?: (queryId: string, message: string, sql: string, parameters?: string[]) => VoidOrPromiseVoid
    onQuery?: (queryId: string, message: string, sql: string, parameters?: string[]) => VoidOrPromiseVoid
  }
}

export type DbService = {
  /**
   * Query function that returns the full `pg.query()` response.
   */
  query: <TRow extends any>(sql: string, parameters?: any[]) => Promise<QueryResult<TRow>>
  /**
   * Query function that determines if any rows were returned.
   */
  queryExists: (sql: string, parameters?: any[]) => Promise<boolean>
  /**
   * Query function that returns the rows returned by the query.
   */
  queryGetRows: <TRow extends any>(sql: string, parameters?: any[]) => Promise<TRow[]>
  /**
   * Query function that returns the first row returned by the query.
   */
  queryGetFirstRow: <TRow extends any>(sql: string, parameters?: any[]) => Promise<TRow>
}
