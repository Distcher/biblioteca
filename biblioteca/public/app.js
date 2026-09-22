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