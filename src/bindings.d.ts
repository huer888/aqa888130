export type Bindings = {
  DB: D1Database
  KV: KVNamespace
  R2: R2Bucket
  JWT_SECRET: string
  ODDS_API_KEY: string
  VQPAY_APP_ID?: string
  VQPAY_SECRET_PAY?: string
  VQPAY_SECRET_SETTLE?: string
  VQPAY_API_URL?: string
  ASSETS: Fetcher
}
