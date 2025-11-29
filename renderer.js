// レンダリングエンジン

class Renderer {
    constructor(canvas, tileSize = 24) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.tileSize = tileSize;

        // カラーパレット
        this.colors = {
            wall: '#2a2a3a',
            floor: '#4a4a5a',
            floorExplored: '#3a3a4a',
            player: '#4fc3f7',
            fog: 'rgba(0, 0, 0, 0.7)',
            unexplored: '#1a1a2a'
        };
    }

    render(game) {
        const dungeon = game.dungeon;
        const player = game.player;

        // コンテナのサイズを取得
        const container = this.canvas.parentElement;
        const maxWidth = container.clientWidth - 20; // パディング分を引く
        const maxHeight = container.clientHeight - 20;

        // ビューサイズの決定
        const viewWidth = Math.min(50, dungeon.width);
        const viewHeight = Math.min(35, dungeon.height);

        // コンテナに収まる最大タイルサイズを計算
        const maxTileWidth = Math.floor(maxWidth / viewWidth);
        const maxTileHeight = Math.floor(maxHeight / viewHeight);
        const currentTileSize = Math.max(16, Math.min(this.tileSize, maxTileWidth, maxTileHeight, 32));

        // Canvas サイズ設定
        this.canvas.width = viewWidth * currentTileSize;
        this.canvas.height = viewHeight * currentTileSize;

        // カメラ位置計算（プレイヤー中心）
        const cameraX = Math.max(0, Math.min(dungeon.width - viewWidth, player.x - Math.floor(viewWidth / 2)));
        const cameraY = Math.max(0, Math.min(dungeon.height - viewHeight, player.y - Math.floor(viewHeight / 2)));

        // 背景
        this.ctx.fillStyle = this.colors.unexplored;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // タイルの描画
        for (let y = 0; y < viewHeight; y++) {
            for (let x = 0; x < viewWidth; x++) {
                const worldX = cameraX + x;
                const worldY = cameraY + y;

                if (worldX >= 0 && worldX < dungeon.width && worldY >= 0 && worldY < dungeon.height) {
                    this.drawTile(x, y, dungeon.tiles[worldY][worldX], currentTileSize);
                }
            }
        }

        // モンスターの描画
        for (const monster of dungeon.monsters) {
            const screenX = monster.x - cameraX;
            const screenY = monster.y - cameraY;

            if (screenX >= 0 && screenX < viewWidth && screenY >= 0 && screenY < viewHeight) {
                if (dungeon.tiles[monster.y][monster.x].visible) {
                    this.drawMonster(screenX, screenY, monster, currentTileSize);
                }
            }
        }

        // 宝箱の描画
        for (const treasure of dungeon.treasures) {
            const screenX = treasure.x - cameraX;
            const screenY = treasure.y - cameraY;

            if (screenX >= 0 && screenX < viewWidth && screenY >= 0 && screenY < viewHeight) {
                if (dungeon.tiles[treasure.y][treasure.x].visible) {
                    this.drawTreasure(screenX, screenY, treasure, currentTileSize);
                }
            }
        }

        // 階段の描画
        if (dungeon.stairsPos) {
            const screenX = dungeon.stairsPos.x - cameraX;
            const screenY = dungeon.stairsPos.y - cameraY;

            if (screenX >= 0 && screenX < viewWidth && screenY >= 0 && screenY < viewHeight) {
                if (dungeon.tiles[dungeon.stairsPos.y][dungeon.stairsPos.x].visible) {
                    this.drawStairs(screenX, screenY, currentTileSize);
                }
            }
        }

        // プレイヤーの描画
        const playerScreenX = player.x - cameraX;
        const playerScreenY = player.y - cameraY;
        this.drawPlayer(playerScreenX, playerScreenY, player, currentTileSize);
    }

    drawTile(x, y, tile, tileSize) {
        const px = x * tileSize;
        const py = y * tileSize;

        if (tile.visible) {
            // 見えているタイル
            if (tile.type === 'wall') {
                this.ctx.fillStyle = this.colors.wall;
                this.ctx.fillRect(px, py, tileSize, tileSize);

                // 壁のテクスチャ
                this.ctx.strokeStyle = '#3a3a4a';
                this.ctx.strokeRect(px, py, tileSize, tileSize);
            } else {
                this.ctx.fillStyle = this.colors.floor;
                this.ctx.fillRect(px, py, tileSize, tileSize);

                // 床のドット
                this.ctx.fillStyle = '#5a5a6a';
                this.ctx.fillRect(px + tileSize / 2 - 1, py + tileSize / 2 - 1, 2, 2);
            }
        } else if (tile.explored) {
            // 探索済みだが見えていない
            if (tile.type === 'wall') {
                this.ctx.fillStyle = '#202030';
            } else {
                this.ctx.fillStyle = this.colors.floorExplored;
            }
            this.ctx.fillRect(px, py, tileSize, tileSize);

            // 霧
            this.ctx.fillStyle = this.colors.fog;
            this.ctx.fillRect(px, py, tileSize, tileSize);
        }
    }

    drawPlayer(x, y, player, tileSize) {
        const px = x * tileSize;
        const py = y * tileSize;

        // プレイヤー（アクティブモンスターを表示）
        if (player.activeMonster) {
            this.ctx.font = `${tileSize - 4}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(
                player.activeMonster.emoji,
                px + tileSize / 2,
                py + tileSize / 2
            );

            // プレイヤーインジケーター
            this.ctx.fillStyle = this.colors.player;
            this.ctx.fillRect(px + 2, py + 2, 4, 4);
        } else {
            // モンスターがいない場合
            this.ctx.fillStyle = this.colors.player;
            this.ctx.fillRect(px + 4, py + 4, tileSize - 8, tileSize - 8);
        }
    }

    drawMonster(x, y, monster, tileSize) {
        const px = x * tileSize;
        const py = y * tileSize;

        // モンスターの絵文字
        this.ctx.font = `${tileSize - 4}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(
            monster.emoji,
            px + tileSize / 2,
            py + tileSize / 2
        );

        // レベル表示
        this.ctx.font = '10px Arial';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText(
            `Lv${monster.level}`,
            px + tileSize / 2,
            py + tileSize - 4
        );
    }

    drawTreasure(x, y, treasure, tileSize) {
        const px = x * tileSize;
        const py = y * tileSize;

        // 宝箱の絵文字
        this.ctx.font = `${tileSize - 4}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(
            treasure.opened ? '📭' : '🎁',
            px + tileSize / 2,
            py + tileSize / 2
        );
    }

    drawStairs(x, y, tileSize) {
        const px = x * tileSize;
        const py = y * tileSize;

        // 階段の絵文字
        this.ctx.font = `${tileSize - 4}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(
            '🪜',
            px + tileSize / 2,
            py + tileSize / 2
        );
    }
}
