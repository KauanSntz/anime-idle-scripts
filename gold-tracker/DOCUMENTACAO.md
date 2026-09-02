# GOLD TRACKER — Documentação

## Índice

1. [Visão Geral](#1-visão-geral)
2. [v1.0.0 — Script Atual](#2-v100--script-atual)
3. [Arquitetura do Script](#3-arquitetura-do-script)
4. [localStorage e dados](#4-localstorage-e-dados)
5. [UI / Shadow DOM](#5-ui--shadow-dom)
6. [Legado v9 — gold-agent.js](#6-legado-v9--gold-agentjs)

---

## 1. Visão Geral

- **Jogo:** anime-idle em `anime-idle.com/play` (navegador Brave)
- **Função:** rastrear ouro ganado, gasto, líquido e ganho/hora em tempo real
- **100% local:** sem rede, sem servidor, sem relay
- **Leitura:** `localStorage['anime_idle_save_v4'].gold` a cada 1 segundo
- **UI:** painel fixo com shadow DOM, arrastável pelo header "Gold Tracker"
- **Posição:** salva em `localStorage['anime_idle_gold_tracker_pos']`

---

## 2. v1.0.0 — Script Atual

### O que faz

Lê o gold do save do jogo (`anime_idle_save_v4`) a cada 1 segundo via `setInterval`. Calcula:
- **Saldo atual** — ouro atual do save
- **Gold ganho** — quanto ganhou desde o início ou reset
- **Gold gasto** — quanto gastou desde o início ou reset
- **Saldo líquido** — ganado - gasto (pode ser negativo)
- **Ganho por minuto** — ouro ganado / minutos decorridos
- **Ganho por hora** — ouro ganado / horas decorridas
- **Tempo** — quanto tempo desde o início ou reset

### Seletor do save

```javascript
const SAVE_KEY = 'anime_idle_save_v4';
```

Lê `localStorage.getItem(SAVE_KEY)` → `JSON.parse` → `save.gold`.

### Intervalo de atualização

```javascript
const UPDATE_MS = 1000; // 1 segundo
```

### Reset

O botão "Reiniciar medição" zera `earnedGold`, `spentGold`, atualiza `initialGold` e `previousGold` para o valor atual do save, e reinicia o `startedAt`.

---

## 3. Arquitetura do Script

```
IIFE 'use strict'
├── Constantes (SAVE_KEY, UPDATE_MS, POS_KEY)
├── Estado
│   ├── initialGold = null       // gold no momento do reset/início
│   ├── previousGold = null     // gold da leitura anterior
│   ├── earnedGold = 0          // acumulado de ganhos
│   ├── spentGold = 0           // acumulado de gastos
│   └── startedAt = Date.now()  // timestamp do início/reset
├── Funções principais
│   ├── readGold()              // lê save.gold do localStorage
│   ├── formatNumber(n)         // formata número pt-BR sem decimais
│   ├── formatSigned(n)        // formata com + ou - na frente
│   ├── formatTime(ms)         // ms → HH:MM:SS
│   ├── resetTracker()         // reinicia a medição
│   └── updateTracker()        // atualiza os campos da UI
├── UI (shadow DOM)
│   ├── host (div fixo, position:fixed)
│   └── shadow (shadow root)
│       ├── Styles CSS
│       └── Panel HTML
└── Event listeners
    ├── .reset → resetTracker()
    └── .toggle → minimize/unminimize
```

### Variáveis de drag (para implementação futura)

```javascript
let isDragging = false;
let dragStartX = 0, dragStartY = 0;
let panelStartX = 0, panelStartY = 0;
```

### Key de posição

```javascript
const POS_KEY = 'anime_idle_gold_tracker_pos';
// Formato: { left: number, top: number }
```

---

## 4. localStorage e dados

### Save do jogo (só leitura)

| Key | Conteúdo |
|---|---|
| `anime_idle_save_v4` | JSON do save completo do jogo. Lido apenas o campo `gold`. |

### Posição do painel

| Key | Conteúdo |
|---|---|
| `anime_idle_gold_tracker_pos` | `{ left: number, top: number }` — posição em pixels do painel. |

### Notas
- O tracker **não modifica** o save do jogo — só lê.
- `initialGold` e `previousGold` são reiniciados no `resetTracker()`.
- `earnedGold` e `spentGold` são acumuladores em memória (não persistidos).

---

## 5. UI / Shadow DOM

### Estrutura

```
host (position:fixed, top:16px, right:16px, z-index máxima)
└── shadow (mode:'open')
    └── .panel (265px, background rgba)
        ├── .header (Gold Tracker ● — draggable)
        │   ├── .title
        │   └── .toggle (−/+)
        └── .body
            ├── .row — Saldo atual
            ├── .divider
            ├── .row — Gold ganho (+)
            ├── .row — Gold gasto (−)
            ├── .row — Saldo líquido (+/−)
            ├── .divider
            ├── .row — Ganho por minuto
            ├── .row — Ganho por hora
            ├── .row — Tempo (HH:MM:SS)
            ├── .status
            └── .reset — Reiniciar medição
```

### Cores

| Elemento | Cor |
|---|---|
| `.gold` | `#facc15` (amarelo ouro) |
| `.positive` | `#4ade80` (verde) |
| `.negative` | `#fb7185` (vermelho) |
| Border do panel | `rgba(250, 204, 21, 0.5)` (amarelo semi-transparente) |
| Background | `rgba(13, 18, 29, 0.95)` |

### Minimize

O painel tem estado minimizado controlado pela classe `.minimized` no `.panel`. O toggle (−/+) fica no header. Painel minimizado mostra só o header.

---

## 6. Legado v9 — gold-agent.js

> O `gold-agent.js` (v9) era a versão anterior do Gold Tracker. Era muito mais complexa — lia o `#battle-log` do chat do jogo, extraía mundo/fase/wave/PvP/XP de cada batalha, tinha 4 abas, barra de status no topo, e era arrastável. As informações abaixo são preservadas para futura implementação de funcionalidades equivalentes.

### source

Arquivo: `C:\Users\kauan\anime-idle\scripts\gold-tracker\gold-agent.js`

### O que fazia (v9)

Media ouro e XP de **cada batalha** lida do `#battle-log` (chat "Registro" do jogo). Não lia do localStorage — analisava as linhas novas do registro em tempo real via `MutationObserver` + `setInterval`.

### Dados de cada batalha (v9)

```javascript
{
  id: 'gt2-...',       // string única
  t: 1234567890,       // timestamp da batalha (ms)
  durMs: 45000,        // duração estimada da batalha (ms)
  gold: 1234,          // ouro ganado (pode ser negativo)
  xp: 567,             // XP ganado
  wave: 12,            // wave number (null se PvP)
  world: 160,          // mundo atual (null se não detectado)
  phase: 9,            // fase atual (null se não detectado)
  win: true,           // true/false (derrota = false)
  pvp: false,          // true se PvP
  opp: null,           // nick do oponente (só PvP)
  session: 's1'        // id da sessão
}
```

###localStorage da v9

| Key | Conteúdo |
|---|---|
| `gt2-sessions` | `[{id, label, start}]` — sessões de farming |
| `gt2-curSession` | id da sessão atual |
| `gt2-battles` | `[{...}]` — até 5000 batalhas salvas |
| `gt2-pos` | `{left, top}` ou `{right, bottom}` — posição do wrap |

### Posição Mundial/Fase (v9)

Fonte primária: elemento `.mp-title` no mapa — formato `160-9 • NOME`.

Regex: `/^\s*(\d{1,3})\s*-\s*(\d{1,3})\b/i`

Fallbacks (em ordem):
1. `#rank-line`
2. `#map-panel`
3. `[class*=mundo]`, `[class*=fase]`, `[class*=posicao]`, `[class*=location]`
4. `#stage`, `#battle-side`
5. Tree walker buscando padrão `M<num> F<num>`

### Parse de linha do Registro (v9)

Linhas aceitas: `Venceu`, `Perdeu`, `Derrota`, `Vitoria`.

Expressões regex usadas:
- `gold`: `/([+\-])\s*([\d.,]+[KM]?)\s*ouro/i`
- `xp`: `/([+\-])\s*([\d.,]+[KM]?)\s*xp/i`
- `wave`: `/wave\s+(\d+)/i`
- `pvp`: `/\bpvp\b|duelo/i`
- `win`: `/^(Venceu|Vitoria)/i`

### Abas da v9

1. **Resumo** — ouro total, ouro PvE, ouro PvP, XP total, batalhas, ouro/min, ouro/h, XP/h
2. **Batalhas** — últimas 15 batalhas com timestamp, wave/mundo/fase, ouro, XP, duração
3. **Fases** — ranking M·F por ouro/hora (só PvE), com barra visual
4. **Sessões** — criar/trocar sessões para comparar blocos

### API da v9 (`window.__gt2`)

```javascript
__gt2.start()              // liga o tracking
__gt2.stop()               // pausa (sem zerar)
__gt2.status()             // estado + contadores
__gt2.reset()              // limpa dados da sessão atual
__gt2.newSession()         // cria nova sessão
__gt2.switchSession(id)    // troca de sessão
__gt2.exportCsv()         // baixa CSV da sessão
__gt2.diagnostico()        // info sobre #battle-log / .mp-title
```

### Barra de status da v9

Fixa no topo da tela (`position:fixed; top:0`). Mostrava:
- Posição atual (M160-9)
- Ouro/min
- Ouro/hora
- Total de ouro
- XP/hora
- Número de batalhas (com contagem de derrotas)

Arrastável pelo corpo da barra.

### Drag da v9

O wrap inteiro (botão + painel) era arrastável. O drag salvava posição no `localStorage['gt2-pos']` em formato `{left, top}` ou `{right, bottom}`.

```
DRAG_LIMIT = 8  // pixels para considerar arraste intencional
```

Lógica:
- `pointerdown` no wrap → marca início
- `pointermove` → se moveu mais de DRAG_LIMIT, entra modo drag
- `pointerup` → se moveu, salva posição; se não moveu, toggla painel

---

## Histórico de Versões

| Versão | Mudanças |
|---|---|
| v9 (gold-agent.js) | Completo, lia `#battle-log`, 4 abas, barra de status, MutationObserver, sessões, CSV, drag do wrap |
| v1.0.0 (gold-tracker.js) | Simplificado, lê `localStorage['anime_idle_save_v4'].gold` a cada 1s, shadow DOM, minimize, reset, **sem drag** (TODO) |
