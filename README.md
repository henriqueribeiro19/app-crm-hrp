# APP CRM HRP

CRM para gestão de leads de food service e varejo — Cloudfy e Cplung.

## Tecnologias
- React 18 + Vite
- Tailwind CSS 3
- Supabase (banco de dados + autenticação)
- React Router 6

## Como rodar localmente

### 1. Configure o Supabase
1. Acesse [supabase.com](https://supabase.com) e crie um projeto gratuito
2. No painel do Supabase, vá em **SQL Editor** e cole o conteúdo de `supabase_schema.sql`
3. Execute o script — isso cria todas as tabelas e a segurança

### 2. Configure as variáveis de ambiente
```bash
cp .env.example .env
```
Edite o `.env` com os valores do seu projeto Supabase:
- `VITE_SUPABASE_URL` → Settings → API → Project URL
- `VITE_SUPABASE_ANON_KEY` → Settings → API → anon public

### 3. Convide os usuários
No painel do Supabase → **Authentication → Users → Invite user**
Adicione os e-mails das 3 pessoas. Elas receberão um link para definir a senha.

### 4. Instale e rode
```bash
npm install
npm run dev
```
Acesse em: http://localhost:5173

## Deploy (Vercel)
1. Faça push do projeto para o GitHub
2. Importe o repositório na [Vercel](https://vercel.com)
3. Adicione as variáveis de ambiente (`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`)
4. Deploy automático ✓

## Estrutura do projeto
```
src/
  context/      → AuthContext (gerenciamento de sessão)
  components/
    layout/     → Layout, RotaProtegida
    ui/         → componentes reutilizáveis
  pages/        → Login, Painel, Triagem, Funil
  lib/          → cliente Supabase
```
