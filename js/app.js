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

const nomesDias = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];

const el = id => document.getElementById(id);
const buscar = (lista, id) => lista.find(item => item.id === id);
const num = valor => valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
const arredondar = valor => Math.round(valor * 10) / 10;
const formatarData = iso => iso.split("-").reverse().join("/");
const diaMes = iso => `${iso.slice(8)}/${iso.slice(5, 7)}`;
const mesCurto = iso => new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
const icone = nome => `<span class="icone">${nome}</span>`;
const badge = (texto, cor) => `<span class="badge badge-${cor}">${texto}</span>`;
const pendente = entrega => entrega.estado === "agendado" || entrega.estado === "entrega_parcial";
const botoesLinha = modal => `<button class="btn-icone" data-modal="${modal}" title="Editar">${icone("edit")}</button><button class="btn-icone" title="Excluir">${icone("delete")}</button>`;

let semanaAtual = segundaDaSemana(hoje);
let agendadoSelecionado = null;

function somarDias(iso, dias) {
    const data = new Date(`${iso}T12:00:00`);
    data.setDate(data.getDate() + dias);
    return data.toISOString().slice(0, 10);
}

function segundaDaSemana(iso) {
    const data = new Date(`${iso}T12:00:00`);
    return somarDias(iso, -((data.getDay() + 6) % 7));
}

function nomeProduto(produto) {
    return `${buscar(alimentos, produto.alimento).nome} · ${produto.descricao}`;
}

function itensVigentes(produtoId) {
    return empenhos.filter(e => e.situacao === "vigente").flatMap(e => e.itens).filter(i => i.produto === produtoId);
}

function provisionado(produtoId) {
    return itensVigentes(produtoId).reduce((total, item) => total + item.empenhada, 0);
}

function saldoEmpenho(produtoId) {
    return itensVigentes(produtoId).reduce((total, item) => total + item.empenhada - item.entregue, 0);
}

function fornecedorDoEmpenho(empenhoId) {
    return buscar(fornecedores, buscar(empenhos, empenhoId).fornecedor);
}

function consumo(item) {
    const produto = buscar(produtos, item.produto);
    if (item.referencia === "inteiro") return `${num(item.quant)} ${produto.embalagem}`;
    if (item.referencia === "unidade_base") return `${num(item.quant)} ${buscar(alimentos, produto.alimento).unidade}`;
    return `${num(item.quant)} ${produto.nomeSubitem}`;
}

function porLanche(item) {
    const produto = buscar(produtos, item.produto);
    if (item.referencia === "inteiro") return item.quant;
    if (item.referencia === "unidade_base") return item.quant / produto.quantUnitBase;
    return item.quant / (item.conversao || produto.subitens);
}

function lancheBloqueado(lancheId) {
    return agendados.some(a => a.lanche === lancheId && a.situacao === "entregue");
}

function turnoTag(turno) {
    const manha = turno === "Manhã";
    return `<span class="turno-tag ${manha ? "manha" : "tarde"}">${icone(manha ? "wb_sunny" : "wb_twilight")}${turno}</span>`;
}

function barraEstoque(produto) {
    const total = provisionado(produto.id);
    const pct = total ? Math.min(100, produto.estoque / total * 100) : 0;
    const nivel = pct < 5 ? "critico" : pct < 15 ? "atencao" : "ok";
    return `<div class="barra"><i class="${nivel}" style="width:${Math.max(pct, 2)}%"></i></div>`;
}

function barraPercentual(pct) {
    return `<div class="percentual"><div class="barra"><i class="ok" style="width:${pct}%"></i></div><span>${pct}%</span></div>`;
}

function situacaoNecessidade(produto, necessario) {
    if (necessario <= produto.estoque) return ["Estoque suficiente", "verde", ""];
    if (necessario <= produto.estoque + saldoEmpenho(produto.id)) return ["Solicitar entrega", "laranja", `<a class="btn-mini" href="#agenda-empenho">Solicitar entrega</a>`];
    return ["Sem empenho", "vermelho", `<a class="btn-mini" href="#empenhos">Cadastrar empenho</a>`];
}

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

