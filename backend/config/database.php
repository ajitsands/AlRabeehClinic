<?php
// Database configuration for Al Rabeesh Dental Software
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

class Database {
    // Live Server Configuration for alrabeesh.sandslab.com
    private $host = "localhost"; // Local socket on cPanel server, or "alrabeesh.sandslab.com" for remote connections
    private $db_name = "sandsl23_alrabeeh_db";
    private $username = "sandsl23_alrabeeh_user";
    private $password = "S@nds1@b";
    public $conn;

    public function getConnection() {
        $this->conn = null;
        
        // Allow environment variable overrides if provided
        $host = getenv('DB_HOST') ?: $this->host;
        $db_name = getenv('DB_NAME') ?: $this->db_name;
        $username = getenv('DB_USER') ?: $this->username;
        $password = getenv('DB_PASS') ?: $this->password;

        try {
            $this->conn = new PDO(
                "mysql:host=" . $host . ";dbname=" . $db_name . ";charset=utf8mb4",
                $username,
                $password,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                    PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
                ]
            );
        } catch(PDOException $exception) {
            // Log connection error for debugging
            error_log("Database connection error on " . $host . " / " . $db_name . ": " . $exception->getMessage());
        }
        return $this->conn;
    }
}
