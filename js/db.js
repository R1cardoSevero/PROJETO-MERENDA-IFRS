// Banco de dados local do sistema (IndexedDB).
//
// A estrutura segue a seção "Informações (dados)" da especificação
// (projeto_arquivo_detalhatamento/projeto_merenda.pdf): uma tabela para cada entidade, com os
// mesmos nomes de campos, sem acentos. Campos marcados com "// tela" não estão na especificação,
// mas os formulários do sistema pedem.
//
// O banco começa vazio, exceto pelas unidades de medida citadas na especificação (g, Kg, L, mL,
// un, dz), que não têm tela de cadastro e são necessárias para cadastrar alimentos.
//
// Uso (todas as funções são assíncronas):
//   const id = await banco.salvar("fornecedor", { nome: "Padaria", cnpj: "..." }); // sem id insere, com id atualiza
//   const fornecedor = await banco.obter("fornecedor", id);
//   const produtos = await banco.buscar("produto", "fk_alimento", 3);              // busca por índice
//   await banco.excluir("fornecedor", id);
//   await banco.transacao(async t => {                                            // tudo ou nada
//       const cardapio = await t.salvar("cardapio", { nome: "Pastel e suco" });
//       await t.salvar("item_cardapio", { fk_cardapio: cardapio, fk_alimento: 3, quant: 1 });
//   });
// Dentro de banco.transacao, aguarde só operações de "t": aguardar outra coisa (fetch, setTimeout)
// faz o IndexedDB encerrar a transação.
//
// Regras garantidas pelo banco (violações lançam banco.ErroBanco, com mensagem para o usuário):
// - campos obrigatórios, tipos, valores permitidos e campos únicos (CNPJ, número do empenho);
// - CNPJ (numérico ou alfanumérico) com dígitos verificadores, telefone com DDD e e-mail;
// - chaves estrangeiras: não grava referência a registro inexistente e não exclui registro em uso;
//   excluir um cardápio, lanche, empenho ou lanche agendado exclui junto os itens dele;
// - restrição 1 da especificação: lanche que já foi entregue não pode mais ser alterado;
// - entrega de lanche agendado já registrada não pode mais ser alterada, e não entrega mais
//   lanches (nem produtos) do que o planejado;
// - itens do lanche só usam produtos de alimentos que estão no cardápio do lanche;
// - a entrega solicitada ao fornecedor não passa do saldo do item de empenho;
// - estoque: o recebimento de uma entrega de empenho soma no total_estoque do produto e no
//   quant_entregue do item de empenho; a entrega de lanches desconta do total_estoque.

