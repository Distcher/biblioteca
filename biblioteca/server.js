require('dotenv').config();
const express = require('express');
const {Pool} = require('pg');
const path = require('path');

const app = express();
const pool = new Pool();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/livros', async(requestAnimationFrame, res) =>{
    try{
        const resultado = await pool.query(
            'SELECT * FROM livros ORDER BY id'
        );
        res.json(resultado.rows);
    }catch(erro){
        console.error(erro);
        res.status(500).json({
            erro: 'Não foi possível consultar os livros.'
        });
    }
});

app.listen(process.env.PORT || 3000, () => {
    console.log('Servidor disponível em http://localhost:3000');
});
