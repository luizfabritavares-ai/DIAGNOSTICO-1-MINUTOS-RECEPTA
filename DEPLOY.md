# Deploy — LP Diagnóstico (Next.js no Railway)

## Passos
1. Criar repo GitHub (privado) com esta pasta e dar push.
2. No projeto Railway do backend (main-production-fe25): **New Service → GitHub Repo** → selecionar o repo. O Railway detecta o `Dockerfile` sozinho.
3. Variáveis do serviço (usadas no BUILD, por serem `NEXT_PUBLIC_*` — redeploy ao mudar):
   - `NEXT_PUBLIC_META_PIXEL_ID` — Pixel do funil (sem ele, nenhum snippet é injetado; a LP funciona igual)
   - `NEXT_PUBLIC_GA4_ID` — opcional
   - `NEXT_PUBLIC_PRIVACY_URL` — URL da Política de Privacidade (fallback `#`)
   - `NEXT_PUBLIC_FARMACIAS` — nº da prova social (fallback `+100`)
4. Settings → Networking → **Generate Domain** (porta 3000).
5. Healthcheck do Railway: path `/healthz`.

## Pendências antes de rodar tráfego
- [ ] Logos das farmácias em `public/farmacias/f1.png` … `f7.png` (a faixa se esconde sozinha enquanto não existirem)
- [ ] `NEXT_PUBLIC_META_PIXEL_ID` definido
- [ ] URL real da Política de Privacidade
- [ ] Template WhatsApp `diagnostico_pocket_lp` aprovado na Meta
- [ ] Teste e2e: form → PDF na tela + WhatsApp + task ClickUp
- [ ] Adicionar a URL nova no Vigia LP (monitor de 15min)

## Rodar local
```
npm install && npm run dev   # http://localhost:3000
```
