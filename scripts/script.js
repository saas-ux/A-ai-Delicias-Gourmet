
const form = document.getElementById("formProduto");

const listaProdutos = document.getElementById("listaProdutos");

const produtosVazios = document.getElementById("produtosVazios");

const contador = document.getElementById("contador");

const banco = supabaseClient;


// ========================================
// PRODUTOS
// ========================================

let produtos = [];


// ========================================
// FORMATAR PREÇO
// ========================================

function formatarValor(valor) {

    return Number(valor).toLocaleString("pt-BR", {

        style: "currency",

        currency: "BRL"

    });

}


// ========================================
// CARREGAR PRODUTOS DO SUPABASE
// ========================================

async function carregarProdutos() {

    const { data, error } = await banco

        .from("produtos")

        .select("*")

        .order("created_at", { ascending: false });


    if (error) {

        console.error(
            "Erro ao carregar produtos:",
            error
        );

        alert("Erro ao carregar os produtos.");

        return;

    }


    produtos = data || [];

    mostrarProdutos();

}


// ========================================
// MOSTRAR PRODUTOS
// ========================================

function mostrarProdutos() {

    listaProdutos.innerHTML = "";


    // Nenhum produto

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


    // Criar cards

    produtos.forEach((produto) => {

        const card = document.createElement("div");

        card.className = "card-produto";


        card.innerHTML = `
            <img
                src="${produto.foto_url}"
                alt="${produto.nome}"
            >

            <div class="card-info">

                <h3>
                    ${produto.nome}
                </h3>

                <div class="card-valor">
                    ${formatarValor(produto.valor)}
                </div>

                <div class="card-quantidade">

                    Estoque:

                    <strong>
                        ${produto.quantidade}
                    </strong>

                </div>


                <div class="controle-quantidade">

                    <button
                        onclick="diminuirQuantidade('${produto.id}')"
                    >
                        −
                    </button>

                    <span>
                        ${produto.quantidade}
                    </span>

                    <button
                        onclick="aumentarQuantidade('${produto.id}')"
                    >
                        +
                    </button>

                </div>


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


// ========================================
// CADASTRAR PRODUTO
// ========================================

form.addEventListener("submit", async function(event) {

    event.preventDefault();


    const foto =
        document.getElementById("foto");

    const nome =
        document.getElementById("nome").value.trim();

    const valor =
        document.getElementById("valor").value;

    const quantidade =
        document.getElementById("quantidade").value;


    // Verificar foto

    if (foto.files.length === 0) {

        alert("Selecione uma foto.");

        return;

    }


    // Verificar nome

    if (!nome) {

        alert("Digite o nome do produto.");

        return;

    }


    // Verificar valor

    if (!valor) {

        alert("Digite o valor do produto.");

        return;

    }


    // Verificar quantidade

    if (!quantidade) {

        alert("Digite a quantidade do produto.");

        return;

    }


    // Ler imagem

    const leitor = new FileReader();


    leitor.onload = async function(event) {

        const novoProduto = {

            foto_url: event.target.result,

            nome: nome,

            valor: Number(valor),

            quantidade: Number(quantidade)

        };


        console.log(
            "Enviando produto:",
            novoProduto
        );


        const { data, error } = await banco

            .from("produtos")

            .insert([novoProduto])

            .select()

            .single();


        if (error) {

            console.error(
                "Erro ao cadastrar produto:",
                error
            );

            alert(
                "Erro ao cadastrar produto. Veja o Console."
            );

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

    };


    leitor.readAsDataURL(foto.files[0]);

});


// ========================================
// DIMINUIR QUANTIDADE
// ========================================

async function diminuirQuantidade(id) {

    const produto = produtos.find(
        (produto) => produto.id === id
    );


    if (!produto) return;


    const novaQuantidade =
        produto.quantidade - 1;


    // Quando chegar em zero,
    // excluir produto

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


// ========================================
// AUMENTAR QUANTIDADE
// ========================================

async function aumentarQuantidade(id) {

    const produto = produtos.find(
        (produto) => produto.id === id
    );


    if (!produto) return;


    const novaQuantidade =
        produto.quantidade + 1;


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


// ========================================
// EXCLUIR PRODUTO
// ========================================

async function excluirProduto(id) {

    const confirmar = confirm(
        "Deseja realmente excluir este produto?"
    );


    if (!confirmar) return;


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


    produtos = produtos.filter(
        (produto) => produto.id !== id
    );


    mostrarProdutos();


    alert("Produto excluído!");

}


// ========================================
// INICIAR
// ========================================

carregarProdutos();

