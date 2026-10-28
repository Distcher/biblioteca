const lista = document.querySelector('#lista-livros');
const mensagem = document.querySelector('#mensagem');
const ordenacao = document.querySelector('#ordenacao')
const detalhesLivro = document.querySelector('#detalhes-livro');
const detalhesTitulo = document.querySelector('#detalhes-titulo')
const detalhesAutor = document.querySelector('#detalhes-autor')
const detalhesAno = document.querySelector('#detalhes-ano')
const detalhesStatus = document.querySelector('#detalhes-status');
const campoAno = document.querySelector('#ano');

for(let ano = 2026; ano >=1; ano--){
    const opcao = document.createElement('option');
    opcao.value = String(ano);
    opcao.textContent = String(ano);

    campoAno.appendChild(opcao);
}

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
            if (livro.capa_url){
                const imagem = document.createElement('img');
                imagem.className = 'imagem-capa';
                imagem.alt = '';
                imagem.loading = 'lazy'

                imagem.addEventListener('load', ()=>{
                    titulo.hidden = true;
                    autor.hidden = true;
                    status.hidden = true;
                    capa.classList.add('com-imagem');
                });
                imagem.addEventListener('error', ()=>{
                    imagem.remove();
                    titulo.hidden = false;
                    status.hidden = false;
                    autor.hidden = false;
                    capa.classList.remove('com-imagem');
                });
                imagem.src = livro.capa_url;
                capa.prepend(imagem);
            }

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
        cor: document.querySelector('#cor').value,
        capa_url: document.querySelector('#capa-url').value || null
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
const buscarTitulo = document.querySelector('#busca-titulo');
const botaoBuscar = document.querySelector('#buscar-catalogo');
const mensagemCatalogo = document.querySelector('#mensagem-catalogo');
const resultadosCatalogo = document.querySelector('#resultados-catalogo');
const previaCapa = document.querySelector('#previa-capa');
const campoCapaUrl = document.querySelector('#capa-url')

function limparPreviaCapa(){
    campoCapaUrl.value = '';
    previaCapa.hidden = true;
    previaCapa.removeAttribute('src');
}
formulario.addEventListener('reset', limparPreviaCapa);

previaCapa.addEventListener('error', ()=>{
    limparPreviaCapa();
    mensagemCatalogo.textContent =
    'A imagem não está disponível. Você pode cadastrar sem ela.';
});
botaoBuscar.addEventListener('click', async()=>{
    const titulo = buscarTitulo.value.trim();
    if (titulo.length <2 || titulo.length > 200){
        mensagemCatalogo.textContent = 'Digite um título entre 2 a 200 caracteres.';
        return;
    }
    botaoBuscar.disabled = true;
    resultadosCatalogo.replaceChildren();
    mensagemCatalogo.textContent = 'Buscando...';
    try{
        const parametros = new URLSearchParams({ titulo});
        const resposta = await fetch(`/api/catalogo?${parametros}`);
        const dados = await resposta.json();

        if(!resposta.ok){
            throw new Error(dados.erro || 'Erro ao buscar no catalogo.');
        }
        if (!Array.isArray(dados)){
            throw new Error('Resposta inesperada do catalogo.');
        }
        mensagemCatalogo.textContent = dados.length
        ? 'Selecione um livro abaixo.'
        : 'Nenhum resultado encontrado. tente outro Título.';

        for (const livro of dados){
            const item = document.createElement('li');
            const descricao = document.createElement('p');
            const selecionar = document.createElement('button');
            descricao.textContent = `${livro.titulo}-${livro.autor|| 'Autor não informado'}`+
            ` - ${livro.ano_publicacao ?? ' Ano não informado'}`+ (livro.capa_url ? '':' - Sem capa');
            selecionar.type = 'button';
            selecionar.textContent = 'Usar este livro';

            selecionar.addEventListener('click', ()=>{
                document.querySelector('#titulo').value = livro.titulo;
                document.querySelector('#autor').value = livro.autor;
                const ano = Number(livro.ano_publicacao);
                if (Number.isInteger(ano) && ano >=1 && ano<=9999){
                    const valor = String(ano);
                    const existe = Array.from(campoAno.options).some(opcao => opcao.value === valor);
                    if (!existe){
                        campoAno.add(new Option(valor, valor));
                    }
                    campoAno.value = valor;
                }
                else{
                    campoAno.value = '';
                }
                limparPreviaCapa();
                if (livro.capa_url){
                    campoCapaUrl.value = livro.capa_url;
                    previaCapa.src = livro.capa_url;
                    previaCapa.hidden = false;
                }
                mensagemCatalogo.textContent = 'Confira os dados e a prévi antes de cadastrar.';

            });
            item.append(descricao, selecionar);
            resultadosCatalogo.appendChild(item);
        }
    }catch(erro){
            mensagemCatalogo.textContent = erro.message;
        }finally{
            botaoBuscar.disabled = false;
        }
});
