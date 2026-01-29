import Database from 'better-sqlite3'

const db = new Database('local.sqlite')

try {
    const row = db.prepare("SELECT data FROM sports_cache WHERE key = 'sports_data'").get() as any
    if (!row) {
        console.log('No data in cache')
    } else {
        const data = JSON.parse(row.data)
        console.log('Total matches:', data.length)
        console.log('First 5 match titles:')
        data.slice(0, 5).forEach((m: any) => console.log('Title type:', typeof m.sport_title, 'Value:', m.sport_title))
        
        // Check for suspicious values
        const bad = data.filter((m: any) => m.sport_title === '[object Object]' || typeof m.sport_title === 'object')
        if (bad.length > 0) {
            console.log('⚠️ FOUND BAD DATA:', bad.length, 'records have corrupted titles!')
            console.log('Sample:', bad[0])
        } else {
            console.log('✅ Titles look normal (no [object Object])')
        }
    }
} catch (e) {
    console.error(e)
}
