// Helper to check match results from API
async function checkMatchResult(apiKey: string, eventId: string): Promise<string | null> {
    try {
        const res = await fetch(`https://api.oddspapi.io/v4/scores?apiKey=${apiKey}&sportId=10&daysFrom=3`)
        // Standard score logic usually requires specific event lookup or parsing 'completed' events.
        // For MVP/Sandbox: Since we can't wait for real matches to end in minutes, 
        // we will MOCK the result logic here for demonstration if it's a test event,
        // or check real API if available.
        // REAL LOGIC:
        // const data = await res.json()
        // const match = data.find(m => m.id === eventId && m.completed)
        // if(match) return match.scores.home > match.scores.away ? 'Home' : ...
        
        return null // No result yet
    } catch(e) { return null }
}
