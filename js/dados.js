const hoje = "2026-10-01";

const semanaPrevisao = { inicio: "2026-10-05", fim: "2026-10-09" };

const grandezas = [
    { id: 1, nome: "Massa" },
    { id: 2, nome: "Volume" },
    { id: 3, nome: "Comprimento" },
    { id: 4, nome: "Quantidade" }
];

const unidadesBasicas = [
    { id: 1, nome: "grama", sigla: "g", grandeza: 1 },
    { id: 2, nome: "litro", sigla: "L", grandeza: 2 },
    { id: 3, nome: "unidade", sigla: "un", grandeza: 4 },
    { id: 4, nome: "dúzia", sigla: "dz", grandeza: 4 }
];

const multiplos = [
    { id: 1, nome: "quilo", sigla: "K", valor: 1000 },
    { id: 2, nome: "mili", sigla: "m", valor: 0.001 }
];

const unidadesMedida = [
    { id: 1, basica: 1, multiplo: 1 },
    { id: 2, basica: 1, multiplo: null },
    { id: 3, basica: 2, multiplo: null },
    { id: 4, basica: 2, multiplo: 2 },
    { id: 5, basica: 3, multiplo: null },
    { id: 6, basica: 4, multiplo: null }
];

const alimentos = [
    { id: 1, nome: "Banana", descricao: "Banana prata", natureza: "Comida", grupo: "Fruta", unidade: 1 },
    { id: 2, nome: "Maçã", descricao: "Maçã gala", natureza: "Comida", grupo: "Fruta", unidade: 1 },
    { id: 3, nome: "Pastel", descricao: "Pastel assado de frango", natureza: "Comida", grupo: "Panifício", unidade: 5 },
    { id: 4, nome: "Pastel vegetariano", descricao: "Pastel assado de legumes", natureza: "Comida", grupo: "Panifício", unidade: 5 },
    { id: 5, nome: "Biscoito doce", descricao: "Biscoito tipo maria", natureza: "Comida", grupo: "Panifício", unidade: 1 },
    { id: 6, nome: "Cuca", descricao: "Cuca caseira de banana", natureza: "Comida", grupo: "Panifício", unidade: 1 },
    { id: 7, nome: "Suco de uva", descricao: "Suco integral de uva", natureza: "Bebida", grupo: "Suco", unidade: 3 },
    { id: 8, nome: "Leite", descricao: "Leite integral pasteurizado", natureza: "Bebida", grupo: "Laticínio", unidade: 3 },
    { id: 9, nome: "Iogurte", descricao: "Iogurte de morango", natureza: "Bebida", grupo: "Laticínio", unidade: 3 }
];

const produtos = [
    { id: 101, alimento: 5, descricao: "Pacote 400g", embalagem: "pct", quantUnitBase: 0.4, subitens: 40, nomeSubitem: "biscoitos", estoque: 50 },
    { id: 102, alimento: 5, descricao: "Pacote com 4 unidades (40g)", embalagem: "pct", quantUnitBase: 0.04, subitens: 4, nomeSubitem: "biscoitos", estoque: 500 },
    { id: 103, alimento: 7, descricao: "Garrafa 900mL", embalagem: "gf", quantUnitBase: 0.9, subitens: null, nomeSubitem: "", estoque: 110 },
    { id: 104, alimento: 7, descricao: "Caixa 200mL", embalagem: "cx", quantUnitBase: 0.2, subitens: null, nomeSubitem: "", estoque: 260 },
    { id: 105, alimento: 8, descricao: "Saco 1L", embalagem: "sc", quantUnitBase: 1, subitens: null, nomeSubitem: "", estoque: 20 },
    { id: 106, alimento: 1, descricao: "A granel", embalagem: "kg", quantUnitBase: 1, subitens: 6, nomeSubitem: "bananas", estoque: 30 },
    { id: 107, alimento: 3, descricao: "Unidade", embalagem: "un", quantUnitBase: 1, subitens: null, nomeSubitem: "", estoque: 240 },
    { id: 108, alimento: 4, descricao: "Unidade", embalagem: "un", quantUnitBase: 1, subitens: null, nomeSubitem: "", estoque: 80 },
    { id: 109, alimento: 6, descricao: "Cuca 400g", embalagem: "un", quantUnitBase: 0.4, subitens: 4, nomeSubitem: "pedaços", estoque: 12 },
    { id: 110, alimento: 7, descricao: "Caixa 300mL", embalagem: "cx", quantUnitBase: 0.3, subitens: null, nomeSubitem: "", estoque: 300 },
    { id: 111, alimento: 9, descricao: "Garrafa 1L", embalagem: "gf", quantUnitBase: 1, subitens: null, nomeSubitem: "", estoque: 0 },
    { id: 112, alimento: 7, descricao: "Caixa 100mL", embalagem: "cx", quantUnitBase: 0.1, subitens: null, nomeSubitem: "", estoque: 0 }
];

