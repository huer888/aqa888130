
// Helper to fetch and format templates
export async function getTemplate(db: any, key: string, params: Record<string, any>, userId?: number) {
    // 1. Fetch Template
    const res = await db.prepare('SELECT value FROM system_config WHERE key = ?').bind(key).first();
    let tpl = res?.value || '';
    
    // Fallbacks (Updated for Brazil Market Hype & Fission)
    if (!tpl) {
        // 1. New Bet - Create FOMO
        if (key === 'tpl_bet') tpl = `🎰 <b>NOVA APOSTA!</b>\n\n👤 <b>Membro:</b> {mention}\n🆔 <b>UID:</b> <code>{uid}</code>\n\n💸 <b>Valor:</b> R$ {amount}\n🎯 <b>Potencial:</b> R$ {potential}\n\n🔥 <i>O mercado está aquecido! Faça sua análise!</i>`;
        
        // 2. Win - Celebrate Profit ("Forra")
        if (key === 'tpl_win') tpl = `🟢 <b>GREEN! VITÓRIA!</b>\n\n👤 <b>Membro:</b> {mention}\n🆔 <b>UID:</b> <code>{uid}</code>\n\n💰 <b>LUCRO:</b> <b>R$ {profit}</b>\n📈 <b>Odd:</b> {odds}x\n\n🤑 <i>Lucro no bolso! Quem será o próximo a forrar?</i>`;
        
        // 3. Deposit - Multiplication Mindset
        if (key === 'tpl_deposit') tpl = `💎 <b>DEPÓSITO CONFIRMADO!</b>\n\n👤 <b>Membro:</b> {mention}\n🆔 <b>UID:</b> <code>{uid}</code>\n\n💵 <b>Valor:</b> <b>R$ {amount}</b>\n✅ <b>Status:</b> Banca Carregada!\n\n🚀 <i>Preparado para multiplicar! Boa sorte!</i>`;
        
        // 4. Withdraw - Social Proof (Real Money)
        if (key === 'tpl_withdraw') tpl = `🏦 <b>SAQUE REALIZADO!</b>\n\n👤 <b>Membro:</b> {mention}\n🆔 <b>UID:</b> <code>{uid}</code>\n\n💸 <b>Recebeu:</b> <b>R$ {amount}</b>\n⚡ <b>Via:</b> PIX/USDT\n\n🏆 <i>Dinheiro real na conta! O resultado vem!</i>`;

        // 5. Commission (Agent) - Passive Income Hype
        if (key === 'tpl_commission') tpl = `💰 <b>COMISSÃO RECEBIDA!</b>\n\n👤 <b>Líder:</b> {mention}\n🤝 <b>Origem:</b> Rede / Sub-Agentes\n\n🆔 <b>Fonte:</b> <code>{source_uid}</code>\n💵 <b>Ganho:</b> <b>R$ {amount}</b>\n\n💎 <i>Sua rede trabalha por você! Renda 100% passiva.</i>`;
        
        // 6. Downline Activity - Volume/Turnover focus
        if (key === 'tpl_downline_bet') tpl = `📊 <b>MOVIMENTAÇÃO NA REDE!</b>\n\n👤 <b>Líder:</b> {mention}\n👇 <b>Status da Equipe:</b>\n\n🆔 <b>Membro:</b> <code>{source_uid}</code>\n💸 <b>Gerou Volume:</b> R$ {amount}\n\n🚀 <i>Volume gera lucro! Continue expandindo seu time.</i>`;
    }

    // 2. Enrich with User Stats if userId provided
    if (userId) {
        // Query Lifetime Stats
        const stats = await db.prepare(`
            SELECT 
                (SELECT COUNT(*) FROM users WHERE parent_id = ?) as total_downline,
                (SELECT COALESCE(SUM(amount),0) FROM transactions WHERE user_id = ? AND type = 'deposit' AND status = 'completed') as total_deposit,
                (SELECT COALESCE(SUM(amount),0) FROM transactions WHERE user_id = ? AND type = 'withdraw' AND status = 'completed') as total_withdraw,
                (SELECT COALESCE(SUM(amount),0) FROM transactions WHERE user_id = ? AND type = 'commission' AND status = 'completed') as total_commission,
                (SELECT COALESCE(SUM(t.amount),0) FROM transactions t JOIN users u ON t.user_id = u.id WHERE u.parent_id = ? AND t.type = 'deposit' AND t.status = 'completed') as team_deposit
        `).bind(userId, userId, userId, userId, userId).first();

        if (stats) {
            params['total_downline'] = stats.total_downline;
            params['total_deposit'] = Number(stats.total_deposit).toFixed(2);
            params['total_withdraw'] = Number(stats.total_withdraw).toFixed(2);
            params['total_commission'] = Number(stats.total_commission).toFixed(2);
            params['team_deposit'] = Number(stats.team_deposit).toFixed(2);
            // Aliases for convenience
            params['member_total_downline'] = stats.total_downline;
        }
    }

    // 3. Replace variables
    for (const [k, v] of Object.entries(params)) {
        tpl = tpl.replace(new RegExp(`{${k}}`, 'g'), v);
    }
    
    return tpl;
}
