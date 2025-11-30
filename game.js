// メインゲームクラス

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.renderer = new Renderer(this.canvas);
        this.ui = new UI();

        this.dungeon = null;
        this.player = null;
        this.combat = null;
        this.scoreManager = null;
        this.monsterDex = new MonsterDex(); // 図鑑システム初期化
        this.gameOver = false;
        this.currentFloor = 1; // 現在のフロア（B1F = 1, B2F = 2...）

        this.init();
        this.setupControls();
    }

    async init(keepFloor = false) {
        // モンスターデータの読み込み待機
        if (!keepFloor) {
            const loaded = await loadMonsterData();
            if (!loaded) {
                this.addMessage('モンスターデータの読み込みに失敗しました。');
                return;
            }
            // 図鑑にモンスターデータをセット
            this.monsterDex.setMonsterData(MONSTER_TYPES);
        }
        // フロアをリセット（再スタート時のみ）
        if (!keepFloor) {
            this.currentFloor = 1;
            this.scoreManager = new ScoreManager();
            this.player = null; // プレイヤーをリセットして再作成させる
        }

        // スコア管理初期化（初回起動時用）
        if (!this.scoreManager) {
            this.scoreManager = new ScoreManager();
        }

        // ダンジョン生成（フロアレベルを渡す）
        this.dungeon = new Dungeon(80, 50, this.currentFloor);

        // プレイヤー配置
        const startPos = this.dungeon.getRandomFloorTile();

        if (!this.player) {
            // 初回のみプレイヤー作成
            this.player = new Player(startPos.x, startPos.y);

            // 初期モンスター付与（チュートリアル用）
            const starterType = randomChoice(['slime', 'bat', 'goblin']);
            const starterMonster = new Monster(0, 0, starterType, 1, false);
            starterMonster.isWild = false;
            this.player.party.push(starterMonster);
            this.player.activeMonsterIndex = 0;

            // 初期モンスターも図鑑登録（ボーナスはなし）
            this.scoreManager.capturedTypes.add(starterType);
        } else {
            // フロア移動時はプレイヤー位置のみ更新
            this.player.moveTo(startPos.x, startPos.y);
        }

        this.gameOver = false;

        if (this.currentFloor === 1) {
            this.ui.clearMessages();
            this.ui.hideGameOver();
            this.addMessage('ダンジョンに降り立った...');
            const starter = this.player.party[0];
            if (starter) {
                this.addMessage(`${starter.name} と共に冒険を始めよう！`);
            }
            this.addMessage('矢印キーで移動、モンスターに触れると戦闘開始！');
        }

        this.updateVisibility();
        this.render();
    }

    setupControls() {
        document.addEventListener('keydown', (e) => {
            if (this.gameOver) return;
            if (this.combat && this.combat.isActive) return;

            let moved = false;

            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    moved = this.movePlayer(0, -1);
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    moved = this.movePlayer(0, 1);
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    moved = this.movePlayer(-1, 0);
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    moved = this.movePlayer(1, 0);
                    break;
                case '1':
                    this.switchMonster(0);
                    break;
                case '2':
                    this.switchMonster(1);
                    break;
                case '3':
                    this.switchMonster(2);
                    break;
            }

            if (moved) {
                e.preventDefault();
            }
        });
    }

    movePlayer(dx, dy) {
        if (!this.player.hasAliveMonsters()) {
            this.addMessage('戦えるモンスターがいないため、ゲームオーバー...');
            this.endGame();
            return false;
        }

        const moved = this.player.move(dx, dy, this.dungeon);

        if (moved) {
            // console.log(`Player moved to ${this.player.x}, ${this.player.y}`);

            // 宝箱チェック
            const treasure = this.dungeon.getTreasureAt(this.player.x, this.player.y);
            if (treasure) {
                const item = treasure.open();
                this.player.addItem(item);
                const score = this.scoreManager.addTreasureScore();
                this.addMessage(`宝箱を開けた！ (Score +${score})`);
                this.addMessage(`${item.data.name} を手に入れた！`);
                this.ui.updateInventory(this.player);
            }

            // モンスター遭遇チェック
            const monster = this.dungeon.getMonsterAt(this.player.x, this.player.y);
            // console.log(`Monster check at ${this.player.x}, ${this.player.y}:`, monster);

            if (monster) {
                console.log("Starting combat with:", monster);
                this.startCombat(monster);
            } else {
                // モンスターがいない場合のみ階段チェック
                const stairs = this.dungeon.getStairsAt(this.player.x, this.player.y);
                if (stairs) {
                    this.descendFloor();
                }
            }

            this.updateVisibility();
            this.render();
        }
        return moved;
    }

    async descendFloor() {
        // フェードアウトエフェクト
        await this.renderer.fadeOut(300);

        // 次のフロアへ
        this.currentFloor++;

        // スコアボーナス
        const floorBonus = this.scoreManager.addFloorBonus(this.currentFloor);

        this.addMessage(`B${this.currentFloor}Fに降りた... (Score +${floorBonus})`);
        this.addMessage(`敵がより強力になった！`);

        // 新しいダンジョンを生成
        this.init(true); // keepFloor = true

        // フェードインエフェクト
        await this.renderer.fadeIn(300);
    }

    useItemFromInventory(index, targetIndex = null) {
        if (this.combat && this.combat.isActive) {
            this.addMessage('戦闘中はインベントリから直接使えません！');
            return;
        }

        const item = this.player.inventory[index];
        if (!item) return;

        // ターゲットが指定されていない場合はアクティブモンスター
        if (targetIndex === null) {
            targetIndex = this.player.activeMonsterIndex;
        } else {
            targetIndex = parseInt(targetIndex);
        }

        const result = this.player.useItem(index, targetIndex);

        if (result) {
            if (result.success) {
                this.addMessage(result.message);
            } else {
                this.addMessage(result.message || 'アイテムを使用できませんでした');
            }
            this.ui.updateInventory(this.player);
            this.ui.updateParty(this.player);
            this.render();
        }
    }

    // アイテム名から最初に見つかったアイテムを使用（グループ化UI用）
    useItemByName(itemName, targetIndex = null) {
        if (this.combat && this.combat.isActive) {
            this.addMessage('戦闘中はインベントリから直接使えません！');
            return;
        }

        // アイテム名が一致する最初のアイテムを探す
        const index = this.player.inventory.findIndex(item => item.data.name === itemName);
        if (index === -1) {
            this.addMessage('アイテムが見つかりませんでした');
            return;
        }

        // 既存のuseItemFromInventoryを呼び出す
        this.useItemFromInventory(index, targetIndex);
    }


    switchMonster(index) {
        if (this.combat && this.combat.isActive) return;

        if (this.player.switchMonster(index)) {
            const monster = this.player.activeMonster;
            this.addMessage(`${monster.name} に切り替えた！`);
            this.render();
        }
    }

    movePartyMember(fromIndex, toIndex) {
        if (this.combat && this.combat.isActive) {
            this.addMessage('戦闘中はパーティーを入れ替えられません！');
            return;
        }

        if (fromIndex < 0 || fromIndex >= this.player.party.length ||
            toIndex < 0 || toIndex >= this.player.party.length) {
            return;
        }

        // 配列要素を入れ替え
        const temp = this.player.party[fromIndex];
        this.player.party[fromIndex] = this.player.party[toIndex];
        this.player.party[toIndex] = temp;

        // 先頭のモンスターをアクティブ（表示用）にする
        this.player.activeMonsterIndex = 0;

        // もし先頭が死んでいたら、生きているモンスターを探す
        if (this.player.party[0].isDead()) {
            this.player.autoSwitchToAliveMonster();
        }

        this.addMessage(`パーティーの順番を入れ替えた！`);
        this.render();
    }

    startCombat(enemy) {
        this.combat = new Combat(this.player, enemy, this);
        this.combat.start();
        this.render();
    }

    playerCombatAction(action, param) {
        if (!this.combat || !this.combat.isActive || this.combat.turn !== 'player') {
            return;
        }

        switch (action) {
            case 'attack':
                this.combat.playerAttack(param);
                break;
            case 'capture':
                this.combat.playerCapture();
                break;
            case 'flee':
                this.combat.playerFlee();
                break;
        }

        this.render();
    }

    updateVisibility() {
        this.dungeon.updateVisibility(this.player.x, this.player.y);
    }

    render() {
        this.renderer.render(this);
        this.ui.updatePlayerStats(this.player);
        this.ui.updateParty(this.player);
        this.ui.updateInventory(this.player);
        this.ui.updateCombatUI(this.combat);
    }

    addMessage(text) {
        this.ui.addMessage(text);
    }

    restart() {
        this.init();
    }

    onBossDefeated(boss) {
        this.addMessage(`👑 フロアの主 ${boss.name} を倒した！`);

        // 階段出現
        const stairsPos = this.dungeon.spawnStairs();
        this.addMessage(`どこかで重い音がした... 階段が現れたようだ！`);

        // 視界更新して階段が見えるようにする（オプション）
        this.render();
    }

    endGame() {
        this.gameOver = true;
        // 最大ダメージボーナスを加算
        if (this.scoreManager.maxDamage > 0) {
            this.scoreManager.addBonus(this.scoreManager.maxDamage);
        }
        this.ui.showGameOver(this.player, this.scoreManager);
    }
}

// ゲーム開始
let game;

window.addEventListener('load', () => {
    game = new Game();
    window.game = game; // グローバルアクセス可能にする（UIボタン用）
});

function restartGame() {
    game.restart();
}
