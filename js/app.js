const paginas = {
    inicio: ["Visão geral", "Início"],
    agendamento: ["Merenda", "Agendamento de lanches"],
    "entrega-lanche": ["Merenda", "Entrega de lanches"],
    cardapios: ["Merenda", "Cardápios"],
    lanches: ["Merenda", "Lanches"],
    alimentos: ["Estoque", "Alimentos"],
    produtos: ["Estoque", "Produtos"],
    fornecedores: ["Compras", "Fornecedores"],
    empenhos: ["Compras", "Empenhos"],
    "agenda-empenho": ["Compras", "Entregas de empenho"],
    recebimento: ["Compras", "Recebimento"]
};

const referencias = {
    inteiro: { nome: "Inteiro", classe: "ref-inteiro" },
    unidade_base: { nome: "Unidade base", classe: "ref-base" },
    subitens: { nome: "Subitens", classe: "ref-subitens" }
};

const estadosEntrega = {
    agendado: ["Agendado", "azul"],
    entrega_parcial: ["Entrega parcial", "laranja"],
    entrega_total: ["Entrega total", "verde"],
    finalizado: ["Finalizado", "cinza"]
};

const turnos = { manha: "Manhã", tarde: "Tarde" };

const nomesDias = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];

// Como cada cadastro é preenchido e salvo (o formulário tem data-tabela com o nome da tabela).
const formularios = {
    lanche_agendado: { salvo: "Lanche agendado", excluido: "Agendamento excluído", preencher: preencherAgendamento, salvar: salvarSimples },
    cardapio: { salvo: "Cardápio salvo", excluido: "Cardápio excluído", preencher: preencherCardapio, salvar: salvarCardapio },
    lanche: { salvo: "Lanche salvo", excluido: "Lanche excluído", preencher: preencherLanche, salvar: salvarLanche },
    alimento: { salvo: "Alimento salvo", excluido: "Alimento excluído", preencher: preencherSimples, salvar: salvarSimples },
    produto: { salvo: "Produto salvo", excluido: "Produto excluído", preencher: preencherSimples, salvar: salvarSimples },
    fornecedor: { salvo: "Fornecedor salvo", excluido: "Fornecedor excluído", preencher: preencherSimples, salvar: salvarSimples },
    empenho: { salvo: "Empenho registrado", excluido: "Empenho excluído", preencher: preencherEmpenho, salvar: salvarEmpenho },
    agenda_entrega_empenho: { salvo: "Entrega solicitada", excluido: "Solicitação excluída", preencher: preencherSolicitacao, salvar: salvarSolicitacao }
};

const el = id => document.getElementById(id);
const buscar = (lista, id) => lista.find(item => item.id === id);
const num = valor => valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
const arredondar = valor => Math.round(valor * 10) / 10;
const arredondarCima = valor => Math.ceil(valor - 1e-9);
const precisao = valor => Math.round(valor * 1000) / 1000;
const formatarData = iso => iso.split("-").reverse().join("/");
const diaMes = iso => `${iso.slice(8)}/${iso.slice(5, 7)}`;
const mesCurto = iso => new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
const maiuscula = texto => texto ? texto[0].toUpperCase() + texto.slice(1) : "";
const esc = texto => String(texto ?? "").replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const icone = nome => `<span class="icone">${nome}</span>`;
const badge = (texto, cor) => `<span class="badge badge-${cor}">${texto}</span>`;
const vazio = (nomeIcone, texto, classe = "") => `<div class="vazio ${classe}">${icone(nomeIcone)}<p>${texto}</p></div>`;
const linhaVazia = (colunas, nomeIcone, texto) => `<tr class="linha-vazia"><td colspan="${colunas}">${vazio(nomeIcone, texto)}</td></tr>`;
const opcoes = (lista, textoVazio) => `<option value="">${textoVazio}</option>` + lista.map(([valor, texto]) => `<option value="${valor}">${esc(texto)}</option>`).join("");
const ordenado = (lista, chave) => [...lista].sort((a, b) => chave(a).localeCompare(chave(b)));
const sincronizar = area => area.querySelectorAll("select[onchange]").forEach(select => select.dispatchEvent(new Event("change")));
const botoesLinha = (tabela, id) => `<button class="btn-icone" data-editar="${tabela}" data-id="${id}" title="Editar">${icone("edit")}</button><button class="btn-icone" data-excluir="${tabela}" data-id="${id}" title="Excluir">${icone("delete")}</button>`;

const dataLocal = data => [data.getFullYear(), data.getMonth() + 1, data.getDate()].map(n => String(n).padStart(2, "0")).join("-");
const hoje = dataLocal(new Date());

// Cópia em memória do banco (js/db.js), recarregada depois de cada gravação.
const dados = Object.fromEntries(banco.tabelas.map(tabela => [tabela, []]));

let semanaAtual = segundaDaSemana(hoje);
let agendadoSelecionado = null;

function somarDias(iso, dias) {
    const data = new Date(`${iso}T12:00:00`);
    data.setDate(data.getDate() + dias);
    return dataLocal(data);
}

function segundaDaSemana(iso) {
    const data = new Date(`${iso}T12:00:00`);
    return somarDias(iso, -((data.getDay() + 6) % 7));
}

// ---------------------------------------------------------------------------------------------
// Consultas sobre os dados carregados

const pendente = entrega => entrega.estado === "agendado" || entrega.estado === "entrega_parcial";
const vigente = empenho => empenho.data_final >= hoje;
const doRegistro = (tabela, campo, id) => dados[tabela].filter(item => item[campo] === id);
const itensCardapio = id => doRegistro("item_cardapio", "fk_cardapio", id);
const itensLanche = id => doRegistro("item_lanche", "fk_lanche", id);
const itensEmpenho = id => doRegistro("item_empenho", "fk_empenho", id);
const porTurno = (a, b) => a.data.localeCompare(b.data) || a.turno.localeCompare(b.turno);

function siglaUnidade(id) {
    const unidade = buscar(dados.unidade_medida, id);
    const multiplo = buscar(dados.multiplo, unidade.fk_multiplo);
    return `${multiplo ? multiplo.sigla : ""}${buscar(dados.unidade_medida_basica, unidade.fk_unidade_medida_basica).sigla}`;
}

function nomeUnidade(id) {
    const unidade = buscar(dados.unidade_medida, id);
    const multiplo = buscar(dados.multiplo, unidade.fk_multiplo);
    return `${maiuscula(`${multiplo ? multiplo.nome : ""}${buscar(dados.unidade_medida_basica, unidade.fk_unidade_medida_basica).nome}`)} (${siglaUnidade(id)})`;
}

const unidadeAlimento = alimentoId => siglaUnidade(buscar(dados.alimento, alimentoId).fk_unidade_medida);
const nomeProduto = produto => `${buscar(dados.alimento, produto.fk_alimento).nome} · ${produto.descricao}`;
const embalagem = produto => produto.embalagem || "un";
const descricaoLanche = lanche => lanche.descricao || buscar(dados.cardapio, lanche.fk_cardapio).nome;
const fornecedorDoEmpenho = empenho => buscar(dados.fornecedor, empenho.fk_fornecedor);
const produtoDaEntrega = entrega => buscar(dados.produto, buscar(dados.item_empenho, entrega.fk_item_empenho).fk_produto);

const itensVigentes = produtoId => dados.item_empenho.filter(item => item.fk_produto === produtoId && vigente(buscar(dados.empenho, item.fk_empenho)));
const provisionado = produtoId => itensVigentes(produtoId).reduce((total, item) => total + item.quant_empenhada, 0);
const aReceberItem = itemId => doRegistro("agenda_entrega_empenho", "fk_item_empenho", itemId).filter(pendente)
    .reduce((total, entrega) => total + entrega.quant_solicitada - entrega.quant_entregue, 0);
