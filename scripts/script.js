const form = document.getElementById("formProduto");

const listaProdutos = document.getElementById("listaProdutos");
const produtosVazios = document.getElementById("produtosVazios");
const contador = document.getElementById("contador");
const banco = supabaseClient;

// Nome do bucket no Supabase Storage onde as fotos ficam guardadas
// (precisa existir e estar marcado como público — veja instruções).
const NOME_BUCKET = "fotos-produtos";

// PRODUTOS
let produtos = [];

// FORMATAR PREÇO
function formatarValor(valor) {
    return Number(valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

// CARREGAR PRODUTOS DO SUPABASE
async function carregarProdutos() {
    const { data, error } = await banco
        .from("produtos")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Erro ao carregar produtos:", error);
        alert("Erro ao carregar os produtos.");
        return;
    }

    produtos = data || [];
    mostrarProdutos();
}

// MOSTRAR PRODUTOS
function mostrarProdutos() {
    listaProdutos.innerHTML = "";

    if (produtos.length === 0) {
        produtosVazios.style.display = "block";
        contador.textContent = "0 produtos";
        return;
    }

    produtosVazios.style.display = "none";

    contador.textContent =
        produtos.length === 1
            ? "1 produto"
            : `${produtos.length} produtos`;

    produtos.forEach((produto) => {
        const card = document.createElement("div");

        card.className = "card-produto";

        card.innerHTML = `
            <img src="${produto.foto_url}" alt="${produto.nome}">

            <div class="card-info">

                <h3>${produto.nome}</h3>

                <div class="card-valor">
                    ${formatarValor(produto.valor)}
                </div>

                <div class="card-quantidade">
                    Estoque:
                    <strong>${produto.quantidade}</strong>
                </div>

                <div class="controle-quantidade">

                    <button onclick="diminuirQuantidade('${produto.id}')">
                        −
                    </button>

                    <span>
                        ${produto.quantidade}
                    </span>

                    <button onclick="aumentarQuantidade('${produto.id}')">
                        +
                    </button>

                </div>

                <div class="status-produto ${produto.publicado ? 'publicado' : 'nao-publicado'}">
                    ${produto.publicado ? '🟢 Publicado' : '⚪ Não publicado'}
                </div>

                <button
                    class="btn-alternar"
                    onclick="alternarPublicado('${produto.id}')"
                >
                    ${
                        produto.publicado
                            ? 'Remover do cardápio'
                            : 'Publicar no cardápio'
                    }
                </button>

                <button
                    class="btn-excluir"
                    onclick="excluirProduto('${produto.id}')"
                >
                    🗑️ Excluir produto
                </button>

            </div>
        `;

        listaProdutos.appendChild(card);
    });
}

// CADASTRAR PRODUTO
form.addEventListener("submit", async function(event) {
    event.preventDefault();

    const foto = document.getElementById("foto");
    const nome = document.getElementById("nome").value.trim();
    const valor = document.getElementById("valor").value;
    const quantidade = document.getElementById("quantidade").value;
    const categoria = document.getElementById("categoria").value;

    if (foto.files.length === 0) {
        alert("Selecione uma foto.");
        return;
    }

    if (!nome) {
        alert("Digite o nome do produto.");
        return;
    }

    if (!valor) {
        alert("Digite o valor do produto.");
        return;
    }

    if (!quantidade) {
        alert("Digite a quantidade do produto.");
        return;
    }

    if (!categoria) {
        alert("Selecione uma categoria.");
        return;
    }

    const fotoComprimida = await comprimirImagem(
        foto.files[0],
        800,
        0.7
    );

    const nomeArquivo =
        `${crypto.randomUUID()}.jpg`;

    const { error: erroUpload } = await banco
        .storage
        .from(NOME_BUCKET)
        .upload(nomeArquivo, fotoComprimida, {
            contentType: "image/jpeg"
        });

    if (erroUpload) {
        console.error("Erro ao enviar a foto:", erroUpload);
        alert("Erro ao enviar a foto. Veja o Console.");
        return;
    }

    const { data: dadosPublicos } = banco
        .storage
        .from(NOME_BUCKET)
        .getPublicUrl(nomeArquivo);

    const novoProduto = {
        foto_url: dadosPublicos.publicUrl,
        nome: nome,
        valor: Number(valor),
        quantidade: Number(quantidade),
        categoria: categoria,
        publicado: true
    };

    console.log("Enviando produto:", novoProduto);

    const { data, error } = await banco
        .from("produtos")
        .insert([novoProduto])
        .select()
        .single();

    if (error) {
        console.error("Erro ao cadastrar produto:", error);
        alert("Erro ao cadastrar produto. Veja o Console.");
        return;
    }

    console.log(
        "Produto cadastrado no Supabase:",
        data
    );

    produtos.unshift(data);

    mostrarProdutos();

    form.reset();

    alert("Produto cadastrado!");
});

// Redimensiona a imagem num canvas e devolve um JPEG como Blob
// (arquivo binário leve), pronto pra subir no Supabase Storage —
// bem mais leve que o arquivo original de uma foto de celular.
function comprimirImagem(arquivo, larguraMaxima, qualidade) {

    return new Promise((resolve, reject) => {

        const leitor = new FileReader();

        leitor.onload = (event) => {

            const imagem = new Image();

            imagem.onload = () => {

                const escala = Math.min(
                    1,
                    larguraMaxima / imagem.width
                );

                const canvas = document.createElement("canvas");
                canvas.width = imagem.width * escala;
                canvas.height = imagem.height * escala;

                const ctx = canvas.getContext("2d");
                ctx.drawImage(
                    imagem,
                    0,
                    0,
                    canvas.width,
                    canvas.height
                );

                canvas.toBlob(
                    (blob) => resolve(blob),
                    "image/jpeg",
                    qualidade
                );
            };

            imagem.onerror = reject;
            imagem.src = event.target.result;
        };

        leitor.onerror = reject;
        leitor.readAsDataURL(arquivo);
    });
}

// DIMINUIR QUANTIDADE
async function diminuirQuantidade(id) {

    const produto = produtos.find(
        (produto) => produto.id === id
    );

    if (!produto) return;

    const novaQuantidade = produto.quantidade - 1;

    if (novaQuantidade <= 0) {
        await excluirProduto(id);
        return;
    }

    const { data, error } = await banco
        .from("produtos")
        .update({
            quantidade: novaQuantidade
        })
        .eq("id", id)
        .select()
        .single();

    if (error) {
        console.error(
            "Erro ao diminuir quantidade:",
            error
        );

        alert("Erro ao atualizar o estoque.");
        return;
    }

    const indice = produtos.findIndex(
        (produto) => produto.id === id
    );

    produtos[indice] = data;

    mostrarProdutos();
}

// AUMENTAR QUANTIDADE
async function aumentarQuantidade(id) {

    const produto = produtos.find(
        (produto) => produto.id === id
    );

    if (!produto) return;

    const novaQuantidade = produto.quantidade + 1;

    const { data, error } = await banco
        .from("produtos")
        .update({
            quantidade: novaQuantidade
        })
        .eq("id", id)
        .select()
        .single();

    if (error) {
        console.error(
            "Erro ao aumentar quantidade:",
            error
        );

        alert("Erro ao atualizar o estoque.");
        return;
    }

    const indice = produtos.findIndex(
        (produto) => produto.id === id
    );

    produtos[indice] = data;

    mostrarProdutos();
}

// ALTERNAR PUBLICAÇÃO
async function alternarPublicado(id) {

    const produto = produtos.find(
        (produto) => produto.id === id
    );

    if (!produto) return;

    const { data, error } = await banco
        .from("produtos")
        .update({
            publicado: !produto.publicado
        })
        .eq("id", id)
        .select()
        .single();

    if (error) {
        console.error(
            "Erro ao alternar publicação:",
            error
        );

        alert("Erro ao atualizar o status do produto.");
        return;
    }

    const indice = produtos.findIndex(
        (produto) => produto.id === id
    );

    produtos[indice] = data;

    mostrarProdutos();
}

// EXCLUIR PRODUTO
async function excluirProduto(id) {

    const confirmar = confirm(
        "Deseja realmente excluir este produto?"
    );

    if (!confirmar) return;

    const produto = produtos.find(
        (produto) => produto.id === id
    );

    const { error } = await banco
        .from("produtos")
        .delete()
        .eq("id", id);

    if (error) {
        console.error(
            "Erro ao excluir produto:",
            error
        );

        alert("Erro ao excluir produto.");
        return;
    }

    // Também remove a foto do Storage, pra não acumular
    // arquivos órfãos sem produto associado.
    if (produto && produto.foto_url) {

        const nomeArquivo =
            produto.foto_url.split(`/${NOME_BUCKET}/`)[1];

        if (nomeArquivo) {

            const { error: erroStorage } = await banco
                .storage
                .from(NOME_BUCKET)
                .remove([nomeArquivo]);

            if (erroStorage) {
                console.error(
                    "Erro ao remover a foto do Storage:",
                    erroStorage
                );
            }
        }
    }

    produtos = produtos.filter(
        (produto) => produto.id !== id
    );

    mostrarProdutos();

    alert("Produto excluído!");
}

// INICIAR
carregarProdutos();