# Fluxo Jurídico — Atividades da Equipe (HERO Seguros)

Sistema web para a equipe jurídica controlar atividades: **designar → delegar → concluir → aprovar**, com comentários, quadro Kanban, roadmap da cadeia de responsabilidade e feed de atualizações. Um único arquivo (`index.html`), sincronizado em tempo real via **Supabase**, publicado no **GitHub Pages**.

- **Sem login, ninguém vê os dados** (RLS do Supabase). A equipe entra com uma **senha compartilhada**.
- **Tempo real**: o que uma pessoa muda aparece nas telas das outras em segundos.

---

## Publicar em 5 passos

### 1. Criar o projeto no Supabase
1. Crie uma conta em <https://supabase.com> e um **New project** (região mais próxima; guarde a senha do banco).
2. Menu **SQL Editor → New query**, cole o conteúdo de [`supabase_setup.sql`](supabase_setup.sql) e clique **Run**.

### 2. Criar o login compartilhado da equipe
No painel: **Authentication → Users → Add user**
- **Email:** `juridico@heroseguros.com.br` (ou o que você preferir — tem que ser o mesmo do passo 3)
- **Password:** a senha que a equipe vai usar
- marque **Auto Confirm User**

### 3. Preencher a configuração no `index.html`
No painel do Supabase: **Project Settings → API**. Copie os dois valores para o topo do `index.html`:

```js
window.FLUXO_CONFIG = {
  SUPABASE_URL:      "https://SEU-PROJETO.supabase.co",
  SUPABASE_ANON_KEY: "eyJ...",              // chave "anon public" (pode ser pública)
  LOGIN_EMAIL:       "juridico@heroseguros.com.br"
};
```

> A **chave `anon public` é feita para ficar visível** — a proteção real vem do RLS + login. A senha da equipe **nunca** fica no código.

### 4. Subir para o GitHub
```bash
git add -A
git commit -m "Fluxo Jurídico"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/fluxo-juridico.git
git push -u origin main
```

### 5. Ligar o GitHub Pages
No repositório: **Settings → Pages → Source: Deploy from a branch → `main` / `(root)` → Save**.
Em ~1 minuto sai a URL pública (algo como `https://SEU-USUARIO.github.io/fluxo-juridico/`).
**É esse link que você manda para a equipe.** Cada pessoa entra com a senha e escolhe o próprio nome.

---

## Trocar o time / cores
No `index.html`, edite a constante `TEAM` (nome, papel e cor de cada pessoa). As cores seguem o padrão do dashboard HERO.

## Sobre privacidade (LGPD)
Neste modelo os dados ficam **no Supabase (nuvem)**, não na rede interna da Hero. Se a política interna exigir que os dados jurídicos não saiam da empresa, existe a alternativa de rodar em servidor interno (arquivos `fluxo_server.py` / `iniciar_fluxo.bat`, na pasta do projeto) — nesse caso o "link" é o endereço interno `http://IP:porta` e nada vai para a nuvem.

## Modos de funcionamento (automático)
O mesmo `index.html` se adapta sozinho:
- **Nuvem (Supabase):** quando `SUPABASE_URL`/`SUPABASE_ANON_KEY` estão preenchidos. Login + tempo real.
- **Servidor na rede:** quando servido por `fluxo_server.py` sem config Supabase.
- **Local:** aberto como arquivo, sem config — dados só no navegador + backup por exportar/importar.
