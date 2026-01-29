import Database from 'better-sqlite3'

// --- MOCK FRONTEND LOGIC (MATCHING V2.3) ---
const cleanTeamName = (name: string) => {
    let cleaned = name
        .replace(/^(IF|CA|SE|EC|FC|SC|AC|CD)\s/gi, '')
        .replace(/\s(FC|EC|SC|AC|CD|IF|CR|Gremio|Grêmio|Associação|Associacao|Sociedade|S\.E\.|E\.C\.|F\.C\.|United|City|Clube|Club|Futebol|Sports|Esporte|de)\b/gi, '')
        // 3. Remove State Codes (Space OR Hyphen) -> The FIX
        .replace(/[\s-](PR|SP|RJ|MG|RS|SC|BA|PE|CE|GO|MT|MS|AL|RN|PB|SE|MA|PI|AC|AM|AP|DF|ES|PA|RO|RR|TO)\b/g, '') 
        .replace(/[-\s]20\d\d$/g, '') 
        .trim()
    return cleaned
}

const testCases = [
    "Sampaio Correa-RJ", 
    "Boavista-RJ",
    "Sampaio Correa",
    "Boavista",
    "Cianorte FC PR",
    "Londrina-PR"
]

console.log("--- VERIFYING HYPHEN FIX ---")
testCases.forEach(name => {
    const cleaned = cleanTeamName(name)
    console.log(`"${name}" -> "${cleaned}"`)
})