function renderInicio() {
    const doDia = agendados.filter(a => a.data === hoje);
    const pendentes = entregasEmpenho.filter(pendente).sort((a, b) => a.dataPrevista.localeCompare(b.dataPrevista));
    const vigentes = empenhos.filter(e => e.situacao === "vigente");

    el("inicio-data").textContent = new Date(`${hoje}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    el("stat-lanches").textContent = doDia.reduce((total, a) => total + a.quantidade, 0);
    el("stat-lanches-info").textContent = `${doDia.length} opções em ${new Set(doDia.map(a => a.turno)).size} turnos`;
    el("stat-entregas").textContent = pendentes.length;
    el("stat-abaixo").textContent = necessidade.filter(n => n.necessario > buscar(produtos, n.produto).estoque).length;
    el("stat-empenhos").textContent = vigentes.length;
    el("stat-empenhos-info").textContent = `${new Set(vigentes.map(e => e.fornecedor)).size} fornecedores`;

    el("inicio-lanches").innerHTML = doDia.map(a => {
        const lanche = buscar(lanches, a.lanche);
        return `
            <li class="linha-lista">
                ${turnoTag(a.turno)}
                <div class="linha-info"><strong>Lanche ${lanche.id}</strong><span>${lanche.descricao}</span></div>
                <div class="linha-qtd"><strong>${a.quantidade}</strong><span>previstos</span></div>
                ${a.situacao === "entregue" ? badge("Entregue", "verde") : `<a class="btn-mini" href="#entrega-lanche" onclick="selecionarAgendado(${a.id})">Registrar</a>`}
            </li>`;
    }).join("");

    el("inicio-entregas").innerHTML = pendentes.slice(0, 5).map(e => {
        const produto = buscar(produtos, e.produto);
        const [texto, cor] = estadosEntrega[e.estado];
        return `
            <li class="linha-lista">
                <div class="data-bloco${e.dataPrevista === hoje ? " hoje" : ""}"><strong>${e.dataPrevista.slice(8)}</strong><span>${mesCurto(e.dataPrevista)}</span></div>
                <div class="linha-info"><strong>${nomeProduto(produto)}</strong><span>${fornecedorDoEmpenho(e.empenho).nome}</span></div>
                <div class="linha-qtd"><strong>${num(e.quantSolicitada - e.quantEntregue)}</strong><span>${produto.embalagem}</span></div>
                ${badge(texto, cor)}
            </li>`;
    }).join("");

    el("inicio-estoque").innerHTML = produtos.filter(p => provisionado(p.id) > 0).map(p => `
        <div class="estoque-item">
            <div class="estoque-nome"><strong>${buscar(alimentos, p.alimento).nome}</strong><span>${p.descricao}</span></div>
            ${barraEstoque(p)}
            <div class="estoque-valores"><span>${num(p.estoque)} ${p.embalagem} disponíveis</span><span>de ${num(provisionado(p.id))}</span></div>
        </div>`).join("");
}

function mudarSemana(passo) {
    semanaAtual = passo === 0 ? segundaDaSemana(hoje) : somarDias(semanaAtual, passo * 7);
    renderSemana();
}

function chipLanche(agendado) {
    const lanche = buscar(lanches, agendado.lanche);
    return `<div class="lanche-chip ${agendado.situacao}"><strong>Lanche ${lanche.id}</strong><em>${agendado.quantidade}</em><span>${lanche.descricao}</span></div>`;
}

function renderSemana() {
    const dias = [0, 1, 2, 3, 4].map(n => somarDias(semanaAtual, n));
    el("semana-titulo").textContent = `${diaMes(dias[0])} a ${formatarData(dias[4])}`;
    el("semana").innerHTML = dias.map((dia, i) => `
        <div class="dia${dia === hoje ? " hoje" : ""}">
            <div class="dia-topo"><span>${nomesDias[i]}</span><strong>${diaMes(dia)}</strong>${dia === hoje ? `<em>Hoje</em>` : ""}</div>
            ${["Manhã", "Tarde"].map(turno => `
                <div class="turno">
                    <h4>${icone(turno === "Manhã" ? "wb_sunny" : "wb_twilight")}${turno}</h4>
                    ${agendados.filter(a => a.data === dia && a.turno === turno).map(chipLanche).join("")}
                    ${dia >= hoje ? `<button class="add-lanche" data-modal="modal-agendamento">${icone("add")}Adicionar</button>` : ""}
                </div>`).join("")}
        </div>`).join("");
}

function renderNecessidade() {
    el("previsao-periodo").textContent = `${formatarData(semanaPrevisao.inicio)} a ${formatarData(semanaPrevisao.fim)}`;
    el("tabela-necessidade").innerHTML = necessidade.map(n => {
        const produto = buscar(produtos, n.produto);
        const [texto, cor, acao] = situacaoNecessidade(produto, n.necessario);
        return `
            <tr>
                <td><strong>${nomeProduto(produto)}</strong></td>
                <td class="num">${num(n.necessario)} ${produto.embalagem}</td>
                <td class="num">${num(produto.estoque)} ${produto.embalagem}</td>
                <td class="num">${num(saldoEmpenho(produto.id))} ${produto.embalagem}</td>
                <td>${badge(texto, cor)}</td>
                <td class="acoes">${acao}</td>
            </tr>`;
    }).join("");
}

function selecionarAgendado(id) {
    agendadoSelecionado = id;
    el("entrega-data").value = buscar(agendados, id).data;
    renderEntregaLista();
}

function renderEntregaLista() {
    const doDia = agendados.filter(a => a.data === el("entrega-data").value);
    if (!doDia.some(a => a.id === agendadoSelecionado)) agendadoSelecionado = doDia.length ? doDia[0].id : null;

    el("entrega-lista").innerHTML = doDia.length ? doDia.map(a => `
        <button class="opcao-agendado${a.id === agendadoSelecionado ? " selecionado" : ""}" onclick="selecionarAgendado(${a.id})">
            ${turnoTag(a.turno)}
            <span class="opcao-info"><strong>Lanche ${a.lanche}</strong><small>${a.quantidade} previstos</small></span>
            ${a.situacao === "entregue" ? `<span class="icone status-ok">task_alt</span>` : `<span class="icone status-pendente">schedule</span>`}
        </button>`).join("") : `<div class="vazio">${icone("event_busy")}<p>Nenhum lanche agendado nesta data.</p></div>`;

    renderEntregaDetalhe();
}

function renderEntregaDetalhe() {
    const agendado = buscar(agendados, agendadoSelecionado);
    if (!agendado) {
        el("entrega-detalhe").innerHTML = `<div class="vazio">${icone("lunch_dining")}<p>Selecione um lanche agendado para registrar a entrega.</p></div>`;
        return;
    }

    const lanche = buscar(lanches, agendado.lanche);
    const cardapio = buscar(cardapios, lanche.cardapio);
    const entregue = agendado.situacao === "entregue";
    const bloqueio = entregue ? " disabled" : "";
    const proporcao = entregue ? agendado.entregues / agendado.quantidade : 1;
    const entregues = entregue ? agendado.entregues : agendado.quantidade;

    el("entrega-detalhe").innerHTML = `
        <div class="detalhe-topo">
            <div class="detalhe-icone">${icone("lunch_dining")}</div>
            <div class="detalhe-titulo">
                <span class="sobretitulo">${formatarData(agendado.data)} · ${agendado.turno}</span>
                <h3>Lanche ${lanche.id} · ${lanche.descricao}</h3>
                <p>Cardápio ${cardapio.id}: ${cardapio.nome}</p>
            </div>
            ${entregue ? badge("Entregue", "verde") : badge("Agendado", "azul")}
        </div>
        <div class="resumo-entrega" data-linha>
            <div class="resumo-box"><span>Lanches previstos</span><strong>${agendado.quantidade}</strong></div>
            <label class="resumo-box"><span>Lanches entregues</span><input class="input-grande" type="number" min="0" value="${entregues}" data-planejado="${agendado.quantidade}" data-unidade="" oninput="atualizarSobra(this)"${bloqueio}></label>
            <div class="resumo-box"><span>Sobra</span><strong class="sobra"></strong></div>
        </div>
        <div class="tabela-wrap tabela-borda">
            <table class="tabela">
                <thead><tr><th>Item do lanche</th><th>Referência</th><th class="num">Planejado</th><th class="num">Entregue</th><th class="num">Sobra</th></tr></thead>
                <tbody>${lanche.itens.map(item => {
                    const produto = buscar(produtos, item.produto);
                    const planejado = arredondar(porLanche(item) * agendado.quantidade);
                    const ref = referencias[item.referencia];
                    return `
                        <tr data-linha>
                            <td><strong>${nomeProduto(produto)}</strong><small>${consumo(item)} por lanche</small></td>
                            <td><span class="ref ${ref.classe}">${ref.nome}</span></td>
                            <td class="num">${num(planejado)} ${produto.embalagem}</td>
                            <td class="num"><input class="input-tabela" type="number" min="0" step="0.1" value="${arredondar(planejado * proporcao)}" data-planejado="${planejado}" data-unidade="${produto.embalagem}" oninput="atualizarSobra(this)"${bloqueio}></td>
                            <td class="num sobra"></td>
                        </tr>`;
                }).join("")}</tbody>
            </table>
        </div>
        <label class="campo"><span>Observações</span><textarea rows="2" placeholder="Ex.: turma em saída de campo"${bloqueio}>${agendado.observacoes}</textarea></label>
        <div class="detalhe-rodape">
            ${entregue
                ? `<div class="aviso aviso-bloqueio">${icone("lock")}Entrega registrada. Este lanche agendado não pode mais ser alterado.</div>`
                : `<div class="aviso aviso-info">${icone("info")}Após confirmar, a entrega não poderá ser alterada.</div>
                   <button class="btn btn-primario" data-toast="Entrega registrada com sucesso">${icone("check")}Confirmar entrega</button>`}
        </div>`;

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
    el("tabela-historico").innerHTML = agendados
        .filter(a => a.situacao === "entregue")
        .sort((a, b) => b.data.localeCompare(a.data) || a.turno.localeCompare(b.turno))
        .map(a => {
            const lanche = buscar(lanches, a.lanche);
            const sobra = a.quantidade - a.entregues;
            return `
                <tr>
                    <td>${formatarData(a.data)}</td>
                    <td>${turnoTag(a.turno)}</td>
                    <td><strong>Lanche ${lanche.id}</strong><small>${lanche.descricao}</small></td>
                    <td class="num">${a.quantidade}</td>
                    <td class="num">${a.entregues}</td>
                    <td class="num"><span class="sobra${sobra ? " positiva" : ""}">${sobra}</span></td>
                    <td>${barraPercentual(Math.round(a.entregues / a.quantidade * 100))}</td>
                </tr>`;
        }).join("");
}

function renderCardapios() {
    el("lista-cardapios").innerHTML = cardapios.map(c => {
        const vinculados = lanches.filter(l => l.cardapio === c.id).length;
        return `
            <article class="card cartao">
                <div class="cartao-topo">
                    <span class="numero">C${c.id}</span>
                    <div><h3>${c.nome}</h3><p>${c.descricao}</p></div>
                </div>
                <ul class="itens">${c.itens.map(item => {
                    const alimento = buscar(alimentos, item.alimento);
                    return `<li><i class="natureza-ponto ${alimento.natureza.toLowerCase()}"></i>${alimento.nome}<strong>${num(item.quant)} ${alimento.unidade}</strong></li>`;
                }).join("")}</ul>
                <div class="cartao-rodape">
                    <span>${vinculados} ${vinculados === 1 ? "lanche vinculado" : "lanches vinculados"}</span>
                    <button class="btn btn-fantasma btn-pequeno" data-modal="modal-cardapio">${icone("edit")}Editar</button>
                </div>
            </article>`;
    }).join("");
}

function renderLanches() {
    el("lista-lanches").innerHTML = lanches.map(l => {
        const cardapio = buscar(cardapios, l.cardapio);
        const bloqueado = lancheBloqueado(l.id);
        return `
            <article class="card cartao">
                <div class="cartao-topo">
                    <span class="numero laranja">L${l.id}</span>
                    <div><h3>${l.descricao}</h3><p>Cardápio ${cardapio.id} · ${cardapio.nome}</p></div>
                </div>
                <ul class="itens">${l.itens.map(item => {
                    const ref = referencias[item.referencia];
                    return `<li><span class="item-produto"><strong>${consumo(item)}</strong><small>${nomeProduto(buscar(produtos, item.produto))}</small></span><span class="ref ${ref.classe}">${ref.nome}</span></li>`;
                }).join("")}</ul>
                <div class="cartao-rodape">
                    ${bloqueado ? `<span class="bloqueado">${icone("lock")}Já entregue, edição bloqueada</span>` : `<span>Disponível para edição</span>`}
                    <button class="btn btn-fantasma btn-pequeno" data-modal="modal-lanche"${bloqueado ? " disabled" : ""}>${icone("edit")}Editar</button>
                </div>
            </article>`;
    }).join("");
}

function renderAlimentos() {
    el("tabela-alimentos").innerHTML = alimentos.map(a => {
        const bebida = a.natureza === "Bebida";
        return `
            <tr data-filtro="${a.natureza}">
                <td><div class="celula-nome"><span class="avatar-item ${bebida ? "bebida" : "comida"}">${icone(bebida ? "local_drink" : "restaurant")}</span><div><strong>${a.nome}</strong><small>${a.descricao}</small></div></div></td>
                <td>${badge(a.natureza, bebida ? "azul" : "laranja")}</td>
                <td>${a.grupo}</td>
                <td><span class="unidade">${a.unidade}</span></td>
                <td class="num">${produtos.filter(p => p.alimento === a.id).length}</td>
                <td class="acoes">${botoesLinha("modal-alimento")}</td>
            </tr>`;
    }).join("");
}

function renderProdutos() {
    el("tabela-produtos").innerHTML = produtos.map(p => {
        const alimento = buscar(alimentos, p.alimento);
        const bebida = alimento.natureza === "Bebida";
        return `
            <tr data-filtro="${alimento.natureza}">
                <td><div class="celula-nome"><span class="avatar-item ${bebida ? "bebida" : "comida"}">${icone(bebida ? "local_drink" : "inventory_2")}</span><div><strong>${alimento.nome}</strong><small>${p.descricao} · cód. ${p.id}</small></div></div></td>
                <td>${num(p.quantUnitBase)} ${alimento.unidade}<small>por ${p.embalagem}</small></td>
                <td>${p.subitens ? `${p.subitens} ${p.nomeSubitem}` : "—"}</td>
                <td class="col-estoque">${barraEstoque(p)}<small>${num(p.estoque)} de ${num(provisionado(p.id))} ${p.embalagem}</small></td>
                <td class="num">${num(provisionado(p.id))} ${p.embalagem}</td>
                <td class="acoes">${botoesLinha("modal-produto")}</td>
            </tr>`;
    }).join("");
}

function renderFornecedores() {
    el("tabela-fornecedores").innerHTML = fornecedores.map(f => {
        const vigentes = empenhos.filter(e => e.fornecedor === f.id && e.situacao === "vigente").length;
        const iniciais = f.nome.split(" ").filter(parte => parte.length > 2).slice(0, 2).map(parte => parte[0]).join("");
        return `
            <tr>
                <td><div class="celula-nome"><span class="avatar-item">${iniciais}</span><div><strong>${f.nome}</strong><small>${f.email}</small></div></div></td>
                <td class="mono">${f.cnpj}</td>
                <td>${f.telefone}</td>
                <td>${vigentes ? badge(`${vigentes} vigente${vigentes > 1 ? "s" : ""}`, "verde") : badge("Nenhum", "cinza")}</td>
                <td class="acoes">${botoesLinha("modal-fornecedor")}</td>
            </tr>`;
    }).join("");
}

function renderEmpenhos() {
    el("lista-empenhos").innerHTML = empenhos.map(e => `
        <article class="card empenho" data-filtro="${e.situacao}">
            <div class="empenho-topo">
                <div class="empenho-icone">${icone("receipt_long")}</div>
                <div class="empenho-titulo"><strong>${e.sigla}</strong><span>${buscar(fornecedores, e.fornecedor).nome}</span></div>
                <div class="empenho-meta">
                    <span>${icone("date_range")}${formatarData(e.dataInicial)} a ${formatarData(e.dataFinal)}</span>
                    <span>${icone("inventory_2")}${e.itens.length} ${e.itens.length === 1 ? "item" : "itens"}</span>
                </div>
                ${e.situacao === "vigente" ? badge("Vigente", "verde") : badge("Encerrado", "cinza")}
                <button class="btn-icone" data-modal="modal-empenho" title="Editar">${icone("edit")}</button>
            </div>
            <div class="tabela-wrap tabela-embutida">
                <table class="tabela">
                    <thead><tr><th>Produto</th><th class="num">Empenhado</th><th class="num">Entregue</th><th class="num">Saldo</th><th>Execução</th></tr></thead>
                    <tbody>${e.itens.map(item => {
                        const produto = buscar(produtos, item.produto);
                        return `
                            <tr>
                                <td><strong>${nomeProduto(produto)}</strong></td>
                                <td class="num">${num(item.empenhada)} ${produto.embalagem}</td>
                                <td class="num">${num(item.entregue)} ${produto.embalagem}</td>
                                <td class="num">${num(item.empenhada - item.entregue)} ${produto.embalagem}</td>
                                <td>${barraPercentual(Math.round(item.entregue / item.empenhada * 100))}</td>
                            </tr>`;
                    }).join("")}</tbody>
                </table>
            </div>
        </article>`).join("");
}

function renderAgendaEmpenho() {
    el("tabela-agenda-empenho").innerHTML = [...entregasEmpenho]
        .sort((a, b) => b.dataPrevista.localeCompare(a.dataPrevista))
        .map(e => {
            const empenho = buscar(empenhos, e.empenho);
            const produto = buscar(produtos, e.produto);
            const [texto, cor] = estadosEntrega[e.estado];
            return `
                <tr data-filtro="${e.estado}">
                    <td><strong>${empenho.sigla}</strong><small>${buscar(fornecedores, empenho.fornecedor).nome}</small></td>
                    <td>${nomeProduto(produto)}</td>
                    <td>${formatarData(e.dataSolicitacao)}</td>
                    <td>${formatarData(e.dataPrevista)}</td>
                    <td class="num">${num(e.quantSolicitada)} ${produto.embalagem}</td>
                    <td class="num">${e.quantEntregue ? `${num(e.quantEntregue)} ${produto.embalagem}` : "—"}</td>
                    <td>${badge(texto, cor)}</td>
                    <td class="acoes">${pendente(e) ? `<a class="btn-mini" href="#recebimento">Receber</a>` : ""}</td>
                </tr>`;
        }).join("");
}

function renderRecebimento() {
    el("lista-recebimento").innerHTML = entregasEmpenho
        .filter(pendente)
        .sort((a, b) => a.dataPrevista.localeCompare(b.dataPrevista))
        .map(e => {
            const empenho = buscar(empenhos, e.empenho);
            const produto = buscar(produtos, e.produto);
            const [texto, cor] = estadosEntrega[e.estado];
            const saldo = e.quantSolicitada - e.quantEntregue;
            return `
                <article class="card recebimento">
                    <div class="recebimento-topo">
                        <div class="data-bloco${e.dataPrevista === hoje ? " hoje" : ""}"><strong>${e.dataPrevista.slice(8)}</strong><span>${mesCurto(e.dataPrevista)}</span></div>
                        <div class="linha-info"><strong>${nomeProduto(produto)}</strong><span>${buscar(fornecedores, empenho.fornecedor).nome} · ${empenho.sigla}</span></div>
                        ${badge(texto, cor)}
                    </div>
                    <div class="recebimento-numeros">
                        <div><span>Solicitado</span><strong>${num(e.quantSolicitada)} ${produto.embalagem}</strong></div>
                        <div><span>Já recebido</span><strong>${num(e.quantEntregue)} ${produto.embalagem}</strong></div>
                        <div><span>A receber</span><strong>${num(saldo)} ${produto.embalagem}</strong></div>
                    </div>
                    <div class="campos">
                        <label class="campo"><span>Data do recebimento</span><input type="date" value="${hoje}"></label>
                        <label class="campo"><span>Quantidade recebida</span><input type="number" min="0" value="${saldo}"></label>
                        <label class="campo campo-largo"><span>Observação</span><input type="text" placeholder="Opcional" value="${e.observacao}"></label>
                    </div>
                    <div class="recebimento-acoes"><button class="btn btn-primario" data-toast="Recebimento registrado">${icone("inventory")}Registrar recebimento</button></div>
                </article>`;
        }).join("");

    el("tabela-recebidos").innerHTML = entregasEmpenho
        .filter(e => e.dataEntregue)
        .sort((a, b) => b.dataEntregue.localeCompare(a.dataEntregue))
        .map(e => {
            const empenho = buscar(empenhos, e.empenho);
            const produto = buscar(produtos, e.produto);
            const [texto, cor] = estadosEntrega[e.estado];
            return `
                <tr>
                    <td>${formatarData(e.dataEntregue)}</td>
                    <td><strong>${nomeProduto(produto)}</strong><small>${e.observacao}</small></td>
                    <td>${empenho.sigla}<small>${buscar(fornecedores, empenho.fornecedor).nome}</small></td>
                    <td class="num">${num(e.quantSolicitada)} ${produto.embalagem}</td>
                    <td class="num">${num(e.quantEntregue)} ${produto.embalagem}</td>
                    <td>${badge(texto, cor)}</td>
                </tr>`;
        }).join("");
}

const opcoesSelect = {
    alimentos: () => alimentos.map(a => [a.id, `${a.nome} (${a.unidade})`]),
    produtos: () => produtos.map(p => [p.id, nomeProduto(p)]),
    fornecedores: () => fornecedores.map(f => [f.id, f.nome]),
    empenhos: () => empenhos.filter(e => e.situacao === "vigente").map(e => [e.id, `${e.sigla} · ${buscar(fornecedores, e.fornecedor).nome}`]),
    cardapios: () => cardapios.map(c => [c.id, `Cardápio ${c.id} · ${c.nome}`]),
    lanches: () => lanches.map(l => [l.id, `Lanche ${l.id} · ${l.descricao}`])
};

function preencherSelects() {
    document.querySelectorAll("select[data-opcoes]").forEach(select => {
        select.innerHTML = `<option value="">Selecione</option>` + opcoesSelect[select.dataset.opcoes]().map(([valor, texto]) => `<option value="${valor}">${texto}</option>`).join("");
    });
}

function adicionarLinha(botao) {
    const lista = botao.previousElementSibling;
    const nova = lista.firstElementChild.cloneNode(true);
    nova.querySelectorAll("input").forEach(campo => campo.value = "");
    nova.querySelectorAll("select").forEach(campo => campo.selectedIndex = 0);
    lista.append(nova);
}

function filtrar(area) {
    const termo = (area.querySelector(".busca input")?.value || "").toLowerCase();
    const filtro = area.querySelector(".chips .ativo")?.dataset.filtro || "";
    area.querySelectorAll("[data-itens] > *").forEach(item => {
        item.hidden = !item.textContent.toLowerCase().includes(termo) || (filtro && item.dataset.filtro !== filtro);
    });
}

let temporizadorToast;

function mostrarToast(texto) {
    el("toast-texto").textContent = texto;
    el("toast").classList.add("visivel");
    clearTimeout(temporizadorToast);
    temporizadorToast = setTimeout(() => el("toast").classList.remove("visivel"), 2600);
}

document.addEventListener("click", evento => {
    const alvo = evento.target;

    const abrir = alvo.closest("[data-modal]");
    if (abrir) {
        const modal = el(abrir.dataset.modal);
        modal.querySelector("form").reset();
        modal.showModal();
    }

    if (alvo.closest("[data-fechar]")) alvo.closest("dialog").close();
    if (alvo.matches("dialog")) alvo.close();

    const aviso = alvo.closest("[data-toast]");
    if (aviso) mostrarToast(aviso.dataset.toast);

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

document.addEventListener("input", evento => {
    if (evento.target.closest(".busca")) filtrar(evento.target.closest("[data-filtragem]"));
});

el("data-hoje").textContent = new Date(`${hoje}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" });
el("entrega-data").value = hoje;

renderInicio();
renderSemana();
renderNecessidade();
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
preencherSelects();

window.addEventListener("hashchange", navegar);
navegar();
