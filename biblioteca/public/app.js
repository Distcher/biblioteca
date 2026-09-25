const lista = document.querySelector('#lista-livros');
const mensagem = document.querySelector('#mensagem');
const ordenacao = document.querySelector('#ordenacao')
const detalhesLivro = document.querySelector('#detalhes-livro');
const detalhesTitulo = document.querySelector('#detalhes-titulo')
const detalhesAutor = document.querySelector('#detalhes-autor')
const detalhesAno = document.querySelector('#detalhes-ano')
const detalhesStatus = document.querySelector('#detalhes-status');

function abrirDetalhes(livro){
    detalhesTitulo.textContent = livro.titulo;
    detalhesAutor.textContent = livro.autor; 
    detalhesAno.textContent = livro.ano_publicacao ?? 'Não informado';
    detalhesStatus.textContent = livro.lido ? 'lido' : 'Quero Ler';       

    detalhesLivro.showModal();
}
function escolherCorTexto(cor){
    const componentes = [
        cor.slice(1, 3),
        cor.slice(3,5),
        cor.slice(5,7)
    ].map((hex)=>{
        const valor = parseInt(hex, 16)/255;
        return valor <= 0.0405
        ?valor/ 12.92
        :((valor +0.055) / 1.055)**2.4;
    });
    const [r,g,b]=componentes;
    const luminosidade = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    const contrastePreto = (luminosidade +0.05)/0.05;
    const contrasteBranco = 1.05 / (luminosidade+ 0.05);
    
    return contrastePreto >= contrasteBranco ? '#000000' : '#ffffff';
}
async function carregarLivros() {
    try{
        const parametros = new URLSearchParams({
            ordem: ordenacao.value
        });
        const resposta = await fetch(`/api/livros?${parametros}`);

        if (!resposta.ok){
            throw new Error ('Não foi possivel carregar os livros.');
        }
        const livros = await resposta.json();
        lista.replaceChildren();

        for(const livro of livros){
            const item = document.createElement('li');
            item.className = 'livro-item';
            const cores = [
                '#765044','#9370DB',
                '#456455','#FF6347',
                '#425b76','#87CEFA',
                '#80556C','#32CD32',
                '#89652D','#000000',
                '#AD0042','#2f4f4f',
                '#E6C972','#ffedf5',
            ];
            const cor = livro.cor ?? cores[Number(livro.id) % cores.length];

            const capa = document.createElement('button');
            capa.type= 'button'
            capa.className ='livro-capa';
            capa.style.setProperty('--cor-livro', cor);
            
            capa.style.color = escolherCorTexto(cor);
            capa.setAttribute('aria-label', `Ver detalhes de ${livro.titulo}`);
            
            capa.addEventListener('click', () => {
                abrirDetalhes(livro)
            })

            const titulo = document.createElement('span');
            titulo.className = 'livro-titulo';
            titulo.textContent = livro.titulo;

            const autor = document.createElement('span');
            autor.className = 'livro-autor';
            autor.textContent = livro.autor;

            const status = document.createElement('span');
            status.className = 'livro-status';
            status.textContent = livro.lido ? 'lido' : 'Quero ler';

            capa.append(titulo, autor, status);

            const acoes = document.createElement('div');
            acoes.className = 'livro-acoes';

            item.append(capa, acoes);
            lista.appendChild(item);
            if (!livro.lido){
                const botaoLido = document.createElement('button');
                botaoLido.type = 'button';
                botaoLido.textContent = 'Marcar como lido';
            
                botaoLido.addEventListener('click', async()=>{
                    botaoLido.disabled = true;
            
                try{
                    const resposta = await fetch(
                        `/api/livros/${livro.id}/lido`,
                        {method: 'PATCH' }
                    );
                    const dados = await resposta.json();
            
                    if(!resposta.ok){
                        throw new Error(
                            dados.erro || "Não foi possível atualizar o livro."
                        );
                    }
                    await carregarLivros();
                }catch(erro){
                    mensagem.textContent = erro.message;
                }finally{
                    botaoLido.disabled = false
                }
                });
                acoes.appendChild(botaoLido);
            }
            const botaoExcluir = document.createElement('button');
            botaoExcluir.type = 'button';
            botaoExcluir.textContent = 'Excluir';

            botaoExcluir.addEventListener('click', async () => {
                const confirmou = window.confirm(
                    `Excluir "${livro.titulo}" da sua biblioteca?`
                );
                if (!confirmou){
                    return;
                }
                botaoExcluir.disabled = true;

                try{
                    const resposta = await fetch(`/api/livros/${livro.id}`,{
                        method: 'DELETE'
                    });
                    const dados = await resposta.json();

                    if(!resposta.ok){
                        throw new Error(
                            dados.erro || 'Não foi possivel excluir o livro.'
                        );
                    }
                    await carregarLivros();
                } catch(erro){
                    mensagem.textContent = erro.message;
                }finally{
                    botaoExcluir.disabled = false
                }
            });
            botaoExcluir.className = 'botao-excluir';
            acoes.appendChild(botaoExcluir);
        }
        mensagem.textContent = livros.length === 0
            ?'Você ainda não cadastrou livros.'
            :`${livros.length} livro(s) na biblioteca.`;
    } catch(erro){
        mensagem.textContent = 'Erro ao carregar a biblioteca. ';
        console.error(erro);
    }
    
}
ordenacao.addEventListener('change', carregarLivros);
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
        ano_publicacao:document.querySelector('#ano').value,
        cor: document.querySelector('#cor').value
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