const fornecedores = [
    { id: 1, nome: "Padaria Pão do Campo Ltda", cnpj: "12.345.678/0001-90", telefone: "(51) 3485-1020", email: "contato@paodocampo.com.br" },
    { id: 2, nome: "Cooperativa Agroecológica de Viamão", cnpj: "23.456.789/0001-01", telefone: "(51) 3492-3344", email: "vendas@coopviamao.org.br" },
    { id: 3, nome: "Laticínios Vale Verde S.A.", cnpj: "34.567.890/0001-12", telefone: "(51) 3211-7788", email: "pedidos@valeverde.com.br" },
    { id: 4, nome: "Sucos Serra Gaúcha Ltda", cnpj: "45.678.901/0001-23", telefone: "(54) 3455-9090", email: "comercial@sucosserra.com.br" },
    { id: 5, nome: "Distribuidora Bom Sabor Ltda", cnpj: "56.789.012/0001-34", telefone: "(51) 3344-5566", email: "atendimento@bomsabor.com.br" }
];

const empenhos = [
    {
        id: 1, sigla: "2026NE000101", fornecedor: 1, dataInicial: "2026-03-02", dataFinal: "2026-12-18",
        itens: [
            { produto: 107, empenhada: 2000, entregue: 1240 },
            { produto: 108, empenhada: 600, entregue: 360 },
            { produto: 109, empenhada: 150, entregue: 90 }
        ]
    },
    {
        id: 2, sigla: "2026NE000102", fornecedor: 2, dataInicial: "2026-03-02", dataFinal: "2026-12-18",
        itens: [
            { produto: 106, empenhada: 500, entregue: 310 }
        ]
    },
    {
        id: 3, sigla: "2026NE000103", fornecedor: 3, dataInicial: "2026-03-02", dataFinal: "2026-12-18",
        itens: [
            { produto: 105, empenhada: 1000, entregue: 620 },
            { produto: 111, empenhada: 200, entregue: 0 }
        ]
    },
    {
        id: 4, sigla: "2026NE000104", fornecedor: 4, dataInicial: "2026-03-02", dataFinal: "2026-12-18",
        itens: [
            { produto: 103, empenhada: 300, entregue: 180 },
            { produto: 104, empenhada: 1000, entregue: 700 },
            { produto: 110, empenhada: 800, entregue: 500 }
        ]
    },
    {
        id: 5, sigla: "2026NE000105", fornecedor: 5, dataInicial: "2026-04-01", dataFinal: "2026-12-18",
        itens: [
            { produto: 101, empenhada: 600, entregue: 350 },
            { produto: 102, empenhada: 1000, entregue: 700 }
        ]
    },
    {
        id: 6, sigla: "2025NE000412", fornecedor: 2, dataInicial: "2025-02-03", dataFinal: "2025-12-19",
        itens: [
            { produto: 106, empenhada: 400, entregue: 400 }
        ]
    }
];

