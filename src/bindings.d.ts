export type Bindings = {
  DB: D1Database
  KV: KVNamespace
  R2: R2Bucket
  JWT_SECRET: string
  ODDS_API_KEY: string
  ASSETS: Fetcher
}
