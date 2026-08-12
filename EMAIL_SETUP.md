# Notificações por e-mail — configuração

Arquitetura **segura**: o site só dispara o pedido; a chave da API fica só no servidor (Supabase Edge Function).

```
Fluxo Jurídico (site)  →  Edge Function "notify" (Supabase, guarda a chave)  →  provedor  →  caixas da equipe
```

O site **já chama** a função ao criar/atualizar tarefas. A função suporta **Brevo** (sem DNS) ou **Resend** (com domínio).

---

## Opção A — Brevo (SEM DNS, envia para a equipe já) ✅ escolhida

> ⚠️ Sem autenticação de domínio, os primeiros e-mails podem cair no **Spam/Lixo Eletrônico**. Peça para a equipe marcar como "não é spam" / remetente confiável na primeira vez.

### 1 · Conta + remetente + chave
1. Crie conta em <https://www.brevo.com> (grátis, 300 e-mails/dia).
2. **Senders, Domains & Dedicated IPs → Senders → Add a sender**: cadastre um **e-mail remetente** que você controla (ex.: um e-mail seu). O Brevo envia um link de confirmação — **clique nele** para verificar. (Não precisa de DNS.)
3. **SMTP & API → API Keys → Generate a new API key** → copie (`xkeysib-...`). Essa chave **você** guarda e cola no Supabase (não no site).

### 2 · Publicar a Edge Function no Supabase
- Supabase → **Edge Functions → Deploy a new function → via editor** → nome `notify` → cole `supabase/functions/notify/index.ts` → **Deploy**.

### 3 · Segredos (Supabase → Edge Functions → Secrets)
| Nome | Valor |
|---|---|
| `EMAIL_PROVIDER` | `brevo` |
| `BREVO_API_KEY` | a chave `xkeysib-...` |
| `FROM_EMAIL` | `Fluxo Jurídico <o-remetente-verificado@exemplo.com>` |
| `ALLOWED_EMAILS` | os e-mails da equipe, separados por vírgula |

### 4 · E-mails da equipe no site
No `index.html`, preencha `email` de cada membro em `TEAM`, e `git push`.

### 5 · Testar
Crie uma tarefa → chega **[Nova tarefa]**. Mude o prazo → chega **[Tarefa atualizada]** com o que mudou. (Confira o Spam na primeira vez.)

---

## Opção B — Resend (com domínio verificado, melhor entrega) — para depois
Quando puder verificar o domínio no DNS, troque os segredos para:
`EMAIL_PROVIDER=resend`, `RESEND_API_KEY=re_...`, `FROM_EMAIL=Fluxo Jurídico <fluxo@notificacoes.heroseguros.com.br>`. Nada mais muda.

---

### Notas
- **verify_jwt:** a função exige login por padrão; o site já envia a sessão. Se der 401, desative `verify_jwt` para `notify` (a `ALLOWED_EMAILS` continua protegendo).
- **Quem recebe:** responsáveis + revisor + criador, exceto quem fez a ação.
- **Falha de e-mail nunca trava o app.**
- **Modo local / rede:** e-mails só na versão em nuvem (Supabase).
