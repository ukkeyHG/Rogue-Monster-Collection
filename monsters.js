// モンスターデータベース

const MONSTER_TYPES = {
    slime: {
        name: 'スライム',
        emoji: '🟢',
        baseStats: {
            hp: 30,
            maxHp: 30,
            atk: 5,
            def: 3,
            speed: 3
        },
        skills: [
            {
                name: '体当たり',
                power: 1.0,
                description: '通常の攻撃'
            },
            {
                name: 'スライム弾',
                power: 1.5,
                description: '強力な攻撃'
            }
        ],
        captureRate: 0.4,
        expYield: 15,
        rarity: 'common'
    },

    goblin: {
        name: 'ゴブリン',
        emoji: '👺',
        baseStats: {
            hp: 40,
            maxHp: 40,
            atk: 8,
            def: 4,
            speed: 5
        },
        skills: [
            {
                name: '殴る',
                power: 1.0,
                description: '通常の攻撃'
            },
            {
                name: '強打',
                power: 1.8,
                description: '強力な一撃'
            }
        ],
        captureRate: 0.3,
        expYield: 25,
        rarity: 'common'
    },

    bat: {
        name: 'コウモリ',
        emoji: '🦇',
        baseStats: {
            hp: 25,
            maxHp: 25,
            atk: 6,
            def: 2,
            speed: 8
        },
        skills: [
            {
                name: '噛みつく',
                power: 1.0,
                description: '通常の攻撃'
            },
            {
                name: '超音波',
                power: 1.3,
                description: '音波攻撃'
            }
        ],
        captureRate: 0.35,
        expYield: 18,
        rarity: 'common'
    },

    dragon: {
        name: 'ドラゴン',
        emoji: '🐉',
        baseStats: {
            hp: 60,
            maxHp: 60,
            atk: 12,
            def: 8,
            speed: 6
        },
        skills: [
            {
                name: '爪攻撃',
                power: 1.0,
                description: '通常の攻撃'
            },
            {
                name: '火炎ブレス',
                power: 2.5,
                description: '強力な炎の攻撃'
            }
        ],
        captureRate: 0.15,
        expYield: 50,
        rarity: 'rare'
    },

    ghost: {
        name: 'ゴースト',
        emoji: '👻',
        baseStats: {
            hp: 35,
            maxHp: 35,
            atk: 7,
            def: 5,
            speed: 7
        },
        skills: [
            {
                name: '呪い',
                power: 1.0,
                description: '通常の攻撃'
            },
            {
                name: 'シャドウボール',
                power: 2.0,
                description: '闇の力を放つ'
            }
        ],
        captureRate: 0.25,
        expYield: 30,
        rarity: 'uncommon'
    },

    wolf: {
        name: 'ウルフ',
        emoji: '🐺',
        baseStats: {
            hp: 45,
            maxHp: 45,
            atk: 10,
            def: 5,
            speed: 9
        },
        skills: [
            {
                name: '噛みつく',
                power: 1.0,
                description: '通常の攻撃'
            },
            {
                name: '遠吠え',
                power: 1.6,
                description: '攻撃力を上げて攻撃'
            }
        ],
        captureRate: 0.28,
        expYield: 35,
        rarity: 'uncommon'
    }
};

// レアリティ別の出現確率
const RARITY_WEIGHTS = {
    common: 0.6,
    uncommon: 0.3,
    rare: 0.1
};

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
