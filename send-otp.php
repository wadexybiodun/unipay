<?php
// UniPay - Send OTP Email via PHPMailer
//
// SETUP:
//   1. composer require phpmailer/phpmailer
//   2. Update SMTP credentials below (lines 55-60)
//   3. Start PHP server: php -S localhost:8000
//
// USAGE:
//   POST /send-otp.php
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
$otp   = isset($_POST['otp'])   ? trim($_POST['otp'])   : '';

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['success' => false, 'message' => 'Invalid email address']);
    exit;
}

if (!preg_match('/^\d{6}$/', $otp)) {
    echo json_encode(['success' => false, 'message' => 'Invalid OTP format']);
    exit;
}

// ─── SMTP CONFIGURATION ───────────────────────────────────────────
$smtpHost     = 'smtp.gmail.com';
$smtpPort     = 587;
$smtpUsername = 'your-email@gmail.com';
$smtpPassword = 'your-app-password';
$smtpFrom     = 'your-email@gmail.com';
$smtpFromName = 'UniPay';
// ───────────────────────────────────────────────────────────────────

$emailSent = false;
$method    = 'none';

// ─── PHPMailer (via Composer) ──────────────────────────────────
$autoloadPath = __DIR__ . '/vendor/autoload.php';
if (file_exists($autoloadPath)) {
    try {
        require_once $autoloadPath;

        $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
        $mail->isSMTP();
        $mail->SMTPAuth   = true;
        $mail->Host       = $smtpHost;
        $mail->Port       = $smtpPort;
        $mail->Username   = $smtpUsername;
        $mail->Password   = $smtpPassword;
        $mail->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;

        $mail->setFrom($smtpFrom, $smtpFromName);
        $mail->addAddress($email);
        $mail->isHTML(true);

        $mail->Subject = 'Your UniPay OTP Code';
        $mail->Body    = buildEmailHtml($otp);
        $mail->AltBody = "Your UniPay OTP code is: $otp\n\nExpires in 10 minutes.";

        $mail->send();
        $emailSent = true;
        $method    = 'phpmailer';
    } catch (\Exception $e) {
        $method = 'phpmailer_error: ' . $e->getMessage();
    }
}

// ─── PHP mail() fallback ──────────────────────────────────────
if (!$emailSent && function_exists('mail')) {
    try {
        $subject = 'Your UniPay OTP Code';
        $headers = "MIME-Version: 1.0\r\n"
                 . "Content-Type: text/html; charset=UTF-8\r\n"
                 . "From: UniPay <$smtpFrom>\r\n"
                 . "X-Mailer: PHP/" . phpversion();

        if (@mail($email, $subject, buildEmailHtml($otp), $headers)) {
            $emailSent = true;
            $method    = 'mail';
        }
    } catch (\Exception $e) {
        $method = 'mail_error';
    }
}

// ─── Store OTP in session ─────────────────────────────────────
session_start();
$_SESSION['unipay_otp']         = $otp;
$_SESSION['unipay_email']       = $email;
$_SESSION['unipay_otp_expires'] = time() + 600;

// ─── Response ─────────────────────────────────────────────────
if ($emailSent) {
    echo json_encode([
        'success' => true,
        'message' => 'OTP sent to ' . $email,
        'method'  => $method
    ]);
} else {
    echo json_encode([
        'success'   => false,
        'message'   => 'Email delivery unavailable — demo mode active',
        'demo_otp'  => $otp,
        'method'    => $method
    ]);
}

// ─── Helpers ──────────────────────────────────────────────────
function buildEmailHtml($otp) {
    return "
    <div style='font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #111827; border-radius: 16px; border: 1px solid rgba(124,58,237,0.2);'>
        <div style='text-align: center; margin-bottom: 24px;'>
            <div style='width: 48px; height: 48px; margin: 0 auto 12px; background: linear-gradient(135deg, #7C3AED, #22D3EE); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 22px; font-weight: 800;'>U</div>
            <h1 style='color: #E5E7EB; font-size: 20px; margin: 0;'>UniPay Verification</h1>
        </div>
        <p style='color: #9CA3AF; font-size: 14px; text-align: center; margin-bottom: 24px;'>Use the following code to complete your sign in</p>
        <div style='background: #1E293B; border-radius: 12px; padding: 24px; text-align: center; border: 1px solid rgba(124,58,237,0.15);'>
            <div style='font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #8B5CF6; font-family: monospace;'>$otp</div>
        </div>
        <p style='color: #6B7280; font-size: 12px; text-align: center; margin-top: 24px;'>This code expires in 10 minutes.</p>
        <div style='text-align: center; margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(124,58,237,0.1);'>
            <p style='color: #6B7280; font-size: 11px;'>UniPay &mdash; Smart Routing</p>
        </div>
    </div>";
}
