let MONSTER_TYPES = {};

// レアリティ別の出現確率
const RARITY_WEIGHTS = {
    common: 0.6,
    uncommon: 0.3,
    rare: 0.1
};

// モンスターデータをJSONから読み込む
async function loadMonsterData() {
    try {
        const response = await fetch('monsters.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        MONSTER_TYPES = await response.json();
        console.log('Monster data loaded:', MONSTER_TYPES);
        return true;
    } catch (error) {
        console.error('Failed to load monster data:', error);
        return false;
    }
}

// ランダムなモンスタータイプを取得
function getRandomMonsterType() {
    const roll = Math.random();
    let cumulative = 0;
    let selectedRarity = 'common';

    for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS)) {
        cumulative += weight;
        if (roll < cumulative) {
            selectedRarity = rarity;
            break;
        }
    }

    const monstersOfRarity = Object.entries(MONSTER_TYPES)
        .filter(([_, data]) => data.rarity === selectedRarity)
        .map(([type, _]) => type);

    // データ読み込み前などの安全策
    if (monstersOfRarity.length === 0) {
        return 'slime';
    }

    return randomChoice(monstersOfRarity);
}

// レベルに応じたステータス計算
function calculateStatsForLevel(baseStats, level) {
    const growthRate = 0.1; // レベルごとに10%成長
    return {
        hp: Math.floor(baseStats.hp * (1 + growthRate * (level - 1))),
        maxHp: Math.floor(baseStats.maxHp * (1 + growthRate * (level - 1))),
        atk: Math.floor(baseStats.atk * (1 + growthRate * (level - 1))),
        def: Math.floor(baseStats.def * (1 + growthRate * (level - 1))),
        speed: baseStats.speed
    };
}

// 経験値テーブル（レベルアップに必要な経験値）
function expRequiredForLevel(level) {
    return Math.floor(20 * Math.pow(level, 1.5));
}
