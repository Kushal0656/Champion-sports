<?php
require_once __DIR__ . '/../includes/auth.php';
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;

switch ($method) {
    case 'GET':
        $matchId = $_GET['matchId'] ?? null;
        if ($id) {
            $stmt = $db->prepare("SELECT * FROM overlay_slides WHERE id=?");
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if (isset($_GET['image']) && $row['image_path'] && file_exists(UPLOAD_DIR.'slides/'.$row['image_path'])) {
                $ext = strtolower(pathinfo($row['image_path'], PATHINFO_EXTENSION));
                header('Content-Type: image/'.($ext==='jpg'?'jpeg':$ext));
                readfile(UPLOAD_DIR.'slides/'.$row['image_path']); exit;
            }
            jsonResponse($row ? formatSlide($row) : ['error'=>'Not found']);
        } elseif (isset($_GET['active'])) {
            $stmt = $db->query("SELECT * FROM overlay_slides WHERE active=1 LIMIT 1");
            $row = $stmt->fetch();
            jsonResponse($row ? formatSlide($row) : null);
        } elseif ($matchId) {
            $stmt = $db->prepare("SELECT * FROM overlay_slides WHERE match_id=? ORDER BY id");
            $stmt->execute([$matchId]);
            jsonResponse(array_map('formatSlide',$stmt->fetchAll()));
        } else {
            $rows = $db->query("SELECT * FROM overlay_slides ORDER BY id DESC")->fetchAll();
            jsonResponse(array_map('formatSlide',$rows));
        }
        break;

    case 'POST':
        $action = $_GET['action'] ?? null;
        if ($action === 'layout') {
            $layout = $_POST['layout'] ?? getInput()['layout'] ?? '';
            $db->prepare("UPDATE overlay_slides SET overlay_layout=? WHERE id=?")->execute([$layout, $id]);
            $stmt2 = $db->prepare("SELECT * FROM overlay_slides WHERE id=?");
            $stmt2->execute([$id]);
            jsonResponse(formatSlide($stmt2->fetch()));
        } elseif ($action === 'canvas-layout') {
            $layout = $_POST['layout'] ?? getInput()['layout'] ?? '';
            $db->prepare("UPDATE overlay_slides SET canvas_layout=? WHERE id=?")->execute([$layout, $id]);
            $stmt2 = $db->prepare("SELECT * FROM overlay_slides WHERE id=?");
            $stmt2->execute([$id]);
            jsonResponse(formatSlide($stmt2->fetch()));
        } elseif ($action === 'activate') {
            $w = (int)($_POST['width'] ?? $_GET['width'] ?? getInput()['width'] ?? 800);
            $h = (int)($_POST['height'] ?? $_GET['height'] ?? getInput()['height'] ?? 450);
            $db->query("UPDATE overlay_slides SET active=0");
            $db->prepare("UPDATE overlay_slides SET active=1,width=?,height=? WHERE id=?")->execute([$w, $h, $id]);
            $stmt2 = $db->prepare("SELECT * FROM overlay_slides WHERE id=?");
            $stmt2->execute([$id]);
            jsonResponse(formatSlide($stmt2->fetch()));
        } elseif ($action === 'deactivate-all') {
            $db->query("UPDATE overlay_slides SET active=0");
            jsonResponse(['success' => true, 'message' => 'All slides deactivated']);
        } else {
            // Standard create
            $title = $_POST['title'] ?? getInput()['title'] ?? '';
            $width = (int)($_POST['width'] ?? getInput()['width'] ?? 800);
            $height = (int)($_POST['height'] ?? getInput()['height'] ?? 450);
            $matchId = $_POST['matchId'] ?? getInput()['matchId'] ?? null;
            $imagePath = null;
            $fileKey = isset($_FILES['file']) ? 'file' : 'image';
            if (!empty($_FILES[$fileKey]['tmp_name'])) {
                $ext = pathinfo($_FILES[$fileKey]['name'], PATHINFO_EXTENSION);
                $imagePath = uniqid().'.'.$ext;
                if (!file_exists(UPLOAD_DIR.'slides/')) {
                    mkdir(UPLOAD_DIR.'slides/', 0777, true);
                }
                move_uploaded_file($_FILES[$fileKey]['tmp_name'], UPLOAD_DIR.'slides/'.$imagePath);
            }
            $stmt = $db->prepare("INSERT INTO overlay_slides (title,image_path,width,height,match_id) VALUES (?,?,?,?,?)");
            $stmt->execute([$title,$imagePath,$width,$height,$matchId?:(null)]);
            $newId = $db->lastInsertId();
            $stmt2 = $db->prepare("SELECT * FROM overlay_slides WHERE id=?");
            $stmt2->execute([$newId]);
            jsonResponse(formatSlide($stmt2->fetch()));
        }
        break;

    case 'PUT':
        if (!$id) jsonResponse(['error'=>'ID required'],400);
        $action = $_GET['action'] ?? null;
        if ($action === 'activate') {
            $w = (int)($_GET['width'] ?? $_GET['w'] ?? getInput()['width'] ?? 800);
            $h = (int)($_GET['height'] ?? $_GET['h'] ?? getInput()['height'] ?? 450);
            $db->query("UPDATE overlay_slides SET active=0");
            $db->prepare("UPDATE overlay_slides SET active=1,width=?,height=? WHERE id=?")->execute([$w,$h,$id]);
        } elseif ($action === 'deactivate-all') {
            $db->query("UPDATE overlay_slides SET active=0");
        } elseif ($action === 'layout') {
            $layout = file_get_contents('php://input');
            if (empty($layout)) $layout = getInput()['layout'] ?? '';
            $db->prepare("UPDATE overlay_slides SET overlay_layout=? WHERE id=?")->execute([$layout,$id]);
        } elseif ($action === 'canvas-layout') {
            $layout = file_get_contents('php://input');
            if (empty($layout)) $layout = getInput()['layout'] ?? '';
            $db->prepare("UPDATE overlay_slides SET canvas_layout=? WHERE id=?")->execute([$layout,$id]);
        } elseif ($action === 'title') {
            $d = getInput();
            $stmt = $db->prepare("UPDATE overlay_slides SET title=?,width=?,height=?,match_id=? WHERE id=?");
            $stmt->execute([$d['title']??'',(int)($d['width']??800),(int)($d['height']??450),$d['matchId']??null,$id]);
        } else {
            // Full update: could contain multipart file upload
            $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
            if (strpos($contentType, 'multipart/form-data') !== false) {
                $put = parseMultipartPut();
                $d = $put['data'];
                $files = $put['files'];
            } else {
                $d = getInput();
                $files = [];
            }
            
            $title = $d['title'] ?? '';
            $width = (int)($d['width'] ?? 800);
            $height = (int)($d['height'] ?? 450);
            $matchId = $d['matchId'] ?? null;
            
            $imagePath = null;
            $fileKey = isset($files['file']) ? 'file' : (isset($files['image']) ? 'image' : null);
            if ($fileKey && !empty($files[$fileKey]['tmp_name'])) {
                $oldStmt = $db->prepare("SELECT image_path FROM overlay_slides WHERE id=?");
                $oldStmt->execute([$id]);
                $old = $oldStmt->fetch();
                if ($old && $old['image_path'] && file_exists(UPLOAD_DIR.'slides/'.$old['image_path'])) {
                    unlink(UPLOAD_DIR.'slides/'.$old['image_path']);
                }
                
                $ext = pathinfo($files[$fileKey]['name'], PATHINFO_EXTENSION);
                $imagePath = uniqid().'.'.$ext;
                if (!file_exists(UPLOAD_DIR.'slides/')) {
                    mkdir(UPLOAD_DIR.'slides/', 0777, true);
                }
                move_uploaded_file($files[$fileKey]['tmp_name'], UPLOAD_DIR.'slides/'.$imagePath);
                
                $stmt = $db->prepare("UPDATE overlay_slides SET title=?,width=?,height=?,match_id=?,image_path=? WHERE id=?");
                $stmt->execute([$title,$width,$height,$matchId?:(null),$imagePath,$id]);
            } else {
                $stmt = $db->prepare("UPDATE overlay_slides SET title=?,width=?,height=?,match_id=? WHERE id=?");
                $stmt->execute([$title,$width,$height,$matchId?:(null),$id]);
            }
        }
        $stmt2 = $db->prepare("SELECT * FROM overlay_slides WHERE id=?");
        $stmt2->execute([$id]);
        jsonResponse(formatSlide($stmt2->fetch()));
        break;

    case 'DELETE':
        if (!$id) jsonResponse(['error'=>'ID required'],400);
        $stmt = $db->prepare("SELECT image_path FROM overlay_slides WHERE id=?");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if ($row && $row['image_path'] && file_exists(UPLOAD_DIR.'slides/'.$row['image_path'])) {
            unlink(UPLOAD_DIR.'slides/'.$row['image_path']);
        }
        $db->prepare("DELETE FROM overlay_slides WHERE id=?")->execute([$id]);
        jsonResponse(['success'=>true]);
        break;
}

function formatSlide(array $r): array {
    return [
        'id'            => (int)$r['id'],
        'title'         => $r['title'],
        'imageUrl'      => $r['image_path'] ? UPLOAD_URL.'slides/'.$r['image_path'] : null,
        'width'         => (int)$r['width'],
        'height'        => (int)$r['height'],
        'active'        => (bool)$r['active'],
        'overlayLayout' => $r['overlay_layout'],
        'canvasLayout'  => $r['canvas_layout'] ?? null,
        'matchId'       => $r['match_id'] ? (int)$r['match_id'] : null,
    ];
}
