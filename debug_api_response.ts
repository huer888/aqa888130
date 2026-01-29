import { fetch } from 'undici'

async function check() {
    try {
        console.log('Fetching from http://localhost:3000/api/sports/events...')
        const res = await fetch('http://localhost:3000/api/sports/events')
        const data = await res.json()
        
        if (!Array.isArray(data)) {
            console.error('❌ Response is not an array:', data)
            return
        }

        if (data.length === 0) {
            console.log('⚠️ Array is empty. No leagues found.')
            return
        }

        console.log(`✅ Found ${data.length} leagues.`)
        
        const firstLeague = data[0]
        console.log('--- First League Structure ---')
        console.log('Name:', firstLeague.name || firstLeague.sport_title || firstLeague.title)
        console.log('Events type:', Array.isArray(firstLeague.events) ? 'Array' : typeof firstLeague.events)
        
        if (firstLeague.events && firstLeague.events.length > 0) {
            const firstEvent = firstLeague.events[0]
            console.log('\n--- First Event Structure ---')
            console.log(JSON.stringify(firstEvent, null, 2))
            
            // Check specific fields frontend might be looking for
            console.log('\n--- Key Fields Check ---')
            console.log('Has "bookmakers"?', !!firstEvent.bookmakers)
            console.log('Has "outcomes"?', !!firstEvent.outcomes)
        } else {
            console.log('⚠️ First league has no events.')
        }

    } catch (e) {
        console.error('Fetch failed:', e)
    }
}

check()
