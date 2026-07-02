// Tipos centrais do FoodCRM
// Refletem exatamente os campos do arquivo de scraping + campos do CRM

export type Produto = 'cloudfy' | 'cplung' | 'qualificar'

export type StatusLead =
  | 'novo'
  | 'contato_feito'
  | 'proposta_enviada'
  | 'fechado_ganho'
  | 'fechado_perdido'

export type ClassificacaoScraping = 'A - Excelente' | 'B - Bom' | 'C - Regular'

export type StatusStagingRaspagem =
  | 'pendente'
  | 'aprovado'
  | 'descartado'
  | 'transformado'

// ---------------------------------------------------------------
// Empresa / Lead — tabela principal do CRM
// ---------------------------------------------------------------
export interface Empresa {
  id: string
  tenant_id: string
  nome: string               // nome_fantasia ou razao_social
  razao_social: string
  cnpj: string | null
  telefone: string | null    // normalizado: só dígitos, primeiro número
  telefone_raw: string | null // original do scraping
  email: string | null
  email_contador: boolean    // true se o sistema detectou e-mail de escritório contábil
  segmento: string | null    // descrição do CNAE principal
  cnae_codigo: string | null
  porte: string | null       // MICRO EMPRESA / EMPRESA DE PEQUENO PORTE / DEMAIS
  capital_social: number | null
  bairro: string | null
  municipio: string | null
  uf: string | null
  score: number
  classificacao: ClassificacaoScraping | null
  produto_sugerido: Produto
  status: StatusLead
  dono_id: string | null     // usuário responsável
  canal_origem: string       // 'scraping' | 'manual'
  fonte_dados: string | null // ReceitaWS | BrasilAPI
  notas: string | null
  criado_em: string
  atualizado_em: string
  excluido_em: string | null
}

// ---------------------------------------------------------------
// Staging — fila de leads brutos do scraping ainda não triados
// ---------------------------------------------------------------
export interface StagingRaspagem {
  id: string
  tenant_id: string
  bruto: Record<string, unknown>  // JSON exatamente como veio
  normalizado: Partial<Empresa> | null
  status: StatusStagingRaspagem
  alerta: string | null           // ex: "e-mail de contador", "fora do segmento"
  fonte: string | null
  criado_em: string
  processado_em: string | null
}

// ---------------------------------------------------------------
// Interação — histórico de contatos com um lead
// ---------------------------------------------------------------
export type TipoInteracao =
  | 'whatsapp'
  | 'ligacao'
  | 'email'
  | 'visita'
  | 'nota'
  | 'proposta'

export interface Interacao {
  id: string
  empresa_id: string
  usuario_id: string
  tipo: TipoInteracao
  descricao: string
  ocorreu_em: string
  criado_em: string
}

// ---------------------------------------------------------------
// Usuário — os 3 membros da equipe
// ---------------------------------------------------------------
export type PapelUsuario = 'admin' | 'vendedor'

export interface Usuario {
  id: string
  tenant_id: string
  email: string
  nome_completo: string
  papel: PapelUsuario
  avatar_url: string | null
  criado_em: string
}

// ---------------------------------------------------------------
// Helpers de UI
// ---------------------------------------------------------------
export interface FiltroLeads {
  produto?: Produto | 'todos'
  status?: StatusLead | 'todos'
  busca?: string
  dono_id?: string | 'todos'
}

export interface KpiPainel {
  leads_na_fila: number
  em_negociacao: number
  cloudfy_total: number
  cplung_total: number
  fechados_mes: number
}
