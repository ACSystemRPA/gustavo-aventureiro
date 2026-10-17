# GameForge — instruções para agentes
Este repositório é o jogo educativo «O Segredo do Farol». Preservar a história, os versículos, os comandos e o progresso local descritos em README.md.
## Compatibilidade
- Manter HTML/JavaScript e Three.js local. Não migrar para React, TypeScript, Vite, Rapier ou WebGPU sem prova de benefício, plano de migração incremental e testes.
- Mobile-first, suporte a toque, comandos/teclado, voz, leitura inicial e fallback 2D sem WebGL.
- Não introduzir telemetria, contas infantis, recolha de dados ou dependências remotas sem aprovação explícita.
- Validar performance em aparelhos modestos, carregamento offline e licenças dos recursos.
## Ferramentas auxiliares opcionais
- Context7 no **cliente do agente**, para consultar documentação atualizada de Three.js e APIs Web; não é dependência do jogo.
- 21st.dev apenas para UI web compatível e acessível; não substituir o motor de jogo.
- Strix apenas em ambiente de testes autorizado e isolado; nunca executar testes intrusivos contra o site público por defeito.
- Graphite como editor de assets exportados (SVG/PNG), não como dependência de runtime.
## Critérios antes de qualquer merge
1. Verificar que o jogo abre e que a missão é concluível.
2. Testar teclado, toque e controlos por comando quando disponíveis.
3. Testar sem ligação de rede, persistência local e fallback 2D.
4. Não publicar diretamente no GitHub Pages sem validação.
