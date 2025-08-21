// Estrutura hierárquica de categorização conforme planilha real
export const TABULATION_HIERARCHY = {
  "Alimentação": {
    "Auxiliar de Cozinha": [
      "Auxiliar de Cozinha Geral",
      "Auxiliar de Cozinha Hospitalar",
      "Auxiliar de Cozinha Escolar"
    ],
    "Coffee Break/Almoço/Jantar": [
      "Coffee Break Simples",
      "Coffee Break Completo",
      "Almoço Executivo",
      "Jantar Corporativo"
    ],
    "Fornecimento de Alimentação": [
      "Fornecimento Regular",
      "Fornecimento Especial",
      "Fornecimento de Emergência"
    ],
    "Fornecimento de Refeições": [
      "Refeições Prontas",
      "Refeições Congeladas",
      "Refeições Dietéticas"
    ],
    "Kit Lanche": [
      "Kit Básico",
      "Kit Premium",
      "Kit Infantil"
    ],
    "Kit Lanche e Refeição": [
      "Kit Completo",
      "Kit Parcial",
      "Kit Especial"
    ],
    "Preparo de Refeição": [
      "Preparo Local",
      "Transportadora",
      "Preparo Misto"
    ],
    "Produção de Refeição Local": [
      "Produção Própria",
      "Produção Compartilhada",
      "Produção Supervisionada"
    ],
    "Refeição CAPS": [
      "CAPS I",
      "CAPS II", 
      "CAPS III"
    ],
    "Refeição Local e Transportada": [
      "Refeição Local",
      "Refeição Transportada",
      "Ambas"
    ],
    "Refeição Socioeducativa": [
      "Escolar",
      "Comunitária",
      "Social"
    ],
    "Refeição Transportada": [
      "Transporte Refrigerado",
      "Transporte Térmico",
      "Transporte Comum"
    ],
    "Refeições UPA": [
      "UPA 24h",
      "UPA Básica",
      "UPA Ampliada"
    ],
    "Refeições UPA e Hospital Dia": [
      "UPA",
      "Hospital Dia",
      "Ambos"
    ],
    "Restaurante do Trabalhador": [
      "Popular",
      "Empresarial",
      "Público"
    ],
    "Restaurante Popular": [
      "Básico",
      "Ampliado",
      "Especializado"
    ],
    "Serviço de Alimentação Buffet": [
      "Buffet Simples",
      "Buffet Completo",
      "Buffet Premium"
    ],
    "Merenda Escolar Completa": [
      "Educação Infantil",
      "Ensino Fundamental",
      "Ensino Médio"
    ],
    "Refeição Presidio": [
      "Refeição Básica",
      "Refeição Completa",
      "Refeição Especial"
    ]
  },
  "Concessão": {
    "Concessões de Restaurante": [
      "Concessão Básica",
      "Concessão Completa",
      "Concessão Especializada"
    ],
    "Exploração de Restaurante": [
      "Exploração Total",
      "Exploração Parcial",
      "Exploração Temporária"
    ],
    "Permissão de Uso": [
      "Uso Básico",
      "Uso Completo",
      "Uso Especializado"
    ]
  },
  "Mão de Obra": {
    "Mão de Obra Cozinheira": [
      "Cozinheira Geral",
      "Cozinheira Especializada",
      "Cozinheira Chefe"
    ],
    "Mão de Obra Cozinheira (s)": [
      "Uma Cozinheira",
      "Múltiplas Cozinheiras",
      "Equipe de Cozinheiras"
    ],
    "Mão de Obra Cozinheiro Escolar": [
      "Ensino Fundamental",
      "Ensino Médio",
      "Ensino Superior"
    ],
    "Mão de Obra Diversas (os)": [
      "Auxiliares",
      "Especialistas",
      "Coordenadores"
    ],
    "Mão de Obra Merendeira": [
      "Merendeira Básica",
      "Merendeira Especializada",
      "Merendeira Supervisora"
    ],
    "Mão de Obra Merendeira e outros": [
      "Merendeira Principal",
      "Auxiliares",
      "Equipe Completa"
    ],
    "Mão de Obra Merendeira Escolar": [
      "Educação Infantil",
      "Ensino Fundamental",
      "Ensino Médio"
    ],
    "Mão de Obra Copeiragem": [
      "Copeiro Básico",
      "Copeiro Especializado",
      "Chefe de Copeiragem"
    ],
    "Mão de Obra Copeiragem Hospitalar": [
      "Copeiro Hospitalar",
      "Copeiro UTI",
      "Copeiro Especializado"
    ],
    "Mão Obra Cozinheiro e Auxiliar Cozinha": [
      "Cozinheiro Principal",
      "Auxiliar de Cozinha",
      "Equipe Completa"
    ],
    "Mão de Obra Merendeira Empresa Escolar": [
      "Empresa Pequena",
      "Empresa Média",
      "Empresa Grande"
    ],
    "Mão de Obra Merenda Escolar": [
      "Merenda Básica",
      "Merenda Completa",
      "Merenda Especializada"
    ],
    "Mão de Obra Merenda Escolar e outras": [
      "Merenda Principal",
      "Outras Refeições",
      "Serviço Completo"
    ],
    "Mão de Obra Merendeira Empresa": [
      "Empresa Terceirizada",
      "Empresa Própria",
      "Empresa Mista"
    ]
  },
  "Nutrição": {
    "Motorista ambulância": [
      "Motorista Básico",
      "Motorista Especializado",
      "Motorista UTI"
    ],
    "Nutrição Hospitalar": [
      "Nutrição Clínica",
      "Nutrição Pediátrica",
      "Nutrição Geriátrica"
    ]
  },
  "Prestação de Serviços": {
    "Prestação de Serviços de cozinha unidades de Rancho": [
      "Rancho Básico",
      "Rancho Completo",
      "Rancho Especializado"
    ]
  }
};

