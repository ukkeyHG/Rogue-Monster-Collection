// アイテムシステム

// アイテムタイプ定義
const ITEM_TYPES = {
    herb: {
        name: '薬草',
        emoji: '🌿',
        effect: 'heal',
        value: 30,
        rarity: 'common',
        description: 'HP 30回復'
    },
    potion: {
        name: 'ポーション',
        emoji: '⚗️',
        effect: 'heal',
        value: 50,
        rarity: 'common',
        description: 'HP 50回復'
    },
    hiPotion: {
        name: '高級ポーション',
        emoji: '✨',
        effect: 'healFull',
        rarity: 'uncommon',
        description: 'HP全回復'
    },
    elixir: {
        name: 'エリクサー',
        emoji: '💎',
        effect: 'healAllParty',
        rarity: 'rare',
        description: 'パーティ全員HP全回復'
    },
    reviveSeed: {
        name: '復活の種',
        emoji: '🌱',
        effect: 'revive',
        rarity: 'uncommon',
        description: '倒れたモンスターを50%HPで復活'
    }
};

// ルートテーブル（宝箱の中身）
const LOOT_TABLE = [
    { item: 'herb', weight: 40 },
    { item: 'potion', weight: 30 },
    { item: 'hiPotion', weight: 15 },
    { item: 'elixir', weight: 5 },
    { item: 'reviveSeed', weight: 10 }
];

// アイテムクラス
class Item {
    constructor(type) {
        this.type = type;
        this.data = ITEM_TYPES[type];
    }

    get name() {
        return this.data.name;
    }

    get emoji() {
        return this.data.emoji;
    }

    get description() {
        return this.data.description;
    }

    // アイテムを使用（targetMonsterIndexはオプション）
    use(player, targetMonsterIndex = null) {
        switch (this.data.effect) {
            case 'heal':
                return this.useHeal(player, targetMonsterIndex);
            case 'healFull':
                return this.useHealFull(player, targetMonsterIndex);
            case 'healAllParty':
                return this.useHealAllParty(player);
            case 'revive':
                return this.useRevive(player, targetMonsterIndex);
            default:
                return false;
        }
    }

    useHeal(player, targetMonsterIndex) {
        if (targetMonsterIndex === null || targetMonsterIndex === undefined) {
            // アクティブモンスターに使用
            targetMonsterIndex = player.activeMonsterIndex;
        }

        const monster = player.party[targetMonsterIndex];
        if (!monster || monster.isDead()) {
            return { success: false, message: '使用できません' };
        }

        // HP満タンなら使用しない
        if (monster.hp >= monster.maxHp) {
            return { success: false, message: `${monster.name} のHPは満タンです` };
        }

        const healed = Math.min(this.data.value, monster.maxHp - monster.hp);
        monster.heal(healed);

        return {
            success: true,
            message: `${monster.name} のHPが ${healed} 回復した！`,
            target: monster
        };
    }

    useHealFull(player, targetMonsterIndex) {
        if (targetMonsterIndex === null || targetMonsterIndex === undefined) {
            targetMonsterIndex = player.activeMonsterIndex;
        }

        const monster = player.party[targetMonsterIndex];
        if (!monster || monster.isDead()) {
            return { success: false, message: '使用できません' };
        }

        // HP満タンなら使用しない
        if (monster.hp >= monster.maxHp) {
            return { success: false, message: `${monster.name} のHPは満タンです` };
        }

        const healed = monster.maxHp - monster.hp;
        monster.heal(healed);

        return {
            success: true,
            message: `${monster.name} のHPが全回復した！`,
            target: monster
        };
    }

    useHealAllParty(player) {
        let healedCount = 0;

        for (const monster of player.party) {
            if (!monster.isDead()) {
                const healed = monster.maxHp - monster.hp;
                if (healed > 0) {
                    monster.heal(healed);
                    healedCount++;
                }
            }
        }

        if (healedCount === 0) {
            return false;
        }

        return {
            success: true,
            message: `パーティ全員のHPが全回復した！`,
            target: null
        };
    }

    useRevive(player, targetMonsterIndex) {
        if (targetMonsterIndex === null || targetMonsterIndex === undefined) {
            // 最初の倒れているモンスターを探す
            for (let i = 0; i < player.party.length; i++) {
                if (player.party[i].isDead()) {
                    targetMonsterIndex = i;
                    break;
                }
            }
        }

        if (targetMonsterIndex === null || targetMonsterIndex === undefined) {
            return false;
        }

        const monster = player.party[targetMonsterIndex];
        if (!monster || !monster.isDead()) {
            return false;
        }

        // 最大HPの50%で復活
        const reviveHp = Math.floor(monster.maxHp * 0.5);
        monster.hp = reviveHp;

        return {
            success: true,
            message: `${monster.name} が復活した！`,
            target: monster
        };
    }
}

// ルートテーブルからランダムにアイテムを取得
function rollLoot() {
    const totalWeight = LOOT_TABLE.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Math.random() * totalWeight;

    for (const entry of LOOT_TABLE) {
        roll -= entry.weight;
        if (roll <= 0) {
            return new Item(entry.item);
        }
    }

    // フォールバック
    return new Item('herb');
}
