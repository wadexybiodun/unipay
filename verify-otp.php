<?php
// UniPay - Verify OTP
//
// USAGE:
//   POST verify-otp.php
//   Body: email=user@example.com&otp=123456

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Only POST requests are accepted']);
    exit;
}

$email = isset($_POST['email']) ? trim($_POST['email']) : '';
$otp   = isset($_POST['otp']) ? trim($_POST['otp']) : '';

session_start();

$storedOtp      = isset($_SESSION['unipay_otp']) ? $_SESSION['unipay_otp'] : '';
$storedEmail    = isset($_SESSION['unipay_email']) ? $_SESSION['unipay_email'] : '';
$expires        = isset($_SESSION['unipay_otp_expires']) ? $_SESSION['unipay_otp_expires'] : 0;

// Check expiration
if (time() > $expires) {
    unset($_SESSION['unipay_otp']);
    unset($_SESSION['unipay_email']);
    unset($_SESSION['unipay_otp_expires']);
    echo json_encode(['success' => false, 'message' => 'OTP has expired. Please request a new one.']);
    exit;
}

// Verify
if ($storedOtp === $otp && $storedEmail === $email) {
    // Clear OTP from session (one-time use)
    unset($_SESSION['unipay_otp']);
    unset($_SESSION['unipay_email']);
    unset($_SESSION['unipay_otp_expires']);

    echo json_encode([
        'success' => true,
        'message' => 'OTP verified successfully'
    ]);
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Invalid OTP code. Please try again.'
    ]);
}
