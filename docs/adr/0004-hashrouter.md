# ADR 0004 — HashRouter em vez de rotas de histórico

**Status:** aceito · **Data:** 2026-08-25

## Contexto

O GitHub Pages serve arquivos estáticos e não oferece fallback de rota: uma requisição direta a `/my-fitness-app/hoje` retorna 404, porque não existe esse arquivo. As duas saídas conhecidas são o truque do `404.html` (copiar o `index.html` para `404.html` e reconstruir a rota no cliente) ou rotas por hash.

## Decisão

`HashRouter` do React Router. As rotas ficam `#/hoje`, `#/evolucao`, `#/perfil`, `#/plano`.

## Razões

- O truque do `404.html` precisa ser mantido em sincronia com o `navigateFallback` do service worker. São duas peças que podem divergir em silêncio e quebrar recarregamento **offline**, que é justamente o caso de uso crítico deste app.
- URL bonita não é requisito de um app instalado na tela inicial: o usuário abre pelo ícone, não digitando o endereço. Não há SEO a defender — o conteúdo é privado por natureza.
- Simplicidade vence: uma peça a menos para dar errado.

## Consequências

- URLs carregam `#`. Custo estético aceito.
- Migrar para rotas de histórico depois é troca de um componente do React Router mais configuração de servidor — barato, se um domínio próprio com servidor de verdade entrar em cena.
- Links compartilhados apontando para dentro do app continuam funcionando normalmente.
