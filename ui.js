// UI管理

class UI {
    constructor() {
        this.messageLog = [];
        this.maxMessages = 8;
        this.isInventoryOpen = true;
    }

    addMessage(text) {
        this.messageLog.push(text);
        if (this.messageLog.length > this.maxMessages) {
            this.messageLog.shift();
        }
        this.updateMessageLog();
    }

    clearMessages() {
        this.messageLog = [];
        this.updateMessageLog();
    }

    updateMessageLog() {
        const logElement = document.getElementById('message-log');
        if (logElement) {
            logElement.innerHTML = this.messageLog
                .map(msg => `<div class="message">${msg}</div>`)
                .join('');
            logElement.scrollTop = logElement.scrollHeight;
        }
    }

    updatePlayerStats(player) {
        const statsElement = document.getElementById('player-stats');
        if (!statsElement) return;

        const floor = window.game ? window.game.currentFloor : 1;
        let html = `<h3>👤 プレイヤー (B${floor}F)</h3>`;
        html += `<div class="stats-inline">`;
        html += `<span>🎯 ${player.turnsPlayed}</span>`;
        html += `<span>⚔️ ${player.monstersDefeated}</span>`;
        html += `<span>🎒 ${player.monstersCaptured}</span>`;
        html += `</div>`;

        statsElement.innerHTML = html;
    }

    updateParty(player) {
        const partyElement = document.getElementById('party-info');
        if (!partyElement) return;

        let html = '<h3>🎒 パーティ</h3>';

        if (player.party.length === 0) {
            html += '<p class="empty-message">モンスターがいません</p>';
        } else {
            for (let i = 0; i < player.party.length; i++) {
                const monster = player.party[i];
                const isActive = i === player.activeMonsterIndex;
                const isDead = monster.isDead();

                html += `<div class="monster-card ${isActive ? 'active' : ''} ${isDead ? 'dead' : ''}">`;

                // モンスターヘッダー（順番入れ替えボタン付き）
                html += `<div class="monster-header">`;
                html += `<span class="monster-emoji">${monster.emoji}</span>`;
                html += `<span class="monster-name">${monster.name}</span>`;
                html += `<span class="monster-level">Lv.${monster.level}</span>`;

                // 順番入れ替えボタン
                if (player.party.length > 1) {
                    html += `<div class="party-reorder-btns">`;
                    // 上ボタン（先頭でない場合のみ有効）
                    if (i > 0) {
                        html += `<button class="party-reorder-btn" onclick="game.movePartyMember(${i}, ${i - 1})" title="上に移動">↑</button>`;
                    } else {
                        html += `<button class="party-reorder-btn" disabled>↑</button>`;
                    }
                    // 下ボタン（最後でない場合のみ有効）
                    if (i < player.party.length - 1) {
                        html += `<button class="party-reorder-btn" onclick="game.movePartyMember(${i}, ${i + 1})" title="下に移動">↓</button>`;
                    } else {
                        html += `<button class="party-reorder-btn" disabled>↓</button>`;
                    }
                    html += `</div>`;
                }

                html += `</div>`;

                html += `<div class="stat-bar">`;
                html += `<div class="stat-label">HP</div>`;
                html += `<div class="progress-bar">`;
                const hpPercent = (monster.hp / monster.maxHp) * 100;
                html += `<div class="progress-fill" style="width: ${hpPercent}%"></div>`;
                html += `</div>`;
                html += `<div class="stat-value">${monster.hp}/${monster.maxHp}</div>`;
                html += `</div>`;
                html += `<div class="stat-row">ATK: ${monster.atk} / DEF: ${monster.def}</div>`;

                if (!isDead) {
                    const expPercent = (monster.exp / expRequiredForLevel(monster.level + 1)) * 100;
                    html += `<div class="exp-bar">`;
                    html += `<div class="exp-fill" style="width: ${expPercent}%"></div>`;
                    html += `</div>`;
                    html += `<div class="stat-row small">EXP: ${monster.exp}/${expRequiredForLevel(monster.level + 1)}</div>`;
                }

                html += `</div>`;
            }
        }

        partyElement.innerHTML = html;
    }

    toggleInventory() {
        this.isInventoryOpen = !this.isInventoryOpen;
        if (window.game) {
            this.updateInventory(window.game.player);
        }
    }