const aReceber = produtoId => doRegistro("item_empenho", "fk_produto", produtoId).reduce((total, item) => total + aReceberItem(item.id), 0);
const saldoItemEmpenho = item => precisao(item.quant_empenhada - item.quant_entregue - aReceberItem(item.id));
const saldoEmpenho = produtoId => precisao(itensVigentes(produtoId).reduce((total, item) => total + saldoItemEmpenho(item), 0));
const lancheBloqueado = lancheId => dados.lanche_agendado.some(a => a.fk_lanche === lancheId && a.situacao === "entregue");

// Forma de consumo do item do lanche, com a unidade de consumo da especificação ("1 un", "0,2 L", "4 biscoitos").
function consumo(item) {
    const produto = buscar(dados.produto, item.fk_produto);
    let unidade = unidadeConsumo(item.referencia_consumo, produto);
    if (item.referencia_consumo === "subitens" && item.quant_consumida === 1) unidade = produto.nome_subitem ? unidade.replace(/s$/, "") : "subitem";
    return `${num(item.quant_consumida)} ${unidade}`;
}

// Quantas unidades do produto (embalagens) cada lanche consome.
const porLanche = item => banco.consumoPorLanche(item, buscar(dados.produto, item.fk_produto));

// Unidade em que a quantidade do item do lanche é informada (unidade de consumo da especificação).
function unidadeConsumo(referencia, produto) {
    if (!produto) return "";
    if (referencia === "inteiro") return "un";
    if (referencia === "unidade_base") return unidadeAlimento(produto.fk_alimento);
    return produto.nome_subitem || "subitens";
}

function turnoTag(turno) {
    return `<span class="turno-tag ${turno}">${icone(turno === "manha" ? "wb_sunny" : "wb_twilight")}${turnos[turno]}</span>`;
}

function barraEstoque(produto) {
    const total = provisionado(produto.id);
    const pct = total ? Math.min(100, produto.total_estoque / total * 100) : 0;
    const nivel = pct < 5 ? "critico" : pct < 15 ? "atencao" : "ok";
    return `<div class="barra"><i class="${nivel}" style="width:${Math.max(pct, 2)}%"></i></div>`;
}

function barraPercentual(pct) {
    return `<div class="percentual"><div class="barra"><i class="ok" style="width:${Math.min(pct, 100)}%"></i></div><span>${pct}%</span></div>`;
}

const percentual = (parte, total) => total ? Math.round(parte / total * 100) : 0;

function consumoProdutos(inicio, fim) {
    const totais = new Map();
    dados.lanche_agendado.filter(a => a.situacao === "agendado" && a.data >= inicio && a.data <= fim).forEach(a => {
        itensLanche(a.fk_lanche).forEach(item => totais.set(item.fk_produto, (totais.get(item.fk_produto) || 0) + porLanche(item) * a.quant_prevista));
    });
    return totais;
}

// Produtos necessários para os lanches agendados na semana que começa em "inicio".
function previsao(inicio) {
    const antes = inicio > hoje ? consumoProdutos(hoje, somarDias(inicio, -1)) : new Map();
    return [...consumoProdutos(inicio, somarDias(inicio, 4))]
        .map(([produtoId, total]) => {
            const produto = buscar(dados.produto, produtoId);
            return {
                produto,
                necessario: arredondarCima(total),
                previsto: precisao(produto.total_estoque + aReceber(produtoId) - arredondarCima(antes.get(produtoId) || 0))
            };
        })
        .sort((a, b) => nomeProduto(a.produto).localeCompare(nomeProduto(b.produto)));
}

function situacaoNecessidade({ produto, necessario, previsto }) {
    if (necessario <= previsto) return ["Estoque suficiente", "verde", ""];
    if (necessario <= previsto + saldoEmpenho(produto.id)) return ["Solicitar entrega", "laranja", `<button class="btn-mini" data-novo="agenda_entrega_empenho">Solicitar entrega</button>`];
    return ["Sem empenho", "vermelho", `<button class="btn-mini" data-novo="empenho">Cadastrar empenho</button>`];
}

// ---------------------------------------------------------------------------------------------
// Navegação

function navegar() {
    const id = location.hash.slice(1) in paginas ? location.hash.slice(1) : "inicio";
    document.querySelectorAll(".pagina").forEach(pagina => pagina.hidden = pagina.dataset.pagina !== id);
    document.querySelectorAll(".menu a").forEach(link => link.classList.toggle("ativo", link.getAttribute("href") === `#${id}`));
    el("trilha-grupo").textContent = paginas[id][0];
    el("trilha-pagina").textContent = paginas[id][1];
    document.body.classList.remove("menu-aberto");
    window.scrollTo(0, 0);
}

function alternarMenu() {
    document.body.classList.toggle("menu-aberto");
}

// ---------------------------------------------------------------------------------------------
// Telas

