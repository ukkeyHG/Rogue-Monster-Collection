/**
 * ランキングシステム - フロントエンド
 */

const RANKING_SECRET_KEY = 'ierFvt3HsEVvLxDkG86oxtLacOfEYqRA';

/**
 * ハッシュ生成（SHA-256 HMAC）
 */
async function generateHash(nickname, score) {
    const message = `${nickname}|${score}`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(RANKING_SECRET_KEY);
    const messageData = encoder.encode(message);

    // HMAC-SHA256
    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const hashArray = Array.from(new Uint8Array(signature));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return hashHex;
}

/**
 * スコアを送信
 */
async function submitScore(nickname, score) {
    try {
        // ニックネーム検証
        if (!/^[a-zA-Z0-9_-]{1,10}$/.test(nickname)) {
            throw new Error('ニックネームは半角英数字・ハイフン・アンダースコアで10文字以内にしてください');
        }

        // ハッシュ生成
        const hash = await generateHash(nickname, score);

        // API送信
        const response = await fetch('./ranking.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nickname: nickname,
                score: score,
                hash: hash
            })
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'スコア送信に失敗しました');
        }

        return result.data;
    } catch (error) {
        console.error('Score submission error:', error);
        throw error;
    }
}

/**
 * ランキング取得
 */
async function fetchRankings() {
    try {
        const response = await fetch('./ranking.php');
        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'ランキング取得に失敗しました');
        }

        return result.data;
    } catch (error) {
        console.error('Ranking fetch error:', error);
        throw error;
    }
}

/**
 * ランキング表示モーダルを表示
 */
async function showRankingModal() {
    try {
        const data = await fetchRankings();

        // モーダル作成
        const modal = document.createElement('div');
        modal.id = 'ranking-modal';
        modal.className = 'modal-overlay';

        let rankingHTML = '';
        if (data.rankings.length === 0) {
            rankingHTML = '<div class="empty-message">まだランキングがありません</div>';
        } else {
            data.rankings.forEach(entry => {
                const rankClass = entry.rank <= 3 ? `rank-${entry.rank}` : '';
                const date = new Date(entry.timestamp).toLocaleString('ja-JP', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                rankingHTML += `
                    <div class="ranking-entry ${rankClass}">
                        <span class="ranking-rank">${entry.rank}</span>
                        <span class="ranking-nickname">${entry.nickname}</span>
                        <span class="ranking-score">${entry.score.toLocaleString()}</span>
                        <span class="ranking-date">${date}</span>
                    </div>
                `;
            });
        }

        modal.innerHTML = `
            <div class="ranking-content">
                <div class="modal-header">
                    <h2>🏆 週間ランキング</h2>
                    <p class="week-info">期間: ${data.weekStart} ～</p>
                    <button class="close-btn" onclick="document.getElementById('ranking-modal').remove()">×</button>
                </div>
                <div class="ranking-list">
                    ${rankingHTML}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    } catch (error) {
        alert('ランキングの取得に失敗しました: ' + error.message);
    }
}

/**
 * スコア送信ダイアログを表示
 */
function showScoreSubmitDialog(score) {
    const modal = document.createElement('div');
    modal.id = 'score-submit-modal';
    modal.className = 'modal-overlay';

    modal.innerHTML = `
        <div class="score-submit-content">
            <div class="modal-header">
                <h2>🎮 スコア登録</h2>
                <p>あなたのスコア: <strong>${score.toLocaleString()}</strong></p>
            </div>
            <div class="submit-form">
                <label for="nickname-input">ニックネーム（半角英数字・記号、10文字以内）</label>
                <input 
                    type="text" 
                    id="nickname-input" 
                    maxlength="10" 
                    pattern="[a-zA-Z0-9_-]+" 
                    placeholder="例: Player123"
                    autocomplete="off"
                />
                <div class="submit-buttons">
                    <button class="submit-btn" onclick="handleScoreSubmit(${score})">登録</button>
                    <button class="cancel-btn" onclick="document.getElementById('score-submit-modal').remove()">キャンセル</button>
                </div>
                <div id="submit-error" class="error-message"></div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    document.getElementById('nickname-input').focus();

    // Enterキーで送信
    document.getElementById('nickname-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleScoreSubmit(score);
        }
    });
}

/**
 * スコア送信処理
 */
async function handleScoreSubmit(score) {
    const nicknameInput = document.getElementById('nickname-input');
    const nickname = nicknameInput.value.trim();
    const errorDiv = document.getElementById('submit-error');

    errorDiv.textContent = '';

    if (!nickname) {
        errorDiv.textContent = 'ニックネームを入力してください';
        return;
    }

    try {
        const submitBtn = document.querySelector('.submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = '送信中...';

        const result = await submitScore(nickname, score);

        // 成功メッセージ
        alert(`ランキング登録完了！\nあなたの順位: ${result.rank}位`);

        // モーダルを閉じる
        document.getElementById('score-submit-modal').remove();

        // ランキングを表示
        showRankingModal();

    } catch (error) {
        errorDiv.textContent = error.message;
        const submitBtn = document.querySelector('.submit-btn');
        submitBtn.disabled = false;
        submitBtn.textContent = '登録';
    }
}

// グローバルに公開（UIから呼び出せるように）
window.showRankingModal = showRankingModal;
window.showScoreSubmitDialog = showScoreSubmitDialog;
window.handleScoreSubmit = handleScoreSubmit;
