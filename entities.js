// エンティティクラス（プレイヤーとモンスター）

class Entity {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    moveTo(x, y) {
        this.x = x;
        this.y = y;
    }
}

class Monster extends Entity {
    constructor(x, y, type, level = 1, isWild = true, isBoss = false) {
        super(x, y);
        this.type = type;
        this.data = MONSTER_TYPES[type];
        this.level = level;
        this.isWild = isWild;
        this.isBoss = isBoss;
        this.exp = 0;

        // 経験値（倒された時に与える経験値）
        this.expGiven = this.data.expYield || 10;
        if (this.isBoss) {
            this.expGiven *= 5; // ボスは経験値5倍
        }

        // ステータスの初期化
        const stats = calculateStatsForLevel(this.data.baseStats, level);

        // ボス補正
        const multiplier = isBoss ? 1.5 : 1.0;

        this.hp = Math.floor(stats.hp * (isBoss ? 2.0 : 1.0)); // HPは2倍
        this.maxHp = this.hp;
        this.atk = Math.floor(stats.atk * multiplier);
        this.def = Math.floor(stats.def * multiplier);
        this.speed = Math.floor(stats.speed * multiplier);

        this.skills = [...this.data.skills];
    }

    get name() {
        return this.data.name;
    }

    get emoji() {
        return this.data.emoji;
    }

    get displayName() {
        if (this.isWild) {
            return `野生の${this.name}`;
        }
        return this.name;
    }

    takeDamage(damage) {
        const actualDamage = Math.max(1, damage - this.def);
        this.hp -= actualDamage;
        if (this.hp < 0) this.hp = 0;
        return actualDamage;
    }

    heal(amount) {
        this.hp += amount;
        if (this.hp > this.maxHp) this.hp = this.maxHp;
    }

    isDead() {
        return this.hp <= 0;
    }

    gainExp(amount) {
        if (this.isWild) return false;

        this.exp += amount;
        const requiredExp = expRequiredForLevel(this.level + 1);

        if (this.exp >= requiredExp) {
            this.levelUp();
            return true;
        }
        return false;
    }

    levelUp() {
        this.level++;
        const oldMaxHp = this.maxHp;

        // ステータスを再計算
        const stats = calculateStatsForLevel(this.data.baseStats, this.level);
        const hpIncrease = stats.maxHp - oldMaxHp;

        this.maxHp = stats.maxHp;
        this.atk = stats.atk;
        this.def = stats.def;
        this.speed = stats.speed;
        this.hp += hpIncrease; // レベルアップでHPも回復

        if (this.hp > this.maxHp) this.hp = this.maxHp;
    }

    useSkill(skillIndex, target) {
        if (skillIndex < 0 || skillIndex >= this.skills.length) {
            skillIndex = 0;
        }

        const skill = this.skills[skillIndex];
        const baseDamage = this.atk * skill.power;
        const variance = 0.85 + Math.random() * 0.3; // 85%～115%の振れ幅
        const damage = Math.floor(baseDamage * variance);

        return {
            skill: skill,
            damage: damage,
            actualDamage: target.takeDamage(damage)
        };
    }

    attack(target) {
        // 最初のスキル（通常攻撃）を使用
        const result = this.useSkill(0, target);
        return result.actualDamage;
    }
}

class Player extends Entity {
    constructor(x, y) {
        super(x, y);
        this.party = []; // 仲間モンスター（最大3匹）
        this.activeMonsterIndex = -1; // 現在戦闘中のモンスター
        this.inventory = [];
        this.turnsPlayed = 0;
        this.monstersDefeated = 0;
        this.monstersCaptured = 0;
    }

    addItem(item) {
        this.inventory.push(item);
        return true;
    }

    removeItem(index) {
        if (index >= 0 && index < this.inventory.length) {
            this.inventory.splice(index, 1);
            return true;
        }
        return false;
    }

    useItem(index, targetMonsterIndex) {
        if (index < 0 || index >= this.inventory.length) return false;

        const item = this.inventory[index];
        const result = item.use(this, targetMonsterIndex);

        if (result && result.success) {
            this.removeItem(index);
        }

        return result;
    }

    get activeMonster() {
        if (this.activeMonsterIndex >= 0 && this.activeMonsterIndex < this.party.length) {
            return this.party[this.activeMonsterIndex];
        }
        return null;
    }

    hasAliveMonsters() {
        return this.party.some(m => !m.isDead());
    }

    autoSwitchToAliveMonster() {
        // 生きているモンスターを探して自動的に切り替え
        for (let i = 0; i < this.party.length; i++) {
            if (!this.party[i].isDead()) {
                this.activeMonsterIndex = i;
                return true;
            }
        }
        return false;
    }

    addMonster(monster) {
        if (this.party.length >= 3) {
            return false; // パーティが満杯
        }

        monster.isWild = false;
        this.party.push(monster);

        // 最初のモンスターは自動的にアクティブに
        if (this.party.length === 1) {
            this.activeMonsterIndex = 0;
        }

        this.monstersCaptured++;
        return true;
    }

    switchMonster(index) {
        if (index >= 0 && index < this.party.length && !this.party[index].isDead()) {
            this.activeMonsterIndex = index;
            return true;
        }
        return false;
    }

    autoSwitchToAliveMonster() {
        for (let i = 0; i < this.party.length; i++) {
            if (!this.party[i].isDead()) {
                this.activeMonsterIndex = i;
                return true;
            }
        }
        return false;
    }

    healAllMonsters() {
        for (const monster of this.party) {
            monster.heal(monster.maxHp);
        }
    }

    move(dx, dy, dungeon) {
        const newX = this.x + dx;
        const newY = this.y + dy;

        // 範囲チェック
        if (newX < 0 || newX >= dungeon.width || newY < 0 || newY >= dungeon.height) {
            return false;
        }

        // 壁チェック
        if (dungeon.tiles[newY][newX].type === 'wall') {
            return false;
        }

        this.moveTo(newX, newY);
        this.turnsPlayed++;
        return true;
    }
}
