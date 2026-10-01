/* =========================================
   DADOS
========================================= */

const CHAVE_AGENDAMENTOS =
    "merenda_agendamentos";

const CHAVE_ENTREGAS =
    "merenda_entregas";


/* =========================================
   AGENDAMENTOS INICIAIS
========================================= */

function obterAgendamentos() {

    const dados =
        localStorage.getItem(
            CHAVE_AGENDAMENTOS
        );

    if (dados) {

        return JSON.parse(dados);

    }


    /*
       EXEMPLO:

       Mesmo dia com DOIS tipos
       diferentes de lanche.
    */

    const agendamentos = [

        {
            id: 1,
            data: "2026-09-28",
            turno: "Manhã",
            lanche: "Pastel de frango + suco",
            quantidade: 120
        },

        {
            id: 2,
            data: "2026-09-28",
            turno: "Manhã",
            lanche: "Pastel vegetariano + suco",
            quantidade: 80
        },

        {
            id: 3,
            data: "2026-09-29",
            turno: "Tarde",
            lanche: "Sanduíche natural + suco",
            quantidade: 150
        },

        {
            id: 4,
            data: "2026-09-30",
            turno: "Manhã",
            lanche: "Biscoito integral + suco",
            quantidade: 100
        }

    ];


    salvarAgendamentos(
        agendamentos
    );


    return agendamentos;
}


/* =========================================
   SALVAR
========================================= */

function salvarAgendamentos(
    agendamentos
) {

    localStorage.setItem(

        CHAVE_AGENDAMENTOS,

        JSON.stringify(
            agendamentos
        )

    );

}


/* =========================================
   DATA
========================================= */

function formatarData(data) {

    if (!data) {

        return "";

    }


    const partes =
        data.split("-");


    return (

        partes[2] +
        "/" +
        partes[1] +
        "/" +
        partes[0]

    );

}


/* =========================================
   DIA DA SEMANA
========================================= */

function diaSemana(data) {

    const dias = [

        "Domingo",
        "Segunda",
        "Terça",
        "Quarta",
        "Quinta",
        "Sexta",
        "Sábado"

    ];


    const dataObj =
        new Date(
            data + "T00:00:00"
        );


    return dias[
        dataObj.getDay()
    ];

}


/* =========================================
   TABELA
========================================= */

