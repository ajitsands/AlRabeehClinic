<?php
// API Entry Router for Al Rabeesh Dental Software
require_once __DIR__ . '/../config/database.php';

header("Content-Type: application/json; charset=UTF-8");

$route = isset($_GET['route']) ? $_GET['route'] : '';

switch ($route) {
    case 'sync':
        require_once __DIR__ . '/sync.php';
        break;
    default:
        echo json_encode([
            "system" => "Al Rabeesh Dental Specialty Center API",
            "version" => "1.0.0",
            "status" => "ACTIVE",
            "endpoints" => [
                "/api/sync.php?action=push",
                "/api/sync.php?action=pull",
                "/api/sync.php?action=status"
            ]
        ]);
        break;
}