    updateInventory(player) {
        const inventoryElement = document.getElementById('inventory-panel');
        if (!inventoryElement) return;

        const count = player.inventory.length;
        const arrow = this.isInventoryOpen ? '▼' : '▶';

        let html = `<div class="panel-header" onclick="game.ui.toggleInventory()">`;
        html += `<h3>🎒 アイテム (${count})</h3>`;
        html += `<span class="toggle-icon">${arrow}</span>`;
        html += `</div>`;

        if (this.isInventoryOpen) {
            if (player.inventory.length === 0) {
                html += '<p class="empty-message">アイテムがありません</p>';
            } else {
                for (let i = 0; i < player.inventory.length; i++) {
                    const item = player.inventory[i];
                    html += `<div class="item-slot">`;
                    html += `<span class="item-emoji">${item.data.emoji}</span>`;
                    html += `<div class="item-details">`;
                    html += `<span class="item-name">${item.data.name}</span>`;
                    html += `<span class="item-desc">${item.data.description}</span>`;
                    html += `</div>`;

                    // ターゲット選択ドロップダウン
                    html += `<select class="item-target-select" id="target-${i}">`;
                    for (let j = 0; j < player.party.length; j++) {
                        const mon = player.party[j];
                        const selected = j === player.activeMonsterIndex ? ' selected' : '';
                        html += `<option value="${j}"${selected}>${mon.name} (${mon.hp}/${mon.maxHp})</option>`;
                    }
                    html += `</select>`;

                    html += `<button class="item-use-btn" onclick="game.useItemFromInventory(${i}, document.getElementById('target-${i}').value)">使う</button>`;
                    html += `</div>`;
                }
            }
        }

        inventoryElement.innerHTML = html;
    }

    updateCombatUI(combat) {
        const combatElement = document.getElementById('combat-ui');
        if (!combatElement) return;

        if (!combat || !combat.isActive) {
            combatElement.style.display = 'none';
            return;
        }

        combatElement.style.display = 'block';

        const playerMonster = combat.player.activeMonster;
        const enemy = combat.enemy;

        let html = '<h3>戦闘中</h3>';

        // 敵情報
        html += '<div class="combat-enemy">';
        html += `<div class="enemy-name">${enemy.emoji} ${enemy.displayName} Lv.${enemy.level}</div>`;
        html += `<div class="stat-bar">`;
        html += `<div class="stat-label">HP</div>`;
        html += `<div class="progress-bar">`;
        const enemyHpPercent = (enemy.hp / enemy.maxHp) * 100;
        html += `<div class="progress-fill enemy" style="width: ${enemyHpPercent}%"></div>`;
        html += `</div>`;
        html += `<div class="stat-value">${enemy.hp}/${enemy.maxHp}</div>`;
        html += `</div>`;
        html += '</div>';

        // 味方情報
        html += '<div class="combat-ally">';
        html += `<div class="ally-name">${playerMonster.emoji} ${playerMonster.name} Lv.${playerMonster.level}</div>`;
        html += `<div class="stat-bar">`;
        html += `<div class="stat-label">HP</div>`;
        html += `<div class="progress-bar">`;
        const allyHpPercent = (playerMonster.hp / playerMonster.maxHp) * 100;
        html += `<div class="progress-fill ally" style="width: ${allyHpPercent}%"></div>`;
        html += `</div>`;
        html += `<div class="stat-value">${playerMonster.hp}/${playerMonster.maxHp}</div>`;
        html += `</div>`;
        html += '</div>';

        // 戦闘コマンド
        if (combat.turn === 'player') {
            html += '<div class="combat-actions">';

            for (let i = 0; i < playerMonster.skills.length; i++) {
                const skill = playerMonster.skills[i];
                html += `<button class="combat-btn" onclick="game.playerCombatAction('attack', ${i})">`;
                html += `${skill.name}`;
                html += `</button>`;
            }

            html += `<button class="combat-btn capture" onclick="game.playerCombatAction('capture')">捕獲</button>`;
            html += `<button class="combat-btn flee" onclick="game.playerCombatAction('flee')">逃げる</button>`;
            html += '</div>';
        } else {
            html += '<div class="turn-indicator">敵のターン...</div>';
        }

        combatElement.innerHTML = html;
    }
    showGameOver(player, scoreManager) {
        const gameOverElement = document.getElementById('game-over');
        if (!gameOverElement) return;

        // 統計情報の生成
        let statsHtml = `
            <div class="game-over-stats">
                <div class="score-display">
                    <div class="total-score">Total Score: ${scoreManager.totalScore.toLocaleString()}</div>
                </div>
                <div class="score-details">
                    <div class="score-row">
                        <span>⚔️ 戦闘スコア:</span>
                        <span>${scoreManager.breakdown.battle.toLocaleString()}</span>
                    </div>
                    <div class="score-row">
                        <span>🎒 捕獲スコア:</span>
                        <span>${scoreManager.breakdown.capture.toLocaleString()}</span>
                    </div>
                    <div class="score-row">
                        <span>💎 探索スコア:</span>
                        <span>${scoreManager.breakdown.exploration.toLocaleString()}</span>
                    </div>
                    <div class="score-row">
                        <span>✨ ボーナス:</span>
                        <span>${scoreManager.breakdown.bonus.toLocaleString()}</span>
                    </div>
                    </div>
                </div>
            </div>
        `;

        const content = gameOverElement.querySelector('.game-over-content');
        // 既存の統計情報を削除して新しいものを追加
        const existingStats = content.querySelector('.game-over-stats');
        if (existingStats) {
            existingStats.remove();
        }

        // ボタンの前に挿入
        const restartBtn = content.querySelector('.restart-btn');
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = statsHtml;
        content.insertBefore(tempDiv.firstElementChild, restartBtn);

        gameOverElement.style.display = 'flex';
    }

    hideGameOver() {
        const gameOverElement = document.getElementById('game-over');
        if (gameOverElement) {
            gameOverElement.style.display = 'none';
        }
    }
}