function renderTabela() {

    const tabela =
        document.getElementById(
            "tabelaAgendamentos"
        );


    if (!tabela) {

        return;

    }


    let agendamentos =
        obterAgendamentos();


    const turno =
        document.getElementById(
            "turnoFiltro"
        ).value;


    const busca =
        document.getElementById(
            "busca"
        ).value
        .toLowerCase();


    if (
        turno !==
        "Todos os turnos"
    ) {

        agendamentos =
            agendamentos.filter(

                item =>
                    item.turno ===
                    turno

            );

    }


    if (busca) {

        agendamentos =
            agendamentos.filter(

                item =>

                    item.lanche
                    .toLowerCase()
                    .includes(busca)

            );

    }


    agendamentos.sort(

        (a,b) => {

            if (
                a.data ===
                b.data
            ) {

                return a.turno.localeCompare(
                    b.turno
                );

            }

            return a.data.localeCompare(
                b.data
            );

        }

    );


    if (
        agendamentos.length === 0
    ) {

        tabela.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    style="
                        text-align:center;
                        padding:35px;
                        color:#718096;
                    "
                >

                    Nenhum agendamento encontrado.

                </td>

            </tr>

        `;

        return;

    }


    tabela.innerHTML =

        agendamentos.map(

            item => `

            <tr>

                <td>
                    ${formatarData(item.data)}
                </td>

                <td>
                    ${diaSemana(item.data)}
                </td>

                <td>
                    ${item.turno}
                </td>

                <td>
                    <strong>
                        ${item.lanche}
                    </strong>
                </td>

                <td>
                    ${item.quantidade}
                </td>

                <td>

                    <span
                        class="status agendado"
                    >

                        Agendado

                    </span>

                </td>

                <td>

                    <div class="acoes">

                        <button
                            class="btn-mini entrega"
                            onclick="
                                abrirRegistro(
                                    ${item.id}
                                )
                            "
                        >

                            Registrar entrega

                        </button>


                        <button
                            class="btn-mini"
                            onclick="
                                editarAgendamento(
                                    ${item.id}
                                )
                            "
                        >

                            Editar

                        </button>


                        <button
                            class="btn-mini excluir"
                            onclick="
                                excluirAgendamento(
                                    ${item.id}
                                )
                            "
                        >

                            Excluir

                        </button>

                    </div>

                </td>

            </tr>

        `

        ).join("");

}


/* =========================================
   FORMULÁRIO
========================================= */

function abrirFormulario() {

    const formulario =
        document.getElementById(
            "formulario"
        );


    formulario.style.display =
        "block";


    document.getElementById(
        "novaData"
    ).value = "";


    document.getElementById(
        "novoTurno"
    ).value = "";


    document.getElementById(
        "novoLanche"
    ).value = "";


    document.getElementById(
        "novaQuantidade"
    ).value = "";

}


function fecharFormulario() {

    document.getElementById(
        "formulario"
    ).style.display =
        "none";

}


/* =========================================
   SALVAR NOVO AGENDAMENTO
========================================= */

function salvarAgendamento() {

    const data =
        document.getElementById(
            "novaData"
        ).value;


    const turno =
        document.getElementById(
            "novoTurno"
        ).value;


    const lanche =
        document.getElementById(
            "novoLanche"
        ).value.trim();


    const quantidade =
        Number(
            document.getElementById(
                "novaQuantidade"
            ).value
        );


    if (!data) {

        alert(
            "Informe a data."
        );

        return;

    }


    if (!turno) {

        alert(
            "Selecione o turno."
        );

        return;

    }


    if (!lanche) {

        alert(
            "Informe o tipo de lanche."
        );

        return;

    }


    if (
        quantidade <= 0
    ) {

        alert(
            "Informe uma quantidade válida."
        );

        return;

    }


    const agendamentos =
        obterAgendamentos();


    agendamentos.push({

        id:
            Date.now(),

        data:

            data,

        turno:

            turno,

        lanche:

            lanche,

        quantidade:

            quantidade

    });


    salvarAgendamentos(
        agendamentos
    );


    fecharFormulario();


    renderTabela();


    mostrarMensagem(
        "Agendamento cadastrado."
    );

}


/* =========================================
   EDITAR
========================================= */

function editarAgendamento(id) {

    const agendamentos =
        obterAgendamentos();


    const item =
        agendamentos.find(
            x =>
                x.id === id
        );


    if (!item) {

        return;

    }


    const novaQuantidade =
        prompt(

            "Quantidade:",

            item.quantidade

        );


    if (
        novaQuantidade === null
    ) {

        return;

    }


    item.quantidade =
        Number(
            novaQuantidade
        );


    salvarAgendamentos(
        agendamentos
    );


    renderTabela();


    mostrarMensagem(
        "Agendamento atualizado."
    );

}


/* =========================================
   EXCLUIR
========================================= */

function excluirAgendamento(id) {

    const confirmar =
        confirm(
            "Deseja excluir este agendamento?"
        );


    if (!confirmar) {

        return;

    }


    let agendamentos =
        obterAgendamentos();


    agendamentos =
        agendamentos.filter(

            item =>
                item.id !== id

        );


    salvarAgendamentos(
        agendamentos
    );


    renderTabela();


    mostrarMensagem(
        "Agendamento excluído."
    );

}


/* =========================================
   ABRIR REGISTRO
========================================= */

function abrirRegistro(id) {

    const agendamentos =
        obterAgendamentos();


    const item =
        agendamentos.find(
            x =>
                x.id === id
        );


    if (!item) {

        return;

    }


    /*
       GUARDA O LANCHES SELECIONADO
       PARA A OUTRA PÁGINA.
    */

    sessionStorage.setItem(

        "lancheSelecionado",

        JSON.stringify(item)

    );


    window.location.href =
        "registro-entrega.html";

}


/* =========================================
   CARREGAR REGISTRO
========================================= */

function carregarRegistro() {

    const elemento =
        document.getElementById(
            "entregaLanche"
        );


    if (!elemento) {

        return;

    }


    const dados =
        sessionStorage.getItem(
            "lancheSelecionado"
        );


    if (!dados) {

        return;

    }


    const item =
        JSON.parse(
            dados
        );


    document.getElementById(
        "entregaData"
    ).textContent =
        formatarData(
            item.data
        );


    document.getElementById(
        "entregaTurno"
    ).textContent =
        item.turno;


    document.getElementById(
        "entregaLanche"
    ).textContent =
        item.lanche;


    document.getElementById(
        "quantidadePrevista"
    ).textContent =
        item.quantidade;


    document.getElementById(
        "quantidadeEntregue"
    ).value =
        item.quantidade;

}


/* =========================================
   ENTREGAS
========================================= */

function obterEntregas() {

    const dados =
        localStorage.getItem(
            CHAVE_ENTREGAS
        );


    if (!dados) {

        return [];

    }


    return JSON.parse(
        dados
    );

}


function salvarEntregas(
    entregas
) {

    localStorage.setItem(

        CHAVE_ENTREGAS,

        JSON.stringify(
            entregas
        )

    );

}


/* =========================================
   REGISTRAR ENTREGA
========================================= */

function registrarEntrega() {

    const dados =
        sessionStorage.getItem(
            "lancheSelecionado"
        );


    if (!dados) {

        alert(
            "Nenhum agendamento selecionado."
        );

        return;

    }


    const item =
        JSON.parse(
            dados
        );


    const quantidade =
        Number(
            document.getElementById(
                "quantidadeEntregue"
            ).value
        );


    if (
        quantidade < 0 ||
        isNaN(quantidade)
    ) {

        alert(
            "Informe uma quantidade válida."
        );

        return;

    }


    const observacao =
        document.getElementById(
            "observacaoEntrega"
        ).value;


    let entregas =
        obterEntregas();


    entregas.push({

        id:
            Date.now(),

        data:
            item.data,

        turno:
            item.turno,

        lanche:
            item.lanche,

        prevista:
            item.quantidade,

        entregue:
            quantidade,

        observacao:
            observacao

    });


    salvarEntregas(
        entregas
    );


    renderHistorico();


    mostrarMensagem(
        "Entrega registrada com sucesso."
    );


    document.getElementById(
        "observacaoEntrega"
    ).value = "";

}


/* =========================================
   HISTÓRICO
========================================= */

function renderHistorico() {

    const tabela =
        document.getElementById(
            "historicoEntrega"
        );


    if (!tabela) {

        return;

    }


    const entregas =
        obterEntregas();


    if (
        entregas.length === 0
    ) {

        tabela.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    style="
                        text-align:center;
                        padding:30px;
                        color:#718096;
                    "
                >

                    Nenhuma entrega registrada.

                </td>

            </tr>

        `;

        return;

    }


    tabela.innerHTML =

        entregas.map(

            item => {

                let status;

                let classe;


                if (
                    item.entregue === 0
                ) {

                    status =
                        "Não entregue";

                    classe =
                        "nao-entregue";

                }

                else if (
                    item.entregue <
                    item.prevista
                ) {

                    status =
                        "Parcial";

                    classe =
                        "parcial";

                }

                else {

                    status =
                        "Entregue";

                    classe =
                        "entregue";

                }


                return `

                    <tr>

                        <td>
                            ${formatarData(
                                item.data
                            )}
                        </td>

                        <td>
                            ${item.turno}
                        </td>

                        <td>
                            <strong>
                                ${item.lanche}
                            </strong>
                        </td>

                        <td>
                            ${item.prevista}
                        </td>

                        <td>
                            ${item.entregue}
                        </td>

                        <td>

                            <span
                                class="
                                    status
                                    ${classe}
                                "
                            >

                                ${status}

                            </span>

                        </td>

                        <td>

                            <button
                                class="
                                    btn-mini
                                    excluir
                                "
                                onclick="
                                    excluirEntrega(
                                        ${item.id}
                                    )
                                "
                            >

                                Excluir

                            </button>

                        </td>

                    </tr>

                `;

            }

        ).join("");

}


/* =========================================
   EXCLUIR ENTREGA
========================================= */

function excluirEntrega(id) {

    if (
        !confirm(
            "Deseja excluir este registro?"
        )
    ) {

        return;

    }


    let entregas =
        obterEntregas();


    entregas =
        entregas.filter(

            item =>
                item.id !== id

        );


    salvarEntregas(
        entregas
    );


    renderHistorico();


    mostrarMensagem(
        "Registro excluído."
    );

}


/* =========================================
   MENSAGEM
========================================= */

function mostrarMensagem(
    mensagem
) {

    const toast =
        document.getElementById(
            "toast"
        );


    if (!toast) {

        return;

    }


    toast.textContent =
        mensagem;


    toast.classList.add(
        "show"
    );


    setTimeout(

        () => {

            toast.classList.remove(
                "show"
            );

        },

        2500

    );

}


/* =========================================
   INICIALIZAÇÃO
========================================= */

document.addEventListener(

    "DOMContentLoaded",

    () => {

        renderTabela();

        carregarRegistro();

        renderHistorico();

    }

);