require('dotenv').config();
const express = require('express');
const {Pool} = require('pg');
const path = require('path');

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
        console.error(erro);
        res.status(500).json({
            erro:'Não foi possivel consultar os livros.'
        });
    }

});
app.post('/api/livros', async(req, res) =>{
    const {titulo, autor, ano_publicacao, cor} = req.body ?? {};
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
            `INSERT INTO livros (titulo, autor, ano_publicacao, cor)
            VALUES ($1, $2, $3, $4)
            RETURNING *`,
            [titulo.trim(), autor.trim(), ano, cor]
        );
        res.status(201).json(resultado.rows[0]);
    }catch(erro){
        console.error(erro);
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
        console.error(erro);
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
        console.error(erro);

        res.status(500).json({
            erro: 'Não foi possivel atualizar o livro'
        });
    }
});