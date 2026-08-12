-- ============================================================
--  Fluxo Jurídico — configuração do banco (Supabase)
--  Cole TUDO isto no Supabase → SQL Editor → New query → Run.
--  Roda em segundos e pode ser executado de novo sem problema.
-- ============================================================

-- 1) Tabela única: cada linha é uma atividade (o app guarda o objeto em JSONB).
create table if not exists public.atividades (
  id          text primary key,
  data        jsonb       not null,
  updated_at  timestamptz not null default now()
);

-- 2) Segurança (RLS): SEM login ninguém lê nem escreve — nem com a chave pública.
--    Só quem entrou com o login compartilhado (role "authenticated") tem acesso.
alter table public.atividades enable row level security;

drop policy if exists "equipe le"       on public.atividades;
drop policy if exists "equipe insere"   on public.atividades;
drop policy if exists "equipe atualiza" on public.atividades;

create policy "equipe le"       on public.atividades
  for select to authenticated using (true);
create policy "equipe insere"   on public.atividades
  for insert to authenticated with check (true);
create policy "equipe atualiza" on public.atividades
  for update to authenticated using (true) with check (true);

-- 3) Tempo real: publica as mudanças da tabela para os clientes conectados.
--    (Ignore o erro "already member" se rodar duas vezes — é inofensivo.)
do $$
begin
  begin
    alter publication supabase_realtime add table public.atividades;
  exception when duplicate_object then
    null;
  end;
end $$;

-- ============================================================
--  Depois deste SQL, falta só criar o LOGIN COMPARTILHADO no painel:
--  Authentication → Users → Add user
--    • Email: o mesmo do LOGIN_EMAIL no index.html
--    • Password: a senha que você vai passar para a equipe
--    • marque "Auto Confirm User" (dispensa e-mail de confirmação)
-- ============================================================