const banco = (() => {
    const NOME = "merenda-ifrs";
    const VERSAO = 2; // aumente sempre que mudar tabelas, chaves ou índices do esquema

    class ErroBanco extends Error {
        constructor(mensagem) {
            super(mensagem);
            this.name = "ErroBanco";
        }
    }

    const falhar = mensagem => { throw new ErroBanco(mensagem); };
    const vazio = valor => valor === undefined || valor === null || valor === "";
    const arred = valor => Math.round(valor * 1000) / 1000;
    const emAberto = estado => estado === "agendado" || estado === "entrega_parcial";

    const texto = (opcoes = {}) => ({ tipo: "texto", ...opcoes });
    const numero = (opcoes = {}) => ({ tipo: "numero", ...opcoes });
    const data = (opcoes = {}) => ({ tipo: "data", ...opcoes });
    const opcao = (valores, opcoes = {}) => ({ tipo: "opcao", valores, ...opcoes });
    const fk = (tabela, opcoes = {}) => ({ tipo: "fk", tabela, ...opcoes });

    // Cada tabela tem: rótulo (para as mensagens), chave (padrão: "id" gerado automaticamente),
    // campos, índices extras e regras próprias. fk(..., { dono: true }) indica que o registro é
    // item do referenciado: excluir o dono exclui o item, e o item não pode trocar de dono.
    const esquema = {
        grandeza: {
            rotulo: "grandeza",
            campos: { nome: texto() }
        },
        multiplo: {
            rotulo: "múltiplo",
            campos: { nome: texto(), sigla: texto(), valor: numero({ positivo: true }) }
        },
        unidade_medida_basica: {
            rotulo: "unidade de medida básica",
            campos: { nome: texto(), sigla: texto(), fk_grandeza: fk("grandeza") }
        },
        unidade_medida: {
            rotulo: "unidade de medida",
            campos: {
                fk_unidade_medida_basica: fk("unidade_medida_basica"),
                fk_multiplo: fk("multiplo", { opcional: true }) // vazio: unidade básica sem múltiplo
            }
        },
        alimento: {
            rotulo: "alimento",
            campos: {
                nome: texto(),
                descricao: texto({ opcional: true }),
                fk_unidade_medida: fk("unidade_medida"),
                natureza: opcao(["comida", "bebida"]),
                grupo: texto()
            }
        },
        produto: {
            rotulo: "produto",
            campos: {
                fk_alimento: fk("alimento"),
                descricao: texto(),
                quant_unit_base: numero({ positivo: true }),
                quant_subitens: numero({ positivo: true, opcional: true }),
                total_estoque: numero({ minimo: 0, padrao: 0 }),
                embalagem: texto({ opcional: true }),   // tela
                nome_subitem: texto({ opcional: true }) // tela
            },
            antesDeSalvar: async (t, produto, anterior) => {
                if (!anterior || anterior.fk_alimento === produto.fk_alimento) return;
                for (const item of await t.buscar("item_lanche", "fk_produto", produto.id)) {
                    const lanche = await t.obter("lanche", item.fk_lanche);
                    if (!await alimentoNoCardapio(t, produto.fk_alimento, lanche.fk_cardapio))
                        falhar(`Não é possível trocar o alimento deste produto: ele é usado no lanche ${lanche.id}, e o novo alimento não está no cardápio desse lanche.`);
                }
            }
        },
        cardapio: {
            rotulo: "cardápio",
            campos: { nome: texto(), descricao: texto({ opcional: true }) }
        },
        item_cardapio: {
            rotulo: "item de cardápio",
            chave: ["fk_cardapio", "fk_alimento"],
            campos: {
                fk_cardapio: fk("cardapio", { dono: true }),
                fk_alimento: fk("alimento"),
                descricao: texto({ opcional: true }),
                quant: numero({ positivo: true }) // na unidade de medida base do alimento
            },
            antesDeExcluir: async (t, item) => {
                for (const lanche of await t.buscar("lanche", "fk_cardapio", item.fk_cardapio)) {
                    for (const itemLanche of await t.buscar("item_lanche", "fk_lanche", lanche.id)) {
                        const produto = await t.obter("produto", itemLanche.fk_produto);
                        if (produto.fk_alimento === item.fk_alimento)
                            falhar(`Não é possível tirar este alimento do cardápio: o lanche ${lanche.id} usa o produto "${await nomeDoProduto(t, produto)}".`);
                    }
                }
            }
        },
        lanche: {
            rotulo: "lanche",
            campos: {
                fk_cardapio: fk("cardapio"),
                descricao: texto({ opcional: true }) // tela
            },
            antesDeSalvar: async (t, lanche, anterior) => {
                if (!anterior) return;
                await exigirLancheEditavel(t, lanche.id);
                if (anterior.fk_cardapio === lanche.fk_cardapio) return;
                for (const item of await t.buscar("item_lanche", "fk_lanche", lanche.id)) {
                    const produto = await t.obter("produto", item.fk_produto);
                    if (!await alimentoNoCardapio(t, produto.fk_alimento, lanche.fk_cardapio))
                        falhar(`Não é possível trocar o cardápio: o produto "${await nomeDoProduto(t, produto)}" do lanche não está no novo cardápio.`);
                }
            },
            antesDeExcluir: (t, lanche) => exigirLancheEditavel(t, lanche.id)
        },
        item_lanche: {
            rotulo: "item de lanche",
            campos: {
                fk_lanche: fk("lanche", { dono: true }),
                fk_produto: fk("produto"),
                referencia_consumo: opcao(["inteiro", "unidade_base", "subitens"]),
                quant_consumida: numero({ positivo: true }),
                conversao_subitens: numero({ positivo: true, opcional: true })
            },
            antesDeSalvar: async (t, item) => {
                await exigirLancheEditavel(t, item.fk_lanche);
                const lanche = await t.obter("lanche", item.fk_lanche);
                const produto = await t.obter("produto", item.fk_produto);
                if (!await alimentoNoCardapio(t, produto.fk_alimento, lanche.fk_cardapio))
                    falhar(`O produto "${await nomeDoProduto(t, produto)}" não pode entrar no lanche: o alimento dele não está no cardápio do lanche.`);
                if (item.referencia_consumo !== "subitens" && item.conversao_subitens !== null)
                    falhar('Item de lanche: conversao_subitens só é usado quando a referência de consumo é "subitens".');
                if (item.referencia_consumo === "subitens" && item.conversao_subitens === null && !produto.quant_subitens)
                    falhar(`O produto "${await nomeDoProduto(t, produto)}" não tem quantidade de subitens cadastrada: informe a conversão.`);
            },
            antesDeExcluir: (t, item) => exigirLancheEditavel(t, item.fk_lanche)
        },
        lanche_agendado: {
            rotulo: "lanche agendado",
            campos: {
                data: data(),
                turno: opcao(["manha", "tarde"]), // tela
                fk_lanche: fk("lanche"),
                quant_prevista: numero({ positivo: true, inteiro: true }),             // tela
                quant_entregue: numero({ minimo: 0, inteiro: true, opcional: true }), // tela
                situacao: opcao(["agendado", "entregue"], { padrao: "agendado" }),
                observacoes: texto({ opcional: true })
            },
            indices: ["data", ["fk_lanche", "situacao"]],
            antesDeSalvar: async (t, agendado, anterior) => {
                if (anterior) exigirEntregaAberta(t, anterior);
                if (agendado.situacao === "entregue" && agendado.quant_entregue === null)
                    falhar("Informe a quantidade de lanches entregues para registrar a entrega.");
                if (agendado.quant_entregue > agendado.quant_prevista)
                    falhar(`A quantidade de lanches entregues (${agendado.quant_entregue}) não pode passar da prevista (${agendado.quant_prevista}).`);
            },
            depoisDeSalvar: (t, agendado, id, anterior) => {
                // libera a gravação dos itens da entrega nesta mesma transação
                if (agendado.situacao === "entregue" && anterior?.situacao !== "entregue") t.entregasRegistradas.add(id);
            },
            antesDeExcluir: (t, agendado) => exigirEntregaAberta(t, agendado)
        },
        // Os itens da entrega só são gravados junto com o registro da entrega (na mesma transação
        // que muda a situação do lanche agendado para "entregue"), e descontam do estoque.
        item_lanche_agendado: {
            rotulo: "item de lanche agendado",
            chave: ["fk_lanche_agendado", "fk_item_lanche"],
            campos: {
                fk_lanche_agendado: fk("lanche_agendado", { dono: true }),
                fk_item_lanche: fk("item_lanche"),
                quant_entregue: numero({ minimo: 0 }), // em unidades do produto
                observacoes: texto({ opcional: true })
            },
            antesDeSalvar: async (t, item) => {
                const agendado = await t.obter("lanche_agendado", item.fk_lanche_agendado);
                if (!t.entregasRegistradas.has(agendado.id))
                    falhar(agendado.situacao === "entregue"
                        ? `A entrega do lanche agendado ${agendado.id} já foi registrada e não pode mais ser alterada.`
                        : "Os itens entregues só podem ser gravados junto com o registro da entrega do lanche agendado.");
                const itemLanche = await t.obter("item_lanche", item.fk_item_lanche);
                if (itemLanche.fk_lanche !== agendado.fk_lanche)
                    falhar(`O item de lanche ${itemLanche.id} não faz parte do lanche ${agendado.fk_lanche}, que é o lanche agendado.`);
                // a tela mostra o planejado com 1 casa decimal; a folga de 0,05 cobre esse arredondamento
                const produto = await t.obter("produto", itemLanche.fk_produto);
                const planejado = consumoPorLanche(itemLanche, produto) * agendado.quant_prevista;
                if (item.quant_entregue > planejado + 0.05 + 1e-9)
                    falhar(`"${await nomeDoProduto(t, produto)}": a quantidade entregue (${item.quant_entregue}) passa da planejada para este lanche (${Math.round(planejado * 10) / 10}).`);
            },
            depoisDeSalvar: async (t, item, chave, anterior) => {
                const usado = arred(item.quant_entregue - (anterior?.quant_entregue ?? 0));
                if (!usado) return;
                const produto = await t.obter("produto", (await t.obter("item_lanche", item.fk_item_lanche)).fk_produto);
                if (produto.total_estoque - usado < -1e-9)
                    falhar(`Estoque insuficiente de "${await nomeDoProduto(t, produto)}": o estoque tem ${produto.total_estoque} e a entrega usa ${usado}. Registre o recebimento do produto ou corrija o estoque no cadastro do produto.`);
                await t.salvar("produto", { ...produto, total_estoque: Math.max(0, arred(produto.total_estoque - usado)) });
            },
            antesDeExcluir: async (t, item) => exigirEntregaAberta(t, await t.obter("lanche_agendado", item.fk_lanche_agendado))
        },
        fornecedor: {
            rotulo: "fornecedor",
            campos: {
                nome: texto(),
                cnpj: texto({ unico: true, formatar: formatarCnpj, validar: valor => cnpjValido(valor) || "deve ser um CNPJ válido (confira os números e os dígitos verificadores)" }),
                telefone: texto({ opcional: true, formatar: formatarTelefone, validar: valor => /^\([1-9]\d\) \d{4,5}-\d{4}$/.test(valor) || "deve ter DDD e 8 ou 9 dígitos, como (51) 3333-4444" }), // tela
                email: texto({ opcional: true, validar: valor => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor) || "deve ser um e-mail válido, como nome@empresa.com.br" }) // tela
            }
        },
        empenho: {
            rotulo: "empenho",
            campos: {
                sigla: texto({ unico: true }),
                fk_fornecedor: fk("fornecedor"),
                data_inicial: data(),
                data_final: data()
            },
            indices: ["data_final"],
            antesDeSalvar: (t, empenho) => {
                if (empenho.data_final < empenho.data_inicial)
                    falhar("A data final do empenho não pode ser anterior à data inicial.");
            }
        },
        item_empenho: {
            rotulo: "item de empenho",
            campos: {
                fk_empenho: fk("empenho", { dono: true }),
                fk_produto: fk("produto"),
                quant_empenhada: numero({ positivo: true }),
                quant_entregue: numero({ minimo: 0, padrao: 0 }) // atualizada pelos recebimentos
            },
            antesDeSalvar: async (t, item, anterior) => {
                if (item.quant_entregue > item.quant_empenhada)
                    falhar("A quantidade entregue não pode passar da quantidade empenhada.");
                if (!anterior) return;
                if (anterior.fk_produto !== item.fk_produto && (await t.buscar("agenda_entrega_empenho", "fk_item_empenho", item.id)).length)
                    falhar("Não é possível trocar o produto: este item de empenho já tem entregas solicitadas.");
                const comprometido = arred(item.quant_entregue + await aReceber(t, item.id));
                if (comprometido > item.quant_empenhada + 1e-9)
                    falhar(`A quantidade empenhada não pode ser menor que ${comprometido}, que é o já entregue mais o que está solicitado ao fornecedor.`);
            }
        },
        agenda_entrega_empenho: {
            rotulo: "entrega de empenho",
            campos: {
                fk_empenho: fk("empenho"),
                fk_item_empenho: fk("item_empenho"),
                data_solicitacao: data(),
                data_prevista_entrega: data(),
                data_entregue: data({ opcional: true }),
                quant_solicitada: numero({ positivo: true }),
                quant_entregue: numero({ minimo: 0, padrao: 0 }),
                observacao: texto({ opcional: true }),
                estado: opcao(["agendado", "entrega_total", "entrega_parcial", "finalizado"], { padrao: "agendado" })
            },
            indices: ["estado", "data_prevista_entrega"],
            antesDeSalvar: async (t, entrega, anterior) => {
                if (anterior && !emAberto(anterior.estado))
                    falhar("Esta solicitação de entrega já foi concluída e não pode mais ser alterada.");
                if (anterior && entrega.quant_entregue < anterior.quant_entregue)
                    falhar("A quantidade recebida não pode diminuir.");
                if (anterior?.quant_entregue > 0 && (anterior.fk_item_empenho !== entrega.fk_item_empenho || anterior.fk_empenho !== entrega.fk_empenho))
                    falhar("Não é possível trocar o item de uma entrega que já teve recebimento.");

                const item = await t.obter("item_empenho", entrega.fk_item_empenho);
                if (item.fk_empenho !== entrega.fk_empenho)
                    falhar(`O item de empenho ${item.id} não pertence ao empenho ${entrega.fk_empenho}.`);
                if (entrega.data_prevista_entrega < entrega.data_solicitacao)
                    falhar("A data prevista de entrega não pode ser anterior à data da solicitação.");
                if (entrega.quant_entregue > entrega.quant_solicitada)
                    falhar("A quantidade entregue não pode passar da quantidade solicitada.");
                if (entrega.estado === "entrega_total" && entrega.quant_entregue !== entrega.quant_solicitada)
                    falhar('No estado "entrega_total", a quantidade entregue deve ser igual à solicitada.');
                if (entrega.estado === "entrega_parcial" && !(entrega.quant_entregue > 0 && entrega.quant_entregue < entrega.quant_solicitada))
                    falhar('No estado "entrega_parcial", a quantidade entregue deve ser maior que zero e menor que a solicitada.');
                if ((entrega.estado === "entrega_total" || entrega.estado === "entrega_parcial") && !entrega.data_entregue)
                    falhar("Informe a data em que a entrega foi feita.");

                // saldo do item: empenhado - já entregue (sem esta entrega) - solicitado nas outras entregas em aberto
                const jaContado = anterior?.fk_item_empenho === item.id ? anterior.quant_entregue : 0;
                const saldo = arred(item.quant_empenhada - (item.quant_entregue - jaContado) - await aReceber(t, item.id, entrega.id));
                const usado = emAberto(entrega.estado) ? entrega.quant_solicitada : entrega.quant_entregue;
                if (usado > saldo + 1e-9)
                    falhar(`A quantidade solicitada passa do saldo do item de empenho, que é ${Math.max(saldo, 0)}.`);
            },
            depoisDeSalvar: async (t, entrega, id, anterior) => {
                const recebido = arred(entrega.quant_entregue - (anterior?.quant_entregue ?? 0));
                if (!recebido) return;
                const item = await t.obter("item_empenho", entrega.fk_item_empenho);
                await t.salvar("item_empenho", { ...item, quant_entregue: arred(item.quant_entregue + recebido) });
                const produto = await t.obter("produto", item.fk_produto);
                await t.salvar("produto", { ...produto, total_estoque: arred(produto.total_estoque + recebido) });
            },
            antesDeExcluir: (t, entrega) => {
                if (entrega.quant_entregue > 0) falhar("Não é possível excluir uma entrega que já teve recebimento.");
            }
        }
    };

    async function exigirLancheEditavel(t, idLanche) {
        const entregas = await esperar(t.loja("lanche_agendado").index("fk_lanche+situacao").count([idLanche, "entregue"]));
        if (entregas) falhar(`O lanche ${idLanche} já foi entregue aos estudantes e não pode mais ser alterado.`);
    }

    function exigirEntregaAberta(t, agendado) {
        if (agendado.situacao === "entregue" && !t.entregasRegistradas.has(agendado.id))
            falhar(`A entrega do lanche agendado ${agendado.id} já foi registrada e não pode mais ser alterada.`);
    }

    async function alimentoNoCardapio(t, idAlimento, idCardapio) {
        return Boolean(await t.obter("item_cardapio", [idCardapio, idAlimento]));
    }

    async function nomeDoProduto(t, produto) {
        const alimento = await t.obter("alimento", produto.fk_alimento);
        return `${alimento.nome} · ${produto.descricao}`;
    }

    // Quantas unidades do produto (embalagens) um lanche consome, conforme a referência de consumo.
    function consumoPorLanche(item, produto) {
        if (item.referencia_consumo === "inteiro") return item.quant_consumida;
        if (item.referencia_consumo === "unidade_base") return item.quant_consumida / produto.quant_unit_base;
        return item.quant_consumida / (item.conversao_subitens || produto.quant_subitens);
    }

    // CNPJ numérico ou alfanumérico (adotado pela Receita Federal a partir de julho de 2026):
    // 12 caracteres [0-9A-Z] seguidos de 2 dígitos verificadores. No cálculo dos dígitos, cada
    // caractere vale o seu código ASCII menos 48 (os números continuam valendo 0 a 9).
    function formatarCnpj(valor) {
        const c = valor.toUpperCase().replace(/[^0-9A-Z]/g, "");
        return c.length === 14 ? `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}` : valor;
    }

    function cnpjValido(valor) {
        const c = valor.replace(/[./-]/g, "");
        if (!/^[0-9A-Z]{12}\d{2}$/.test(c) || /^(.)\1+$/.test(c)) return false;
        const pesos = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        const digito = tamanho => {
            const resto = [...c.slice(0, tamanho)].reduce((soma, caractere, i) => soma + (caractere.charCodeAt(0) - 48) * pesos[i + 13 - tamanho], 0) % 11;
            return resto < 2 ? 0 : 11 - resto;
        };
        return digito(12) === Number(c[12]) && digito(13) === Number(c[13]);
    }

    function formatarTelefone(valor) {
        const d = valor.replace(/\D/g, "");
        if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
        if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
        return valor;
    }

    // Quantidade do item de empenho já solicitada ao fornecedor e ainda não entregue.
    async function aReceber(t, idItem, excetoEntrega) {
        return (await t.buscar("agenda_entrega_empenho", "fk_item_empenho", idItem))
            .filter(entrega => entrega.id !== excetoEntrega && emAberto(entrega.estado))
            .reduce((total, entrega) => total + entrega.quant_solicitada - entrega.quant_entregue, 0);
    }

    // ---------------------------------------------------------------------------------------
    // Validação

    function tabelaDe(nome) {
        return Object.hasOwn(esquema, nome) ? esquema[nome] : falhar(`Tabela desconhecida: "${nome}".`);
    }

    function titulo(nome) {
        const rotulo = esquema[nome].rotulo;
        return rotulo[0].toUpperCase() + rotulo.slice(1);
    }

    const dataValida = valor => typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor)
        && !Number.isNaN(Date.parse(valor)) && new Date(valor).toISOString().startsWith(valor);

    function validarValor(nome, campo, def, valor) {
        const invalido = motivo => falhar(`${titulo(nome)}: o campo "${campo}" ${motivo}.`);
        if (def.tipo === "texto" && typeof valor !== "string") invalido("deve ser um texto");
        if (def.tipo === "data" && !dataValida(valor)) invalido("deve ser uma data válida no formato AAAA-MM-DD");
        if (def.tipo === "opcao" && !def.valores.includes(valor)) invalido(`deve ser um destes valores: ${def.valores.join(", ")}`);
        if (def.tipo === "fk" && !Number.isInteger(valor)) invalido("deve ser o id (número inteiro) de um registro");
        if (def.validar) {
            const resultado = def.validar(valor);
            if (resultado !== true) invalido(resultado);
        }
        if (def.tipo === "numero") {
            if (typeof valor !== "number" || !Number.isFinite(valor)) invalido("deve ser um número");
            if (def.inteiro && !Number.isInteger(valor)) invalido("deve ser um número inteiro");
            if (def.positivo && valor <= 0) invalido("deve ser maior que zero");
            if (def.minimo !== undefined && valor < def.minimo) invalido(`não pode ser menor que ${def.minimo}`);
        }
    }

    // Copia só os campos do esquema, aplica valores padrão e valida tipos e obrigatórios.
    function normalizar(nome, registro) {
        const tabela = tabelaDe(nome);
        const temId = !tabela.chave;
        if (typeof registro !== "object" || registro === null) falhar(`${titulo(nome)}: registro inválido.`);
        for (const campo of Object.keys(registro)) {
            if (!(temId && campo === "id") && !Object.hasOwn(tabela.campos, campo))
                falhar(`${titulo(nome)}: o campo "${campo}" não existe nesta tabela.`);
        }

        const dados = {};
        if (temId && !vazio(registro.id)) {
            if (!Number.isInteger(registro.id) || registro.id < 1) falhar(`${titulo(nome)}: id inválido.`);
            dados.id = registro.id;
        }
        for (const [campo, def] of Object.entries(tabela.campos)) {
            let valor = typeof registro[campo] === "string" ? registro[campo].trim() : registro[campo];
            if (def.formatar && typeof valor === "string" && valor) valor = def.formatar(valor);
            if (vazio(valor) && def.padrao !== undefined) valor = def.padrao;
            if (vazio(valor)) {
                if (!def.opcional) falhar(`${titulo(nome)}: o campo "${campo}" é obrigatório.`);
                dados[campo] = def.tipo === "texto" ? "" : null;
                continue;
            }
            validarValor(nome, campo, def, valor);
            dados[campo] = valor;
        }
        return dados;
    }

    // ---------------------------------------------------------------------------------------
    // Gravação e exclusão

    async function salvar(t, nome, registro) {
        const tabela = tabelaDe(nome);
        const dados = normalizar(nome, registro);
        const chave = tabela.chave ? tabela.chave.map(campo => dados[campo]) : dados.id;
        const anterior = chave === undefined ? undefined : await t.obter(nome, chave);

        for (const [campo, def] of Object.entries(tabela.campos)) {
            const valor = dados[campo];
            if (vazio(valor)) continue;
            if (def.tipo === "fk") {
                if (!await t.obter(def.tabela, valor))
                    falhar(`${titulo(nome)}: não existe ${esquema[def.tabela].rotulo} com id ${valor}.`);
                if (def.dono && anterior && anterior[campo] !== valor)
                    falhar(`${titulo(nome)}: o campo "${campo}" não pode ser alterado.`);
            }
            if (def.unico) {
                const outro = await esperar(t.loja(nome).index(campo).getKey(valor));
                if (outro !== undefined && outro !== chave) falhar(`Já existe um ${tabela.rotulo} com ${campo} "${valor}".`);
            }
        }

        await tabela.antesDeSalvar?.(t, dados, anterior);
        const chaveSalva = await esperar(t.loja(nome).put(dados));
        await tabela.depoisDeSalvar?.(t, dados, chaveSalva, anterior);
        return chaveSalva;
    }

    // Registros que apontam para a tabela "nome" por chave estrangeira.
    const dependentes = nome => Object.entries(esquema).flatMap(([outra, tabela]) =>
        Object.entries(tabela.campos)
            .filter(([, def]) => def.tipo === "fk" && def.tabela === nome)
            .map(([campo, def]) => ({ tabela: outra, campo, dono: Boolean(def.dono) })));

    async function excluir(t, nome, chave) {
        const tabela = tabelaDe(nome);
        const registro = await t.obter(nome, chave);
        if (!registro) return false;
        await tabela.antesDeExcluir?.(t, registro);

        const ligados = dependentes(nome);
        for (const { tabela: outra, campo } of ligados.filter(d => !d.dono)) {
            const usos = await esperar(t.loja(outra).index(campo).count(chave));
            if (usos) falhar(`Não é possível excluir: este registro de ${tabela.rotulo} é usado em ${usos} registro(s) de ${esquema[outra].rotulo}.`);
        }
        for (const { tabela: outra, campo } of ligados.filter(d => d.dono)) {
            for (const item of await esperar(t.loja(outra).index(campo).getAllKeys(chave))) await excluir(t, outra, item);
        }
        await esperar(t.loja(nome).delete(chave));
        return true;
    }

    // ---------------------------------------------------------------------------------------
    // Conexão, estrutura e transações

    const esperar = pedido => new Promise((ok, falha) => {
        pedido.onsuccess = () => ok(pedido.result);
        pedido.onerror = () => falha(pedido.error);
    });

    function indicesDe(tabela) {
        const indices = {};
        for (const [campo, def] of Object.entries(tabela.campos)) {
            if (def.tipo === "fk" || def.unico) indices[campo] = { caminho: campo, unico: Boolean(def.unico) };
        }
        for (const caminho of tabela.indices || []) {
            indices[[].concat(caminho).join("+")] = { caminho, unico: false };
        }
        return indices;
    }

    // Cria as tabelas que faltam e deixa os índices iguais aos do esquema. Mudar a chave de uma
    // tabela que já existe exige apagar o banco (banco.apagarBanco()).
    function atualizarEstrutura(db, tx) {
        for (const [nome, tabela] of Object.entries(esquema)) {
            const loja = db.objectStoreNames.contains(nome)
                ? tx.objectStore(nome)
                : db.createObjectStore(nome, tabela.chave ? { keyPath: tabela.chave } : { keyPath: "id", autoIncrement: true });
            const desejados = indicesDe(tabela);
            for (const indice of Array.from(loja.indexNames)) {
                const atual = loja.index(indice), desejado = desejados[indice];
                if (!desejado || String(atual.keyPath) !== String(desejado.caminho) || atual.unique !== desejado.unico) loja.deleteIndex(indice);
            }
            for (const [indice, { caminho, unico }] of Object.entries(desejados)) {
                if (!loja.indexNames.contains(indice)) loja.createIndex(indice, caminho, { unique: unico });
            }
        }
    }

    // Unidades de medida citadas na especificação (exemplos do campo fk_unidade_medida do alimento,
    // grandezas e múltiplos). Só entram se ainda não houver nenhuma unidade de medida no banco.
    async function cadastrarUnidades(tx) {
        if (await esperar(tx.objectStore("unidade_medida").count())) return;
        const inserir = (nome, registro) => esperar(tx.objectStore(nome).add(registro));

        const grandeza = {};
        for (const nome of ["massa", "volume", "comprimento", "quantidade"]) grandeza[nome] = await inserir("grandeza", { nome });

        const basica = {};
        for (const [nome, sigla, deGrandeza] of [["grama", "g", "massa"], ["litro", "L", "volume"], ["unidade", "un", "quantidade"], ["dúzia", "dz", "quantidade"]])
            basica[sigla] = await inserir("unidade_medida_basica", { nome, sigla, fk_grandeza: grandeza[deGrandeza] });

        const multiplo = {};
        for (const [nome, sigla, valor] of [["quilo", "K", 1000], ["mega", "M", 1000000], ["mili", "m", 0.001], ["micro", "u", 0.000001]])
            multiplo[nome] = await inserir("multiplo", { nome, sigla, valor });

        for (const [sigla, deMultiplo] of [["g", null], ["g", "quilo"], ["L", null], ["L", "mili"], ["un", null], ["dz", null]])
            await inserir("unidade_medida", { fk_unidade_medida_basica: basica[sigla], fk_multiplo: deMultiplo ? multiplo[deMultiplo] : null });
    }

    let conexao = null;

    function abrir() {
        conexao ??= new Promise((ok, falha) => {
            const pedido = indexedDB.open(NOME, VERSAO);
            pedido.onupgradeneeded = evento => {
                const tx = pedido.transaction;
                atualizarEstrutura(pedido.result, tx);
                if (evento.oldVersion < 2) cadastrarUnidades(tx).catch(erro => { console.error(erro); tx.abort(); });
            };
            pedido.onblocked = () => console.warn("A atualização do banco está aguardando: feche as outras abas do sistema.");
            pedido.onsuccess = () => {
                const db = pedido.result;
                db.onversionchange = () => { db.close(); conexao = null; };
                ok(db);
            };
            pedido.onerror = () => { conexao = null; falha(pedido.error); };
        });
        return conexao;
    }

    function contexto(tx) {
        const loja = nome => (tabelaDe(nome), tx.objectStore(nome));
        const t = {
            loja,
            entregasRegistradas: new Set(),
            listar: nome => esperar(loja(nome).getAll()),
            obter: (nome, chave) => esperar(loja(nome).get(chave)),
            buscar: (nome, indice, valor) => esperar(loja(nome).index(indice).getAll(valor)),
            salvar: (nome, registro) => salvar(t, nome, registro),
            excluir: (nome, chave) => excluir(t, nome, chave)
        };
        return t;
    }

    async function transacao(operacao, modo) {
        const db = await abrir();
        const tx = db.transaction(Array.from(db.objectStoreNames), modo);
        const concluida = new Promise((ok, falha) => {
            tx.oncomplete = () => ok();
            tx.onabort = () => falha(tx.error);
        });
        concluida.catch(() => {}); // o erro é tratado abaixo; evita aviso de rejeição não tratada
        try {
            const resultado = await operacao(contexto(tx));
            await concluida;
            return resultado;
        } catch (erro) {
            try { tx.abort(); } catch { /* a transação já tinha terminado */ }
            throw erro;
        }
    }

    // Apaga o banco inteiro. Ele é recriado (só com as unidades de medida) no próximo uso.
    async function apagarBanco() {
        const atual = conexao;
        conexao = null;
        if (atual) (await atual.catch(() => null))?.close();
        await esperar(indexedDB.deleteDatabase(NOME));
    }

    abrir().catch(erro => console.error("Não foi possível abrir o banco local:", erro));

    return {
        ErroBanco,
        tabelas: Object.keys(esquema),
        consumoPorLanche,
        listar: nome => transacao(t => t.listar(nome), "readonly"),
        listarTudo: () => transacao(async t => {
            const tudo = {};
            await Promise.all(Object.keys(esquema).map(async nome => { tudo[nome] = await t.listar(nome); }));
            return tudo;
        }, "readonly"),
        obter: (nome, chave) => transacao(t => t.obter(nome, chave), "readonly"),
        buscar: (nome, indice, valor) => transacao(t => t.buscar(nome, indice, valor), "readonly"),
        salvar: (nome, registro) => transacao(t => t.salvar(nome, registro), "readwrite"),
        excluir: (nome, chave) => transacao(t => t.excluir(nome, chave), "readwrite"),
        transacao: operacao => transacao(t => operacao({
            listar: t.listar, obter: t.obter, buscar: t.buscar, salvar: t.salvar, excluir: t.excluir
        }), "readwrite"),
        apagarBanco
    };
})();
