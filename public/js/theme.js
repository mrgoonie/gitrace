// Theme toggle functionality
function initTheme() {
  const themeToggleDesktop = document.getElementById('theme-toggle-desktop');
  const themeToggleMobile = document.getElementById('theme-toggle-mobile');

  // Function to check and apply theme
  const applyTheme = (isDark) => {
    // For Tailwind dark mode
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      document.documentElement.style.colorScheme = 'light';
    }

    // For custom CSS dark mode
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

    // Update theme icons
    const sunIcons = document.querySelectorAll('.ri-sun-line');
    const moonIcons = document.querySelectorAll('.ri-moon-line');

    sunIcons.forEach(icon => {
      icon.classList.toggle('hidden', isDark);
    });

    moonIcons.forEach(icon => {
      icon.classList.toggle('hidden', !isDark);
    });

    // Store preference
    localStorage.theme = isDark ? 'dark' : 'light';
  };

  // Function to toggle theme
  const toggleTheme = () => {
    const isDark = document.documentElement.classList.contains('dark');
    applyTheme(!isDark);
  };

  // Add click handlers to both buttons
  themeToggleDesktop?.addEventListener('click', toggleTheme);
  themeToggleMobile?.addEventListener('click', toggleTheme);

  // Initialize theme on load
  const isDark = localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
  applyTheme(isDark);

  // Initialize mobile menu
  const menuBtn = document.getElementById('menu-btn');
  const sideBar = document.getElementById('side-bar');
  const closeBtn = document.querySelector('.close-icon-menu');

  menuBtn?.addEventListener('click', () => {
    sideBar?.classList.remove('translate-x-full');
  });

  closeBtn?.addEventListener('click', () => {
    sideBar?.classList.add('translate-x-full');
  });

  // Watch for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (!('theme' in localStorage)) {
      applyTheme(e.matches);
    }
  });
}

// Initialize tooltips
function initTooltips() {
  if (window.tippy) {
    tippy('#theme-toggle-desktop', {
      content: 'Toggle theme',
      placement: 'bottom'
    });
    tippy('#theme-toggle-mobile', {
      content: 'Toggle theme',
      placement: 'bottom'
    });
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const isDark = localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.add(isDark ? 'dark' : 'light');
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  initTheme();
  // Wait a bit for Tippy to be ready
  setTimeout(initTooltips, 100);
});