const entregasEmpenho = [
    { id: 1, empenho: 1, produto: 107, dataSolicitacao: "2026-09-25", dataPrevista: "2026-10-01", dataEntregue: "", quantSolicitada: 300, quantEntregue: 0, estado: "agendado", observacao: "" },
    { id: 2, empenho: 3, produto: 105, dataSolicitacao: "2026-09-25", dataPrevista: "2026-10-01", dataEntregue: "", quantSolicitada: 200, quantEntregue: 0, estado: "agendado", observacao: "" },
    { id: 3, empenho: 2, produto: 106, dataSolicitacao: "2026-09-24", dataPrevista: "2026-09-30", dataEntregue: "2026-09-30", quantSolicitada: 80, quantEntregue: 60, estado: "entrega_parcial", observacao: "Faltaram 20 kg, fornecedor completa na próxima entrega" },
    { id: 4, empenho: 4, produto: 104, dataSolicitacao: "2026-09-22", dataPrevista: "2026-09-28", dataEntregue: "2026-09-28", quantSolicitada: 300, quantEntregue: 300, estado: "entrega_total", observacao: "" },
    { id: 5, empenho: 5, produto: 101, dataSolicitacao: "2026-09-21", dataPrevista: "2026-09-29", dataEntregue: "2026-09-29", quantSolicitada: 50, quantEntregue: 50, estado: "entrega_total", observacao: "" },
    { id: 6, empenho: 1, produto: 108, dataSolicitacao: "2026-09-28", dataPrevista: "2026-10-02", dataEntregue: "", quantSolicitada: 80, quantEntregue: 0, estado: "agendado", observacao: "" },
    { id: 7, empenho: 4, produto: 110, dataSolicitacao: "2026-09-28", dataPrevista: "2026-10-02", dataEntregue: "", quantSolicitada: 200, quantEntregue: 0, estado: "agendado", observacao: "" },
    { id: 8, empenho: 1, produto: 109, dataSolicitacao: "2026-09-29", dataPrevista: "2026-10-05", dataEntregue: "", quantSolicitada: 40, quantEntregue: 0, estado: "agendado", observacao: "" },
    { id: 9, empenho: 4, produto: 103, dataSolicitacao: "2026-09-15", dataPrevista: "2026-09-21", dataEntregue: "2026-09-21", quantSolicitada: 60, quantEntregue: 48, estado: "finalizado", observacao: "Fornecedor sem estoque; o restante volta ao saldo do empenho" }
];

const cardapios = [
    { id: 1, nome: "Pastel e suco", descricao: "Lanche padrão com pastel e suco", itens: [{ alimento: 3, quant: 1, descricao: "" }, { alimento: 7, quant: 0.2, descricao: "" }] },
    { id: 2, nome: "Pastel e suco reforçado", descricao: "Porção maior de suco para dias quentes", itens: [{ alimento: 3, quant: 1, descricao: "" }, { alimento: 7, quant: 0.3, descricao: "" }] },
    { id: 3, nome: "Pastel e leite", descricao: "Alternativa com laticínio", itens: [{ alimento: 3, quant: 1, descricao: "" }, { alimento: 8, quant: 0.25, descricao: "" }] },
    { id: 4, nome: "Banana, biscoito e leite", descricao: "Fruta, panifício e laticínio", itens: [{ alimento: 1, quant: 0.3, descricao: "" }, { alimento: 5, quant: 0.04, descricao: "Aproximadamente 4 biscoitos" }, { alimento: 8, quant: 0.25, descricao: "" }] },
    { id: 5, nome: "Banana e suco", descricao: "Lanche leve com fruta", itens: [{ alimento: 1, quant: 0.2, descricao: "Aproximadamente 1 banana" }, { alimento: 7, quant: 0.3, descricao: "" }] },
    { id: 6, nome: "Pastel vegetariano e suco", descricao: "Opção sem carne", itens: [{ alimento: 4, quant: 1, descricao: "" }, { alimento: 7, quant: 0.2, descricao: "" }] },
    { id: 7, nome: "Cuca e leite", descricao: "Lanche da tarde com cuca caseira", itens: [{ alimento: 6, quant: 0.1, descricao: "1 pedaço de uma cuca de 400g" }, { alimento: 8, quant: 0.2, descricao: "" }] }
];

