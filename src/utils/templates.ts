
// Helper to fetch and format templates
export async function getTemplate(db: any, key: string, params: Record<string, any>, userId?: number) {
    // 1. Fetch Template
    const res = await db.prepare('SELECT value FROM system_config WHERE key = ?').bind(key).first();
    let tpl = res?.value || '';
    
    // Fallbacks (Updated to new Leader/Member format)
    if (!tpl) {
        if (key === 'tpl_bet') tpl = `🎰 <b>NOVA APOSTA!</b>\n\n🎉 <b>Parabéns membro {mention}</b>\n🆔 <b>UID:</b> <code>{uid}</code>\n\n💸 <b>Apostou:</b> R$ {amount}\n🎯 <b>Potencial:</b> R$ {potential}\n\n🚀 <i>A sorte favorece os audazes!</i>`;
        
        if (key === 'tpl_win') tpl = `🟢 <b>VITÓRIA (WIN)!</b>\n\n🎉 <b>Parabéns membro {mention}</b>\n🆔 <b>UID:</b> <code>{uid}</code>\n\n💰 <b>Ganhou:</b> <b>R$ {profit}</b>\n📈 <b>Odd:</b> {odds}x\n\n🚀 <i>O método é infalível! Quem é o próximo?</i>`;
        
        if (key === 'tpl_deposit') tpl = `💎 <b>DEPÓSITO REALIZADO!</b>\n\n🎉 <b>Parabéns membro {mention}</b>\n🆔 <b>UID:</b> <code>{uid}</code>\n\n💵 <b>Valor:</b> <b>R$ {amount}</b>\n✅ <b>Status:</b> Confirmado\n\n🚀 <i>Munição carregada! Bora buscar o lucro!</i>`;
        
        if (key === 'tpl_withdraw') tpl = `🏦 <b>SAQUE APROVADO!</b>\n\n🎉 <b>Parabéns membro {mention}</b>\n🆔 <b>UID:</b> <code>{uid}</code>\n\n💰 <b>Recebeu:</b> <b>R$ {amount}</b>\n⚡ <b>Processamento:</b> Concluído\n\n🚀 <i>Dinheiro na conta! Parabéns pelo resultado!</i>`;

        // Downline Fallbacks
        if (key === 'tpl_commission') tpl = `💰 <b>BÔNUS DE EQUIPE!</b>\n\n🎉 <b>Parabéns membro {mention}</b>\n🤝 <b>Você lucrou com sua rede!</b>\n\n🆔 <b>Fonte (Sub):</b> <code>{source_uid}</code>\n💵 <b>Sua Comissão:</b> <b>R$ {amount}</b>\n\n🚀 <i>Isso é renda passiva! Você dorme e o dinheiro cai!</i>`;
        
        if (key === 'tpl_downline_bet') tpl = `🎰 <b>AÇÃO NA EQUIPE!</b>\n\n🎉 <b>Parabéns membro {mention}</b>\n👇 <b>Sua rede está ativa!</b>\n\n🆔 <b>Fonte (Sub):</b> <code>{source_uid}</code>\n💸 <b>Apostou:</b> R$ {amount}\n\n🚀 <i>Quanto maior a equipe, maior o lucro!</i>`;
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
