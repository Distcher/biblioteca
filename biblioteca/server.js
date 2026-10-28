require('dotenv').config();
const express = require('express');
const {Pool} = require('pg');
const path = require('path');
const { registrarErro } = require('./logger');

const app = express();
const pool = new Pool();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/livros', async(req, res) =>{
    const ordenacoes = new Map([
        ['recentes', 'id DESC'],
        ['antigos', 'id ASC'],
        ['titulo', 'LOWER(titulo) ASC, id ASC'],
        ['autor', 'LOWER(autor) ASC, LOWER(titulo) ASC, id ASC'],
        ['publicacao_recente', 'ano_publicacao DESC NULLS LAST, id DESC'],
        ['publicacao_antiga','ano_publicacao ASC NULLS LAST, id ASC'],
    ]);
    const ordem = ordenacoes.get(req.query.ordem)
        ?? ordenacoes.get('recentes');
    
    try{
        const resultado = await pool.query(
            `SELECT * FROM livros ORDER BY ${ordem}`
        );

    res.json(resultado.rows);
    } catch(erro){
        registrarErro(erro, { operacao: 'Consultar livros', metodo: req.method, rota: req.path });
        res.status(500).json({
            erro:'Não foi possivel consultar os livros.'
        });
    }

});
app.get('/api/catalogo', async(req,res)=> { 
    const titulo = typeof
req.query.titulo ==='string'
        ? req.query.titulo.trim()
        :'';

    if(titulo.length < 2 || titulo.length > 200){
        return res.status(400).json({
            erro: 'informe um titulo entre 2 e 200 caracteres.'
        });
    }
    const parametros = new URLSearchParams({
        title:titulo,
        fields:'key,title,author_name,first_publish_year,cover_i', limit:'8', lang:'pt'
    });
    try{
        const resposta = await fetch(
            `https://openlibrary.org/search.json?${parametros}`, {
                headers:{
                    Accept: 'application/json'
                },
                signal:AbortSignal.timeout(10000)
            }
        );
        if(!resposta.ok){
            throw new Error(
                `O catálogo respondeu com status ${resposta.status}.`
            );
        }
        const dados = await resposta.json();
        if(!Array.isArray(dados.docs)){
            throw new Error('Resposta inesperada do catálogo.');
        }
        const resultado = dados.docs.map((livro)=>({
            origem:'openlibrary',
            id_externo: livro.key,
            titulo:livro.title??'',
            autor: Array.isArray(livro.author_name)
            ? livro.author_name.join(', ')
            : '',
            ano_publicacao:livro.first_publish_year ?? null,
            capa_url: livro.cover_i
            ?
            `https://covers.openlibrary.org/b/id/${livro.cover_i}-M.jpg?default=false`
            : null
        }));
        res.json(resultado);
    } catch(erro){
        console.error('Erro na busca do catálogo:', erro.message);
        const expirou = erro.name === 'TimeoutError';
        res.status(expirou? 504: 502).json({
            erro: expirou
            ?'O catalogo demorou para responder. Tente novamente.'
            :'Não foi possivel consultar o catálogo agora.'
        });
    }
});
app.post('/api/livros', async(req, res) =>{
    const{
        titulo,
        autor,
        ano_publicacao,
        cor,
        capa_url
    } = req.body ?? {};
    if(
        typeof titulo !== 'string' || 
        typeof autor !== 'string' ||
        !titulo.trim() ||
        !autor.trim() ||
        titulo.trim().length > 200 ||
        autor.trim().length > 150
    ){
        return res.status(400).json({ erro : 'Informe titulo e autor validos.'
        });
    }
    if(
        typeof cor !=='string' ||
        !/^#[0-9A-Fa-f]{6}$/.test(cor)
    ){return res.status(400).json({
        erro:'Escolha uma cor válida para a capa'
    });
}
const capaUrl= capa_url === '' || capa_url == null
    ? null
    : capa_url;
    if (capaUrl !== null &&(
        typeof capaUrl !== 'string' || !/^https:\/\/covers\.openlibrary\.org\/b\/id\/[0-9]+-M\.jpg\?default=false$/.test(capaUrl)
    )){
        return res.status(400).json({
            erro: 'O endereço da capa é invalido.'
        });
    }
    const ano = ano_publicacao === '' || ano_publicacao == null
        ? null
        : Number(ano_publicacao);
    if (
        ano !== null && (!Number.isInteger(ano) || ano<1 || ano>9999)
    ){
        return res.status(400).json({
            erro: "informe um ano entre 1 e 9999."
        });
    }
    try{
        const resultado = await pool.query(
            `INSERT INTO livros (titulo, autor, ano_publicacao, cor, capa_url)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *`,
            [titulo.trim(), autor.trim(), ano, cor, capaUrl]
        );
        res.status(201).json(resultado.rows[0]);
    }catch(erro){
        registrarErro(erro, { operacao: 'Cadastrar livro', metodo: req.method, rota: req.path });
        res.status(500).json({
            erro: "Não foi possivel cadastrar o livro."
        });
    }
})

app.delete('/api/livros/:id', async(req,res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <1 || id > 2147483647){
        return res.status(400).json({
            erro: 'ID inválido'
        });
    }
    try{
        const resultado = await pool.query(
            'DELETE FROM livros WHERE id = $1 RETURNING id',
            [id]
        );
        if (resultado.rowCount === 0){
            return res.status(404).json({
                erro: 'Livro não encontrado.'
            });
        }
        res.json({mensagem: 'Livro Excluido.'});
    }catch(erro){
        registrarErro(erro, { operacao: 'Excluir livro', metodo: req.method, rota: req.path });
        res.status(500).json({
            erro: 'Não foi possível excluir o livro.'
        });
    }
})
app.listen(process.env.PORT || 3000, () => {
    console.log('Servidor disponível em http://localhost:3000');
});

app.patch('/api/livros/:id/lido', async(req, res) =>{
    const id =Number(req.params.id);
    if(!Number.isInteger(id) || id<1 || id>2147483647){
        return res.status(400).json({
            erro:'ID inválido.'
        });
    }
    try {
        const resultado = await pool.query(
            'UPDATE livros SET lido = TRUE WHERE id = $1 RETURNING *',
            [id]
        );
        if (resultado.rowCount === 0){
            return res.status(404).json({
                erro: 'Livro não encontrado.'
            });
        }
        res.json(resultado.rows[0]);
    } catch(erro){
        registrarErro(erro, { operacao: 'Marcar livro como lido', metodo: req.method, rota: req.path });

        res.status(500).json({
            erro: 'Não foi possivel atualizar o livro'
        });
    }
});
