class ScoreManager {
    constructor() {
        this.totalScore = 0;
        this.breakdown = {
            battle: 0,      // 戦闘スコア（撃破）
            capture: 0,     // 捕獲スコア
            exploration: 0, // 探索スコア（宝箱）
            bonus: 0        // ボーナス（初捕獲など）
        };
        this.maxDamage = 0;
        this.capturedTypes = new Set();
    }

    // レアリティ倍率を取得
    getRarityMultiplier(rarity) {
        switch (rarity) {
            case 'Common': return 1.0;
            case 'Uncommon': return 1.5;
            case 'Rare': return 3.0;
            default: return 1.0;
        }
    }

    // 戦闘勝利スコア加算
    addBattleScore(enemy) {
        const rarityMult = this.getRarityMultiplier(enemy.rarity);
        const score = Math.floor(100 * enemy.level * rarityMult);
        this.breakdown.battle += score;
        this.totalScore += score;
        return score;
    }

    // 捕獲スコア加算
    addCaptureScore(enemy) {
        const rarityMult = this.getRarityMultiplier(enemy.rarity);
        let score = Math.floor(300 * enemy.level * rarityMult);

        // 初捕獲ボーナス
        if (!this.capturedTypes.has(enemy.type)) {
            score += 500;
            this.breakdown.bonus += 500; // ボーナスとして記録
            this.capturedTypes.add(enemy.type);
        }

        this.breakdown.capture += score;
        this.totalScore += score;
        return score;
    }

    // 宝箱スコア加算
    addTreasureScore() {
        const score = 50;
        this.breakdown.exploration += score;
        this.totalScore += score;
        return score;
    }

    // フロア到達ボーナス
    addFloorBonus(floor) {
        const bonus = floor * 200;
        this.totalScore += bonus;
        return bonus;
    }

    // 最大ダメージ更新
    recordDamage(damage) {
        if (damage > this.maxDamage) {
            this.maxDamage = damage;
        }
    }

    // 任意のボーナス加算
    addBonus(amount) {
        this.breakdown.bonus += amount;
        this.totalScore += amount;
    }

    // スコアデータのエクスポート（将来用）
    exportScore() {
        return {
            score: this.totalScore,
            details: this.breakdown,
            maxDamage: this.maxDamage,
            timestamp: Date.now()
        };
    }
}
