<?php
/**
 * ランキングAPIテストスクリプト
 * このファイルをブラウザで直接開いて、ranking.phpが動作しているか確認
 */

echo "=== Ranking API Test ===\n\n";

// 1. ranking.phpの存在確認
$rankingFile = __DIR__ . '/ranking.php';
if (!file_exists($rankingFile)) {
    echo "❌ ranking.php が見つかりません\n";
    exit;
}
echo "✅ ranking.php 存在確認OK\n";

// 2. dataディレクトリの確認
$dataDir = __DIR__ . '/data';
if (!is_dir($dataDir)) {
    echo "⚠️ data ディレクトリが存在しません。作成を試みます...\n";
    if (mkdir($dataDir, 0755, true)) {
        echo "✅ data ディレクトリを作成しました\n";
    } else {
        echo "❌ data ディレクトリの作成に失敗しました\n";
        exit;
    }
} else {
    echo "✅ data ディレクトリ存在確認OK\n";
}

// 3. dataディレクトリの書き込み権限確認
if (!is_writable($dataDir)) {
    echo "❌ data ディレクトリに書き込み権限がありません\n";
    echo "   chmod 755 data を実行してください\n";
    exit;
}
echo "✅ data ディレクトリ書き込み権限OK\n";

// 4. テストリクエスト（GET）
echo "\n--- GET リクエストテスト ---\n";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'http://' . $_SERVER['HTTP_HOST'] . dirname($_SERVER['PHP_SELF']) . '/ranking.php');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP ステータスコード: $httpCode\n";
if ($httpCode === 200) {
    echo "✅ GET リクエスト成功\n";
    
    // レスポンスボディを表示
    list($header, $body) = explode("\r\n\r\n", $response, 2);
    echo "レスポンス:\n";
    echo $body . "\n";
} else {
    echo "❌ GET リクエスト失敗\n";
    echo "レスポンス:\n$response\n";
}

echo "\n=== テスト完了 ===\n";
echo "このテストで問題が見つかった場合は、該当箇所を修正してください。\n";
