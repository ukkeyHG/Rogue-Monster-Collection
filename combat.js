// 戦闘システム

class Combat {
    constructor(player, enemy, game) {
        this.player = player;
        this.enemy = enemy;
        this.game = game;
        this.isActive = true;
        this.turn = 'player'; // 'player' or 'enemy'
        this.actionQueue = [];
    }

    start() {
        // 戦闘開始前に生きているモンスターに自動切り替え
        if (!this.player.activeMonster || this.player.activeMonster.isDead()) {
            if (!this.player.autoSwitchToAliveMonster()) {
                this.game.addMessage('戦闘できるモンスターがいません！');
                this.isActive = false;
                return;
            }
        }

        const playerMonster = this.player.activeMonster;
        if (!playerMonster) {
            this.game.addMessage('戦闘できるモンスターがいません！');
            this.isActive = false;
            return;
        }

        this.game.addMessage(`${this.enemy.displayName} が現れた！`);
        this.game.addMessage(`${playerMonster.name} 出てこい！`);

        // スピードで先攻を決定
        if (this.enemy.speed > playerMonster.speed) {
            this.turn = 'enemy';
            setTimeout(() => this.enemyAction(), 1000);
        } else {
            // プレイヤー先攻の場合もUIを更新
            this.game.render();
        }

        // 図鑑に遭遇を登録
        if (this.game.monsterDex) {
            this.game.monsterDex.registerSeen(this.enemy.type);
        }
    }

    playerAttack(skillIndex = 0) {
        if (!this.isActive || this.turn !== 'player') return;

        const playerMonster = this.player.activeMonster;
        if (!playerMonster || playerMonster.isDead()) {
            this.game.addMessage('戦闘できるモンスターがいません！');
            this.end(false);
            return;
        }

        const result = playerMonster.useSkill(skillIndex, this.enemy);
        this.game.addMessage(`${playerMonster.name} の ${result.skill.name}！`);

        if (result.success) {
            if (result.isCritical) {
                this.game.addMessage('会心の一撃！！！');
            }
            this.game.addMessage(`${this.enemy.name} に ${result.actualDamage} のダメージ！`);

            // 最大ダメージを記録
            this.game.scoreManager.recordDamage(result.actualDamage);
        } else {
            this.game.addMessage('攻撃が外れた！');
        }

        // 攻撃後にUIを更新
        this.game.render();

        if (this.enemy.isDead()) {
            this.playerWin();
        } else {
            this.nextTurn();
        }
    }

    playerCapture() {
        if (!this.isActive || this.turn !== 'player') return;

        const playerMonster = this.player.activeMonster;

        // 捕獲率の計算（敵のHP割合で変動）
        const hpRatio = this.enemy.hp / this.enemy.maxHp;
        const baseCaptureRate = this.enemy.data.captureRate;
        const adjustedRate = baseCaptureRate * (1.5 - hpRatio); // HPが少ないほど捕獲しやすい

        this.game.addMessage(`${playerMonster.name} は ${this.enemy.name} を捕まえようとしている...`);

        if (chance(adjustedRate)) {
            this.captureSuccess();
        } else {
            this.game.addMessage('捕獲に失敗した！');
            this.nextTurn();
        }
    }

