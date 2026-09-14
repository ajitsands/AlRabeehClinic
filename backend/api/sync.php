<?php
require_once __DIR__ . '/../config/database.php';

header("Content-Type: application/json; charset=UTF-8");

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
            }

            // Log sync
            $logStmt = $db->prepare("INSERT INTO sync_logs (id, client_device_id, entity_type, entity_id, action, payload) VALUES (UUID(), :device, :type, :eid, :act, :pay)");
            $logStmt->execute([
                ':device' => $deviceId,
                ':type' => $entityType,
                ':eid' => $entityId,
                ':act' => $operation,
                ':pay' => json_encode($payload)
            ]);

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
