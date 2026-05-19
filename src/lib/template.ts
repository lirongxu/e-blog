export interface TemplateOptions {
  title: string;
  description?: string;
  content: string;
  siteTitle: string;
  siteDescription: string;
  currentPath: string;
}

const NAV_LINKS = [
  { path: '/about', label: '关于' },
  { path: '/blog', label: '博客' },
  { path: '/now', label: '近况' },
  { path: '/wall', label: '签名墙' },
];

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function pageTitle(title: string, siteTitle: string) {
  return title === siteTitle ? title : `${title} | ${siteTitle}`;
}

const CSS = `:root{--bg:#fff;--bg-secondary:#f8f9fa;--text:#333;--text-secondary:#666;--accent:#4a90d9;--accent-hover:#357abd;--border:#e0e0e0;--code-bg:#f5f5f5;--nav-bg:#fff;--footer-bg:#f8f9fa;--shadow:0 1px 3px rgba(0,0,0,.1);--radius:6px;--max-width:800px;--nav-height:56px}
[data-theme=dark]{--bg:#1a1a2e;--bg-secondary:#16213e;--text:#e0e0e0;--text-secondary:#a0a0a0;--accent:#6db3f2;--accent-hover:#5a9fd9;--border:#2a2a4a;--code-bg:#16213e;--nav-bg:#16213e;--footer-bg:#16213e;--shadow:0 1px 3px rgba(0,0,0,.3)}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif;background-color:var(--bg);color:var(--text);line-height:1.8;min-height:100vh;display:flex;flex-direction:column}
.navbar{position:fixed;top:0;left:0;right:0;height:var(--nav-height);background:var(--nav-bg);border-bottom:1px solid var(--border);box-shadow:var(--shadow);z-index:100}
.nav-container{max-width:1200px;margin:0 auto;padding:0 1.5rem;height:100%;display:flex;align-items:center;justify-content:space-between}
.nav-brand{font-size:1.25rem;font-weight:700;color:var(--text);text-decoration:none}
.nav-links{display:flex;align-items:center;gap:.25rem}
.nav-link{color:var(--text-secondary);text-decoration:none;padding:.4rem .75rem;border-radius:var(--radius);font-size:.95rem;transition:color .2s,background .2s}
.nav-link:hover,.nav-link.active{color:var(--accent);background:var(--bg-secondary)}
.nav-toggle{display:none;background:none;border:none;cursor:pointer;padding:.5rem;flex-direction:column;gap:4px}
.nav-toggle span{display:block;width:22px;height:2px;background:var(--text);border-radius:2px;transition:transform .2s}
.theme-toggle{background:none;border:1px solid var(--border);border-radius:var(--radius);cursor:pointer;font-size:1.1rem;padding:.3rem .5rem;margin-left:.25rem;line-height:1}
.theme-toggle:hover{background:var(--bg-secondary)}
.container{max-width:var(--max-width);margin:0 auto;padding:calc(var(--nav-height) + 2rem) 1.5rem 3rem;flex:1;width:100%}
h1{font-size:1.8rem;margin-bottom:1rem;line-height:1.4}
h2{font-size:1.5rem;margin:2rem 0 .75rem;line-height:1.4}
h3{font-size:1.25rem;margin:1.5rem 0 .5rem;line-height:1.4}
h4{font-size:1.1rem;margin:1.25rem 0 .5rem}
p{margin-bottom:1rem}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline;color:var(--accent-hover)}
ul,ol{margin-bottom:1rem;padding-left:1.5rem}
li{margin-bottom:.25rem}
blockquote{border-left:3px solid var(--accent);padding:.5rem 1rem;margin:1rem 0;background:var(--bg-secondary);border-radius:0 var(--radius) var(--radius) 0;color:var(--text-secondary)}
blockquote p:last-child{margin-bottom:0}
img{max-width:100%;height:auto;border-radius:var(--radius)}
hr{border:none;border-top:1px solid var(--border);margin:2rem 0}
code{font-family:"SF Mono","Fira Code","Fira Mono",Menlo,Consolas,monospace;font-size:.9em;background:var(--code-bg);padding:.15em .4em;border-radius:3px}
pre{margin:1rem 0;border-radius:var(--radius);overflow-x:auto}
pre code{display:block;padding:1rem;background:var(--code-bg);font-size:.875rem;line-height:1.6}
.post-list{list-style:none;padding:0}
.post-item{padding:1.25rem 0;border-bottom:1px solid var(--border)}
.post-item:last-child{border-bottom:none}
.post-item h2{margin:0 0 .25rem;font-size:1.25rem}
.post-item h2 a{color:var(--text);text-decoration:none}
.post-item h2 a:hover{color:var(--accent)}
.post-meta{color:var(--text-secondary);font-size:.875rem;margin-bottom:.5rem}
.post-summary{color:var(--text-secondary);margin:0}
.tag{display:inline-block;background:var(--bg-secondary);color:var(--text-secondary);padding:.15rem .5rem;border-radius:3px;font-size:.8rem;text-decoration:none;margin-right:.25rem}
.tag:hover{color:var(--accent);text-decoration:none}
.tags{margin:.5rem 0}
.post-header{margin-bottom:2rem}
.post-header h1{margin-bottom:.5rem}
.post-content{margin-bottom:3rem}
.post-content h1,.post-content h2,.post-content h3,.post-content h4,.post-content h5,.post-content h6{scroll-margin-top:calc(var(--nav-height) + 1rem)}
.post-content table{width:100%;border-collapse:collapse;margin:1rem 0}
.post-content th,.post-content td{border:1px solid var(--border);padding:.5rem .75rem;text-align:left}
.post-content th{background:var(--bg-secondary)}
.pagination{display:flex;justify-content:center;gap:.5rem;margin:2rem 0;flex-wrap:wrap}
.pagination a,.pagination span{padding:.4rem .8rem;border:1px solid var(--border);border-radius:var(--radius);font-size:.9rem;color:var(--text-secondary);text-decoration:none}
.pagination a:hover{background:var(--bg-secondary);color:var(--accent);text-decoration:none}
.pagination .current{background:var(--accent);color:#fff;border-color:var(--accent)}
.adjacent-posts{display:flex;justify-content:space-between;gap:1rem;margin:2rem 0;padding-top:1.5rem;border-top:1px solid var(--border)}
.adjacent-posts a{max-width:48%}
.adjacent-posts .label{font-size:.8rem;color:var(--text-secondary);display:block}
.bio-container{display:flex;flex-direction:column;align-items:center;gap:1.5rem;margin-bottom:2rem}
.bio-avatar{width:150px;height:150px;border-radius:50%;object-fit:cover}
@media(min-width:768px){.bio-container{flex-direction:row;align-items:flex-start}}
.guestbook-form{background:var(--bg-secondary);padding:1.5rem;border-radius:var(--radius);margin-bottom:2rem}
.form-group{margin-bottom:1rem}
.form-group label{display:block;font-size:.9rem;font-weight:600;margin-bottom:.25rem}
.form-group input,.form-group textarea{width:100%;padding:.5rem .75rem;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg);color:var(--text);font-size:.95rem;font-family:inherit}
.form-group textarea{min-height:100px;resize:vertical}
.form-group input:focus,.form-group textarea:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 2px rgba(74,144,217,.2)}
.btn{display:inline-block;padding:.5rem 1.25rem;background:var(--accent);color:#fff;border:none;border-radius:var(--radius);font-size:.95rem;cursor:pointer;text-decoration:none;transition:background .2s}
.btn:hover{background:var(--accent-hover);text-decoration:none;color:#fff}
.btn-danger{background:#dc3545}
.btn-danger:hover{background:#c82333}
.btn-sm{padding:.25rem .75rem;font-size:.85rem}
.guestbook-entry{padding:1rem 0;border-bottom:1px solid var(--border)}
.guestbook-entry:last-child{border-bottom:none}
.guestbook-entry .entry-meta{font-size:.85rem;color:var(--text-secondary);margin-bottom:.5rem}
.guestbook-entry .entry-message{margin:0}
.admin-layout{display:flex;gap:2rem;margin-top:1rem}
.admin-sidebar{min-width:180px;flex-shrink:0}
.admin-sidebar a{display:block;padding:.4rem .75rem;color:var(--text-secondary);text-decoration:none;border-radius:var(--radius);margin-bottom:.25rem}
.admin-sidebar a:hover,.admin-sidebar a.active{background:var(--bg-secondary);color:var(--accent)}
.admin-content{flex:1;min-width:0}
.admin-table{width:100%;border-collapse:collapse;font-size:.9rem}
.admin-table th,.admin-table td{padding:.5rem .75rem;border-bottom:1px solid var(--border);text-align:left}
.admin-table th{font-weight:600;background:var(--bg-secondary)}
.admin-table .actions{white-space:nowrap}
.admin-table .actions form{display:inline}
.badge{display:inline-block;padding:.1rem .5rem;border-radius:3px;font-size:.75rem;font-weight:600}
.badge-published{background:#d4edda;color:#155724}
.badge-draft{background:#fff3cd;color:#856404}
.badge-pending{background:#f8d7da;color:#721c24}
.badge-approved{background:#d4edda;color:#155724}
[data-theme=dark] .badge-published{background:#1a4d2e;color:#7fdf8f}
[data-theme=dark] .badge-draft{background:#4d3d00;color:#dfc07f}
[data-theme=dark] .badge-pending{background:#4d1a1a;color:#df7f7f}
[data-theme=dark] .badge-approved{background:#1a4d2e;color:#7fdf8f}
.login-container{max-width:360px;margin:4rem auto}
.alert{padding:.75rem 1rem;border-radius:var(--radius);margin-bottom:1rem;font-size:.9rem}
.alert-success{background:#d4edda;color:#155724;border:1px solid #c3e6cb}
.alert-error{background:#f8d7da;color:#721c24;border:1px solid #f5c6cb}
[data-theme=dark] .alert-success{background:#1a4d2e;color:#7fdf8f;border-color:#2a6d3e}
[data-theme=dark] .alert-error{background:#4d1a1a;color:#df7f7f;border-color:#6d2a2a}
.footer{border-top:1px solid var(--border);background:var(--footer-bg);padding:1.5rem;margin-top:auto}
.footer-container{max-width:1200px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;font-size:.85rem;color:var(--text-secondary)}
.footer a{color:var(--text-secondary)}
.footer a:hover{color:var(--accent)}
.timeline{position:relative;padding-left:1.5rem}
.timeline::before{content:'';position:absolute;left:0;top:0;bottom:0;width:2px;background:var(--border)}
.timeline-item{position:relative;margin-bottom:1.5rem;padding-left:1rem}
.timeline-item::before{content:'';position:absolute;left:-1.5rem;top:.6rem;width:10px;height:10px;border-radius:50%;background:var(--accent);transform:translateX(-4px)}
.timeline-date{font-size:.85rem;color:var(--text-secondary);margin-bottom:.25rem}
@media(max-width:768px){.nav-toggle{display:flex}.nav-links{display:none;position:absolute;top:var(--nav-height);left:0;right:0;background:var(--nav-bg);border-bottom:1px solid var(--border);flex-direction:column;padding:.5rem 1rem;box-shadow:var(--shadow)}.nav-links.show{display:flex}.nav-link{padding:.6rem 0}.admin-layout{flex-direction:column}.admin-sidebar{min-width:auto;display:flex;gap:.5rem;flex-wrap:wrap}.footer-container{flex-direction:column;gap:.5rem;text-align:center}.adjacent-posts{flex-direction:column}.adjacent-posts a{max-width:100%}}`;

