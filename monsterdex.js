class MonsterDex {
    constructor() {
        this.seen = new Set();
        this.captured = new Set();
        // モンスターデータの参照を保持（後で設定される）
        this.monsterData = {};
    }

    // モンスターデータをセット
    setMonsterData(data) {
        this.monsterData = data;
    }

    // 遭遇したモンスターを登録
    registerSeen(monsterId) {
        if (!this.seen.has(monsterId)) {
            this.seen.add(monsterId);
            return true; // 新規登録
        }
        return false;
    }

    // 捕獲したモンスターを登録
    registerCaptured(monsterId) {
        this.registerSeen(monsterId); // 捕獲したら遭遇も済み
        if (!this.captured.has(monsterId)) {
            this.captured.add(monsterId);
            return true; // 新規登録
        }
        return false;
    }

    // 遭遇済みかチェック
    isSeen(monsterId) {
        return this.seen.has(monsterId);
    }

    // 捕獲済みかチェック
    isCaptured(monsterId) {
        return this.captured.has(monsterId);
    }

    // 進捗状況を取得
    getProgress() {
        if (!this.monsterData) {
            return {
                total: 0,
                seen: 0,
                captured: 0,
                seenPercent: 0,
                capturedPercent: 0
            };
        }

        const total = Object.keys(this.monsterData).length;
        const seenCount = this.seen.size;
        const capturedCount = this.captured.size;

        return {
            total,
            seen: seenCount,
            captured: capturedCount,
            seenPercent: total > 0 ? Math.floor((seenCount / total) * 100) : 0,
            capturedPercent: total > 0 ? Math.floor((capturedCount / total) * 100) : 0
        };
    }

    // セーブデータのエクスポート
    exportData() {
        return {
            seen: Array.from(this.seen),
            captured: Array.from(this.captured)
        };
    }

    // セーブデータのインポート
    importData(data) {
        if (data) {
            if (data.seen) {
                this.seen = new Set(data.seen);
            }
            if (data.captured) {
                this.captured = new Set(data.captured);
            }
        }
    }
}
