# Auto-Invocar — Como Usar

##安装 (primeira vez)

1. Abra o jogo em **anime-idle.com/play**
2. Pressione **F12** para abrir o DevTools
3. Vá na aba **Console**
4. Cole o conteúdo do arquivo `auto-invocar.js` e pressione **Enter**
5. Vai aparecer um botão **"PARADO"** no canto inferior direito

---

## Como Ligar

Clique no botão **"PARADO"** ou digite no console:

```javascript
__sm.start()
```

O botão vai ficar **verde** e mostrar **"BAU"** ou **"INVOC"** significando que está ativo.

---

## Os Dois Modos

### Modo Baú
Abre baús com ouro real. Você escolhe:
- **×10** — 9k ouro por lote
- **×50** — 42.5k ouro por lote
- **×100** — 82k ouro por lote

### Modo Invocação
Usa o botão **×10** original de invocação (13.5k ouro por lote). Sempre abre 10 personagens por vez.

---

## Como Trocar de Modo

1. Clique no botão **PARADO** para desligar se estiver ativo
2. Clique na **engrenagem** (⚙) ao lado do botão
3. Clique na aba **"Baú"** ou **"Invocação"**
4. Se for modo Baú, escolha ×10, ×50 ou ×100

---

## Configurações

Clique na **engrenagem** para abrir o painel:

| Opção | O que faz |
|---|---|
| **Atraso entre cliques** | Quanto esperar entre cada lote (padrão: 1s) |
| **Pausa ao achar L/M** | Quanto tempo parar ao sair Lendário ou Mítico (padrão: 5s) |
| **Cliques no continuar** | Quantos cliques pra fechar a tela de resultado (padrão: 2) |
| **Parar ao encontrar** | Pausar ao tirar um boneco específico (nome + raridade) |
| **Parar quando** | Pausar ao sair de certas raridades |
| **Mostrar nome** | Exibir ou esconder o nome do boneco no banner |

---

## Como Desligar

- Clique no botão verde (ele desliga e volta pra PARADO)
- Ou digite no console: `__sm.stop()`
- Ou pressione **F5** (recarrega a página)

---

## Pausa Automática

O script **para sozinho** quando:
- Sai um **Lendário** ou **Mítico** (padrão)
- Ou sai qualquer **boneco** que você configurar na lista "Parar ao encontrar"

### Regras da pausa:
- Se você **clicar manualmente** durante a pausa e sair algo novo → a pausa **reinicia**
- Se você **clicar manualmente** e o lote vier limpo → a pausa **encerra na hora**
- Se ninguém clicar → o countdown acaba e volta a auto-invocar

---

## API Rápida (console)

```javascript
__sm.start()          // ligar
__sm.stop()           // desligar
__sm.status()         // ver estado atual
__sm.retomar()        // encerrar pausa manualmente
__sm.intervalo(2)     // mudar atraso pra 2 segundos
__sm.pausaSec(10)    // mudar pausa pra 10 segundos
__sm.modo('bau')      // trocar pra modo Baú
__sm.modo('invoc')    // trocar pra modo Invocação
__sm.tipoBaum(50)     // mudar pra ×50 baús
```

---

## Problemas Comuns

### "botao não encontrado"
Verifique se você está na **tela certa do jogo** (a tela de baús ou de invocação).

### Banner amarelo não aparece
O script está rodando mas não encontra o `#battle-log`. Verifique se a **aba Registro** do chat está aberta no jogo.

### Script não faz nada
Verifique se o botão está **verde (ativo)**. Se estiver cinza (PARADO), clique nele pra ligar.

---

## Atualizar para nova versão

1. Substitua o conteúdo de `auto-invocar.js` pela nova versão
2. Recarregue a página (F5)
3. Cole o novo script no console

Seus configurações são mantidas no navegador (localStorage).
