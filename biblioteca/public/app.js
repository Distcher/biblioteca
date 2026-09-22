const lista = document.querySelector('#lista-livros');
const mensagem = document.querySelector('#mensagem');

async function carregarLivros() {
    try{
        const resposta = await fetch('/api/livros');

        if (!resposta.ok){
            throw new Error ('Não foi possivel carregar os livros.');
        }
        const livros = await resposta.json();
        lista.replaceChildren();

        for(const livro of livros){
            const item = document.createElement('li');
            const status = livro.lido ? 'lido' : 'Não lido';

            item.textContent = 
                `${livro.titulo} - ${livro.autor} (${status})`;
            lista.appendChild(item);
        }
        mensagem.textContent = livros.length === 0
            ?'Você ainda não cadastrou livros.'
            :`${livros.length} livro(s) na biblioteca.`;
    } catch(erro){
        mensagem.textContent = 'Erro ao carregar a biblioteca. ';
        console.error(erro);
    }
    
}
carregarLivros();
const formulario = document.querySelector('#form-livro');
const botaodeCadastrar =
formulario.querySelector('button[type="submit"]');

formulario.addEventListener('submit', async(evento) =>{
    evento.preventDefault();
    botaodeCadastrar.disabled = true;
    mensagem.textContent = 'Cadastrando...';

    const livro ={
        titulo: document.querySelector('#titulo').value,
        autor: document.querySelector('#autor').value,
        ano_publicacao:document.querySelector('#ano').value
    };
    try{
        const resposta = await fetch('/api/livros',{
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(livro)
        });
        const dados = await resposta.json();

        if(!resposta.ok){
            throw new Error(dados.erro || 'Erro ao cadastrar livro');
        }
        formulario.reset()
        await carregarLivros();
    }catch(erro){
        mensagem.textContent = erro.message;
    }finally{
        botaodeCadastrar.disabled = false
    }
})