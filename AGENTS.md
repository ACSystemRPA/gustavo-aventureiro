# GameForge Agent — Gustavo

Este repositório adota o **GameForge Agent** como padrão para criação, restauração e evolução de games.

## Missão
Preservar o jogo atual e evoluí-lo de forma incremental para uma arquitetura reutilizável, performática e mobile-first, sem quebrar a versão publicada.

## Prioridades
1. Jogabilidade
2. Estabilidade
3. Performance
4. Clareza
5. Acessibilidade
6. Qualidade visual
7. Efeitos extras

## Stack atual a preservar
- HTML/CSS/JavaScript
- Three.js local em `vendor/three.min.js`
- fallback 2D
- GitHub Pages
- save local
- voz/speech synthesis
- touch, teclado e comando

## Stack alvo
A migração para TypeScript, Vite, Rapier e WebGPU deve ser gradual. Não reescrever o jogo inteiro de uma vez.

## Regra de ouro
Antes de alterar um sistema existente:
- identificar onde estado, renderização e input estão acoplados;
- preservar comportamento atual;
- criar uma camada compatível;
- testar desktop e mobile;
- só então substituir o código legado.

## Arquitetura alvo
```
src/
  core/
    GameManager
    InputManager
    SaveManager
    AudioManager
    AssetManager
  rendering/
    Renderer3D
    Renderer2D
  gameplay/
    PlayerController
    QuestSystem
    InteractionSystem
  world/
    World
    LevelLoader
  ui/
  data/
```

## Restrições
- Não remover fallback 2D até existir alternativa validada.
- Não remover suporte offline sem substituto equivalente.
- Não quebrar GitHub Pages.
- Não mover regras bíblicas/narrativas para dentro da renderização.
- Não transformar conteúdo inventado em fato bíblico.
- Não adicionar dependência sem necessidade clara.

## Critério de pronto
Uma alteração só está pronta quando:
- o jogo abre;
- o jogo inicia;
- o jogador se move;
- missões continuam funcionando;
- save/load continuam funcionando;
- 3D e fallback continuam íntegros;
- mobile continua jogável;
- não surgem erros críticos no console.

## Estratégia de restauração
Use `docs/GAMEFORGE_RESTORE.md` como roteiro oficial.
