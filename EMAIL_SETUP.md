# Notificações por e-mail — configuração (Resend + Supabase Edge Function)

Arquitetura **segura**: o site só dispara o pedido; a chave da API fica só no servidor.

```
Fluxo Jurídico (site)  →  Edge Function "notify" (Supabase, guarda a chave)  →  Resend  →  caixas da equipe
```

O código do site **já chama** a função ao criar/atualizar tarefas. Falta só o setup abaixo.

---

## 1 · Resend (conta + domínio + chave)

1. Crie conta em <https://resend.com> (grátis: ~3.000 e-mails/mês).
2. **Domains → Add Domain →** `heroseguros.com.br`. O Resend mostra alguns **registros DNS** (SPF/DKIM). Peça para a **TI adicionar** esses registros no DNS do domínio e aguarde ficar **Verified**.
   - Sem domínio verificado, o Resend só entrega para o e-mail da sua própria conta (modo teste).
3. **API Keys → Create API Key →** copie o valor (`re_...`). Guarde — vamos colocar como segredo no Supabase (não no site).

## 2 · Publicar a Edge Function no Supabase

**Pelo painel (sem instalar nada):**
1. Supabase → menu **Edge Functions → Deploy a new function → Via editor**.
2. Nome: `notify`.
3. Cole o conteúdo de [`supabase/functions/notify/index.ts`](supabase/functions/notify/index.ts).
4. **Deploy**.

*(Alternativa por CLI: `supabase functions deploy notify`.)*

## 3 · Segredos da função (a chave mora aqui, nunca no site)

Supabase → **Edge Functions → (função notify) → Secrets** (ou Project Settings → Edge Functions → Manage secrets). Adicione:

| Nome | Valor |
|---|---|
| `RESEND_API_KEY` | a chave `re_...` do Resend |
| `FROM_EMAIL` | `Fluxo Jurídico <fluxo@heroseguros.com.br>` (tem que ser do domínio verificado) |
| `ALLOWED_EMAILS` | os 4 e-mails da equipe, separados por vírgula (lista de segurança) |

## 4 · Preencher os e-mails da equipe no site

No `index.html`, na constante `TEAM`, preencha o campo `email` de cada pessoa. Depois `git push` (o GitHub Pages atualiza sozinho).

## 5 · Testar

Crie uma tarefa atribuindo a alguém com e-mail preenchido → deve chegar um **[Nova tarefa]**. Altere o prazo → deve chegar um **[Tarefa atualizada]** dizendo o que mudou.

---

### Notas
- **verify_jwt:** por padrão a função exige login. O site já envia a sessão do usuário, então funciona. Se aparecer erro 401, desative `verify_jwt` para a função `notify` (a `ALLOWED_EMAILS` continua protegendo contra abuso).
- **Quem recebe:** responsáveis + revisor + criador, exceto quem fez a ação (não recebe e-mail da própria ação).
- **Falha de e-mail nunca trava o app:** se a função estiver fora do ar, o quadro continua funcionando normalmente.
- **Modo local / servidor na rede:** as notificações só disparam na versão em nuvem (Supabase). Na versão LAN não há envio de e-mail.
