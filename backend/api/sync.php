<?php
// CORS Headers for multi-origin & local development support
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Origin, Accept");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../config/database.php';

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    echo json_encode([
        "success" => false,
        "message" => "Database offline. Operating in local storage mode."
    ]);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : 'status';

if ($method === 'POST' && $action === 'push') {
    // Process batch sync from offline Outbox
    $input = json_decode(file_get_contents("php://input"), true);
    $items = isset($input['items']) ? $input['items'] : [];
    $deviceId = isset($input['deviceId']) ? $input['deviceId'] : 'UNKNOWN_CLIENT';

    $results = [
        'processed' => 0,
        'failed' => 0,
        'syncedIds' => [],
        'errors' => []
    ];

    // Temporarily relax foreign key checks during batch sync to prevent out-of-order dependency rejections
    try {
        $db->exec("SET FOREIGN_KEY_CHECKS=0;");
    } catch (Exception $e) {}

    foreach ($items as $item) {
        $entityType = $item['entityType'];
        $entityId = $item['entityId'];
        $operation = $item['operation']; // INSERT, UPDATE, DELETE
        $payload = $item['payload'];

        try {
            if ($entityType === 'patients') {
                if ($operation === 'INSERT' || $operation === 'UPDATE') {
                    $stmt = $db->prepare("
                        INSERT INTO patients (id, file_number, cpr_number, full_name_en, full_name_ar, phone, email, dob, gender, nationality, blood_group, address, photo_base64, allergies, medical_alerts, source, updated_at)
                        VALUES (:id, :file_number, :cpr_number, :full_name_en, :full_name_ar, :phone, :email, :dob, :gender, :nationality, :blood_group, :address, :photo_base64, :allergies, :medical_alerts, :source, NOW())
                        ON DUPLICATE KEY UPDATE
                            full_name_en = VALUES(full_name_en),
                            full_name_ar = VALUES(full_name_ar),
                            phone = VALUES(phone),
                            email = VALUES(email),
                            address = VALUES(address),
                            photo_base64 = VALUES(photo_base64),
                            allergies = VALUES(allergies),
                            medical_alerts = VALUES(medical_alerts),
                            updated_at = NOW()
                    ");
                    $stmt->execute([
                        ':id' => $payload['id'],
                        ':file_number' => $payload['file_number'],
                        ':cpr_number' => $payload['cpr_number'] ?? null,
                        ':full_name_en' => $payload['full_name_en'],
                        ':full_name_ar' => $payload['full_name_ar'] ?? null,
                        ':phone' => $payload['phone'],
                        ':email' => $payload['email'] ?? null,
                        ':dob' => !empty($payload['dob']) ? $payload['dob'] : null,
                        ':gender' => $payload['gender'] ?? 'MALE',
                        ':nationality' => $payload['nationality'] ?? null,
                        ':blood_group' => $payload['blood_group'] ?? null,
                        ':address' => $payload['address'] ?? null,
                        ':photo_base64' => $payload['photo_base64'] ?? null,
                        ':allergies' => $payload['allergies'] ?? null,
                        ':medical_alerts' => $payload['medical_alerts'] ?? null,
                        ':source' => $payload['source'] ?? 'CARD_READER'
                    ]);
                }
            } elseif ($entityType === 'appointments') {
                if ($operation === 'INSERT' || $operation === 'UPDATE') {
                    $stmt = $db->prepare("
                        INSERT INTO appointments (id, patient_id, doctor_id, service_id, appointment_date, start_time, end_time, slot_count, duration_mins, status, chief_complaint, notes, estimated_fee, updated_at)
                        VALUES (:id, :patient_id, :doctor_id, :service_id, :appointment_date, :start_time, :end_time, :slot_count, :duration_mins, :status, :chief_complaint, :notes, :estimated_fee, NOW())
                        ON DUPLICATE KEY UPDATE
                            appointment_date = VALUES(appointment_date),
                            start_time = VALUES(start_time),
                            end_time = VALUES(end_time),
                            slot_count = VALUES(slot_count),
                            duration_mins = VALUES(duration_mins),
                            status = VALUES(status),
                            chief_complaint = VALUES(chief_complaint),
                            notes = VALUES(notes),
                            estimated_fee = VALUES(estimated_fee),
                            updated_at = NOW()
                    ");
                    $stmt->execute([
                        ':id' => $payload['id'],
                        ':patient_id' => $payload['patient_id'],
                        ':doctor_id' => $payload['doctor_id'],
                        ':service_id' => $payload['service_id'] ?? null,
                        ':appointment_date' => $payload['appointment_date'],
                        ':start_time' => $payload['start_time'],
                        ':end_time' => $payload['end_time'],
                        ':slot_count' => $payload['slot_count'] ?? 1,
                        ':duration_mins' => $payload['duration_mins'] ?? 30,
                        ':status' => $payload['status'] ?? 'SCHEDULED',
                        ':chief_complaint' => $payload['chief_complaint'] ?? null,
                        ':notes' => $payload['notes'] ?? null,
                        ':estimated_fee' => $payload['estimated_fee'] ?? 0.000
                    ]);
                }
            } elseif ($entityType === 'vitals') {
                if ($operation === 'INSERT') {
                    $stmt = $db->prepare("
                        INSERT INTO patient_vitals (id, patient_id, bp_systolic, bp_diastolic, pulse_bpm, temperature_c, spo2_percent, blood_sugar_mg, weight_kg, pain_scale, clinical_notes)
                        VALUES (:id, :patient_id, :bp_systolic, :bp_diastolic, :pulse_bpm, :temperature_c, :spo2_percent, :blood_sugar_mg, :weight_kg, :pain_scale, :clinical_notes)
                    ");
                    $stmt->execute([
                        ':id' => $payload['id'],
                        ':patient_id' => $payload['patient_id'],
                        ':bp_systolic' => $payload['bp_systolic'] ?? null,
                        ':bp_diastolic' => $payload['bp_diastolic'] ?? null,
                        ':pulse_bpm' => $payload['pulse_bpm'] ?? null,
                        ':temperature_c' => $payload['temperature_c'] ?? null,
                        ':spo2_percent' => $payload['spo2_percent'] ?? null,
                        ':blood_sugar_mg' => $payload['blood_sugar_mg'] ?? null,
                        ':weight_kg' => $payload['weight_kg'] ?? null,
                        ':pain_scale' => $payload['pain_scale'] ?? 0,
                        ':clinical_notes' => $payload['clinical_notes'] ?? null
                    ]);
                }
            } elseif ($entityType === 'attachments') {
                if ($operation === 'INSERT') {
                    $stmt = $db->prepare("
                        INSERT INTO patient_attachments (id, patient_id, appointment_id, file_name, original_name, category, file_size_bytes, mime_type, file_path, file_data_base64, notes)
                        VALUES (:id, :patient_id, :appointment_id, :file_name, :original_name, :category, :file_size_bytes, :mime_type, :file_path, :file_data_base64, :notes)
                    ");
                    $stmt->execute([
                        ':id' => $payload['id'],
                        ':patient_id' => $payload['patient_id'],
                        ':appointment_id' => $payload['appointment_id'] ?? null,
                        ':file_name' => $payload['file_name'],
                        ':original_name' => $payload['original_name'],
                        ':category' => $payload['category'] ?? 'XRAY_OPG',
                        ':file_size_bytes' => $payload['file_size_bytes'] ?? 0,
                        ':mime_type' => $payload['mime_type'] ?? 'application/octet-stream',
                        ':file_path' => $payload['file_path'] ?? '',
                        ':file_data_base64' => $payload['file_data_base64'] ?? null,
                        ':notes' => $payload['notes'] ?? null
                    ]);
                }
            } elseif ($entityType === 'doctors') {
                if ($operation === 'INSERT' || $operation === 'UPDATE') {
                    $stmt = $db->prepare("
                        INSERT INTO doctors (id, name, specialty, qualification, room_number, chair_number, phone, email, photo_url, color_tag, start_time, end_time, slot_duration_mins, is_active, updated_at)
                        VALUES (:id, :name, :specialty, :qualification, :room_number, :chair_number, :phone, :email, :photo_url, :color_tag, :start_time, :end_time, :slot_duration_mins, :is_active, NOW())
                        ON DUPLICATE KEY UPDATE
                            name = VALUES(name),
                            specialty = VALUES(specialty),
                            qualification = VALUES(qualification),
                            room_number = VALUES(room_number),
                            chair_number = VALUES(chair_number),
                            phone = VALUES(phone),
                            email = VALUES(email),
                            photo_url = VALUES(photo_url),
                            color_tag = VALUES(color_tag),
                            start_time = VALUES(start_time),
                            end_time = VALUES(end_time),
                            slot_duration_mins = VALUES(slot_duration_mins),
                            is_active = VALUES(is_active),
                            updated_at = NOW()
                    ");
                    $stmt->execute([
                        ':id' => $payload['id'],
                        ':name' => $payload['name'],
                        ':specialty' => $payload['specialty'] ?? 'General Dental Surgeon',
                        ':qualification' => $payload['qualification'] ?? 'BDS',
                        ':room_number' => $payload['room_number'] ?? 'Room 1',
                        ':chair_number' => $payload['chair_number'] ?? 'Chair 1',
                        ':phone' => $payload['phone'] ?? null,
                        ':email' => $payload['email'] ?? null,
                        ':photo_url' => $payload['photo_url'] ?? null,
                        ':color_tag' => $payload['color_tag'] ?? '#3B82F6',
                        ':start_time' => $payload['start_time'] ?? '09:00',
                        ':end_time' => $payload['end_time'] ?? '17:00',
                        ':slot_duration_mins' => $payload['slot_duration_mins'] ?? 30,
                        ':is_active' => isset($payload['is_active']) ? ($payload['is_active'] ? 1 : 0) : 1
                    ]);
                }
            } elseif ($entityType === 'services') {
                if ($operation === 'INSERT' || $operation === 'UPDATE') {
                    $stmt = $db->prepare("
                        INSERT INTO dental_services (id, name, category, default_duration_mins, required_slots, price, description, is_active, updated_at)
                        VALUES (:id, :name, :category, :default_duration_mins, :required_slots, :price, :description, :is_active, NOW())
                        ON DUPLICATE KEY UPDATE
                            name = VALUES(name),
                            category = VALUES(category),
                            default_duration_mins = VALUES(default_duration_mins),
                            required_slots = VALUES(required_slots),
                            price = VALUES(price),
                            description = VALUES(description),
                            is_active = VALUES(is_active),
                            updated_at = NOW()
                    ");
                    $stmt->execute([
                        ':id' => $payload['id'],
                        ':name' => $payload['name'],
                        ':category' => $payload['category'] ?? 'General',
                        ':default_duration_mins' => $payload['default_duration_mins'] ?? 30,
                        ':required_slots' => $payload['required_slots'] ?? 1,
                        ':price' => $payload['price'] ?? 0.000,
                        ':description' => $payload['description'] ?? null,
                        ':is_active' => isset($payload['is_active']) ? ($payload['is_active'] ? 1 : 0) : 1
                    ]);
                }
            } elseif ($entityType === 'settings') {
                if ($operation === 'INSERT' || $operation === 'UPDATE') {
                    $stmt = $db->prepare("
                        INSERT INTO system_settings (id, clinic_name, theme, timezone, date_format, currency_code, currency_symbol, currency_decimals, reader_ws_url, reader_rest_url, updated_at)
                        VALUES (:id, :clinic_name, :theme, :timezone, :date_format, :currency_code, :currency_symbol, :currency_decimals, :reader_ws_url, :reader_rest_url, NOW())
                        ON DUPLICATE KEY UPDATE
                            clinic_name = VALUES(clinic_name),
                            theme = VALUES(theme),
                            timezone = VALUES(timezone),
                            date_format = VALUES(date_format),
                            currency_code = VALUES(currency_code),
                            currency_symbol = VALUES(currency_symbol),
                            currency_decimals = VALUES(currency_decimals),
                            reader_ws_url = VALUES(reader_ws_url),
                            reader_rest_url = VALUES(reader_rest_url),
                            updated_at = NOW()
                    ");
                    $stmt->execute([
                        ':id' => $payload['id'] ?? 'clinic_settings',
                        ':clinic_name' => $payload['clinic_name'] ?? 'Al Rabeesh Dental Specialty Center',
                        ':theme' => $payload['theme'] ?? 'light',
                        ':timezone' => $payload['timezone'] ?? 'Asia/Bahrain',
                        ':date_format' => $payload['date_format'] ?? 'DD/MM/YYYY',
                        ':currency_code' => $payload['currency_code'] ?? 'BHD',
                        ':currency_symbol' => $payload['currency_symbol'] ?? 'BD',
                        ':currency_decimals' => $payload['currency_decimals'] ?? 3,
                        ':reader_ws_url' => $payload['reader_ws_url'] ?? 'ws://localhost:5060/SCardRead',
                        ':reader_rest_url' => $payload['reader_rest_url'] ?? 'http://localhost:5050/api/operation/ReadCard'
                    ]);
                }
            }

            // Log sync safely
            try {
                $logStmt = $db->prepare("INSERT INTO sync_logs (id, client_device_id, entity_type, entity_id, action, payload) VALUES (UUID(), :device, :type, :eid, :act, :pay)");
                $logStmt->execute([
                    ':device' => $deviceId,
                    ':type' => $entityType,
                    ':eid' => $entityId,
                    ':act' => $operation,
                    ':pay' => json_encode($payload)
                ]);
            } catch (Exception $logErr) {
                // Ignore log table errors so main record sync succeeds
            }

            $results['processed']++;
            $results['syncedIds'][] = $item['id'];
        } catch (Exception $e) {
            $results['failed']++;
            $results['errors'][] = [
                'itemId' => $item['id'],
                'message' => $e->getMessage()
            ];
        }
    }

    echo json_encode([
        'success' => true,
        'results' => $results
    ]);
    exit();
}

if ($method === 'GET' && $action === 'pull') {
    // Pull changes from MySQL to client
    $since = isset($_GET['since']) ? $_GET['since'] : '1970-01-01 00:00:00';

    $patients = $db->query("SELECT * FROM patients WHERE updated_at >= '$since'")->fetchAll();
    $appointments = $db->query("SELECT * FROM appointments WHERE updated_at >= '$since'")->fetchAll();
    $doctors = $db->query("SELECT * FROM doctors WHERE updated_at >= '$since'")->fetchAll();
    $services = $db->query("SELECT * FROM dental_services WHERE updated_at >= '$since'")->fetchAll();

    echo json_encode([
        'success' => true,
        'serverTime' => date('Y-m-d H:i:s'),
        'data' => [
            'patients' => $patients,
            'appointments' => $appointments,
            'doctors' => $doctors,
            'services' => $services
        ]
    ]);
    exit();
}

// Health check status
echo json_encode([
    'success' => true,
    'status' => 'ONLINE',
    'timestamp' => date('Y-m-d H:i:s'),
    'database' => 'CONNECTED'
]);
