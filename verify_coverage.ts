import Database from 'better-sqlite3'

const db = new Database('local.sqlite')

// --- MOCK FRONTEND LOGIC (MATCHING V2.2) ---
const cleanTeamName = (name: string) => {
    let cleaned = name
        // 1. Remove Prefixes
        .replace(/^(IF|CA|SE|EC|FC|SC|AC|CD)\s/gi, '')
        // 2. Remove common suffixes
        .replace(/\s(FC|EC|SC|AC|CD|IF|CR|Gremio|Grêmio|Associação|Associacao|Sociedade|S\.E\.|E\.C\.|F\.C\.|United|City|Clube|Club|Futebol|Sports|Esporte|de)\b/gi, '')
        // 3. Remove State Codes
        .replace(/\s(PR|SP|RJ|MG|RS|SC|BA|PE|CE|GO|MT|MS|AL|RN|PB|SE|MA|PI|AC|AM|AP|DF|ES|PA|RO|RR|TO)\b/g, '') 
        // 4. Remove years
        .replace(/[-\s]20\d\d$/g, '') 
        .trim()
    return cleaned
}

const getLeagueLogoMock = (league: string) => {
    const knownLeagues = [
        'Brazil - Serie A', 'Brazil - Serie B', 'Brazil - Paranaense', 
        'Brazil - Carioca', 'Brazil - Paulista A1', 'Brazil - Goiano',
        'Brazil - Copa do Nordeste', 'Copa Libertadores'
    ]
    if (knownLeagues.includes(league)) return true
    if (league.includes('Brazil') || league.includes('Brasil')) return true
    return false
}

try {
    const row = db.prepare("SELECT data FROM sports_cache WHERE key = 'sports_data'").get() as any
    
    if (!row || !row.data) {
        console.log('⚠️  No cached data found in DB. Inserting MOCK data based on user screenshots for testing...')
        const mockData = [
            { sport_title: 'Brazil - Paranaense', home_team: 'Cianorte FC PR', away_team: 'Coritiba FC PR' },
            { sport_title: 'Brazil - Paranaense', home_team: 'IF Sao Joseense PR', away_team: 'Londrina EC PR' },
            { sport_title: 'Brazil - Paranaense', home_team: 'Operario Ferroviario EC PR', away_team: 'Azuriz FC PR' },
            { sport_title: 'Brazil - Paraibano', home_team: 'Sousa EC PB', away_team: 'Botafogo FC PB' },
            { sport_title: 'Brazil - Maranhense', home_team: 'Sampaio Correa FC MA', away_team: 'Maranhao AC' }
        ]
        analyze(mockData)
    } else {
        console.log('✅ Found real data in DB. Analyzing...')
        analyze(JSON.parse(row.data))
    }

} catch (e) {
    console.error(e)
}

function analyze(matches: any[]) {
    const teams = new Set<string>()
    const leagues = new Set<string>()
    
    matches.forEach(m => {
        teams.add(m.home_team)
        teams.add(m.away_team)
        leagues.add(m.sport_title)
    })

    console.log(`\n🔍 Analyzing ${teams.size} Teams & ${leagues.size} Leagues...\n`)

    // 1. Analyze Leagues
    let leagueMisses = 0
    leagues.forEach(l => {
        if (!getLeagueLogoMock(l)) leagueMisses++
    })
    console.log(`> League Score: ${leagues.size - leagueMisses}/${leagues.size}\n`)

    // 2. Analyze Teams
    let teamMisses = 0
    
    // Simulate known keys from teamLogosData.ts
    const knownKeys = [
        'Cianorte', 'Coritiba', 'Londrina', 'Azuriz', 'Operario Ferroviario', 'Operario-PR', 
        'Sao Joseense', 'Maringa', 'Cascavel', 'Athletico Paranaense', 'Flamengo', 'Palmeiras',
        'Sousa', 'Botafogo-PB', 'Botafogo', 'Sampaio Correa', 'Maranhao', 'Tombense', 'Sport'
    ]
    
    teams.forEach(originalName => {
        const cleaned = cleanTeamName(originalName)
        const match = knownKeys.find(k => k === cleaned || k === originalName)
        
        if (!match) {
            console.log(`❌ [FAIL] "${originalName}" -> Cleaned: "${cleaned}"`)
            teamMisses++
        } else {
            console.log(`✅ [HIT]  "${originalName}" -> "${match}"`)
        }
    })
    console.log(`> Team Score: ${teams.size - teamMisses}/${teams.size} (${((teams.size - teamMisses)/teams.size*100).toFixed(0)}%)`)
}
