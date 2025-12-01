<?php
/**
 * ランキングAPI
 * 週間ランキングシステム（データベース不使用）
 */

// 設定
const RANKING_LIMIT = 10;           // 表示件数
const MAX_SCORE = 999999;           // 最大スコア
const RATE_LIMIT_SECONDS = 60;      // レート制限（秒）
const RATE_LIMIT_COUNT = 3;         // レート制限（回数）
const DATA_FILE = __DIR__ . '/data/rankings.json';
const SECRET_KEY = 'ierFvt3HsEVvLxDkG86oxtLacOfEYqRA';  // ハッシュ検証用秘密鍵

// CORS設定（同じドメインなので不要だが、念のため）
header('Content-Type: application/json');

// HTTPメソッド判定
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    handlePostRequest();
} elseif ($method === 'GET') {
    handleGetRequest();
} else {
    sendError('Invalid method', 405);
}

/**
 * スコア送信処理
 */
function handlePostRequest() {
    // JSONデータ取得
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        sendError('Invalid JSON');
    }
    
    // バリデーション
    $nickname = $input['nickname'] ?? '';
    $score = $input['score'] ?? null;
    $hash = $input['hash'] ?? '';
    
    // ニックネーム検証
    if (!preg_match('/^[a-zA-Z0-9_-]{1,10}$/', $nickname)) {
        sendError('Invalid nickname format');
    }
    
    // スコア検証
    if (!is_numeric($score) || $score < 0 || $score > MAX_SCORE) {
        sendError('Invalid score');
    }
    
    // ハッシュ検証
    $expectedHash = generateHash($nickname, $score);
    if ($hash !== $expectedHash) {
        sendError('Invalid hash');
    }
    
    // レート制限チェック
    if (!checkRateLimit()) {
        sendError('Too many requests', 429);
    }
    
    // データ読み込み
    $data = loadData();
    
    // 週間リセット処理
    $data = checkAndResetWeekly($data);
    
    // ランキングに追加
    $newEntry = [
        'nickname' => htmlspecialchars($nickname, ENT_QUOTES, 'UTF-8'),
        'score' => (int)$score,
        'timestamp' => date('c')  // ISO 8601形式
    ];
    
    $data['rankings'][] = $newEntry;
    
    // ソート（スコア降順、同点なら日時昇順）
    usort($data['rankings'], function($a, $b) {
        if ($a['score'] === $b['score']) {
            return strcmp($a['timestamp'], $b['timestamp']);
        }
        return $b['score'] - $a['score'];
    });
    
    // トップN件のみ保持
    $data['rankings'] = array_slice($data['rankings'], 0, RANKING_LIMIT * 2); // 余裕を持って保存
    
    // 保存
    saveData($data);
    
    // 順位を計算
    $rank = null;
    foreach ($data['rankings'] as $index => $entry) {
        if ($entry['nickname'] === $newEntry['nickname'] && 
            $entry['score'] === $newEntry['score'] &&
            $entry['timestamp'] === $newEntry['timestamp']) {
            $rank = $index + 1;
            break;
        }
    }
    
    sendSuccess([
        'rank' => $rank,
        'total' => count($data['rankings'])
    ]);
}

/**
 * ランキング取得処理
 */
function handleGetRequest() {
    $data = loadData();
    $data = checkAndResetWeekly($data);
    
    // トップN件のみ返す
    $rankings = array_slice($data['rankings'], 0, RANKING_LIMIT);
    
    // 順位を付与
    $rankedData = [];
    foreach ($rankings as $index => $entry) {
        $rankedData[] = array_merge($entry, ['rank' => $index + 1]);
    }
    
    sendSuccess([
        'rankings' => $rankedData,
        'weekStart' => getWeekStart(),
        'total' => count($data['rankings'])
    ]);
}

/**
 * データ読み込み
 */
function loadData() {
    if (!file_exists(DATA_FILE)) {
        return [
            'lastReset' => date('c'),
            'rankings' => []
        ];
    }
    
    $json = file_get_contents(DATA_FILE);
    $data = json_decode($json, true);
    
    if (!$data) {
        return [
            'lastReset' => date('c'),
            'rankings' => []
        ];
    }
    
    return $data;
}

/**
 * データ保存
 */
function saveData($data) {
    // ディレクトリ作成
    $dir = dirname(DATA_FILE);
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    
    // ファイルロック付きで保存
    $fp = fopen(DATA_FILE, 'c+');
    if (flock($fp, LOCK_EX)) {
        ftruncate($fp, 0);
        fwrite($fp, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        fflush($fp);
        flock($fp, LOCK_UN);
    }
    fclose($fp);
}

/**
 * 週間リセット処理
 */
function checkAndResetWeekly($data) {
    $lastReset = new DateTime($data['lastReset']);
    $now = new DateTime();
    
    // 直近の日曜日0時を取得
    $lastSunday = (clone $now)->modify('last Sunday')->setTime(0, 0, 0);
    if ($now->format('w') == 0) { // 今日が日曜日の場合、今日の0時
        $lastSunday = (clone $now)->setTime(0, 0, 0);
    }
    
    // リセットが必要か確認
    if ($lastReset < $lastSunday) {
        $data['rankings'] = [];
        $data['lastReset'] = $now->format('c');
        saveData($data);
    }
    
    return $data;
}

/**
 * レート制限チェック
 */
function checkRateLimit() {
    $ip = $_SERVER['REMOTE_ADDR'];
    $cacheFile = sys_get_temp_dir() . '/ranking_rate_' . md5($ip);
    
    $now = time();
    $requests = [];
    
    if (file_exists($cacheFile)) {
        $requests = json_decode(file_get_contents($cacheFile), true) ?: [];
    }
    
    // 古いリクエストを削除
    $requests = array_filter($requests, function($timestamp) use ($now) {
        return ($now - $timestamp) < RATE_LIMIT_SECONDS;
    });
    
    // リクエスト数チェック
    if (count($requests) >= RATE_LIMIT_COUNT) {
        return false;
    }
    
    // 新しいリクエストを追加
    $requests[] = $now;
    file_put_contents($cacheFile, json_encode($requests));
    
    return true;
}

/**
 * ハッシュ生成
 */
function generateHash($nickname, $score) {
    return hash_hmac('sha256', $nickname . '|' . $score, SECRET_KEY);
}

/**
 * 週の開始日を取得
 */
function getWeekStart() {
    $now = new DateTime();
    $lastSunday = (clone $now)->modify('last Sunday')->setTime(0, 0, 0);
    if ($now->format('w') == 0) {
        $lastSunday = (clone $now)->setTime(0, 0, 0);
    }
    return $lastSunday->format('Y-m-d');
}

/**
 * 成功レスポンス
 */
function sendSuccess($data) {
    echo json_encode(['success' => true, 'data' => $data]);
    exit;
}

/**
 * エラーレスポンス
 */
function sendError($message, $code = 400) {
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $message]);
    exit;
}