export function renderPage(opts: TemplateOptions): string {
  const { title, description, content, siteTitle, siteDescription, currentPath } = opts;

  const navHtml = NAV_LINKS.map(link =>
    `<a href="${link.path}" class="nav-link${currentPath === link.path || currentPath.startsWith(link.path + '/') ? ' active' : ''}">${link.label}</a>`
  ).join('\n          ');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(pageTitle(title, siteTitle))}</title>
  ${description ? `<meta name="description" content="${escapeHtml(description)}">` : ''}
  <meta property="og:title" content="${escapeHtml(pageTitle(title, siteTitle))}">
  ${description ? `<meta property="og:description" content="${escapeHtml(description)}">` : ''}
  <link rel="alternate" type="application/rss+xml" title="${escapeHtml(siteTitle)}" href="/rss.xml">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github.min.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.11/katex.min.css">
  <style>${CSS}</style>
  <script>
    (function(){
      try {
        var t = localStorage.getItem('theme');
        if (t) document.documentElement.setAttribute('data-theme', t);
        else if (window.matchMedia('(prefers-color-scheme: dark)').matches)
          document.documentElement.setAttribute('data-theme', 'dark');
      } catch(e){}
    })();
  </script>
</head>
<body>
  <nav class="navbar">
    <div class="nav-container">
      <a href="/" class="nav-brand">${escapeHtml(siteTitle)}</a>
      <button class="nav-toggle" aria-label="菜单" onclick="document.querySelector('.nav-links').classList.toggle('show')">
        <span></span><span></span><span></span>
      </button>
      <div class="nav-links">
        ${navHtml}
        <a href="/rss.xml" class="nav-link" target="_blank">RSS</a>
        <button class="theme-toggle" onclick="toggleTheme()" aria-label="切换主题">🌓</button>
      </div>
    </div>
  </nav>

  <main class="container">
    ${content}
  </main>

  <footer class="footer">
    <div class="footer-container">
      <a href="/rss.xml">订阅 RSS</a>
      <span>© ${new Date().getFullYear()} ${escapeHtml(siteTitle)}</span>
    </div>
  </footer>

  <script>
    function toggleTheme() {
      var html = document.documentElement;
      var current = html.getAttribute('data-theme');
      var next = current === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch(e) {}
    }
  </script>
</body>
</html>`;
}
