// Integration tests run against a dedicated database so a failed isolation test
// can never leave residue in the dev data — and so `payload.delete` sweeps in
// beforeAll are safe to run unconditionally.
import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env' })
loadEnv({ path: '.env.test', override: true })
