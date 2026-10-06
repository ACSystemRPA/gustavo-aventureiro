# GameForge — Plano de Restauração do Projeto Gustavo

## Estado atual observado
O jogo **O Segredo do Farol** já possui:
- mundo 3D em Three.js;
- fallback 2D;
- controle por teclado, toque e comando;
- HUD;
- voz por síntese do dispositivo;
- save local;
- assets locais;
- GitHub Pages;
- renderização 3D concentrada em `render3d.js`;
- regras e estado principalmente em `jogo.js`.

O objetivo da restauração não é apagar essa base. É separar responsabilidades e criar um núcleo reutilizável.

## Fase 0 — Congelar comportamento
Antes de refatorar:
1. registrar fluxo de início;
2. registrar controles;
3. registrar save/load;
4. registrar progressão de fases;
5. registrar finalização;
6. registrar fallback 2D;
7. testar em desktop e mobile.

## Fase 1 — Criar camada GameForge compatível
Primeiros módulos a extrair sem alterar mecânicas:
- GameState
- InputAdapter
- SaveAdapter
- AudioAdapter
- RendererAdapter

A versão atual continua chamando o código legado por baixo.

## Fase 2 — Separar renderização e gameplay
Objetivo:
- `render3d.js` apenas desenha;
- `jogo.js` não acessa detalhes internos do Three.js;
- dados de fase passam a ser declarativos.

Criar contratos:
```js
RendererAdapter.render(state)
RendererAdapter.onTileChanged(x, y)
RendererAdapter.resize()
RendererAdapter.dispose()
```

## Fase 3 — Extrair input
Consolidar:
- teclado;
- touch;
- gamepad/TV.

Ações abstratas:
```
MOVE_X
MOVE_Y
INTERACT
ATTACK
PAUSE
CONFIRM
BACK
```

## Fase 4 — Extrair save
Criar versão de save:
```json
{
  "version": 1,
  "game": "segredo-do-farol",
  "progress": {},
  "settings": {}
}
```

Adicionar migração de saves antigos quando necessário.

## Fase 5 — Asset Manager
Centralizar:
- imagens;
- texturas;
- áudio;
- dados;
- modelos futuros.

Evitar carregamento duplicado e permitir preload por fase.

## Fase 6 — Performance
Medir antes de alterar.

Verificar:
- draw calls;
- quantidade de meshes;
- instancing;
- partículas;
- resolução;
- sombras;
- pixel ratio;
- tempo por frame.

Manter degradação automática de qualidade em hardware fraco.

## Fase 7 — Física
Rapier só entra quando houver ganho claro:
- colisões mais complexas;
- plataformas;
- objetos físicos;
- triggers reutilizáveis.

Não adicionar Rapier apenas por modernização estética.

## Fase 8 — TypeScript/Vite
Migrar somente após estabilizar contratos do núcleo.

Ordem sugerida:
1. dados;
2. adapters;
3. managers;
4. gameplay;
5. renderer.

## Fase 9 — WebGPU
Adicionar como caminho opcional depois da arquitetura estar modular.
Manter fallback para WebGL 2.

## Vertical slice de validação
Antes de migrar o jogo inteiro, escolher uma fase e validar:
- movimento;
- câmera;
- interação;
- missão;
- HUD;
- save;
- áudio;
- vitória;
- mobile.

## Resultado esperado
Ao final, o projeto deve permitir criar novos jogos do universo Gustavo reutilizando:
- controles;
- câmera;
- save;
- quests;
- diálogos;
- ranking futuro;
- conquistas;
- HUD;
- áudio;
- loading;
- suporte mobile.

Isso transforma o projeto em uma base de games, não em um jogo isolado.
