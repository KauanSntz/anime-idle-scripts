# AUTO-INVOCAR — Documentação Completa (v8)

> Script local para o anime-idle.com. Cola no F12 e roda 100% no navegador.

---

## 1. Visão Geral

- **Jogo:** anime-idle em `anime-idle.com/play` (navegador Brave)
- **Função:** dois modos — **Baú** (×10/50/100) ou **Invocação** (×10 por ouro)
- **100% local:** sem rede, sem registro, sem servidor
- **F5** desliga tudo; **recolar** não duplica (guarda em `window.__sm`) e restaura configs do `localStorage`
- **Modos exclusivos:** ativa um desativa o outro

---

## 2. Os dois modos

### Modo Baú
1. Verifica se botão de baú (`.bau-abrir[data-n="10/50/100"]`) está visível
2. Clica no botão de abrir baús
3. Após 500ms clica em "Continuar" (`#reveal-continue`)
4. Lê o `#battle-log` e conta as invocações
5. Se sair raridade da lista `pararRares` ou algum alvo configurado → **pausa**
6. Repete automaticamente

### Modo Invocação
1. Verifica se botão `#sm-gold-10` está visível (×10 por 13.5k ouro)
2. Clica no botão de invocar
3. Após 500ms clica em "Continuar"
4. Lê o `#battle-log` e conta as invocações
5. Se sair raridade da lista `pararRares` ou algum alvo configurado → **pausa**
6. Repete automaticamente

### Regras de pausa (iguais nos dois modos)

Durante a pausa: se você clicar manualmente e o lote trouxer algo, a pausa **reinicia**; se vier limpo, **encerra na hora**. Se ninguém clicar, o countdown acaba e volta a auto-invocar.

---

## 3. Seletores dos botões

### Modo Baú

| Seletor | Tipo |
|---|---|
| `.bau-abrir[data-n="10"]` | ×10 baús |
| `.bau-abrir[data-n="50"]` | ×50 baús |
| `.bau-abrir[data-n="100"]` | ×100 baús |

### Modo Invocação

| Seletor | Tipo |
|---|---|
| `#sm-gold-10` | ×10 invocação (13.5k ouro) |

### Tela de resultado

Após abrir baú ou invocar, o jogo mostra a tela de resultado com o botão **Continuar**:
- Seletor: `#reveal-continue`
- Padrão: 1 clique base + `extra` cliques extras (padrão `extra = 2`), espaçados em 200ms

Cada invocação gera uma `<div>` filha do `#battle-log`:

```
<div class="other rg-rN">Você invocou Nome (Raridade) · cópia extra</div>
<div class="other rg-rN">Você invocou Nome (Raridade) · NOVA!</div>
```

- **NOVA!** = boneco novo (primeira vez); senão é `cópia extra`
- Regex: `^Voc(e|ê) invocou <nome> (<raridade>)(?: · <tag>)?$`

### Classes de raridade (`rg-rN`)

| Classe | Raridade |
|---|---|
| `rg-r1` | Comum |
| `rg-r2` | Incomum |
| `rg-r3` | Raro |
| `rg-r4` | Épico |
| `rg-r5` | Lendário |
| `rg-r6` | Mítico |

---

## 4. Registro (`#battle-log`)

### Helpers

- `norm(s)` — normaliza texto: minúsculas + remove acentos (á→a, ç→c...)
- `visivel(el)` — `getClientRects().length > 0`
- `apto(el)` — não `disabled`, sem classe `disabled`/`lock`
- `escanear()` — varre `#battle-log` a cada 200ms, processa nós novos
- `conferirClick()` — 2,5s depois de cada clique, confere se o registro ganhou linhas

### Ciclo do `tick` (200ms)

1. `escanear()` — processa linhas novas (dispara pausa se casar regra)
2. Se `pausado` → atualiza banner, checa regras de fim da pausa, **não clica em nada**
3. Se tela de resultado visível → fecha com Continuar (prioridade em qualquer modo)
4. Se modo = **bau** → usa seletor baseado em `TIPO_BAU` (10/50/100)
5. Se modo = **invoc** → usa `#sm-gold-10`
6. Se botão do modo atual visível e apto e passou `clickGap` → clica e agenda conferência

---

## 6. Pause e regras de pausa

### Regras

| Situação | Comportamento |
|---|---|
| Sai raridade da `pararRares` ou alvo | Pausa: countdown + banner |
| Usuário clica durante pausa e lote traz raridade/alvo/L/M | **Re-pausa** (countdown reinicia) |
| Usuário clica durante pausa e lote veio limpo | **Encerra na hora** |
| Linha de L/M/alvo chega durante pausa SEM clique do usuário | **NÃO reinicia** — só anota/loga |
| Ninguém clica e countdown acaba | Retoma sozinho |

### Detecção de clique manual (válida só durante pausa)