function renderInicio() {
    const doDia = dados.lanche_agendado.filter(a => a.data === hoje).sort(porTurno);
    const pendentes = dados.agenda_entrega_empenho.filter(pendente).sort((a, b) => a.data_prevista_entrega.localeCompare(b.data_prevista_entrega));
    const vigentes = dados.empenho.filter(vigente);
    const comEmpenho = dados.produto.filter(p => provisionado(p.id) > 0);
    const turnosDoDia = new Set(doDia.map(a => a.turno)).size;
    const fornecedores = new Set(vigentes.map(e => e.fk_fornecedor)).size;

    el("inicio-data").textContent = new Date(`${hoje}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    el("stat-lanches").textContent = doDia.reduce((total, a) => total + a.quant_prevista, 0);
    el("stat-lanches-info").textContent = doDia.length
        ? `${doDia.length} ${doDia.length === 1 ? "opção" : "opções"} em ${turnosDoDia} ${turnosDoDia === 1 ? "turno" : "turnos"}`
        : "nenhum lanche agendado";
    el("stat-entregas").textContent = pendentes.length;
    el("stat-abaixo").textContent = previsao(somarDias(segundaDaSemana(hoje), 7)).filter(n => n.necessario > n.previsto).length;
    el("stat-empenhos").textContent = vigentes.length;
    el("stat-empenhos-info").textContent = `${fornecedores} ${fornecedores === 1 ? "fornecedor" : "fornecedores"}`;

    el("inicio-lanches").innerHTML = doDia.length ? doDia.map(a => {
        const lanche = buscar(dados.lanche, a.fk_lanche);
        return `
            <li class="linha-lista">
                ${turnoTag(a.turno)}
                <div class="linha-info"><strong>Lanche ${lanche.id}</strong><span>${esc(descricaoLanche(lanche))}</span></div>
                <div class="linha-qtd"><strong>${a.quant_prevista}</strong><span>previstos</span></div>
                ${a.situacao === "entregue" ? badge("Entregue", "verde") : `<a class="btn-mini" href="#entrega-lanche" onclick="selecionarAgendado(${a.id})">Registrar</a>`}
            </li>`;
    }).join("") : `<li>${vazio("event_busy", "Nenhum lanche agendado para hoje.")}</li>`;

    el("inicio-entregas").innerHTML = pendentes.length ? pendentes.slice(0, 5).map(e => {
        const produto = produtoDaEntrega(e);
        const [texto, cor] = estadosEntrega[e.estado];
        return `
            <li class="linha-lista">
                <div class="data-bloco${e.data_prevista_entrega === hoje ? " hoje" : ""}"><strong>${e.data_prevista_entrega.slice(8)}</strong><span>${mesCurto(e.data_prevista_entrega)}</span></div>
                <div class="linha-info"><strong>${esc(nomeProduto(produto))}</strong><span>${esc(fornecedorDoEmpenho(buscar(dados.empenho, e.fk_empenho)).nome)}</span></div>
                <div class="linha-qtd"><strong>${num(e.quant_solicitada - e.quant_entregue)}</strong><span>${esc(embalagem(produto))}</span></div>
                ${badge(texto, cor)}
            </li>`;
    }).join("") : `<li>${vazio("local_shipping", "Nenhuma entrega pendente.")}</li>`;

    el("inicio-estoque").innerHTML = comEmpenho.length ? comEmpenho.map(p => `
        <div class="estoque-item">
            <div class="estoque-nome"><strong>${esc(buscar(dados.alimento, p.fk_alimento).nome)}</strong><span>${esc(p.descricao)}</span></div>
            ${barraEstoque(p)}
            <div class="estoque-valores"><span>${num(p.total_estoque)} ${esc(embalagem(p))} disponíveis</span><span>de ${num(provisionado(p.id))}</span></div>
        </div>`).join("") : vazio("inventory_2", "Nenhum produto com empenho vigente.");
}

function mudarSemana(passo) {
    semanaAtual = passo === 0 ? segundaDaSemana(hoje) : somarDias(semanaAtual, passo * 7);
    renderSemana();
}

function chipLanche(agendado) {
    const lanche = buscar(dados.lanche, agendado.fk_lanche);
    const acao = agendado.situacao === "entregue"
        ? `onclick="verEntrega(${agendado.id})" title="Ver entrega"`
        : `data-editar="lanche_agendado" data-id="${agendado.id}" title="Editar agendamento"`;
    return `<button class="lanche-chip ${agendado.situacao}" ${acao}><strong>Lanche ${lanche.id}</strong><em>${agendado.quant_prevista}</em><span>${esc(descricaoLanche(lanche))}</span></button>`;
}

function verEntrega(id) {
    location.hash = "#entrega-lanche";
    selecionarAgendado(id);
}

function renderSemana() {
    const dias = [0, 1, 2, 3, 4].map(n => somarDias(semanaAtual, n));
    el("semana-titulo").textContent = `${diaMes(dias[0])} a ${formatarData(dias[4])}`;
    el("semana").innerHTML = dias.map((dia, i) => `
        <div class="dia${dia === hoje ? " hoje" : ""}">
            <div class="dia-topo"><span>${nomesDias[i]}</span><strong>${diaMes(dia)}</strong>${dia === hoje ? `<em>Hoje</em>` : ""}</div>
            ${Object.entries(turnos).map(([turno, nome]) => `
                <div class="turno">
                    <h4>${icone(turno === "manha" ? "wb_sunny" : "wb_twilight")}${nome}</h4>
                    ${dados.lanche_agendado.filter(a => a.data === dia && a.turno === turno).map(chipLanche).join("")}
                    ${dia >= hoje ? `<button class="add-lanche" data-novo="lanche_agendado" data-data="${dia}" data-turno="${turno}">${icone("add")}Adicionar</button>` : ""}
                </div>`).join("")}
        </div>`).join("");
    renderNecessidade();
}

function renderNecessidade() {
    const lista = previsao(semanaAtual);
    el("previsao-periodo").textContent = `${formatarData(semanaAtual)} a ${formatarData(somarDias(semanaAtual, 4))}`;
    el("tabela-necessidade").innerHTML = lista.length ? lista.map(n => {
        const { produto } = n;
        const [texto, cor, acao] = situacaoNecessidade(n);
        return `
            <tr>
                <td><strong>${esc(nomeProduto(produto))}</strong></td>
                <td class="num">${num(n.necessario)} ${esc(embalagem(produto))}</td>
                <td class="num">${num(n.previsto)} ${esc(embalagem(produto))}<small>atual ${num(produto.total_estoque)} · a receber ${num(aReceber(produto.id))}</small></td>
                <td class="num">${num(saldoEmpenho(produto.id))} ${esc(embalagem(produto))}</td>
                <td>${badge(texto, cor)}</td>
                <td class="acoes">${acao}</td>
            </tr>`;
    }).join("") : linhaVazia(6, "event_note", "Nenhum lanche a entregar agendado nesta semana.");
}

function selecionarAgendado(id) {
    agendadoSelecionado = id;
    el("entrega-data").value = buscar(dados.lanche_agendado, id).data;
    renderEntregaLista();
}

function renderEntregaLista() {
    const doDia = dados.lanche_agendado.filter(a => a.data === el("entrega-data").value).sort(porTurno);
    if (!doDia.some(a => a.id === agendadoSelecionado)) agendadoSelecionado = doDia.length ? doDia[0].id : null;

    el("entrega-lista").innerHTML = doDia.length ? doDia.map(a => `
        <button class="opcao-agendado${a.id === agendadoSelecionado ? " selecionado" : ""}" onclick="selecionarAgendado(${a.id})">
            ${turnoTag(a.turno)}
            <span class="opcao-info"><strong>Lanche ${a.fk_lanche}</strong><small>${a.quant_prevista} previstos</small></span>
            ${a.situacao === "entregue" ? `<span class="icone status-ok">task_alt</span>` : `<span class="icone status-pendente">schedule</span>`}
        </button>`).join("") : vazio("event_busy", "Nenhum lanche agendado nesta data.");

    renderEntregaDetalhe();
}

function renderEntregaDetalhe() {
    const agendado = buscar(dados.lanche_agendado, agendadoSelecionado);
    if (!agendado) {
        el("entrega-detalhe").innerHTML = vazio("lunch_dining", "Selecione um lanche agendado para registrar a entrega.");
        return;
    }

    const lanche = buscar(dados.lanche, agendado.fk_lanche);
    const cardapio = buscar(dados.cardapio, lanche.fk_cardapio);
    const entregue = agendado.situacao === "entregue";
    const futuro = !entregue && agendado.data > hoje;
    const bloqueio = entregue || futuro ? " disabled" : "";
    const registros = doRegistro("item_lanche_agendado", "fk_lanche_agendado", agendado.id);

    let rodape = `<div class="aviso aviso-info">${icone("info")}Após confirmar, a entrega não poderá ser alterada e os produtos saem do estoque.</div>
                  <button class="btn btn-primario">${icone("check")}Confirmar entrega</button>`;
    if (entregue) rodape = `<div class="aviso aviso-bloqueio">${icone("lock")}Entrega registrada. Este lanche agendado não pode mais ser alterado.</div>`;
    if (futuro) rodape = `<div class="aviso aviso-info">${icone("event")}Este lanche está agendado para ${formatarData(agendado.data)}. A entrega pode ser registrada a partir desse dia.</div>`;

    el("entrega-detalhe").innerHTML = `
        <form id="form-entrega">
            <div class="detalhe-topo">
                <div class="detalhe-icone">${icone("lunch_dining")}</div>
                <div class="detalhe-titulo">
                    <span class="sobretitulo">${formatarData(agendado.data)} · ${turnos[agendado.turno]}</span>
                    <h3>Lanche ${lanche.id} · ${esc(descricaoLanche(lanche))}</h3>
                    <p>Cardápio ${cardapio.id}: ${esc(cardapio.nome)}</p>
                </div>
                ${entregue ? badge("Entregue", "verde") : badge("Agendado", "azul")}
            </div>
            <div class="resumo-entrega" data-linha>
                <div class="resumo-box"><span>Lanches previstos</span><strong>${agendado.quant_prevista}</strong></div>
                <label class="resumo-box"><span>Lanches entregues</span><input class="input-grande" type="number" name="quant_entregue" min="0" max="${agendado.quant_prevista}" step="1" required value="${entregue ? agendado.quant_entregue : agendado.quant_prevista}" data-planejado="${agendado.quant_prevista}" data-unidade="" oninput="atualizarSobra(this)"${bloqueio}></label>
                <div class="resumo-box"><span>Sobra</span><strong class="sobra"></strong></div>
            </div>
            <div class="tabela-wrap tabela-borda">
                <table class="tabela">
                    <thead><tr><th>Item do lanche</th><th>Referência</th><th class="num">Planejado</th><th class="num">Entregue</th><th class="num">Sobra</th><th>Observação</th></tr></thead>
                    <tbody>${itensLanche(lanche.id).map(item => {
                        const produto = buscar(dados.produto, item.fk_produto);
                        const planejado = arredondar(porLanche(item) * agendado.quant_prevista);
                        const registro = registros.find(r => r.fk_item_lanche === item.id) || { quant_entregue: planejado, observacoes: "" };
                        const ref = referencias[item.referencia_consumo];
                        return `
                            <tr data-linha data-item-lanche="${item.id}">
                                <td><strong>${esc(nomeProduto(produto))}</strong><small>${esc(consumo(item))} por lanche</small></td>
                                <td><span class="ref ${ref.classe}">${ref.nome}</span></td>
                                <td class="num">${num(planejado)} ${esc(embalagem(produto))}</td>
                                <td class="num"><input class="input-tabela" type="number" data-campo="quant_entregue" min="0" max="${planejado}" step="any" required value="${registro.quant_entregue}" data-planejado="${planejado}" data-unidade="${esc(embalagem(produto))}" oninput="atualizarSobra(this)"${bloqueio}></td>
                                <td class="num sobra"></td>
                                <td><input class="input-tabela input-texto" type="text" data-campo="observacoes" placeholder="Opcional" value="${esc(registro.observacoes)}"${bloqueio}></td>
                            </tr>`;
                    }).join("")}</tbody>
                </table>
            </div>
            <label class="campo"><span>Observações</span><textarea name="observacoes" rows="2" placeholder="Ex.: turma em saída de campo"${bloqueio}>${esc(agendado.observacoes)}</textarea></label>
            <div class="detalhe-rodape">${rodape}</div>
        </form>`;

    el("entrega-detalhe").querySelectorAll("[data-planejado]").forEach(atualizarSobra);
}

function atualizarSobra(input) {
    const sobra = arredondar(input.dataset.planejado - input.value) || 0;
    const alvo = input.closest("[data-linha]").querySelector(".sobra");
    alvo.textContent = `${num(sobra)} ${input.dataset.unidade}`.trim();
    alvo.classList.toggle("positiva", sobra > 0);
    alvo.classList.toggle("negativa", sobra < 0);
}

function renderHistorico() {
    const entregues = dados.lanche_agendado
        .filter(a => a.situacao === "entregue")
        .sort((a, b) => b.data.localeCompare(a.data) || a.turno.localeCompare(b.turno));

    el("tabela-historico").innerHTML = entregues.length ? entregues.map(a => {
        const lanche = buscar(dados.lanche, a.fk_lanche);
        const sobra = a.quant_prevista - a.quant_entregue;
        return `
            <tr>
                <td>${formatarData(a.data)}</td>
                <td>${turnoTag(a.turno)}</td>
                <td><strong>Lanche ${lanche.id}</strong><small>${esc(descricaoLanche(lanche))}</small></td>
                <td class="num">${a.quant_prevista}</td>
                <td class="num">${a.quant_entregue}</td>
                <td class="num"><span class="sobra${sobra > 0 ? " positiva" : sobra < 0 ? " negativa" : ""}">${sobra}</span></td>
                <td>${barraPercentual(percentual(a.quant_entregue, a.quant_prevista))}</td>
            </tr>`;
    }).join("") : linhaVazia(7, "history", "Nenhuma entrega de lanche registrada ainda.");
}

function renderCardapios() {
    el("lista-cardapios").innerHTML = dados.cardapio.length ? dados.cardapio.map(c => {
        const vinculados = doRegistro("lanche", "fk_cardapio", c.id).length;
        return `
            <article class="card cartao">
                <div class="cartao-topo">
                    <span class="numero">C${c.id}</span>
                    <div><h3>${esc(c.nome)}</h3><p>${esc(c.descricao)}</p></div>
                </div>
                <ul class="itens">${itensCardapio(c.id).map(item => {
                    const alimento = buscar(dados.alimento, item.fk_alimento);
                    return `<li><i class="natureza-ponto ${alimento.natureza}"></i><span class="item-produto">${esc(alimento.nome)}${item.descricao ? `<small>${esc(item.descricao)}</small>` : ""}</span><strong>${num(item.quant)} ${siglaUnidade(alimento.fk_unidade_medida)}</strong></li>`;
                }).join("")}</ul>
                <div class="cartao-rodape">
                    <span>${vinculados} ${vinculados === 1 ? "lanche vinculado" : "lanches vinculados"}</span>
                    <button class="btn btn-fantasma btn-pequeno" data-editar="cardapio" data-id="${c.id}">${icone("edit")}Editar</button>
                </div>
            </article>`;
    }).join("") : vazio("menu_book", "Nenhum cardápio cadastrado. Cadastre os alimentos e depois monte o primeiro cardápio.", "card");
}

function renderLanches() {
    el("lista-lanches").innerHTML = dados.lanche.length ? dados.lanche.map(l => {
        const cardapio = buscar(dados.cardapio, l.fk_cardapio);
        const bloqueado = lancheBloqueado(l.id);
        return `
            <article class="card cartao">
                <div class="cartao-topo">
                    <span class="numero laranja">L${l.id}</span>
                    <div><h3>${esc(descricaoLanche(l))}</h3><p>Cardápio ${cardapio.id} · ${esc(cardapio.nome)}</p></div>
                </div>
                <ul class="itens">${itensLanche(l.id).map(item => {
                    const ref = referencias[item.referencia_consumo];
                    return `<li><span class="item-produto"><strong>${esc(consumo(item))}</strong><small>${esc(nomeProduto(buscar(dados.produto, item.fk_produto)))}</small></span><span class="ref ${ref.classe}">${ref.nome}</span></li>`;
                }).join("")}</ul>
                <div class="cartao-rodape">
                    ${bloqueado ? `<span class="bloqueado">${icone("lock")}Já entregue, edição bloqueada</span>` : `<span>Disponível para edição</span>`}
                    <button class="btn btn-fantasma btn-pequeno" data-editar="lanche" data-id="${l.id}"${bloqueado ? " disabled" : ""}>${icone("edit")}Editar</button>
                </div>
            </article>`;
    }).join("") : vazio("lunch_dining", "Nenhum lanche cadastrado. Um lanche detalha os produtos de um cardápio.", "card");
}

function renderAlimentos() {
    el("tabela-alimentos").innerHTML = dados.alimento.length ? dados.alimento.map(a => {
        const bebida = a.natureza === "bebida";
        return `
            <tr data-filtro="${a.natureza}">
                <td><div class="celula-nome"><span class="avatar-item ${a.natureza}">${icone(bebida ? "local_drink" : "restaurant")}</span><div><strong>${esc(a.nome)}</strong><small>${esc(a.descricao)}</small></div></div></td>
                <td>${badge(maiuscula(a.natureza), bebida ? "azul" : "laranja")}</td>
                <td>${esc(maiuscula(a.grupo))}</td>
                <td><span class="unidade">${siglaUnidade(a.fk_unidade_medida)}</span></td>
                <td class="num">${doRegistro("produto", "fk_alimento", a.id).length}</td>
                <td class="acoes">${botoesLinha("alimento", a.id)}</td>
            </tr>`;
    }).join("") : linhaVazia(6, "nutrition", "Nenhum alimento cadastrado.");
}

function renderProdutos() {
    el("tabela-produtos").innerHTML = dados.produto.length ? dados.produto.map(p => {
        const alimento = buscar(dados.alimento, p.fk_alimento);
        const bebida = alimento.natureza === "bebida";
        return `
            <tr data-filtro="${alimento.natureza}">
                <td><div class="celula-nome"><span class="avatar-item ${alimento.natureza}">${icone(bebida ? "local_drink" : "inventory_2")}</span><div><strong>${esc(alimento.nome)}</strong><small>${esc(p.descricao)} · cód. ${p.id}</small></div></div></td>
                <td>${num(p.quant_unit_base)} ${siglaUnidade(alimento.fk_unidade_medida)}<small>por ${esc(embalagem(p))}</small></td>
                <td>${p.quant_subitens ? `${num(p.quant_subitens)} ${esc(p.nome_subitem || "subitens")}` : "—"}</td>
                <td class="col-estoque">${barraEstoque(p)}<small>${num(p.total_estoque)} de ${num(provisionado(p.id))} ${esc(embalagem(p))}</small></td>
                <td class="num">${num(provisionado(p.id))} ${esc(embalagem(p))}</td>
                <td class="acoes">${botoesLinha("produto", p.id)}</td>
            </tr>`;
    }).join("") : linhaVazia(6, "inventory_2", "Nenhum produto cadastrado.");
}

function renderFornecedores() {
    el("tabela-fornecedores").innerHTML = dados.fornecedor.length ? dados.fornecedor.map(f => {
        const vigentes = doRegistro("empenho", "fk_fornecedor", f.id).filter(vigente).length;
        const iniciais = f.nome.split(" ").filter(parte => parte.length > 2).slice(0, 2).map(parte => parte[0]).join("") || f.nome[0];
        return `
            <tr>
                <td><div class="celula-nome"><span class="avatar-item">${esc(iniciais.toUpperCase())}</span><div><strong>${esc(f.nome)}</strong><small>${esc(f.email)}</small></div></div></td>
                <td class="mono">${esc(f.cnpj)}</td>
                <td>${esc(f.telefone)}</td>
                <td>${vigentes ? badge(`${vigentes} vigente${vigentes > 1 ? "s" : ""}`, "verde") : badge("Nenhum", "cinza")}</td>
                <td class="acoes">${botoesLinha("fornecedor", f.id)}</td>
            </tr>`;
    }).join("") : linhaVazia(5, "storefront", "Nenhum fornecedor cadastrado.");
}

function renderEmpenhos() {
    const empenhos = [...dados.empenho].sort((a, b) => b.data_inicial.localeCompare(a.data_inicial) || b.id - a.id);
    el("lista-empenhos").innerHTML = empenhos.length ? empenhos.map(e => {
        const itens = itensEmpenho(e.id);
        return `
            <article class="card empenho" data-filtro="${vigente(e) ? "vigente" : "encerrado"}">
                <div class="empenho-topo">
                    <div class="empenho-icone">${icone("receipt_long")}</div>
                    <div class="empenho-titulo"><strong>${esc(e.sigla)}</strong><span>${esc(fornecedorDoEmpenho(e).nome)}</span></div>
                    <div class="empenho-meta">
                        <span>${icone("date_range")}${formatarData(e.data_inicial)} a ${formatarData(e.data_final)}</span>
                        <span>${icone("inventory_2")}${itens.length} ${itens.length === 1 ? "item" : "itens"}</span>
                    </div>
                    ${vigente(e) ? badge("Vigente", "verde") : badge("Encerrado", "cinza")}
                    <button class="btn-icone" data-editar="empenho" data-id="${e.id}" title="Editar">${icone("edit")}</button>
                </div>
                <div class="tabela-wrap tabela-embutida">
                    <table class="tabela">
                        <thead><tr><th>Produto</th><th class="num">Empenhado</th><th class="num">Entregue</th><th class="num">Saldo</th><th>Execução</th></tr></thead>
                        <tbody>${itens.map(item => {
                            const produto = buscar(dados.produto, item.fk_produto);
                            return `
                                <tr>
                                    <td><strong>${esc(nomeProduto(produto))}</strong></td>
                                    <td class="num">${num(item.quant_empenhada)} ${esc(embalagem(produto))}</td>
                                    <td class="num">${num(item.quant_entregue)} ${esc(embalagem(produto))}</td>
                                    <td class="num">${num(item.quant_empenhada - item.quant_entregue)} ${esc(embalagem(produto))}</td>
                                    <td>${barraPercentual(percentual(item.quant_entregue, item.quant_empenhada))}</td>
                                </tr>`;
                        }).join("")}</tbody>
                    </table>
                </div>
            </article>`;
    }).join("") : vazio("receipt_long", "Nenhum empenho registrado.", "card");
}

function renderAgendaEmpenho() {
    const entregas = [...dados.agenda_entrega_empenho].sort((a, b) => b.data_prevista_entrega.localeCompare(a.data_prevista_entrega) || b.id - a.id);
    el("tabela-agenda-empenho").innerHTML = entregas.length ? entregas.map(e => {
        const empenho = buscar(dados.empenho, e.fk_empenho);
        const produto = produtoDaEntrega(e);
        const [texto, cor] = estadosEntrega[e.estado];
        return `
            <tr data-filtro="${e.estado}">
                <td><strong>${esc(empenho.sigla)}</strong><small>${esc(fornecedorDoEmpenho(empenho).nome)}</small></td>
                <td>${esc(nomeProduto(produto))}</td>
                <td>${formatarData(e.data_solicitacao)}</td>
                <td>${formatarData(e.data_prevista_entrega)}</td>
                <td class="num">${num(e.quant_solicitada)} ${esc(embalagem(produto))}</td>
                <td class="num">${e.quant_entregue ? `${num(e.quant_entregue)} ${esc(embalagem(produto))}` : "—"}</td>
                <td>${badge(texto, cor)}</td>
                <td class="acoes">${pendente(e) ? `<a class="btn-mini" href="#recebimento">Receber</a>` : ""}</td>
            </tr>`;
    }).join("") : linhaVazia(8, "local_shipping", "Nenhuma entrega solicitada aos fornecedores.");
}

function renderRecebimento() {
    const pendentes = dados.agenda_entrega_empenho.filter(pendente).sort((a, b) => a.data_prevista_entrega.localeCompare(b.data_prevista_entrega));
    el("lista-recebimento").innerHTML = pendentes.length ? pendentes.map(e => {
        const empenho = buscar(dados.empenho, e.fk_empenho);
        const produto = produtoDaEntrega(e);
        const [texto, cor] = estadosEntrega[e.estado];
        const saldo = precisao(e.quant_solicitada - e.quant_entregue);
        return `
            <article class="card recebimento" data-entrega="${e.id}">
                <div class="recebimento-topo">
                    <div class="data-bloco${e.data_prevista_entrega === hoje ? " hoje" : ""}"><strong>${e.data_prevista_entrega.slice(8)}</strong><span>${mesCurto(e.data_prevista_entrega)}</span></div>
                    <div class="linha-info"><strong>${esc(nomeProduto(produto))}</strong><span>${esc(fornecedorDoEmpenho(empenho).nome)} · ${esc(empenho.sigla)}</span></div>
                    ${badge(texto, cor)}
                </div>
                <div class="recebimento-numeros">
                    <div><span>Solicitado</span><strong>${num(e.quant_solicitada)} ${esc(embalagem(produto))}</strong></div>
                    <div><span>Já recebido</span><strong>${num(e.quant_entregue)} ${esc(embalagem(produto))}</strong></div>
                    <div><span>A receber</span><strong>${num(saldo)} ${esc(embalagem(produto))}</strong></div>
                </div>
                <div class="campos">
                    <label class="campo"><span>Data do recebimento</span><input type="date" data-campo="data_entregue" value="${hoje}" max="${hoje}" required></label>
                    <label class="campo"><span>Quantidade recebida</span><input type="number" data-campo="quant_recebida" min="0.001" max="${saldo}" step="any" value="${saldo}" required></label>
                    <label class="campo campo-largo"><span>Observação</span><input type="text" data-campo="observacao" placeholder="Opcional" value="${esc(e.observacao)}"></label>
                </div>
                <div class="recebimento-acoes">
                    <button class="btn btn-fantasma" data-finalizar="${e.id}">${icone("block")}Finalizar sem completar</button>
                    <button class="btn btn-primario" data-receber="${e.id}">${icone("inventory")}Registrar recebimento</button>
                </div>
            </article>`;
    }).join("") : vazio("move_to_inbox", "Nenhuma entrega aguardando recebimento.", "card");

    const recebidos = dados.agenda_entrega_empenho.filter(e => e.data_entregue).sort((a, b) => b.data_entregue.localeCompare(a.data_entregue) || b.id - a.id);
    el("tabela-recebidos").innerHTML = recebidos.length ? recebidos.map(e => {
        const empenho = buscar(dados.empenho, e.fk_empenho);
        const produto = produtoDaEntrega(e);
        const [texto, cor] = estadosEntrega[e.estado];
        return `
            <tr>
                <td>${formatarData(e.data_entregue)}</td>
                <td><strong>${esc(nomeProduto(produto))}</strong><small>${esc(e.observacao)}</small></td>
                <td>${esc(empenho.sigla)}<small>${esc(fornecedorDoEmpenho(empenho).nome)}</small></td>
                <td class="num">${num(e.quant_solicitada)} ${esc(embalagem(produto))}</td>
                <td class="num">${num(e.quant_entregue)} ${esc(embalagem(produto))}</td>
                <td>${badge(texto, cor)}</td>
            </tr>`;
    }).join("") : linhaVazia(6, "inventory", "Nenhum recebimento registrado.");
}

function renderizarTudo() {
    renderInicio();
    renderSemana();
    renderEntregaLista();
    renderHistorico();
    renderCardapios();
    renderLanches();
    renderAlimentos();
    renderProdutos();
    renderFornecedores();
    renderEmpenhos();
    renderAgendaEmpenho();
    renderRecebimento();
    document.querySelectorAll("[data-filtragem]").forEach(filtrar);
}

async function atualizar() {
    Object.assign(dados, await banco.listarTudo());
    renderizarTudo();
}

// ---------------------------------------------------------------------------------------------
// Formulários de cadastro

const opcoesSelect = {
    unidades: () => dados.unidade_medida.map(u => [u.id, nomeUnidade(u.id)]),
    alimentos: () => ordenado(dados.alimento, a => a.nome).map(a => [a.id, `${a.nome} (${unidadeAlimento(a.id)})`]),
    produtos: () => ordenado(dados.produto, nomeProduto).map(p => [p.id, nomeProduto(p)]),
    fornecedores: () => ordenado(dados.fornecedor, f => f.nome).map(f => [f.id, f.nome]),
    empenhos: () => dados.empenho.filter(vigente).map(e => [e.id, `${e.sigla} · ${fornecedorDoEmpenho(e).nome}`]),
    cardapios: () => dados.cardapio.map(c => [c.id, `Cardápio ${c.id} · ${c.nome}`]),
    lanches: () => dados.lanche.map(l => [l.id, `Lanche ${l.id} · ${descricaoLanche(l)}`])
};

function preencherSelects(form) {
    form.querySelectorAll("select[data-opcoes]").forEach(select => {
        const lista = opcoesSelect[select.dataset.opcoes]();
        select.innerHTML = opcoes(lista, lista.length ? "Selecione" : "Nenhum cadastrado");
    });
}

// Campos com nome "id" ou "fk_..." guardam chaves (números), como no banco.
function valorCampo(campo) {
    if (campo instanceof RadioNodeList) return campo.value;
    const nome = campo.name || campo.dataset.campo;
    if (campo.type !== "number" && nome !== "id" && !nome.startsWith("fk_")) return campo.value;
    return campo.value === "" ? null : Number(campo.value);
}

function lerFormulario(form) {
    const nomes = new Set([...form.elements].map(campo => campo.name).filter(Boolean));
    return Object.fromEntries([...nomes].map(nome => [nome, valorCampo(form.elements[nome])]));
}

function lerLinhas(form) {
    return [...form.querySelectorAll(".linha-item")].map(linha => {
        const item = linha.dataset.id ? { id: Number(linha.dataset.id) } : {};
        linha.querySelectorAll("[data-campo]").forEach(campo => item[campo.dataset.campo] = valorCampo(campo));
        return item;
    });
}

function preencherCampos(form, registro) {
    for (const [campo, valor] of Object.entries(registro)) {
        if (campo !== "id" && form.elements[campo]) form.elements[campo].value = valor ?? "";
    }
}

function preencherLinha(linha, item) {
    if (item.id) linha.dataset.id = item.id;
    linha.querySelectorAll("[data-campo]").forEach(campo => campo.value = item[campo.dataset.campo] ?? "");
}

function limparLinha(linha) {
    delete linha.dataset.id;
    linha.querySelectorAll("input").forEach(campo => campo.value = "");
    linha.querySelectorAll("select").forEach(campo => campo.selectedIndex = 0);
    return linha;
}

function definirLinhas(form, quantidade) {
    const lista = form.querySelector(".itens-form");
    [...lista.children].slice(1).forEach(linha => linha.remove());
    limparLinha(lista.firstElementChild);
    while (lista.children.length < quantidade) lista.append(limparLinha(lista.firstElementChild.cloneNode(true)));
    return [...lista.children];
}

function adicionarLinha(botao) {
    const nova = limparLinha(botao.previousElementSibling.firstElementChild.cloneNode(true));
    botao.previousElementSibling.append(nova);
    sincronizar(nova);
}

function semRepetir(valores, mensagem) {
    if (new Set(valores).size !== valores.length) throw new banco.ErroBanco(mensagem);
}

function abrirFormulario(tabela, id, extras = {}) {
    const form = document.querySelector(`form[data-tabela="${tabela}"]`);
    const registro = id ? buscar(dados[tabela], id) : null;
    form.reset();
    form.querySelector(".erro-formulario")?.remove();
    preencherSelects(form);
    form.elements.id.value = registro ? registro.id : "";
    formularios[tabela].preencher(form, registro, extras);
    sincronizar(form);
    const excluir = form.querySelector("[data-excluir]");
    if (excluir) excluir.hidden = !registro;
    form.closest("dialog").showModal();
}

function preencherSimples(form, registro) {
    if (registro) preencherCampos(form, registro);
}

function salvarSimples(form) {
    return banco.salvar(form.dataset.tabela, lerFormulario(form));
}

function preencherAgendamento(form, registro, extras) {
    form.elements.data.min = registro ? "" : hoje;
    if (registro) return preencherCampos(form, registro);
    form.elements.data.value = extras.data || hoje;
    form.elements.turno.value = extras.turno || "manha";
}

function preencherCardapio(form, registro) {
    const itens = registro ? itensCardapio(registro.id) : [];
    if (registro) preencherCampos(form, registro);
    definirLinhas(form, itens.length || 2).forEach((linha, i) => itens[i] && preencherLinha(linha, itens[i]));
}

function salvarCardapio(form) {
    const { id, nome, descricao } = lerFormulario(form);
    const itens = lerLinhas(form);
    semRepetir(itens.map(item => item.fk_alimento), "Um alimento aparece mais de uma vez no cardápio.");
    return banco.transacao(async t => {
        const cardapio = await t.salvar("cardapio", { id, nome, descricao });
        for (const { fk_alimento, quant, descricao: descricaoItem } of itens)
            await t.salvar("item_cardapio", { fk_cardapio: cardapio, fk_alimento, quant, descricao: descricaoItem });
        for (const antigo of await t.buscar("item_cardapio", "fk_cardapio", cardapio))
            if (!itens.some(item => item.fk_alimento === antigo.fk_alimento)) await t.excluir("item_cardapio", [cardapio, antigo.fk_alimento]);
    });
}

function preencherLanche(form, registro) {
    const itens = registro ? itensLanche(registro.id) : [];
    if (registro) preencherCampos(form, registro);
    const linhas = definirLinhas(form, itens.length || 2);
    filtrarProdutosLanche(form);
    linhas.forEach((linha, i) => itens[i] && preencherLinha(linha, itens[i]));
}

// Os itens do lanche são recriados a cada gravação: enquanto o lanche não foi entregue,
// nenhum outro registro aponta para eles.
function salvarLanche(form) {
    const { id, fk_cardapio, descricao } = lerFormulario(form);
    const itens = lerLinhas(form);
    return banco.transacao(async t => {
        if (id) for (const antigo of await t.buscar("item_lanche", "fk_lanche", id)) await t.excluir("item_lanche", antigo.id);
        const lanche = await t.salvar("lanche", { id, fk_cardapio, descricao });
        for (const { fk_produto, referencia_consumo, quant_consumida, conversao_subitens } of itens)
            await t.salvar("item_lanche", { fk_lanche: lanche, fk_produto, referencia_consumo, quant_consumida, conversao_subitens });
    });
}

function preencherEmpenho(form, registro) {
    const itens = registro ? itensEmpenho(registro.id) : [];
    if (registro) preencherCampos(form, registro);
    form.elements.data_final.min = registro ? registro.data_inicial : "";
    definirLinhas(form, itens.length || 1).forEach((linha, i) => itens[i] && preencherLinha(linha, itens[i]));
}

// Os itens de empenho mantêm o id, porque as entregas solicitadas apontam para eles.
function salvarEmpenho(form) {
    const { id, sigla, fk_fornecedor, data_inicial, data_final } = lerFormulario(form);
    const itens = lerLinhas(form);
    semRepetir(itens.map(item => item.fk_produto), "Um produto aparece mais de uma vez no empenho.");
    return banco.transacao(async t => {
        const empenho = await t.salvar("empenho", { id, sigla, fk_fornecedor, data_inicial, data_final });
        for (const antigo of await t.buscar("item_empenho", "fk_empenho", empenho))
            if (!itens.some(item => item.id === antigo.id)) await t.excluir("item_empenho", antigo.id);
        for (const item of itens) {
            const atual = item.id ? await t.obter("item_empenho", item.id) : {};
            await t.salvar("item_empenho", { ...atual, fk_empenho: empenho, fk_produto: item.fk_produto, quant_empenhada: item.quant_empenhada });
        }
    });
}

function preencherSolicitacao(form) {
    form.elements.data_prevista_entrega.min = hoje;
}

function salvarSolicitacao(form) {
    return banco.salvar("agenda_entrega_empenho", { ...lerFormulario(form), data_solicitacao: hoje });
}

function mostrarUnidade(select) {
    el("produto-unidade").textContent = select.value ? unidadeAlimento(Number(select.value)) : "—";
}

function mostrarUnidadeLinha(select) {
    select.closest(".linha-item").querySelector("[data-unidade]").textContent = select.value ? unidadeAlimento(Number(select.value)) : "";
}

// Máscaras de digitação; o banco também confere e padroniza esses formatos.
const mascaras = {
    cnpj: valor => {
        const c = valor.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 14);
        return [c.slice(0, 2), c.slice(2, 5), c.slice(5, 8)].filter(Boolean).join(".") + (c.length > 8 ? `/${c.slice(8, 12)}` : "") + (c.length > 12 ? `-${c.slice(12)}` : "");
    },
    telefone: valor => {
        const d = valor.replace(/\D/g, "").slice(0, 11);
        if (d.length <= 2) return d && `(${d}`;
        const meio = d.length > 10 ? 5 : 4;
        return `(${d.slice(0, 2)}) ${d.slice(2, 2 + meio)}${d.length > 2 + meio ? `-${d.slice(2 + meio)}` : ""}`;
    }
};

function preencherItensEmpenho(form) {
    const empenho = buscar(dados.empenho, Number(form.elements.fk_empenho.value));
    const select = form.elements.fk_item_empenho;
    select.innerHTML = empenho
        ? opcoes(itensEmpenho(empenho.id).map(item => {
            const produto = buscar(dados.produto, item.fk_produto);
            return [item.id, `${nomeProduto(produto)} · saldo ${num(saldoItemEmpenho(item))} ${embalagem(produto)}`];
        }), "Selecione")
        : opcoes([], "Selecione o empenho");
    select.disabled = !empenho;
    limitarQuantidade(form);
}

function limitarQuantidade(form) {
    const item = buscar(dados.item_empenho, Number(form.elements.fk_item_empenho.value));
    const quantidade = form.elements.quant_solicitada;
    if (item) quantidade.max = saldoItemEmpenho(item);
    else quantidade.removeAttribute("max");
}

function filtrarProdutosLanche(form) {
    const cardapio = Number(form.elements.fk_cardapio.value);
    const alimentos = itensCardapio(cardapio).map(item => item.fk_alimento);
    const permitidos = dados.produto.filter(p => alimentos.includes(p.fk_alimento));
    const textoVazio = !cardapio ? "Selecione o cardápio" : permitidos.length ? "Selecione" : "Nenhum produto dos alimentos do cardápio";
    form.querySelectorAll("[data-campo=fk_produto]").forEach(select => {
        const atual = select.value;
        select.innerHTML = opcoes(permitidos.map(p => [p.id, nomeProduto(p)]), textoVazio);
        select.value = atual;
        if (select.selectedIndex < 0) select.selectedIndex = 0;
        select.disabled = !cardapio;
        ajustarReferencia(select.closest(".linha-item"));
    });
}

function ajustarReferencia(linha) {
    const produto = buscar(dados.produto, Number(linha.querySelector("[data-campo=fk_produto]").value));
    const referencia = linha.querySelector("[data-campo=referencia_consumo]");
    const conversao = linha.querySelector("[data-campo=conversao_subitens]");
    referencia.querySelector("[value=unidade_base]").disabled = Boolean(produto) && unidadeAlimento(produto.fk_alimento) === "un";
    referencia.querySelector("[value=subitens]").disabled = Boolean(produto) && !produto.quant_subitens;
    if (referencia.selectedOptions[0].disabled) referencia.value = "inteiro";
    conversao.disabled = referencia.value !== "subitens";
    conversao.placeholder = produto && produto.quant_subitens ? `Auto (${num(produto.quant_subitens)})` : "Auto";
    if (conversao.disabled) conversao.value = "";
    linha.querySelector("[data-unidade]").textContent = unidadeConsumo(referencia.value, produto);
}

// ---------------------------------------------------------------------------------------------
// Gravações

function mensagemDeErro(erro) {
    if (erro instanceof banco.ErroBanco) return erro.message;
    console.error(erro);
    return "Não foi possível concluir a operação. Veja os detalhes no console do navegador.";
}

function mostrarErroNoFormulario(form, texto) {
    const caixa = form.querySelector(".erro-formulario") || form.querySelector(".modal-corpo").appendChild(document.createElement("div"));
    caixa.className = "aviso aviso-erro erro-formulario";
    caixa.innerHTML = `${icone("error")}<span></span>`;
    caixa.lastElementChild.textContent = texto;
    caixa.scrollIntoView({ block: "nearest" });
}

// Executa uma gravação, mostra o erro (no formulário aberto ou no aviso) e atualiza as telas.
async function executar(acao, mensagem, formulario) {
    try {
        await acao();
    } catch (erro) {
        if (formulario) mostrarErroNoFormulario(formulario, mensagemDeErro(erro));
        else mostrarToast(mensagemDeErro(erro), "erro");
        return false;
    }
    formulario?.closest("dialog").close();
    await atualizar();
    mostrarToast(mensagem);
    return true;
}

async function comBotao(botao, tarefa) {
    if (botao) botao.disabled = true;
    try {
        return await tarefa();
    } finally {
        if (botao) botao.disabled = false;
    }
}

function enviarFormulario(form) {
    const { salvar, salvo } = formularios[form.dataset.tabela];
    return executar(() => salvar(form), salvo, form);
}

function excluirRegistro(botao) {
    const tabela = botao.dataset.excluir;
    const id = Number(botao.dataset.id || botao.form?.elements.id.value);
    if (!id || !confirm("Excluir este registro? Esta ação não pode ser desfeita.")) return;
    const formulario = botao.closest("dialog") ? botao.form : null;
    return comBotao(botao, () => executar(() => banco.excluir(tabela, id), formularios[tabela].excluido, formulario));
}

function confirmarEntrega(form) {
    const agendado = buscar(dados.lanche_agendado, agendadoSelecionado);
    const registro = { ...agendado, situacao: "entregue", quant_entregue: Number(form.elements.quant_entregue.value), observacoes: form.elements.observacoes.value };
    const itens = [...form.querySelectorAll("[data-item-lanche]")].map(linha => ({
        fk_lanche_agendado: agendado.id,
        fk_item_lanche: Number(linha.dataset.itemLanche),
        quant_entregue: Number(linha.querySelector("[data-campo=quant_entregue]").value),
        observacoes: linha.querySelector("[data-campo=observacoes]").value
    }));
    if (!confirm("Confirmar a entrega? Depois de registrada, ela não pode mais ser alterada.")) return;
    return executar(() => banco.transacao(async t => {
        await t.salvar("lanche_agendado", registro);
        for (const item of itens) await t.salvar("item_lanche_agendado", item);
    }), "Entrega registrada. Os produtos saíram do estoque.");
}

function registrarRecebimento(id, botao) {
    const card = botao.closest("[data-entrega]");
    const data = card.querySelector("[data-campo=data_entregue]");
    const quantidade = card.querySelector("[data-campo=quant_recebida]");
    if (!data.reportValidity() || !quantidade.reportValidity()) return;
    const entrega = buscar(dados.agenda_entrega_empenho, id);
    const total = precisao(entrega.quant_entregue + Number(quantidade.value));
    return comBotao(botao, () => executar(() => banco.salvar("agenda_entrega_empenho", {
        ...entrega,
        quant_entregue: total,
        data_entregue: data.value,
        observacao: card.querySelector("[data-campo=observacao]").value,
        estado: total >= entrega.quant_solicitada ? "entrega_total" : "entrega_parcial"
    }), "Recebimento registrado. O estoque do produto foi atualizado."));
}

function finalizarEntrega(id, botao) {
    if (!confirm("Finalizar esta solicitação sem completar? O que falta receber volta ao saldo do empenho.")) return;
    const entrega = buscar(dados.agenda_entrega_empenho, id);
    const observacao = botao.closest("[data-entrega]").querySelector("[data-campo=observacao]").value;
    return comBotao(botao, () => executar(() => banco.salvar("agenda_entrega_empenho", { ...entrega, estado: "finalizado", observacao }),
        "Solicitação finalizada. O restante voltou ao saldo do empenho."));
}

// ---------------------------------------------------------------------------------------------
// Eventos

function filtrar(area) {
    const termo = (area.querySelector(".busca input")?.value || "").toLowerCase();
    const filtro = area.querySelector(".chips .ativo")?.dataset.filtro || "";
    area.querySelectorAll("[data-itens] > *").forEach(item => {
        if (item.matches(".linha-vazia, .vazio")) return;
        item.hidden = !item.textContent.toLowerCase().includes(termo) || (filtro && item.dataset.filtro !== filtro);
    });
}

let temporizadorToast;

function mostrarToast(texto, tipo = "ok") {
    const erro = tipo === "erro";
    el("toast-texto").textContent = texto;
    el("toast-icone").textContent = erro ? "error" : "check_circle";
    el("toast").classList.toggle("erro", erro);
    el("toast").classList.add("visivel");
    clearTimeout(temporizadorToast);
    temporizadorToast = setTimeout(() => el("toast").classList.remove("visivel"), erro ? 6000 : 2600);
}

document.addEventListener("click", evento => {
    const alvo = evento.target;

    const novo = alvo.closest("[data-novo]");
    if (novo) abrirFormulario(novo.dataset.novo, null, novo.dataset);

    const editar = alvo.closest("[data-editar]");
    if (editar && !editar.disabled) abrirFormulario(editar.dataset.editar, Number(editar.dataset.id));

    const excluir = alvo.closest("[data-excluir]");
    if (excluir && !excluir.disabled) excluirRegistro(excluir);

    const receber = alvo.closest("[data-receber]");
    if (receber && !receber.disabled) registrarRecebimento(Number(receber.dataset.receber), receber);

    const finalizar = alvo.closest("[data-finalizar]");
    if (finalizar && !finalizar.disabled) finalizarEntrega(Number(finalizar.dataset.finalizar), finalizar);

    if (alvo.closest("[data-fechar]")) alvo.closest("dialog").close();
    if (alvo.matches("dialog")) alvo.close();

    const chip = alvo.closest(".chips button");
    if (chip) {
        chip.parentElement.querySelectorAll("button").forEach(botao => botao.classList.toggle("ativo", botao === chip));
        filtrar(chip.closest("[data-filtragem]"));
    }

    const adicionar = alvo.closest("[data-adicionar]");
    if (adicionar) adicionarLinha(adicionar);

    const remover = alvo.closest("[data-remover]");
    if (remover && remover.closest(".itens-form").children.length > 1) remover.closest(".linha-item").remove();
});

document.addEventListener("submit", evento => {
    const form = evento.target;
    evento.preventDefault();
    if (form.id === "form-entrega") comBotao(evento.submitter, () => confirmarEntrega(form));
    else if (form.dataset.tabela) comBotao(evento.submitter, () => enviarFormulario(form));
});

document.addEventListener("input", evento => {
    const mascara = mascaras[evento.target.dataset.mascara];
    if (mascara) evento.target.value = mascara(evento.target.value);
    if (evento.target.closest(".busca")) filtrar(evento.target.closest("[data-filtragem]"));
});

async function iniciar() {
    el("data-hoje").textContent = new Date(`${hoje}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" });
    el("entrega-data").value = hoje;
    window.addEventListener("hashchange", navegar);
    navegar();
    try {
        await atualizar();
    } catch (erro) {
        console.error(erro);
        mostrarToast("Não foi possível abrir o banco de dados do navegador. Veja os detalhes no console.", "erro");
    }
}

iniciar();
