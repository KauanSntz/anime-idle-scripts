// ==UserScript==
// @name         Anime Idle - Gold Tracker
// @namespace    https://anime-idle.com/
// @version      1.0.0
// @description  Mostra gold ganho, gasto, líquido e ganho por hora.
// @match        https://anime-idle.com/*
// @match        https://www.anime-idle.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(() => {
    'use strict';

    const SAVE_KEY = 'anime_idle_save_v4';
    const UPDATE_MS = 1000;
    const POS_KEY = 'anime_idle_gold_tracker_pos';

    let initialGold = null;
    let previousGold = null;
    let earnedGold = 0;
    let spentGold = 0;
    let startedAt = Date.now();

    let isDragging = false;
    let dragStartX = 0, dragStartY = 0;
    let panelStartX = 0, panelStartY = 0;

    const formatter = new Intl.NumberFormat('pt-BR', {
        maximumFractionDigits: 0
    });

    function readGold() {
        try {
            const rawSave = localStorage.getItem(SAVE_KEY);
            if (!rawSave) return null;
            const save = JSON.parse(rawSave);
            const gold = Number(save.gold);
            return Number.isFinite(gold) ? gold : null;
        } catch (error) {
            return null;
        }
    }

    function formatNumber(number) {
        return formatter.format(Math.max(0, Math.round(number)));
    }

    function formatSigned(number) {
        const rounded = Math.round(number);
        const signal = rounded >= 0 ? '+' : '-';
        return signal + formatter.format(Math.abs(rounded));
    }

    function formatTime(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return [hours, minutes, seconds]
            .map(value => String(value).padStart(2, '0'))
            .join(':');
    }

    function savePos() {
        try {
            localStorage.setItem(POS_KEY, JSON.stringify({ left: panelStartX, top: panelStartY }));
        } catch (e) {}
    }

    function loadPos() {
        try {
            const raw = localStorage.getItem(POS_KEY);
            if (!raw) return null;
            const pos = JSON.parse(raw);
            if (typeof pos.left === 'number' && typeof pos.top === 'number') return pos;
            return null;
        } catch (e) {
            return null;
        }
    }

    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;top:16px;right:16px;z-index:2147483647;font-family:Arial,sans-serif';

    document.documentElement.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });

    shadow.innerHTML = `
        <style>
            * { box-sizing: border-box; }
            .panel {
                width: 265px;
                color: #f8fafc;
                background: rgba(13, 18, 29, 0.95);
                border: 1px solid rgba(250, 204, 21, 0.5);
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 12px 36px rgba(0, 0, 0, 0.5);
            }
            .header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 10px 12px;
                background: linear-gradient(90deg, rgba(234, 179, 8, 0.3), rgba(245, 158, 11, 0.08));
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                cursor: move;
                user-select: none;
                -webkit-user-select: none;
            }
            .title { font-size: 14px; font-weight: bold; }
            .coin { color: #facc15; }
            .toggle {
                width: 28px; height: 28px;
                color: white;
                background: rgba(255, 255, 255, 0.1);
                border: none; border-radius: 7px;
                cursor: pointer; font-size: 17px;
            }
            .body { padding: 10px 12px 12px; }
            .panel.minimized { width: 190px; }
            .panel.minimized .body { display: none; }
            .row {
                display: flex;
                justify-content: space-between;
                gap: 10px;
                padding: 5px 0;
                font-size: 13px;
            }
            .label { color: #aeb8c8; }
            .value {
                color: #f8fafc;
                font-weight: bold;
                font-variant-numeric: tabular-nums;
            }
            .gold { color: #facc15; }
            .positive { color: #4ade80; }
            .negative { color: #fb7185; }
            .divider {
                height: 1px; margin: 6px 0;
                background: rgba(255, 255, 255, 0.08);
            }
            .status {
                min-height: 15px; margin-top: 7px;
                color: #94a3b8; font-size: 11px;
            }
            .reset {
                width: 100%; margin-top: 9px; padding: 8px 10px;
                color: white; background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.12);
                border-radius: 8px; cursor: pointer; font-weight: bold;
            }
            .reset:hover, .toggle:hover { background: rgba(255, 255, 255, 0.17); }
        </style>

        <section class="panel">
            <header class="header">
                <span class="title"><span class="coin">●</span> Gold Tracker</span>
                <button class="toggle" title="Minimizar">−</button>
            </header>
            <div class="body">
                <div class="row">
                    <span class="label">Saldo atual</span>
                    <span class="value gold" data-field="current">—</span>
                </div>
                <div class="divider"></div>
                <div class="row">
                    <span class="label">Gold ganho</span>
                    <span class="value positive" data-field="earned">+0</span>
                </div>
                <div class="row">
                    <span class="label">Gold gasto</span>
                    <span class="value negative" data-field="spent">-0</span>
                </div>
                <div class="row">
                    <span class="label">Saldo líquido</span>
                    <span class="value" data-field="net">+0</span>
                </div>
                <div class="divider"></div>
                <div class="row">
                    <span class="label">Ganho por minuto</span>
                    <span class="value" data-field="perMinute">0</span>
                </div>
                <div class="row">
                    <span class="label">Ganho por hora</span>
                    <span class="value" data-field="perHour">0</span>
                </div>
                <div class="row">
                    <span class="label">Tempo</span>
                    <span class="value" data-field="time">00:00:00</span>
                </div>
                <div class="status" data-field="status">Aguardando o save do jogo...</div>
                <button class="reset">Reiniciar medição</button>
            </div>
        </section>
    `;

    const panel = shadow.querySelector('.panel');
    const header = shadow.querySelector('.header');

    function field(name) {
        return shadow.querySelector(`[data-field="${name}"]`);
    }

    function resetTracker() {
        const currentGold = readGold();
        initialGold = currentGold;
        previousGold = currentGold;
        earnedGold = 0;
        spentGold = 0;
        startedAt = Date.now();
        updateTracker();
    }

    function updateTracker() {
        const currentGold = readGold();
        field('time').textContent = formatTime(Date.now() - startedAt);

        if (currentGold === null) {
            field('status').textContent = 'Save indisponível. Entre no jogo e aguarde.';
            return;
        }

        if (initialGold === null || previousGold === null) {
            initialGold = currentGold;
            previousGold = currentGold;
            startedAt = Date.now();
        }

        const change = currentGold - previousGold;
        if (change > 0) earnedGold += change;
        if (change < 0) spentGold += Math.abs(change);
        previousGold = currentGold;

        const elapsedMinutes = Math.max((Date.now() - startedAt) / 60000, 1 / 60);
        const goldPerMinute = earnedGold / elapsedMinutes;
        const goldPerHour = goldPerMinute * 60;
        const netGold = currentGold - initialGold;

        field('current').textContent = formatNumber(currentGold);
        field('earned').textContent = '+' + formatNumber(earnedGold);
        field('spent').textContent = '-' + formatNumber(spentGold);
        field('net').textContent = formatSigned(netGold);
        field('perMinute').textContent = formatNumber(goldPerMinute);
        field('perHour').textContent = formatNumber(goldPerHour);
        field('time').textContent = formatTime(Date.now() - startedAt);
        field('status').textContent = 'Lendo save.gold • atualização a cada 1 segundo';

        field('net').className = 'value ' + (netGold >= 0 ? 'positive' : 'negative');
    }

    // --- Drag ---
    const DRAG_LIMIT = 8;

    header.addEventListener('mousedown', function (e) {
        if (e.button !== 0) return;
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        panelStartX = host.offsetLeft;
        panelStartY = host.offsetTop;
        e.preventDefault();
    });

    document.addEventListener('mousemove', function (e) {
        if (!isDragging) return;
        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;
        if (!host._moved && (Math.abs(dx) + Math.abs(dy) > DRAG_LIMIT)) {
            host._moved = true;
        }
        if (!host._moved) return;
        panelStartX += dx;
        panelStartY += dy;
        host.style.right = 'auto';
        host.style.bottom = 'auto';
        host.style.left = panelStartX + 'px';
        host.style.top = panelStartY + 'px';
        dragStartX = e.clientX;
        dragStartY = e.clientY;
    });

    document.addEventListener('mouseup', function () {
        if (!isDragging) return;
        isDragging = false;
        if (host._moved) {
            savePos();
            host._moved = false;
        }
    });

    // --- Toggle minimize ---
    shadow.querySelector('.toggle').addEventListener('click', function (e) {
        const minimized = panel.classList.toggle('minimized');
        this.textContent = minimized ? '+' : '−';
        this.title = minimized ? 'Expandir' : 'Minimizar';
        e.stopPropagation();
    });

    // --- Reset ---
    shadow.querySelector('.reset').addEventListener('click', resetTracker);

    // --- Posição inicial (salva ou padrão topo-direita) ---
    const savedPos = loadPos();
    if (savedPos) {
        host.style.right = 'auto';
        host.style.bottom = 'auto';
        host.style.left = savedPos.left + 'px';
        host.style.top = savedPos.top + 'px';
        panelStartX = savedPos.left;
        panelStartY = savedPos.top;
    }

    updateTracker();
    setInterval(updateTracker, UPDATE_MS);
})();
