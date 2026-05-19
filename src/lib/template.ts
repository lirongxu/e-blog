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
  <link rel="stylesheet" href="/styles/main.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github.min.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.11/katex.min.css">
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
