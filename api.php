<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Configuración de la conexión
$host = "localhost";
$user = "root"; // Usuario por defecto en XAMPP
$pass = "";     // Contraseña por defecto vacía en XAMPP
$db   = "neuroedu_db";

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    die(json_encode(["error" => "Conexión fallida: " . $conn->connect_error]));
}

$action = $_GET['action'] ?? '';

// --- SECCIÓN PACIENTES ---
if ($action == 'guardarPaciente') {
    $data = json_decode(file_get_contents('php://input'), true);
    // Usamos INSERT ... ON DUPLICATE KEY UPDATE para que si el DNI ya existe, se actualice el nombre/mutual
    $stmt = $conn->prepare("INSERT INTO pacientes (nombre, dni, edad, mutual) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE nombre=?, edad=?, mutual=?");
    $stmt->bind_param("ssissss", $data['nombre'], $data['dni'], $data['edad'], $data['mutual'], $data['nombre'], $data['edad'], $data['mutual']);
    $stmt->execute();
    echo json_encode(["status" => "success"]);
}

if ($action == 'obtenerPacientes') {
    $result = $conn->query("SELECT * FROM pacientes ORDER BY nombre ASC");
    echo json_encode($result->fetch_all(MYSQLI_ASSOC));
}

// --- SECCIÓN TURNOS ---
if ($action == 'guardarTurno') {
    $data = json_decode(file_get_contents('php://input'), true);
    $stmt = $conn->prepare("INSERT INTO turnos (id, title, start, pIdx) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE title=?, start=?, pIdx=?");
    $stmt->bind_param("sssissi", $data['id'], $data['title'], $data['start'], $data['pIdx'], $data['title'], $data['start'], $data['pIdx']);
    $stmt->execute();
    echo json_encode(["status" => "success"]);
}

if ($action == 'obtenerTurnos') {
    $result = $conn->query("SELECT * FROM turnos");
    echo json_encode($result->fetch_all(MYSQLI_ASSOC));
}

if ($action == 'borrarTurno') {
    $id = $_GET['id'];
    $stmt = $conn->prepare("DELETE FROM turnos WHERE id = ?");
    $stmt->bind_param("s", $id);
    $stmt->execute();
    echo json_encode(["status" => "success"]);
}

// --- SECCIÓN HISTORIAL ---
if ($action == 'guardarHistorial') {
    $data = json_decode(file_get_contents('php://input'), true);
    $scoresJson = json_encode($data['scores']); // Convertimos el array de scores a texto JSON
    $stmt = $conn->prepare("INSERT INTO historial (paciente, dni, test, fecha, scores, profesional) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("ssssss", $data['paciente'], $data['dni'], $data['test'], $data['fecha'], $scoresJson, $data['profesional']);
    $stmt->execute();
    echo json_encode(["status" => "success"]);
}

if ($action == 'obtenerHistorial') {
    $result = $conn->query("SELECT * FROM historial ORDER BY id DESC");
    $rows = [];
    while($row = $result->fetch_assoc()) {
        $row['scores'] = json_decode($row['scores'], true); // Reconvertimos a array para JS
        $rows[] = $row;
    }
    echo json_encode($rows);
}

$conn->close();
?>