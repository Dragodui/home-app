const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'dist', 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error('dist/index.html not found. Run build first.');
  process.exit(1);
}

let html = fs.readFileSync(indexPath, 'utf8');

// PWA head tags to inject
const pwaHead = `
    <!-- PWA Meta Tags -->
    <link rel="manifest" href="/manifest.json" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="HomeManager" />
    <link rel="apple-touch-icon" href="/icons/icon-192.png" />
`;

// Service Worker registration script
const swScript = `
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
          navigator.serviceWorker.register('/sw.js')
            .then(function(reg) { console.log('[SW] Registered:', reg.scope); })
            .catch(function(err) { console.error('[SW] Registration failed:', err); });
        });
      }
    </script>
`;

// Inject PWA head tags before </head>
if (!html.includes('rel="manifest"')) {
  html = html.replace('</head>', pwaHead + '</head>');
}

// Inject SW script before </body>
if (!html.includes('serviceWorker.register')) {
  html = html.replace('</body>', swScript + '</body>');
}

fs.writeFileSync(indexPath, html);
console.log('✓ PWA tags injected into dist/index.html');
