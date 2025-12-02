// アイテムシステム

// アイテムデータ（JSONから読み込む）
let ITEM_TYPES = {};
let LOOT_TABLE = [];

// アイテムデータの読み込み
async function loadItemData() {
    try {
        const response = await fetch('items.json');
        const data = await response.json();
        ITEM_TYPES = data.items;
        LOOT_TABLE = data.lootTable;
        console.log('Item data loaded:', ITEM_TYPES);
        return true;
    } catch (error) {
        console.error('Failed to load item data:', error);
        return false;
    }
}

// アイテムクラス
class Item {
    constructor(type) {
        this.type = type;
        // データがまだ読み込まれていない場合のフォールバック
        this.data = ITEM_TYPES[type] || {
            name: 'Unknown Item',
            emoji: '❓',
            description: 'データ読み込みエラー',
            effect: { type: 'none' }
        };
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
        const effect = this.data.effect;
        
        if (!effect) return false;

        switch (effect.type) {
            case 'heal':
                if (effect.target === 'all') {
                    return this.useHealAllParty(player, effect);
                } else {
                    return this.useHeal(player, targetMonsterIndex, effect);
                }
            case 'revive':
                return this.useRevive(player, targetMonsterIndex, effect);
            default:
                return false;
        }
    }

    // 回復量の計算
    calculateValue(baseValue, unit, maxHp) {
        if (unit === 'percent') {
            return Math.floor(maxHp * (baseValue / 100));
        } else {
            return baseValue;
        }
    }

    useHeal(player, targetMonsterIndex, effect) {
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

        const healAmount = this.calculateValue(effect.value, effect.unit, monster.maxHp);
        const actualHealed = Math.min(healAmount, monster.maxHp - monster.hp);
        
        monster.heal(actualHealed);

        let message = `${monster.name} のHPが ${actualHealed} 回復した！`;
        if (effect.unit === 'percent' && effect.value >= 100) {
            message = `${monster.name} のHPが全回復した！`;
        }

        return {
            success: true,
            message: message,
            target: monster
        };
    }

    useHealAllParty(player, effect) {
        let healedCount = 0;

        for (const monster of player.party) {
            if (!monster.isDead()) {
                const healAmount = this.calculateValue(effect.value, effect.unit, monster.maxHp);
                const actualHealed = Math.min(healAmount, monster.maxHp - monster.hp);
                
                if (actualHealed > 0) {
                    monster.heal(actualHealed);
                    healedCount++;
                }
            }
        }

        if (healedCount === 0) {
            return false;
        }

        let message = `パーティ全員のHPが回復した！`;
        if (effect.unit === 'percent' && effect.value >= 100) {
            message = `パーティ全員のHPが全回復した！`;
        }

        return {
            success: true,
            message: message,
            target: null
        };
    }

    useRevive(player, targetMonsterIndex, effect) {
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

        // 復活時のHP計算
        const reviveHp = this.calculateValue(effect.value, effect.unit, monster.maxHp);
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
    // データ未読み込み時のフォールバック
    if (LOOT_TABLE.length === 0) {
        return new Item('herb');
    }

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
