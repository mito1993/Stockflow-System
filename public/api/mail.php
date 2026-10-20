<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$rawInput = file_get_contents("php://input");
$data = json_decode($rawInput, true);

if (!$data || !isset($data['to'])) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid payload"]);
    exit();
}

$to = filter_var($data['to'], FILTER_VALIDATE_EMAIL);
if (!$to) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid email address"]);
    exit();
}

mb_language("Japanese");
mb_internal_encoding("UTF-8");

$type = isset($data['type']) ? $data['type'] : 'password_reset';
$headers = "From: noreply@" . $_SERVER['SERVER_NAME'] . "\r\n";
$headers .= "Reply-To: noreply@" . $_SERVER['SERVER_NAME'] . "\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

if ($type === 'password_reset') {
    $subject = "【GENZONE在庫管理】パスワード再設定のご案内";
    $resetUrl = isset($data['reset_url']) ? $data['reset_url'] : "https://" . $_SERVER['SERVER_NAME'];
    $body = "GENZONE在庫管理システムをご利用いただきありがとうございます。\n\n";
    $body .= "以下のURLよりパスワードの再設定を行ってください。\n";
    $body .= $resetUrl . "\n\n";
    $body .= "※本メールに心当たりがない場合は破棄してください。\n";
} else {
    $subject = "【GENZONE在庫管理】システムへのご案内";
    $body = isset($data['message']) ? $data['message'] : "GENZONE在庫管理システムへのアカウント案内です。";
}

$mailSuccess = mb_send_mail($to, $subject, $body, $headers);

if ($mailSuccess) {
    echo json_encode(["success" => true, "message" => "Email sent successfully"]);
} else {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Failed to send email"]);
}