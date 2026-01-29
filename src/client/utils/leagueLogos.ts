export const LEAGUE_LOGOS: Record<string, string> = {
    // 🇧🇷 Brasil - Estaduais & Nacionais
    'Brazil - Serie A': 'https://upload.wikimedia.org/wikipedia/pt/4/42/Campeonato_Brasileiro_Série_A_logo.png',
    'Brazil - Serie B': 'https://upload.wikimedia.org/wikipedia/pt/f/f4/Campeonato_Brasileiro_Série_B_logo.png',
    'Brazil - Copa do Brasil': 'https://upload.wikimedia.org/wikipedia/pt/e/e7/Copa_do_Brasil_2021.svg',
    'Brazil - Paulista A1': 'https://upload.wikimedia.org/wikipedia/pt/3/36/Campeonato_Paulista_de_Futebol_logo.svg',
    'Brazil - Carioca': 'https://upload.wikimedia.org/wikipedia/commons/e/ed/Campeonato_Carioca_logo.svg',
    'Brazil - Mineiro': 'https://upload.wikimedia.org/wikipedia/commons/6/66/Campeonato_Mineiro_logo.svg',
    'Brazil - Gaucho': 'https://upload.wikimedia.org/wikipedia/pt/7/7e/Campeonato_Gaúcho_logo.svg',
    'Brazil - Paranaense': 'https://upload.wikimedia.org/wikipedia/commons/9/94/Campeonato_Paranaense_logo.svg',
    'Brazil - Baiano': 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Campeonato_Baiano_logo.svg',
    'Brazil - Goiano': 'https://upload.wikimedia.org/wikipedia/commons/3/36/Campeonato_Goiano_logo.svg',
    'Brazil - Pernambucano': 'https://upload.wikimedia.org/wikipedia/commons/2/2a/Campeonato_Pernambucano_logo.svg',
    'Brazil - Cearense': 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Campeonato_Cearense_logo.svg',
    'Brazil - Copa do Nordeste': 'https://upload.wikimedia.org/wikipedia/pt/d/d4/Copa_do_Nordeste_logo.svg',
    'Brazil - Copa Verde': 'https://upload.wikimedia.org/wikipedia/en/e/e8/Copa_Verde_logo.svg',
    'Brazil - Maranhense': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Campeonato_Maranhense_de_Futebol.png/180px-Campeonato_Maranhense_de_Futebol.png',
    'Brazil - Paraibano': 'https://upload.wikimedia.org/wikipedia/pt/e/e3/Campeonato_Paraibano_de_Futebol_logo.png',
    'Brazil - Sul-Mato-Grossense': 'https://upload.wikimedia.org/wikipedia/commons/0/07/Federação_de_Futebol_de_Mato_Grosso_do_Sul.png',
    'Brazil - Campeonato Tocantinense': 'https://upload.wikimedia.org/wikipedia/commons/3/30/Federação_Tocantinense_de_Futebol.png',

    // 🌎 Sul-Americana
    'Copa Libertadores': 'https://upload.wikimedia.org/wikipedia/commons/3/33/Copa_Libertadores_logo.svg',
    'Copa Sudamericana': 'https://upload.wikimedia.org/wikipedia/commons/2/2a/Copa_Sudamericana_logo.svg',

    // 🇪🇺 Europa Top
    'UEFA Champions League': 'https://upload.wikimedia.org/wikipedia/commons/7/72/UEFA_Champions_League_logo_2.svg',
    'UEFA Europa League': 'https://upload.wikimedia.org/wikipedia/commons/2/26/UEFA_Europa_League_logo.svg',
    'England - Premier League': 'https://upload.wikimedia.org/wikipedia/en/f/f2/Premier_League_Logo.svg',
    'Spain - La Liga': 'https://upload.wikimedia.org/wikipedia/commons/9/92/LaLiga_Santander.svg',
    'Italy - Serie A': 'https://upload.wikimedia.org/wikipedia/commons/e/e9/Serie_A_logo_2019.svg',
    'Germany - Bundesliga': 'https://upload.wikimedia.org/wikipedia/en/d/df/Bundesliga_logo_%282017%29.svg',
    'France - Ligue 1': 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Ligue1_Uber_Eats_logo.svg'
}

// 辅助函数：根据联赛名尝试匹配 Logo
export const getLeagueLogo = (leagueName: string) => {
    if (!leagueName) return null
    if (typeof leagueName !== 'string') return null

    // 1. 精确匹配
    if (LEAGUE_LOGOS[leagueName]) return LEAGUE_LOGOS[leagueName]

    // 2. 模糊匹配 Brasil
    if (leagueName.includes('Brazil') || leagueName.includes('Brasil')) {
        return 'https://upload.wikimedia.org/wikipedia/commons/0/05/Flag_of_Brazil.svg' // 没 Logo 就显示巴西国旗
    }

    // 3. 默认通用
    return null
}
