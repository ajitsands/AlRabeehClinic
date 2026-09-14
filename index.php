<?php
// Automatic router for Al Rabeesh Dental Software on cPanel / Apache
$distIndex = __DIR__ . '/dental-app/dist/index.html';

if (file_exists($distIndex)) {
    // Read and output compiled React SPA HTML
    header('Content-Type: text/html; charset=UTF-8');
    readfile($distIndex);
    exit();
}

http_response_code(503);
echo "<html><body style='font-family:sans-serif;text-align:center;padding:50px;'>";
echo "<h2>Al Rabeesh Dental Center</h2>";
echo "<p>Please ensure 'dental-app/dist' is compiled.</p>";
echo "</body></html>";
?>
