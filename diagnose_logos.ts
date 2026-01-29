import Database from 'better-sqlite3'

const db = new Database('local.sqlite')

try {
    // Read the cached sports data
    const row = db.prepare("SELECT data FROM sports_cache WHERE key = 'sports_data'").get() as any
    if (!row || !row.data) {
        console.log('❌ 数据库中没有缓存的比赛数据。请先等待后台 Cron Job 运行几次抓取数据。')
        process.exit(0)
    }

    const matches = JSON.parse(row.data)
    const teams = new Set<string>()
    const leagues = new Set<string>()

    matches.forEach((m: any) => {
        teams.add(m.home_team)
        teams.add(m.away_team)
        leagues.add(m.sport_title)
    })

    console.log(`📊 统计: 共有 ${leagues.size} 个联赛，${teams.size} 支球队。\n`)

    console.log('--- 🏆 联赛列表 (API 原名) ---')
    Array.from(leagues).forEach(l => console.log(`[League] ${l}`))

    console.log('\n--- ⚽ 球队列表 (API 原名) -> 清洗后预览 ---')
    
    // Simulate Cleaning Logic
    const cleanName = (name: string) => {
        return name
            .replace(/\s(FC|EC|SC|AC|CD|United|City|Clube|Club|Futebol|Sports|Esporte)\b/gi, '')
            .replace(/\s(PR|SP|RJ|MG|RS|SC|BA|PE|CE|GO|MT|MS|AL|RN|PB|SE|MA|PI|AC|AM|AP|DF|ES|PA|RO|RR|TO)\b/g, '')
            .replace(/[-\s]20\d\d$/g, '')
            .trim()
    }

    let brazilTeams: string[] = []
    let otherTeams: string[] = []

    Array.from(teams).forEach((name: string) => {
        const cleaned = cleanName(name)
        // Simple heuristic to detect Brazil teams (based on League usually, but here based on name style for demo)
        // Or better, filter by specific leagues if possible.
        // For now just list them.
        console.log(`"${name}" => "${cleaned}"`)
    })

} catch (e) {
    console.error(e)
}