    captureSuccess() {
        this.game.addMessage(`${this.enemy.name} を捕まえた！`);

        // スコア加算
        this.game.scoreManager.addCaptureScore(this.enemy);

        // 図鑑に捕獲を登録
        if (this.game.monsterDex) {
            this.game.monsterDex.registerCaptured(this.enemy.type);
        }

        // パーティーが満杯かチェック
        if (this.player.party.length >= 3) {
            // 入れ替え選択UIを表示
            this.game.ui.showPartySwapModal(this.player, this.enemy, (selectedIndex) => {
                if (selectedIndex === -1) {
                    // 新しいモンスターを手放す
                    this.game.addMessage(`${this.enemy.name} を逃がした。`);
                } else {
                    // パーティーのモンスターを手放して新しいモンスターを追加
                    const releasedMonster = this.player.party[selectedIndex];
                    this.game.addMessage(`${releasedMonster.name} を逃がした。`);
                    this.player.party[selectedIndex] = this.enemy;
                    this.enemy.isWild = false;
                    this.game.addMessage(`${this.enemy.name} がパーティに加わった！`);

                    // activeMonsterIndex の調整
                    if (this.player.activeMonsterIndex === selectedIndex) {
                        this.player.activeMonsterIndex = selectedIndex;
                    }
                }
                this.game.dungeon.removeMonster(this.enemy);
                this.end(true);
            });
        } else {
            // パーティーに空きがある場合は通常通り追加
            if (this.player.addMonster(this.enemy)) {
                this.game.addMessage(`${this.enemy.name} がパーティに加わった！`);
                this.game.dungeon.removeMonster(this.enemy);
            }
            this.end(true);
        }
    }

    enemyAction() {
        if (!this.isActive || this.turn !== 'enemy') return;

        const playerMonster = this.player.activeMonster;
        const result = this.enemy.useSkill(0, playerMonster);

        this.game.addMessage(`${this.enemy.name} の攻撃！`);

        if (result.success) {
            if (result.isCritical) {
                this.game.addMessage('痛恨の一撃！！！');
            }
            this.game.addMessage(`${playerMonster.name} に ${result.actualDamage} のダメージ！`);
        } else {
            this.game.addMessage('攻撃は外れた！');
        }

        // 攻撃後にUIを更新
        this.game.render();

        if (playerMonster.isDead()) {
            this.game.addMessage(`${playerMonster.name} は倒れた！`);
            this.end(false);
        } else {
            this.nextTurn();
        }
    }

    playerWin() {
        this.enemyDefeated();
    }

    playerFlee() {
        if (!this.isActive || this.turn !== 'player') return;

        if (chance(0.5)) {
            this.game.addMessage('逃げ出した！');
            this.end(true);
        } else {
            this.game.addMessage('逃げられなかった！');
            this.nextTurn();
        }
    }

    enemyDefeated() {
        const playerMonster = this.player.activeMonster;
        const expGained = Math.floor(this.enemy.expGiven * (this.enemy.level / playerMonster.level));

        this.game.scoreManager.addBattleScore(this.enemy);

        this.game.addMessage(`${this.enemy.name} を倒した！`);
        this.game.addMessage(`${playerMonster.name} は ${expGained} の経験値を得た！`);

        this.player.monstersDefeated++;

        if (playerMonster.gainExp(expGained)) {
            this.game.addMessage(`${playerMonster.name} はレベル ${playerMonster.level} に上がった！`);
        }

        this.game.dungeon.removeMonster(this.enemy);

        // アイテムドロップ判定 (ボスは確定、通常は15%)
        if (this.enemy.isBoss || Math.random() < 0.15) {
            const item = rollLoot();
            if (this.player.addItem(item)) {
                this.game.addMessage(`${this.enemy.name} は ${item.emoji}${item.name} を落とした！`);
            } else {
                this.game.addMessage(`${this.enemy.name} は宝箱を落としたが、持ちきれなかった...`);
            }
        }

        // ボス撃破時の処理
        if (this.enemy.isBoss) {
            this.game.onBossDefeated(this.enemy);
        }

        this.end(true);
    }

    nextTurn() {
        this.turn = this.turn === 'player' ? 'enemy' : 'player';

        // UIを更新してターン表示を切り替え
        this.game.render();

        if (this.turn === 'enemy') {
            setTimeout(() => this.enemyAction(), 800);
        }
    }

    end(playerWon) {
        this.isActive = false;
        this.game.combat = null;

        // プレイヤーが負けた場合はゲームオーバー
        if (!playerWon && !this.player.hasAliveMonsters()) {
            this.game.endGame();
        } else {
            this.game.render();
        }
    }
}
