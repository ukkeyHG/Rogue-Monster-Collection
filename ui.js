// UI管理

class UI {
    constructor() {
        this.messageLog = [];
        this.maxMessages = 8;
        this.isInventoryOpen = true;

        // 図鑑ボタンのイベントリスナー
        const dexBtn = document.getElementById('dex-btn');
        if (dexBtn) {
            dexBtn.addEventListener('click', () => {
                if (window.game && window.game.monsterDex) {
                    this.showMonsterDex(window.game.monsterDex);
                }
            });
        }
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

        // アイテムをグループ化
        const itemGroups = {};
        player.inventory.forEach((item, index) => {
            const itemName = item.data.name;
            if (!itemGroups[itemName]) {
                itemGroups[itemName] = {
                    data: item.data,
                    indices: [],
                    count: 0
                };
            }
            itemGroups[itemName].indices.push(index);
            itemGroups[itemName].count++;
        });

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
                // グループ化されたアイテムを表示
                for (const [itemName, group] of Object.entries(itemGroups)) {
                    const firstIndex = group.indices[0];
                    html += `<div class="item-slot">`;
                    html += `<span class="item-emoji">${group.data.emoji}</span>`;
                    html += `<div class="item-details">`;
                    // アイテム名と個数を同じ行に表示（個数は1より大きい場合のみ）
                    html += `<span class="item-name">${group.data.name}`;
                    if (group.count > 1) {
                        html += ` <span style="color: #4fc3f7; font-size: 12px;">x ${group.count}</span>`;
                    }
                    html += `</span>`;
                    html += `<span class="item-desc">${group.data.description}</span>`;
                    html += `</div>`;

                    // ターゲット選択ドロップダウン
                    html += `<select class="item-target-select" id="target-${itemName}">`;
                    for (let j = 0; j < player.party.length; j++) {
                        const mon = player.party[j];
                        const selected = j === player.activeMonsterIndex ? ' selected' : '';
                        html += `<option value="${j}"${selected}>${mon.name} (${mon.hp}/${mon.maxHp})</option>`;
                    }
                    html += `</select>`;

                    html += `<button class="item-use-btn" onclick="game.useItemByName('${itemName}', document.getElementById('target-${itemName}').value)">使う</button>`;
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

    showPartySwapModal(player, newMonster, callback) {
        // モーダルを作成
        const modal = document.createElement('div');
        modal.id = 'party-swap-modal';
        modal.className = 'modal-overlay';

        modal.innerHTML = `
            <div class="modal-content party-swap-content">
                <div class="modal-header">
                    <h2>🎒 パーティーが満員です</h2>
                    <p>どのモンスターを手放しますか？</p>
                </div>
                <div class="modal-body">
                    <div class="new-monster-section">
                        <h3>🆕 捕獲したモンスター</h3>
                        <div class="swap-card new-monster" data-index="-1">
                            <div class="monster-emoji">${newMonster.emoji}</div>
                            <div class="monster-info">
                                <div class="monster-name">${newMonster.name}</div>
                                <div class="monster-level">Lv.${newMonster.level}</div>
                                <div class="monster-stats-compact">
                                    HP: ${newMonster.hp}/${newMonster.maxHp} | 
                                    ATK: ${newMonster.atk} | 
                                    DEF: ${newMonster.def} | 
                                    SPD: ${newMonster.speed}
                                </div>
                            </div>
                            <button class="release-btn" data-index="-1">手放す</button>
                        </div>
                    </div>
                    <div class="party-section">
                        <h3>👥 現在のパーティー</h3>
                        <div class="party-swap-grid">
                            ${player.party.map((monster, index) => `
                                <div class="swap-card ${player.activeMonsterIndex === index ? 'active' : ''}" data-index="${index}">
                                    <div class="monster-emoji">${monster.emoji}</div>
                                    <div class="monster-info">
                                        <div class="monster-name">${monster.name}</div>
                                        <div class="monster-level">Lv.${monster.level}</div>
                                        <div class="monster-stats-compact">
                                            HP: ${monster.hp}/${monster.maxHp} | 
                                            ATK: ${monster.atk} | 
                                            DEF: ${monster.def} | 
                                            SPD: ${monster.speed}
                                        </div>
                                    </div>
                                    <button class="release-btn" data-index="${index}">手放す</button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // ボタンのイベントリスナーを設定
        const releaseButtons = modal.querySelectorAll('.release-btn');
        releaseButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const selectedIndex = parseInt(btn.getAttribute('data-index'));
                modal.remove();
                callback(selectedIndex);
            });
        });
    }

    showMonsterDex(dex) {
        const modal = document.createElement('div');
        modal.id = 'monster-dex-modal';
        modal.className = 'modal-overlay';

        const progress = dex.getProgress();
        const monsters = dex.monsterData;

        let gridHtml = '';
        for (const [id, data] of Object.entries(monsters)) {
            const isSeen = dex.isSeen(id);
            const isCaptured = dex.isCaptured(id);

            let cardClass = 'dex-card';
            let content = '';

            if (isCaptured) {
                cardClass += ' captured';
                content = `
                    <div class="dex-emoji">${data.emoji}</div>
                    <div class="dex-name">${data.name}</div>
                    <div class="dex-rarity ${data.rarity}">${data.rarity.toUpperCase()}</div>
                `;
            } else if (isSeen) {
                cardClass += ' seen';
                content = `
                    <div class="dex-emoji grayscale">${data.emoji}</div>
                    <div class="dex-name">${data.name}</div>
                    <div class="dex-status">未捕獲</div>
                `;
            } else {
                cardClass += ' unknown';
                content = `
                    <div class="dex-emoji">❓</div>
                    <div class="dex-name">???</div>
                `;
            }

            gridHtml += `
                <div class="${cardClass}" onclick="window.game.ui.showMonsterDetail('${id}')">
                    ${content}
                </div>
            `;
        }

        modal.innerHTML = `
            <div class="modal-content dex-content">
                <div class="modal-header">
                    <h2>📖 モンスター図鑑</h2>
                    <div class="dex-stats">
                        <span>遭遇: ${progress.seen}/${progress.total} (${progress.seenPercent}%)</span>
                        <span>捕獲: ${progress.captured}/${progress.total} (${progress.capturedPercent}%)</span>
                    </div>
                    <button class="close-btn" onclick="document.getElementById('monster-dex-modal').remove()">×</button>
                </div>
                <div class="dex-container">
                    <div class="dex-grid">
                        ${gridHtml}
                    </div>
                    <div id="dex-detail-view" class="dex-detail-view">
                        <div class="detail-placeholder">
                            モンスターを選択して詳細を表示
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    showMonsterDetail(monsterId) {
        const dex = window.game.monsterDex;
        // 未遭遇の場合は詳細を表示しない（念のため）
        if (!dex.isSeen(monsterId) && !dex.isCaptured(monsterId)) return;

        const data = dex.monsterData[monsterId];
        const isCaptured = dex.isCaptured(monsterId);
        const detailView = document.getElementById('dex-detail-view');

        if (!detailView) return;

        // 選択状態の更新
        const cards = document.querySelectorAll('.dex-card');
        cards.forEach(card => card.classList.remove('selected'));
        // クリックされたカードを特定するのは難しいので、ここでは省略するか、
        // onclickでthisを渡すように変更する必要があるが、とりあえず詳細表示に集中。

        if (isCaptured) {
            detailView.innerHTML = `
                <div class="detail-header">
                    <div class="detail-emoji">${data.emoji}</div>
                    <div class="detail-info">
                        <h3>${data.name}</h3>
                        <span class="rarity-badge ${data.rarity}">${data.rarity}</span>
                    </div>
                </div>
                <div class="detail-stats">
                    <div class="stat-row"><span>HP:</span> <span>${data.baseStats.hp}</span></div>
                    <div class="stat-row"><span>攻撃:</span> <span>${data.baseStats.atk}</span></div>
                    <div class="stat-row"><span>防御:</span> <span>${data.baseStats.def}</span></div>
                    <div class="stat-row"><span>素早さ:</span> <span>${data.baseStats.speed}</span></div>
                </div>
                <div class="detail-skills">
                    <h4>スキル</h4>
                    <ul>
                        ${data.skills.map(s => `<li><strong>${s.name}</strong>: ${s.description}</li>`).join('')}
                    </ul>
                </div>
                <div class="detail-desc">
                    <p>捕獲率: ${Math.floor(data.captureRate * 100)}%</p>
                    <p>経験値: ${data.expYield}</p>
                </div>
            `;
        } else {
            detailView.innerHTML = `
                <div class="detail-header">
                    <div class="detail-emoji grayscale">${data.emoji}</div>
                    <div class="detail-info">
                        <h3>${data.name}</h3>
                        <span class="rarity-badge unknown">???</span>
                    </div>
                </div>
                <div class="detail-message">
                    <p>まだ捕獲していません。</p>
                    <p>捕獲すると詳細情報が表示されます。</p>
                </div>
            `;
        }
    }
}
