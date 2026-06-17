<?php
// UniPay - Send OTP Email
//
// REQUIRED SETUP for real email delivery:
//   Option A — PHPMailer (recommended):
//     1. Install Composer: https://getcomposer.org
//     2. Run: composer require phpmailer/phpmailer
//     3. Update SMTP config below (lines 60-66)
//   Option B — PHP mail():
//     1. Configure your php.ini SMTP settings
//     2. That's it (less reliable, may go to spam)
//
// If NEITHER is configured, the app runs in DEMO MODE:
//   The OTP code is returned in the API response and
//   displayed directly on the login page.

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
// Update these with your real SMTP credentials for PHPMailer delivery
$smtpHost     = 'smtp.gmail.com';
$smtpPort     = 587;
$smtpUsername = 'your-email@gmail.com';
$smtpPassword = 'your-app-password';
$smtpFrom     = 'your-email@gmail.com';
$smtpFromName = 'UniPay';
// ───────────────────────────────────────────────────────────────────

$emailSent = false;
$method    = 'none';

// ─── ATTEMPT 1: PHPMailer (via Composer) ─────────────────────────
$autoloadPath = __DIR__ . '/vendor/autoload.php';
if (file_exists($autoloadPath)) {
    try {
        require_once $autoloadPath;

        use PHPMailer\PHPMailer\PHPMailer;

        $mail = new PHPMailer(true);
        $mail->isSMTP();
        $mail->SMTPAuth   = true;
        $mail->Host       = $smtpHost;
        $mail->Port       = $smtpPort;
        $mail->Username   = $smtpUsername;
        $mail->Password   = $smtpPassword;
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;

        $mail->setFrom($smtpFrom, $smtpFromName);
        $mail->addAddress($email);
        $mail->isHTML(true);

        $mail->Subject = 'Your UniPay OTP Code';
        $mail->Body    = buildEmailHtml($otp);
        $mail->AltBody = "Your UniPay OTP code is: $otp\n\nThis code expires in 10 minutes.";

        $mail->send();
        $emailSent = true;
        $method    = 'phpmailer';
    } catch (Exception $e) {
        $method = 'phpmailer_failed';
    }
}

// ─── ATTEMPT 2: PHP built-in mail() ─────────────────────────────
if (!$emailSent && function_exists('mail')) {
    try {
        $subject = 'Your UniPay OTP Code';
        $headers = "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
        $headers .= "From: UniPay <$smtpFrom>\r\n";
        $headers .= "X-Mailer: PHP/" . phpversion();

        $body = buildEmailHtml($otp);

        if (@mail($email, $subject, $body, $headers)) {
            $emailSent = true;
            $method    = 'mail';
        }
    } catch (Exception $e) {
        $method = 'mail_failed';
    }
}

// ─── STORE OTP IN SESSION (used by verify-otp.php) ─────────────
session_start();
$_SESSION['unipay_otp']          = $otp;
$_SESSION['unipay_email']        = $email;
$_SESSION['unipay_otp_expires']  = time() + 600; // 10 minutes

// ─── RESPONSE ────────────────────────────────────────────────────
if ($emailSent) {
    echo json_encode([
        'success' => true,
        'message' => 'OTP sent to ' . $email,
        'method'  => $method
    ]);
} else {
    // Return the OTP in the response so the frontend can display it
    echo json_encode([
        'success'   => false,
        'message'   => 'Email delivery unavailable — demo mode active',
        'demo_otp'  => $otp,
        'method'    => $method
    ]);
}

// ─── HELPERS ─────────────────────────────────────────────────────
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
        <p style='color: #6B7280; font-size: 12px; text-align: center; margin-top: 24px;'>This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
        <div style='text-align: center; margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(124,58,237,0.1);'>
            <p style='color: #6B7280; font-size: 11px;'>UniPay &mdash; Smart Routing Architecture</p>
        </div>
    </div>";
}
