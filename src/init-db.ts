import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'

import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const db = new Database('local.sqlite')

const migrationsDir = path.join(__dirname, '../migrations')
const files = fs.readdirSync(migrationsDir).sort()

console.log('Applying migrations...')
for (const file of files) {
    if (file.endsWith('.sql')) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8')
        console.log(`- ${file}`)
        try {
            db.exec(sql)
        } catch (e: any) {
            if (e.message && (e.message.includes('duplicate column') || e.message.includes('already exists'))) {
                console.log(`  Skipping ${file} (already applied)`)
            } else {
                throw e
            }
        }
    }
}
console.log('Done.')