- id/classe contendo `sm-gold` ou `summon`
- OU texto normalizado casando `^x\d+` (ex.: `x10`, `x1`) ou contendo `invoca`/`invoque`
- Botão Continuar **não** conta

### Variáveis de estado

| Variável | Significado |
|---|---|
| `ativo` | script ligado/desligado |
| `pausado` | pausa ativa |
| `pausaEm` | `{ rar, nome, tipo ('ml'|'alvo'), ate, inicio }` |
| `clicouEm` | timestamp do último clique manual (só vale na pausa) |
| `clickGap` | intervalo entre cliques (ms) |
| `pauseMs` | duração do countdown da pausa (ms) |

---

## 7. Configurações (painel ⚙)

| Config | Padrão | Descrição |
|---|---|---|
| `intervalo` | 1s | intervalo mínimo entre cliques |
| `pausa` | 5s | duração do countdown ao achar |
| `extra` | 2 | cliques extras no Continuar |
| `mostraNome` | true | exibe nome/raridade no banner |
| `alvos` | 1 vazio | lista de bonecos que disparam pausa (máx. 10) |
| `pararRares` | L/M | raridades que disparam pausa |

- Painel **só abre com botão PARADO**
- Posição do botão arrastável salva em `localStorage`
- Todas as configs de tempo são em **segundos**

### Migrações já implementadas

- `intervalo` salvo em ms (≥200) é convertido pra s
- `alvoNome`/`alvoRar` antigos viram `alvos`
- Config sem `pararRares` cai no padrão L/M

---

## 8. API do console (`__sm`)

| Chamada | Efeito |
|---|---|
| `__sm.start()` | liga |
| `__sm.stop()` | desliga + resumo |
| `__sm.status()` | estado completo (contagens, pausa, botões do jogo) |
| `__sm.retomar()` | encerra a pausa manualmente na hora |
| `__sm.intervalo(s)` | define intervalo (mín 0.2s) |
| `__sm.pausaSec(n)` | define duração da pausa (s) |
| `__sm.extraClicks(n)` | define cliques no Continuar |
| `__sm.tipoBaum(n)` | muda tipo de baú (10, 50 ou 100) |
| `__sm.modo()` | retorna modo atual ('bau' ou 'invoc') |
| `__sm.modo('bau')` | troca para modo baú |
| `__sm.modo('invoc')` | troca para modo invocação |

---

## 9. UI

### Banner de pausa (topo, fixo)

- amarelo/dourado com nome e contagem regressiva
- só aparece durante a pausa

### Botão flutuante (canto inferior direito)

- **PARADO** (cinza) — início
- **BAU** ou **INVOC** (verde) — ativo
- **PAUSA** (âmbar) — em pausa
- Arrastável: segure e arraste pra mover
- Engrenagem: abre painel de configurações (só quando PARADO)

### Painel de configurações

- **Duas abas:** Baú / Invocação (troca de modo)
- Atraso entre cliques
- Pausa ao achar L/M
- Cliques no Continuar
- Tipo de baú (×10 / ×50 / ×100) — só aparece na aba Baú
- Parar ao encontrar (bonecos com raridade opcional)
- Parar quando (raridades)
- Mostrar nome do boneco (ON/OFF)

---

## 10. Histórico de versões

| Versão | Mudanças |
|---|---|
| v1 | Auto-invocar ×10 + pausa 5s fixa ao achar L/M + leitura do `#battle-log` + API `__sm` |
| v2 | Botão ON/OFF arrastável (posição salva) + logs de diagnóstico |
| v3 | Painel de configurações (⚙) + persistência no `localStorage` |
| v4 | Recolher vermelho, toggle OFF amarelo, anti-spoiler total, config só com PARADO |
| v5 | Lista de alvos múltiplos (máx. 10) + migração ms→s |
| v6 | **Pausa por clique manual**: re-pausa só a partir de clique; lote limpo encerra na hora |
| v7 | **"Parar quando (raridades)"**: lista dinâmica de raridades |
| v8 | **Duas abas**: Baú (×10/50/100) e Invocação (×10 por ouro) — modos mutuamente exclusivos; bug fix no seletor que sempre preferia ×100 |

---

## 11. Distribuição (Gist + one-liner)

### Arquivos

- `auto-invocar.js` — script principal
- `gist.txt` — instruções de publicação
- `version.txt` — versão atual (v8)

### Publicar

1. Crie conta em github.com
2. Acesse gist.github.com → "Create a public gist"
3. Filename: `auto-invocar.js`
4. Cole o conteúdo de `auto-invocar.js`
5. Create gist → Raw → copie a URL

### Linha única pra colar no F12

```js
fetch('URL_RAW?ts='+Date.now()).then(r=>r.text()).then(eval)
```

### Atualizar sem trocar a linha

