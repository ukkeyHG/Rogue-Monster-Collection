// ダンジョン生成

class Dungeon {
    constructor(width, height, floorLevel = 1) {
        this.width = width;
        this.height = height;
        this.floorLevel = floorLevel;
        this.tiles = [];
        this.rooms = [];
        this.monsters = [];
        this.treasures = [];
        this.stairsPos = null; // 階段の位置

        this.generate();
    }

    generate() {
        // すべて壁で初期化
        for (let y = 0; y < this.height; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.tiles[y][x] = {
                    type: 'wall',
                    explored: false,
                    visible: false
                };
            }
        }

        // 部屋を生成
        this.generateRooms();

        // 部屋を通路で接続
        this.connectRooms();

        // モンスターを配置
        this.placeMonsters();

        // 宝箱を配置
        this.placeTreasures();

        // 階段配置
        this.placeStairs();
    }

    generateRooms() {
        const minRoomSize = 4;
        const maxRoomSize = 10;
        const maxAttempts = 50;
        const targetRooms = randomInt(6, 10);

        for (let i = 0; i < maxAttempts && this.rooms.length < targetRooms; i++) {
            const w = randomInt(minRoomSize, maxRoomSize);
            const h = randomInt(minRoomSize, maxRoomSize);
            const x = randomInt(1, this.width - w - 1);
            const y = randomInt(1, this.height - h - 1);

            const newRoom = { x, y, width: w, height: h };

            // 既存の部屋と重ならないかチェック
            let overlaps = false;
            for (const room of this.rooms) {
                if (this.roomsOverlap(newRoom, room)) {
                    overlaps = true;
                    break;
                }
            }

            if (!overlaps) {
                this.createRoom(newRoom);
                this.rooms.push(newRoom);
            }
        }
    }

    roomsOverlap(room1, room2) {
        return room1.x <= room2.x + room2.width &&
            room1.x + room1.width >= room2.x &&
            room1.y <= room2.y + room2.height &&
            room1.y + room1.height >= room2.y;
    }

    createRoom(room) {
        for (let y = room.y; y < room.y + room.height; y++) {
            for (let x = room.x; x < room.x + room.width; x++) {
                this.tiles[y][x].type = 'floor';
            }
        }
    }

    connectRooms() {
        for (let i = 0; i < this.rooms.length - 1; i++) {
            const room1 = this.rooms[i];
            const room2 = this.rooms[i + 1];

            const x1 = Math.floor(room1.x + room1.width / 2);
            const y1 = Math.floor(room1.y + room1.height / 2);
            const x2 = Math.floor(room2.x + room2.width / 2);
            const y2 = Math.floor(room2.y + room2.height / 2);

            // L字型の通路を作成
            if (chance(0.5)) {
                this.createHorizontalCorridor(x1, x2, y1);
                this.createVerticalCorridor(y1, y2, x2);
            } else {
                this.createVerticalCorridor(y1, y2, x1);
                this.createHorizontalCorridor(x1, x2, y2);
            }
        }
    }

    createHorizontalCorridor(x1, x2, y) {
        const startX = Math.min(x1, x2);
        const endX = Math.max(x1, x2);

        for (let x = startX; x <= endX; x++) {
            if (y >= 0 && y < this.height && x >= 0 && x < this.width) {
                this.tiles[y][x].type = 'floor';
            }
        }
    }

    createVerticalCorridor(y1, y2, x) {
        const startY = Math.min(y1, y2);
        const endY = Math.max(y1, y2);

        for (let y = startY; y <= endY; y++) {
            if (y >= 0 && y < this.height && x >= 0 && x < this.width) {
                this.tiles[y][x].type = 'floor';
            }
        }
    }

    placeMonsters() {
        const monsterCount = randomInt(8, 15);

        for (let i = 0; i < monsterCount; i++) {
            const room = randomChoice(this.rooms);
            const x = randomInt(room.x + 1, room.x + room.width - 2);
            const y = randomInt(room.y + 1, room.y + room.height - 2);

            // すでにモンスターがいる場所には配置しない
            if (!this.getMonsterAt(x, y)) {
                const type = getRandomMonsterType();
                // フロアレベルに応じてモンスターレベルを決定
                const baseLevel = this.floorLevel;
                const level = randomInt(baseLevel, baseLevel + 2);

                const monster = new Monster(x, y, type, level, true);
                this.monsters.push(monster);
            }
        }
    }

    getRandomFloorTile() {
        const room = randomChoice(this.rooms);
        const x = randomInt(room.x + 1, room.x + room.width - 2);
        const y = randomInt(room.y + 1, room.y + room.height - 2);
        return { x, y };
    }

    getMonsterAt(x, y) {
        return this.monsters.find(m => m.x === x && m.y === y);
    }

    removeMonster(monster) {
        const index = this.monsters.indexOf(monster);
        if (index > -1) {
            this.monsters.splice(index, 1);
        }
    }

    updateVisibility(playerX, playerY, range = 6) {
        // すべてのタイルを非表示に
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this.tiles[y][x].visible = false;
            }
        }

        // FOV計算
        const visible = calculateFOV(playerX, playerY, range, this);

        for (const key of visible) {
            const [x, y] = key.split(',').map(Number);
            this.tiles[y][x].visible = true;
            this.tiles[y][x].explored = true;
        }
    }

    placeTreasures() {
        const treasureCount = randomInt(3, 7);

        for (let i = 0; i < treasureCount; i++) {
            const room = randomChoice(this.rooms);
            const x = randomInt(room.x + 1, room.x + room.width - 2);
            const y = randomInt(room.y + 1, room.y + room.height - 2);

            // 既に何かある場所には配置しない
            if (!this.getTreasureAt(x, y) && !this.getMonsterAt(x, y)) {
                this.treasures.push(new Treasure(x, y));
            }
        }
    }

    getTreasureAt(x, y) {
        return this.treasures.find(t => t.x === x && t.y === y && !t.opened);
    }

    placeStairs() {
        // ランダムな部屋の床に階段を配置
        const room = randomChoice(this.rooms);
        const x = randomInt(room.x + 1, room.x + room.width - 1);
        const y = randomInt(room.y + 1, room.y + room.height - 1);

        this.stairsPos = { x, y };
    }

    getStairsAt(x, y) {
        return this.stairsPos && this.stairsPos.x === x && this.stairsPos.y === y;
    }
}

class Treasure {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.opened = false;
    }

    open() {
        // ルートテーブルからアイテムを抽選
        const item = rollLoot();
        this.opened = true;
        return item;
    }
}