// Lista de sites conforme especificação atualizada
export const SITES_LIST = [
  "administracao.pr.gov.br",
  "apoiocotacoes.com.br",
  "app2.ammlicita.org.br",
  "aquisicoes.seplag.mt.gov.br",
  "araraquaradaae.eportal.net.br/portal_licitacoes_externo_irrestrito",
  "bancodepreco@educacaosalvador.net",
  "bertioga.sp.gov.br/licitacao",
  "bllcompras.com",
  "bnc.org.br",
  "cabo.pe.gov.br",
  "compras.gov",
  "compras.barueri.sp.gov.br",
  "comprasbr.com.br",
  "compras.itaipu.gov.br",
  "compras.m2atecnologia.com.br",
  "compras.ma.gov.br",
  "compras.manaus.am.gov.br",
  "compras.mg.gov.br",
  "compras.rj.gov.br",
  "compras.sistemafiergs",
  "compras@carmo.rj.gov.br",
  "compras@hcb.org.br",
  "compras@hmmc.org.br",
  "comprasnet.ba.gov.br",
  "compraspara.pa.gov.br",
  "cotacao.banpara.b.br/default.aspx",
  "cotacao.sempre@salvador.ba.gov.br",
  "cotacao2.aguas@gmail.com",
  "dlc.licitacao@saude.ba.gov.br",
  "e-compras.am.gov.br",
  "egov.paradigmabs.com.br/sesc_senac_rs",
  "e-lic.sc",
  "ffm.br",
  "fuabc.org.br",
  "funed.mg.gov.br",
  "funev.org.br",
  "http://164.163.239.234:5656/comprasedital",
  "Licitações-e.com.br",
  "Licitações-e2.bb.com.br",
  "licitacoes-e2.bb.com.br/aop-inter-estatico/",
  "Licitamais Brasil",
  "licitamaisbrasil.com.br",
  "Licitanet",
  "Licitar Digital",
  "Novo BBM NET",
  "operacionalizacao.ucc@uberaba.mg.gov.br",
  "ovg.org.br",
  "parceriassociais.sp.gov.br/OSC/OSC",
  "pbdocforms.pb.gov.br/servico/160",
  "PE Integrado",
  "Portal de Compras Públicas",
  "portal do fornecedor RS",
  "Portal Petronect",
  "portalcompras.ce.gov.br/fornecedores",
  "portaldecompras.ce.gov.br",
  "portaldecomprasfsvc.com.br",
  "praiagrande.sp.gov.br",
  "pregaobanrisul.com.br",
  "Presencial",
  "publinexo",
  "publinexo.com.br/privado/",
  "santacruzdeminas.licitapp.com.br",
  "sefaz.ce",
  "selcorp.com.br",
  "sesc-rs.com.br/licitacoes",
  "SIGA MS",
  "SIGA RJ",
  "siga.ap.gov.br",
  "slicx.com.br",
  "smscla.servicos06@gmail.com",
  "smscla.servicos08@gmail.com",
  "vander@fundahc.com.br"
];