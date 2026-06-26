<?php
// Page header template - call at top of every page
function pageHeader(string $title = 'Champion Sports'): void {
    ?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($title) ?> | Champion Sports</title>
    <meta name="description" content="Champion Sports - Live cricket scoring, match management, and fan portal.">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="<?= SITE_URL ?>/assets/style.css">
</head>
<body>
<div class="app-container">
<?php
}

function pageFooter(): void {
    ?>
</div><!-- /.app-container -->
<script src="<?= SITE_URL ?>/assets/app.js"></script>
</body>
</html>
<?php
}