Edite o mesmo gist — a URL não muda.

---

## 13. Arquitetura do Painel (importante)

O painel tem **duas partes**:

```
panel (container fixo)
├── modoTabs   (abas Baú / Invocação — sempre visíveis)
├── modoPainel (#auto-invocar-modo-painel — conteúdo que muda)
└── f          (botão Recolher — sempre visível)
```

###modoPainel

É reconstruído inteiramente via `renderPainelConteudo()` quando:
- O modo é trocado (`trocarModo`)
- O painel é aberto (`abrirPainel`)

**Não usar `innerHTML` direto no panel** — isso destruiria as abas e o footer.

### Funções de render

| Função | Quando usar |
|---|---|
| `renderPainelConteudo()` | Reconstrói todo o conteúdo dentro de `modoPainel` baseado no modo atual |
| `renderModo()` | Atualiza só as cores das abas (ativa/inativa) |
| `renderTipoBaum()` | Atualiza highlight dos botões ×10/×50/×100 (só modo Baú) |
| `renderAlvos()` | Atualiza lista de alvos dentro do painel (só modo Invocação) |
| `renderParar()` | Atualiza lista de raridades dentro do painel (só modo Invocação) |

---

## 14. Bugs Conhecidos e Correções (v8)

### Bug: `rTipoBaum is not defined`
**Causa:** `rTipoBaum`, `btnTipo10`, `btnTipo50`, `btnTipo100` declarados com `var` local dentro de `montarUI()`. Funções como `renderTipoBaum()` e `renderModo()` executam fora desse escopo.

**Correção:** declarar todas essas variáveis no escopo global do IIFE no início do script (junto com `iIntervalo`, etc).

### Bug: `modoTabs is not defined`
**Causa:** `modoTabs` declarado com `var` local dentro de `montarUI()` masreferenciado antes da atribuição (por causa do hoisting).

**Correção:** declarar `modoTabs = null` no escopo global junto com as outras variáveis.

### Bug: botão sempre ia pra ×100
**Causa:** `tick()` usava `q(SEL_BAU_100) || q(SEL_BAU_50) || q(SEL_BAU_10)` — sempre preferia 100 independentedo `TIPO_BAU`.

**Correção:** usar seletor dinâmico baseado em `TIPO_BAU`:
```javascript
if (TIPO_BAU === 100) btnAlvo = q(SEL_BAU_100);
else if (TIPO_BAU === 50) btnAlvo = q(SEL_BAU_50);
else btnAlvo = q(SEL_BAU_10);
```

### Bug: `f is not defined`
**Causa:** `f` referenciado sem `var` no escopo — em strict mode dá ReferenceError.

**Correção:** declarar `f = null` no escopo global.

### Bug: `window.__renderPainel is not a function`
**Causa:** tentei expor `renderPainelConteudo` via `window.__renderPainel` mas a atribuição ficava dentro de `montarUI()` após a chamada de `renderPainelConteudo()`. Funções `abrirPainel` e `trocarModo` chamavam `window.__renderPainel()` que ainda não existia.

**Correção:** não usar `window.__renderPainel`. Chamar `renderPainelConteudo()` diretamente — ela já existe no escopo do IIFE.

### Bug: `renderPainelConteudo is not defined`
**Causa:** `renderPainelConteudo` era uma `function` declarada **dentro** de `montarUI()`. As funções `trocarModo()` e `abrirPainel()` (definidas **fora** de `montarUI()`) tentavam chamá-la — ReferenceError.

**Correção:** declarar `var renderPainelConteudo = null` no escopo global e atribuir a função dentro de `montarUI()` com `renderPainelConteudo = function() { ... }`. Assim fica acessível fora.

---

## 15. Regras de Escopo (evitar bugs)

1. **Variáveis de UI** (`iIntervalo`, `iPausa`, `iExtra`, `btnNome`, `alvoLista`, `pararLista`, `rTipoBaum`, `btnTipo10/50/100`, `modoTabs`, `modoPainel`, `f`) → declarar no escopo global do IIFE como `null`
2. **Funções auxiliares** (`lbl`, `inp`, `row`) → criar **antes** de `montarUI()` no escopo global
3. **Funções de render** (`renderAlvos`, `renderParar`, `renderTipoBaum`, `renderModo`) → criar no escopo global como `function nome()` normal
4. **`renderPainelConteudo`** → declarado como `var renderPainelConteudo = null` no global; dentro de `montarUI()` atribuir com `renderPainelConteudo = function() { ... }` — não como `function` declaration dentro de `montarUI()`
5. **Não usar `window.*`** para funções internas — só para a API pública `__sm`
6. **Conteúdo do painel** vai dentro de `modoPainel` (não em `panel` diretamente) — assim `renderPainelConteudo()` pode fazer `modoPainel.innerHTML = ''` sem destruir as abas e o footer