const lanches = [
    { id: 1, cardapio: 1, descricao: "Pastel + suco no copo", itens: [{ id: 1, produto: 107, referencia: "inteiro", quant: 1 }, { id: 2, produto: 103, referencia: "unidade_base", quant: 0.2 }] },
    { id: 2, cardapio: 1, descricao: "Pastel + suco em caixinha", itens: [{ id: 3, produto: 107, referencia: "inteiro", quant: 1 }, { id: 4, produto: 104, referencia: "inteiro", quant: 1 }] },
    { id: 3, cardapio: 1, descricao: "Pastel + 2 caixinhas de suco", itens: [{ id: 5, produto: 107, referencia: "inteiro", quant: 1 }, { id: 6, produto: 112, referencia: "inteiro", quant: 2 }] },
    { id: 4, cardapio: 4, descricao: "Banana, biscoitos e leite", itens: [{ id: 7, produto: 106, referencia: "unidade_base", quant: 0.3 }, { id: 8, produto: 101, referencia: "subitens", quant: 4 }, { id: 9, produto: 105, referencia: "unidade_base", quant: 0.25 }] },
    { id: 5, cardapio: 5, descricao: "Banana por peso + suco", itens: [{ id: 10, produto: 106, referencia: "unidade_base", quant: 0.2 }, { id: 11, produto: 110, referencia: "inteiro", quant: 1 }] },
    { id: 6, cardapio: 5, descricao: "Banana unidade + suco", itens: [{ id: 12, produto: 106, referencia: "subitens", quant: 1 }, { id: 13, produto: 110, referencia: "inteiro", quant: 1 }] },
    { id: 7, cardapio: 7, descricao: "Cuca + copo de leite", itens: [{ id: 14, produto: 109, referencia: "inteiro", quant: 0.25 }, { id: 15, produto: 105, referencia: "unidade_base", quant: 0.2 }] },
    { id: 8, cardapio: 6, descricao: "Pastel vegetariano + suco", itens: [{ id: 16, produto: 108, referencia: "inteiro", quant: 1 }, { id: 17, produto: 104, referencia: "inteiro", quant: 1 }] }
];

