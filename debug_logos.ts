import { TEAM_LOGOS } from './src/client/utils/teamLogosData'

const testCases = [
    "Sampaio Correa-RJ", // The key in our DB for the Rio version
    "Sampaio Correa",    // What might be coming from API
    "Sampaio Correa FC MA", // The Maranhão team (also exists)
    "Boavista-RJ",       // The key in our DB
    "Boavista SC",       // What API likely sends
    "Boavista"           // Cleaned name
]

console.log("--- DEBUGGING TEAM LOGO MATCHING ---")

testCases.forEach(name => {
    // Mimic the cleaning logic from TeamLogo.tsx V2.2
    let cleaned = name
        .replace(/^(IF|CA|SE|EC|FC|SC|AC|CD)\s/gi, '')
        .replace(/\s(FC|EC|SC|AC|CD|IF|CR|Gremio|Grêmio|Associação|Associacao|Sociedade|S\.E\.|E\.C\.|F\.C\.|United|City|Clube|Club|Futebol|Sports|Esporte|de)\b/gi, '')
        .replace(/\s(PR|SP|RJ|MG|RS|SC|BA|PE|CE|GO|MT|MS|AL|RN|PB|SE|MA|PI|AC|AM|AP|DF|ES|PA|RO|RR|TO)\b/g, '') 
        .replace(/[-\s]20\d\d$/g, '') 
        .trim()

    console.log(`Original: "${name}"`)
    console.log(`Cleaned:  "${cleaned}"`)
    
    // Check match
    const directMatch = TEAM_LOGOS[name] ? "✅ YES" : "❌ NO"
    const cleanMatch = TEAM_LOGOS[cleaned] ? "✅ YES" : "❌ NO"
    
    console.log(`Direct Match: ${directMatch}`)
    console.log(`Cleaned Match: ${cleanMatch}`)
    console.log('---')
})
