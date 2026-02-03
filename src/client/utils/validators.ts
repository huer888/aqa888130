export function isValidCPF(cpf: string): boolean {
    if (typeof cpf !== 'string') return false;
    
    // Remove non-digits
    cpf = cpf.replace(/[^\d]+/g, '');
    
    // Must be 11 digits
    if (cpf.length !== 11) return false;
    
    // Eliminate known invalid CPFs (all digits equal)
    if (/^(\d)\1+$/.test(cpf)) return false;
    
    // Validate 1st Check Digit
    let add = 0;
    for (let i = 0; i < 9; i++) add += parseInt(cpf.charAt(i)) * (10 - i);
    let rev = 11 - (add % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(cpf.charAt(9))) return false;
    
    // Validate 2nd Check Digit
    add = 0;
    for (let i = 0; i < 10; i++) add += parseInt(cpf.charAt(i)) * (11 - i);
    rev = 11 - (add % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(cpf.charAt(10))) return false;
    
    return true;
}