const agendados = [
    { id: 1, data: "2026-09-28", turno: "Manhã", lanche: 1, quantidade: 140, situacao: "entregue", entregues: 132, observacoes: "",
        itens: [{ itemLanche: 1, quantEntregue: 132, observacoes: "" }, { itemLanche: 2, quantEntregue: 29.4, observacoes: "" }] },
    { id: 2, data: "2026-09-28", turno: "Manhã", lanche: 8, quantidade: 40, situacao: "entregue", entregues: 40, observacoes: "",
        itens: [{ itemLanche: 16, quantEntregue: 40, observacoes: "" }, { itemLanche: 17, quantEntregue: 40, observacoes: "" }] },
    { id: 3, data: "2026-09-28", turno: "Tarde", lanche: 1, quantidade: 160, situacao: "entregue", entregues: 151, observacoes: "Turma do 2º ano em saída de campo",
        itens: [{ itemLanche: 1, quantEntregue: 151, observacoes: "" }, { itemLanche: 2, quantEntregue: 33.5, observacoes: "" }] },
    { id: 4, data: "2026-09-29", turno: "Manhã", lanche: 4, quantidade: 180, situacao: "entregue", entregues: 174, observacoes: "",
        itens: [{ itemLanche: 7, quantEntregue: 52.2, observacoes: "" }, { itemLanche: 8, quantEntregue: 17.4, observacoes: "" }, { itemLanche: 9, quantEntregue: 43.5, observacoes: "" }] },
    { id: 5, data: "2026-09-29", turno: "Tarde", lanche: 4, quantidade: 160, situacao: "entregue", entregues: 160, observacoes: "",
        itens: [{ itemLanche: 7, quantEntregue: 48, observacoes: "" }, { itemLanche: 8, quantEntregue: 16, observacoes: "" }, { itemLanche: 9, quantEntregue: 40, observacoes: "" }] },
    { id: 6, data: "2026-09-30", turno: "Manhã", lanche: 5, quantidade: 180, situacao: "entregue", entregues: 168, observacoes: "Chuva forte, menor frequência",
        itens: [{ itemLanche: 10, quantEntregue: 33.6, observacoes: "" }, { itemLanche: 11, quantEntregue: 168, observacoes: "" }] },
    { id: 7, data: "2026-09-30", turno: "Tarde", lanche: 2, quantidade: 160, situacao: "entregue", entregues: 155, observacoes: "",
        itens: [{ itemLanche: 3, quantEntregue: 155, observacoes: "" }, { itemLanche: 4, quantEntregue: 155, observacoes: "" }] },
    { id: 8, data: "2026-10-01", turno: "Manhã", lanche: 1, quantidade: 140, situacao: "agendado", entregues: 0, observacoes: "", itens: [] },
    { id: 9, data: "2026-10-01", turno: "Manhã", lanche: 8, quantidade: 40, situacao: "agendado", entregues: 0, observacoes: "", itens: [] },
    { id: 10, data: "2026-10-01", turno: "Tarde", lanche: 7, quantidade: 160, situacao: "agendado", entregues: 0, observacoes: "", itens: [] },
    { id: 11, data: "2026-10-02", turno: "Manhã", lanche: 6, quantidade: 180, situacao: "agendado", entregues: 0, observacoes: "", itens: [] },
    { id: 12, data: "2026-10-02", turno: "Tarde", lanche: 3, quantidade: 160, situacao: "agendado", entregues: 0, observacoes: "", itens: [] },
    { id: 13, data: "2026-10-05", turno: "Manhã", lanche: 1, quantidade: 140, situacao: "agendado", entregues: 0, observacoes: "", itens: [] },
    { id: 14, data: "2026-10-05", turno: "Manhã", lanche: 8, quantidade: 40, situacao: "agendado", entregues: 0, observacoes: "", itens: [] },
    { id: 15, data: "2026-10-05", turno: "Tarde", lanche: 1, quantidade: 160, situacao: "agendado", entregues: 0, observacoes: "", itens: [] },
    { id: 16, data: "2026-10-06", turno: "Manhã", lanche: 4, quantidade: 180, situacao: "agendado", entregues: 0, observacoes: "", itens: [] },
    { id: 17, data: "2026-10-06", turno: "Tarde", lanche: 7, quantidade: 160, situacao: "agendado", entregues: 0, observacoes: "", itens: [] },
    { id: 18, data: "2026-10-07", turno: "Manhã", lanche: 2, quantidade: 140, situacao: "agendado", entregues: 0, observacoes: "", itens: [] },
    { id: 19, data: "2026-10-07", turno: "Manhã", lanche: 8, quantidade: 40, situacao: "agendado", entregues: 0, observacoes: "", itens: [] },
    { id: 20, data: "2026-10-07", turno: "Tarde", lanche: 5, quantidade: 160, situacao: "agendado", entregues: 0, observacoes: "", itens: [] },
    { id: 21, data: "2026-10-08", turno: "Manhã", lanche: 6, quantidade: 180, situacao: "agendado", entregues: 0, observacoes: "", itens: [] },
    { id: 22, data: "2026-10-08", turno: "Tarde", lanche: 1, quantidade: 160, situacao: "agendado", entregues: 0, observacoes: "", itens: [] },
    { id: 23, data: "2026-10-09", turno: "Manhã", lanche: 3, quantidade: 180, situacao: "agendado", entregues: 0, observacoes: "", itens: [] },
    { id: 24, data: "2026-10-09", turno: "Tarde", lanche: 4, quantidade: 160, situacao: "agendado", entregues: 0, observacoes: "", itens: [] }
];
