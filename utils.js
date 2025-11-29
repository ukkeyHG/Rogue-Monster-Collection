// ユーティリティ関数

// ランダム整数生成
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ランダム要素選択
function randomChoice(array) {
    return array[randomInt(0, array.length - 1)];
}

// 2点間の距離（マンハッタン距離）
function manhattanDistance(x1, y1, x2, y2) {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

// 2点間の距離（ユークリッド距離）
function euclideanDistance(x1, y1, x2, y2) {
    return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

// 確率判定
function chance(probability) {
    return Math.random() < probability;
}

// シンプルなFOV計算（レイキャスティング）
function calculateFOV(x, y, range, dungeon) {
    const visible = new Set();
    const width = dungeon.width;
    const height = dungeon.height;
    
    // 中心点は常に見える
    visible.add(`${x},${y}`);
    
    // 8方向にレイを飛ばす
    const angles = 64; // レイの数
    for (let i = 0; i < angles; i++) {
        const angle = (i / angles) * Math.PI * 2;
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);
        
        for (let j = 1; j <= range; j++) {
            const targetX = Math.round(x + dx * j);
            const targetY = Math.round(y + dy * j);
            
            if (targetX < 0 || targetX >= width || targetY < 0 || targetY >= height) {
                break;
            }
            
            visible.add(`${targetX},${targetY}`);
            
            // 壁にぶつかったら終了
            if (dungeon.tiles[targetY][targetX].type === 'wall') {
                break;
            }
        }
    }
    
    return visible;
}

// A*パスファインディング（シンプル版）
function findPath(startX, startY, endX, endY, dungeon) {
    const openSet = [{x: startX, y: startY, g: 0, h: 0, f: 0, parent: null}];
    const closedSet = new Set();
    
    while (openSet.length > 0) {
        // f値が最小のノードを選択
        openSet.sort((a, b) => a.f - b.f);
        const current = openSet.shift();
        
        // ゴールに到達
        if (current.x === endX && current.y === endY) {
            const path = [];
            let node = current;
            while (node.parent) {
                path.unshift({x: node.x, y: node.y});
                node = node.parent;
            }
            return path;
        }
        
        closedSet.add(`${current.x},${current.y}`);
        
        // 隣接ノードを探索（4方向）
        const neighbors = [
            {x: current.x + 1, y: current.y},
            {x: current.x - 1, y: current.y},
            {x: current.x, y: current.y + 1},
            {x: current.x, y: current.y - 1}
        ];
        
        for (const neighbor of neighbors) {
            if (neighbor.x < 0 || neighbor.x >= dungeon.width || 
                neighbor.y < 0 || neighbor.y >= dungeon.height) {
                continue;
            }
            
            if (dungeon.tiles[neighbor.y][neighbor.x].type === 'wall') {
                continue;
            }
            
            if (closedSet.has(`${neighbor.x},${neighbor.y}`)) {
                continue;
            }
            
            const g = current.g + 1;
            const h = manhattanDistance(neighbor.x, neighbor.y, endX, endY);
            const f = g + h;
            
            const existingNode = openSet.find(n => n.x === neighbor.x && n.y === neighbor.y);
            if (!existingNode) {
                openSet.push({
                    x: neighbor.x,
                    y: neighbor.y,
                    g, h, f,
                    parent: current
                });
            } else if (g < existingNode.g) {
                existingNode.g = g;
                existingNode.f = f;
                existingNode.parent = current;
            }
        }
    }
    
    return []; // パスが見つからない
}

// 配列をシャッフル
function shuffle(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = randomInt(0, i);
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}
