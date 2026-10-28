function registrarErro(erro, contexto = {}) {
    console.error({
        data: new Date().toISOString(),
        nivel: 'ERRO',
        ...contexto,
        mensagem: erro instanceof Error ? erro.message : String(erro),
        codigo: erro?.code,
        stack: erro?.stack,
    });
}

module.exports = { registrarErro };
