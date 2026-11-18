# 0011. Hospedagem, CI e deploy

- Status: Aceito
- Data: 2026-11-18

## Contexto
O jogo é público, aberto a qualquer pessoa, sem login e sem rastreamento; é só arquivos
estáticos (ADR 0004), sem dado no servidor (ADR 0007). O dono já
opera uma VM com Docker Compose atrás de uma borda Caddy compartilhada, com imagem no
GHCR por SHA e deploy manual. As regras da VM são da plataforma, citadas aqui como
`fahledu/NNNN` (repositório `fahledu/fahledu`, `docs/adr/`): borda única e nomes
(`fahledu/0018`), memória e janelas (`fahledu/0019`), deploy e observabilidade
(`fahledu/0013`), headers e `no_cookie` (`fahledu/0009`). Este ADR diz como o jogo as
cumpre; ele não muda nenhuma.

## Decisão

### Nomes (padrão `fahledu/0018`)
- `<projeto>` = `jorge` (nome do jogo: Jorge). Projeto Compose `jorge`,
  pasta `/opt/jorge`, repositório `fahledu/jorge`, imagem `ghcr.io/fahledu/jorge-app`,
  alias `jorge-app` na `platform-edge`, domínio `jorge.fahledu.com.br`, site
  `jorge.caddy`.
- **O nome e o domínio não mudam depois do primeiro deploy:** o save mora no
  `localStorage` da origem (ADR 0007), e trocar o domínio faz os jogadores perderem o
  progresso.

### Contêiner
- Imagem multi-stage: build com Node (ADR 0003) e `--frozen-lockfile`; final com o
  Caddy (mesma imagem e digest da plataforma) servindo `dist/` com um `Caddyfile`
  próprio em `infra/`. Usuário sem root, `.env*` fora do contexto de build.
- Um serviço, `app`: `mem_limit: 32m`, `restart: unless-stopped`, `cap_drop: [NET_RAW]`,
  só na rede externa `platform-edge` (não entra na `platform-auth`: sem login), sem
  porta publicada, `read_only: true` com `tmpfs` para os diretórios de dados do Caddy.
  Escuta na porta 8080 (usuário sem root não abre a 80).
- `jorge.caddy` (instalado pelo script do projeto `edge`): `reverse_proxy jorge-app:8080`
  com `import no_cookie`.

### Headers e cache (no `Caddyfile` da imagem)
- CSP: `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:
  blob:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none';
  frame-ancestors 'none'; form-action 'none'`. Relaxar um item exige mudar este ADR
  com o motivo; o E2E falha com violação de CSP (ADR 0010).
- `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`,
  `Permissions-Policy` só com `fullscreen=(self)`, HSTS de 1 ano.
- `index.html`: `Cache-Control: no-cache`. Arquivos com hash no nome (`/assets/`):
  `public, max-age=31536000, immutable`.
- Sem requisição a terceiros: sem CDN, fonte externa, analytics ou cookie.
- **Versão nova** chega ao recarregar. Aba antiga que tenta baixar uma fase que não
  existe mais → aviso "Há uma versão nova. Recarregue a página." (o save fica, ADR 0007).

### CI e deploy
- CI (push na `main`): o que o ADR 0010 lista; push só de documentação roda só a
  checagem de documentação e de segredos.
- **Deploy manual** (`workflow_dispatch`, Environment `production`), só de commit da
  `main` com CI verde e fora das janelas de jobs da VM (`fahledu/0019`): build da imagem,
  E2E contra ela, push com tag = SHA completo (nunca `latest`; mantém as 5 mais
  recentes), SSH na VM: `pull`, `up -d`, e confere `https://<domínio>/` = 200 com o
  header CSP. Falha para o deploy, sem rollback automático.
- **Login do GHCR (`fahledu/0025`):** a imagem `ghcr.io/fahledu/jorge-app` é
  pública. O pull na VM é anônimo, sem login nem token; nenhum script nem passo manual
  na VM faz `docker login` no GHCR, e o config do Docker do usuário de deploy não tem
  `ghcr.io`. O único token do GHCR é o `GITHUB_TOKEN` do workflow (`packages: write`),
  usado no push dentro do runner e nunca levado à VM. Pacote privado é mudança deste
  ADR, e aí vale a regra inteira do `fahledu/0025`.
- **Voltar versão** = deploy do SHA anterior.
- **Sem backup:** não há dado no servidor; a imagem no GHCR e o git bastam. O
  `docs/OPERACAO.md` registra isso no lugar do teste de restauração.
- **Monitoramento:** UptimeRobot em `https://<domínio>/` a cada 5 min (mesma conta da
  plataforma). Logs só de erro do Caddy, sem log de acesso.
- **Segredos:** nenhum no servidor (nem token do GHCR); no GitHub, só o acesso SSH do
  Environment `production` e o `GITHUB_TOKEN` do próprio workflow para o push.

### Dependências na plataforma (nota de handoff, não muda este repositório)
- Linha do projeto na tabela de orçamento de `fahledu/0019` (32 MB), na lista de
  `<projeto>` de `fahledu/0018` e alias `jorge-app` nos nomes protegidos; registro DNS
  do subdomínio. Proposta em nota para `docs/handoff/` da plataforma, escrita pela
  sessão principal com o usuário.

## Casos-limite
- Requisição com `Cookie: __Secure-fahledu_sid=...` → o contêiner recebe sem `Cookie`.
- Deploy às 05:10 UTC → fora da regra (janela do Acervo); espera.
- Imagem com `mem_limit` ausente → fora da regra; a verificação da VM alerta.
- Phaser cria textura por `data:` → permitido por `img-src`; um `eval` → bloqueado pela
  CSP e o E2E falha.
- Deploy de SHA que não está na `main` → o workflow recusa.
- Alguém roda `docker login ghcr.io` na VM para o Jorge → fora da regra (`fahledu/0025`):
  o pull é anônimo, e um `docker logout` depois apagaria o login de outro projeto no
  mesmo config.

## Descartado
- **Cloudflare Pages, GitHub Pages, Netlify:** mais simples para estático, mas fora do
  padrão do dono (um host, sem depender de provedor, `fahledu/0012`) e com outra
  operação a aprender.
- **Servir pelo site da plataforma (`fahledu.com.br/jogo`):** mistura o deploy do jogo com
  o da plataforma e coloca o save na mesma origem do site.
- **nginx:** a VM já usa Caddy; uma imagem a menos para manter.
