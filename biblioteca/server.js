require('dotenv').config();
const express = require('express');
const {Pool} = require('pg');
const path = require('path');
const { error } = require('console');

const app = express();
const pool = new Pool();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/livros', async(requestAnimationFrame, res) =>{
    const ordenacoes = new Map([
        ['recentes', 'id DESC'],
        ['antigos', 'id ASC'],
        ['titulo', 'LOWER(titulo) ASC, id ASC'],
        ['autor', 'LOWER(autor) ASC, LOWER(titulo) ASC, id ASC'],
        ['publicacao_recente', 'ano_publicacao ASC NULLS LAST, id DESC'],
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
        console.error(erro);
        res.status(500).json({
            erro:'Não foi possivel consultar os livros.'
        });
    }

});
app.post('/api/livros', async(req, res) =>{
    const {titulo, autor, ano_publicacao} = req.body ?? {};
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
            `INSERT INTO livros (titulo, autor, ano_publicacao)
            VALUES ($1, $2, $3)
            RETURNING *`,
            [titulo.trim(), autor.trim(), ano]
        );
        res.status(201).json(resultado.rows[0]);
    }catch(erro){
        console.error(erro);
        res.status(500).json({
            erro: "Não foi possivel cadastrar o livro."
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
        res.status(500).json({
            erro: 'Não foi possivel atualizar o livro'
        });
    }
});