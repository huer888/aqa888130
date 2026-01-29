// Brazilian Serie A (Brasileirão) Team Logos
// Source: Wikimedia Commons / Wikipedia (Public Domain / Fair Use)
// These URLs are stable and commonly used for this purpose.

export const TEAM_LOGOS: Record<string, string> = {
  // Common names in English/Portuguese from Odds API
  'Flamengo': 'https://upload.wikimedia.org/wikipedia/commons/2/2e/Flamengo_braz_logo.svg',
  'Palmeiras': 'https://upload.wikimedia.org/wikipedia/commons/1/10/Palmeiras_logo.svg',
  'São Paulo': 'https://upload.wikimedia.org/wikipedia/commons/6/6f/Brasao_do_Sao_Paulo_Futebol_Clube.svg',
  'Sao Paulo': 'https://upload.wikimedia.org/wikipedia/commons/6/6f/Brasao_do_Sao_Paulo_Futebol_Clube.svg',
  'Corinthians': 'https://upload.wikimedia.org/wikipedia/pt/b/b4/Corinthians_simbolo.png',
  'Fluminense': 'https://upload.wikimedia.org/wikipedia/commons/a/ad/Fluminense_FC_escudo.png',
  'Botafogo': 'https://upload.wikimedia.org/wikipedia/commons/c/cb/Botafogo_de_Futebol_e_Regatas_logo.svg',
  'Vasco da Gama': 'https://upload.wikimedia.org/wikipedia/en/6/6e/Vasco_da_Gama_logo.svg',
  'Grêmio': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Gremio_logo.svg/100px-Gremio_logo.svg.png',
  'Gremio': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Gremio_logo.svg/100px-Gremio_logo.svg.png',
  'Internacional': 'https://upload.wikimedia.org/wikipedia/commons/f/f1/Escudo_do_Sport_Club_Internacional.svg',
  'Atlético Mineiro': 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Atletico_mineiro_galo.png',
  'Atletico Mineiro': 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Atletico_mineiro_galo.png',
  'Cruzeiro': 'https://upload.wikimedia.org/wikipedia/commons/b/b8/Cruzeiro_Esporte_Clube_%28logo%29.svg',
  'Santos': 'https://upload.wikimedia.org/wikipedia/commons/3/35/Santos_logo.svg',
  'Bahia': 'https://upload.wikimedia.org/wikipedia/en/2/2c/Esporte_Clube_Bahia_logo.svg',
  'Fortaleza': 'https://upload.wikimedia.org/wikipedia/commons/4/42/Fortaleza_Esporte_Clube_logo.svg',
  'Athletico Paranaense': 'https://upload.wikimedia.org/wikipedia/commons/b/b3/CA_Paranaense.svg',
  'Atletico Paranaense': 'https://upload.wikimedia.org/wikipedia/commons/b/b3/CA_Paranaense.svg',
  'Red Bull Bragantino': 'https://upload.wikimedia.org/wikipedia/en/9/9e/Red_Bull_Bragantino_logo.svg',
  'Cuiabá': 'https://upload.wikimedia.org/wikipedia/en/0/05/Cuiab%C3%A1_Esporte_Clube_logo.svg',
  'Cuiaba': 'https://upload.wikimedia.org/wikipedia/en/0/05/Cuiab%C3%A1_Esporte_Clube_logo.svg',
  'Goiás': 'https://upload.wikimedia.org/wikipedia/commons/4/43/Goi%C3%A1s_Esporte_Clube_logo.svg',
  'Goias': 'https://upload.wikimedia.org/wikipedia/commons/4/43/Goi%C3%A1s_Esporte_Clube_logo.svg',
  'Coritiba': 'https://upload.wikimedia.org/wikipedia/commons/f/fe/Coritiba_FBC_2024.svg',
  'América Mineiro': 'https://upload.wikimedia.org/wikipedia/commons/a/ac/Am%C3%A9rica_Mineiro_logo.svg',
  'America Mineiro': 'https://upload.wikimedia.org/wikipedia/commons/a/ac/Am%C3%A9rica_Mineiro_logo.svg',
  'Vitória': 'https://upload.wikimedia.org/wikipedia/en/7/71/Esporte_Clube_Vit%C3%B3ria_logo.svg',
  'Vitoria': 'https://upload.wikimedia.org/wikipedia/en/7/71/Esporte_Clube_Vit%C3%B3ria_logo.svg',
  'Juventude': 'https://upload.wikimedia.org/wikipedia/en/6/6a/Esporte_Clube_Juventude_logo.svg',
  'Criciúma': 'https://upload.wikimedia.org/wikipedia/commons/b/b5/Crici%C3%A9ma_E.C._logo.svg',
  'Criciuma': 'https://upload.wikimedia.org/wikipedia/commons/b/b5/Crici%C3%A9ma_E.C._logo.svg',
}

export function getTeamLogo(name: string): string | null {
  // Direct match
  if (TEAM_LOGOS[name]) return TEAM_LOGOS[name]
  
  // Partial match / Case insensitive
  const key = Object.keys(TEAM_LOGOS).find(k => k.toLowerCase() === name.toLowerCase())
  if (key) return TEAM_LOGOS[key]

  return null
}
