// Global state for pagination
let currentPage = 1;
let totalPages = 1;
let perPage = 20;

// Handle form submission to create git profile
async function handleCreateProfile(event) {
  event.preventDefault();
  const username = document.getElementById('github-username').value;

  try {
    // Show loading state
    const submitBtn = event.target.querySelector('button[type="submit"]');
    if (!submitBtn) {
      console.error('Submit button not found');
      return;
    }

    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="ri-loader-4-line animate-spin"></i> Loading...`;

    // Create git profile
    const response = await fetch('/api/v1/git-profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username }),
    });
    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || 'Failed to create git profile');
    }

    // Refresh the leaderboard
    await loadLeaderboard(1);

    // Reset form
    event.target.reset();

    // Show success message
    showToast('success', 'Git profile created successfully!');
  } catch (error) {
    console.error('Error:', error);
    showToast('error', error.message);
  } finally {
    // Reset button state
    const submitBtn = event.target.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<i class="ri-add-line"></i> Add Profile`;
    }
  }
}

// Load leaderboard data
async function loadLeaderboard(page = 1) {
  try {
    // Get DOM elements
    const leaderboardEl = document.getElementById('leaderboard');
    const searchInput = document.getElementById('search-input');
    if (!leaderboardEl) {
      console.error('Leaderboard element not found');
      return;
    }

    // Get search query
    const searchQuery = searchInput ? searchInput.value : getSearchFromUrl();

    // Update loading state
    leaderboardEl.innerHTML = '<div class="p-4 text-center text-gray-500 dark:text-gray-400"><i class="ri-loader-4-line animate-spin text-2xl"></i></div>';

    // Get pagination elements
    const paginationInfo = document.getElementById('pagination-info');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');

    // Update pagination elements if they exist
    if (paginationInfo) paginationInfo.textContent = 'Loading...';
    if (prevBtn) prevBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = true;

    // Build URL with search query
    const url = new URL('/api/v1/git-profile', window.location.origin);
    url.searchParams.set('page', page);
    url.searchParams.set('perPage', perPage);
    if (searchQuery) {
      url.searchParams.set('q', searchQuery);
    }

    const response = await fetch(url);
    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || 'Failed to load leaderboard');
    }

    // Update pagination state from API response
    const { list: profiles, pagination } = result.data;
    currentPage = pagination.page;
    totalPages = Math.ceil(pagination.total / pagination.perPage);

    // Update total users count
    const totalUsersEl = document.getElementById('total-users');
    if (totalUsersEl) {
      totalUsersEl.textContent = `(${pagination.total} users)`;
    }

    // Sort profiles by current streak and contributions
    const sortedProfiles = profiles.sort((a, b) => {
      const aStats = a.yearlyStats[0] || { currentStreak: 0, longestStreak: 0, contributions: 0 };
      const bStats = b.yearlyStats[0] || { currentStreak: 0, longestStreak: 0, contributions: 0 };

      // First sort by current streak
      if (bStats.currentStreak !== aStats.currentStreak) {
        return bStats.currentStreak - aStats.currentStreak;
      }
      // Then by contributions
      return bStats.contributions - aStats.contributions;
    });

    // Update leaderboard HTML
    leaderboardEl.innerHTML = sortedProfiles.map((profile) => {
      const stats = profile.yearlyStats[0] || { currentStreak: 0, longestStreak: 0, contributions: 0 };
      return renderLeaderboardItem(profile, stats, profile.globalRank);
    }).join('');

    // Update pagination info and controls if they exist
    if (paginationInfo) {
      const startRank = (currentPage - 1) * perPage + 1;
      const endRank = Math.min(startRank + profiles.length - 1, pagination.total);
      paginationInfo.textContent = `${startRank}-${endRank} of ${pagination.total} contributors`;
    }
    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;

    // Store profiles data for contribution graphs
    window.profilesData = profiles.reduce((acc, profile) => {
      acc[profile.username] = profile;
      return acc;
    }, {});

    // Update URL with current page and search query
    updatePageUrl(page, searchQuery);
  } catch (error) {
    console.error('Error:', error);
    showToast('error', error.message);
  }
}

// Load contribution graph data
async function toggleContributionGraph(username) {
  const graphContainer = document.getElementById(`graph-${username}`);
  if (!graphContainer) return;

  const isHidden = graphContainer.classList.contains('hidden');
  if (isHidden) {
    graphContainer.classList.remove('hidden');

    try {
      // Get profile data from stored data
      const profile = window.profilesData[username];
      if (!profile || !profile.yearlyStats || !profile.yearlyStats[0]) {
        throw new Error('Profile data not found');
      }

      // Get the dates data and ensure it's not null
      const dates = profile.yearlyStats[0].dates;
      if (!dates) {
        throw new Error('No contribution data available');
      }

      // Render contribution graph with dates data
      renderContributionGraph(dates, `graph-container-${username}`);
    } catch (error) {
      console.error('Error:', error);
      showToast('error', error.message);

      // Hide graph container on error
      graphContainer.classList.add('hidden');
    }
  } else {
    graphContainer.classList.add('hidden');
  }
}

// Calculate color intensity based on contributions
function getColor(count) {
  if (count === 0) return 'bg-gray-100 dark:bg-gray-900';
  if (count <= 5) return 'bg-green-100 dark:bg-green-900';
  if (count <= 10) return 'bg-green-300 dark:bg-green-700';
  if (count <= 20) return 'bg-green-500 dark:bg-green-500';
  return 'bg-green-700 dark:bg-green-300';
}

// Render contribution graph
function renderContributionGraph(dailyStats, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Create a map of dates to contribution counts, filtering for current year only
  const currentYear = dayjs().year();
  const dateMap = new Map();
  Object.entries(dailyStats).forEach(([date, count]) => {
    if (dayjs(date).year() === currentYear) {
      dateMap.set(date, count);
    }
  });

  // Calculate date range (current year only)
  const endDate = dayjs();
  const startDate = dayjs().startOf('year'); // Start from beginning of current year

  // Create week columns
  const weeks = [];
  let currentWeek = {};
  let currentDate = startDate;

  // Fill in all dates until the end of the year
  const yearEndDate = dayjs().endOf('year');
  while (currentDate.isBefore(yearEndDate) || currentDate.isSame(yearEndDate, 'day')) {
    const dateStr = currentDate.format('YYYY-MM-DD');
    const dayOfWeek = currentDate.day();
    const adjustedDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert Sunday (0) to 6

    // Start a new week if it's Monday
    if (adjustedDayIndex === 0 && Object.keys(currentWeek).length > 0) {
      weeks.push(currentWeek);
      currentWeek = {};
    }

    // Add the day to the current week
    currentWeek[adjustedDayIndex] = {
      date: dateStr,
      count: dateMap.get(dateStr) || 0,
      isToday: currentDate.isSame(dayjs(), 'day'),
      isFuture: currentDate.isAfter(dayjs(), 'day')
    };

    currentDate = currentDate.add(1, 'day');
  }

  // Add the last week if it has any days
  if (Object.keys(currentWeek).length > 0) {
    weeks.push(currentWeek);
  }

  // Create the HTML for the graph
  const graphHtml = `
    <div class="flex gap-1 p-4">
      <div class="flex flex-col gap-1">
        ${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(day => `
          <div class="h-3 w-3 flex items-center justify-center text-xs text-gray-400">
            ${day}
          </div>
        `).join('')}
      </div>

      ${weeks.map(week => `
        <div class="flex flex-col gap-1">
          ${[0, 1, 2, 3, 4, 5, 6].map(dayIndex => {
    const day = week[dayIndex] || { date: '', count: 0, isToday: false, isFuture: false };
    const formattedDate = day.date ? dayjs(day.date).format('ddd, MMM D, YYYY') : '';
    const tooltipText = formattedDate ? `${formattedDate}: ${day.count} contribution${day.count !== 1 ? 's' : ''}` : '';
    const colorClass = day.isFuture ? 'bg-gray-50 dark:bg-gray-950' : getColor(day.count);
    const todayClass = day.isToday ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900' : '';
    const pastClass = day.date === '' ? 'opacity-0' : '';

    return `
              <div 
                class="w-3 h-3 rounded-sm ${colorClass} ${todayClass} ${pastClass} relative group cursor-pointer" 
                ${tooltipText ? `title="${tooltipText}"` : ''}
              >
                ${tooltipText ? `
                  <div class="hidden absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 dark:bg-gray-700">
                    ${tooltipText}
                  </div>
                ` : ''}
              </div>
            `;
  }).join('')}
        </div>
      `).join('')}
    </div>
  `;

  container.innerHTML = graphHtml;
}

function renderLeaderboardItem(profile, stats, globalRank) {
  const { username, avatar } = profile;
  const { currentStreak, longestStreak, contributions } = stats;
  const rankEmoji = globalRank === 1 ? '👑' : globalRank === 2 ? '🥈' : globalRank === 3 ? '🥉' : '';

  return `
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
      <div class="flex flex-col items-start mb-2 sm:mb-0">
        <div class="flex items-center space-x-2">
          <span class="${globalRank <= 3
      ? 'text-2xl font-semibold text-red-400 dark:text-yellow-500'
      : globalRank <= 10
        ? 'text-xl font-semibold text-gray-900 dark:text-white'
        : 'text-xl font-semibold text-gray-500'}">${rankEmoji} #${globalRank}</span>
          <a href="https://github.com/${username}" target="_blank" class="flex items-center hover:text-blue-500">
            ${avatar ? `<img src="${avatar}" alt="${username}" class="size-10 rounded-full mr-2" />` : '<i class="ri-github-fill mr-2"></i>'}
            <strong>${username}</strong>
          </a>
          <button onclick="toggleContributionGraph('${username}')" class="text-gray-500 hover:text-blue-500">
            <i class="ri-bar-chart-fill"></i>
          </button>
          <button onclick="copyUsername('${username}')" class="text-gray-500 hover:text-blue-500">
            <i class="ri-file-copy-2-fill"></i>
          </button>
        </div>
        <div class="bio mt-2 italic text-sm text-gray-700 dark:text-gray-300">
          ${renderLinksInText(profile.description)}
        </div>
      </div>
      <div class="flex flex-col gap-2">
        <div class="text-sm whitespace-nowrap">
          <span class="text-gray-500 dark:text-gray-400">🔥 Current streak:</span>
          <span class="ml-1 font-medium">${currentStreak} days</span>
        </div>
        <div class="text-sm whitespace-nowrap">
          <span class="text-gray-500 dark:text-gray-400">⚡ Longest streak:</span>
          <span class="ml-1 font-medium">${longestStreak} days</span>
        </div>
        <div class="text-sm whitespace-nowrap">
          <span class="text-gray-500 dark:text-gray-400">📊 Contributions:</span>
          <span class="ml-1 font-medium">${contributions}</span>
        </div>
      </div>
    </div>
    <div id="graph-${username}" class="hidden">
      <div class="relative w-full overflow-x-auto">
        <div id="graph-container-${username}" class="min-w-max">
          <div class="absolute inset-y-0 right-0 w-4 bg-gradient-to-l from-white dark:from-gray-800"></div>
        </div>
      </div>
    </div>
  `;
}

// Copy username to clipboard
async function copyUsername(username) {
  try {
    const currentOrigin = window.location.origin;
    const gitRankUrl = `${currentOrigin}/?q=${username}`;
    await navigator.clipboard.writeText(gitRankUrl);
    showToast('success', `Username "${username}" copied to clipboard!`);
  } catch (error) {
    console.error('Failed to copy username:', error);
    showToast('error', 'Failed to copy username');
  }
}

// Show toast message
function showToast(type, message) {
  const toast = document.getElementById('toast');
  if (!toast) {
    console.error('Toast element not found');
    return;
  }

  toast.innerHTML = `
    <div class="fixed top-[80px] right-4 px-4 py-2 rounded-lg ${type === 'error' ? 'bg-red-500' : 'bg-green-500'} text-white
      transform transition-all duration-300 ease-out translate-x-0 opacity-100
      animate-[slide-in_0.3s_ease-out]">
      ${message}
    </div>
  `;

  // Add keyframes for slide-in animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slide-in {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(style);

  // Animate out before removing
  setTimeout(() => {
    const toastEl = toast.firstElementChild;
    if (toastEl) {
      toastEl.style.transform = 'translateX(100%)';
      toastEl.style.opacity = '0';
    }
  }, 2700);

  // Remove after animation
  setTimeout(() => {
    toast.innerHTML = '';
    style.remove();
  }, 3000);
}

// Update URL with current page and search query
function updatePageUrl(page, searchQuery) {
  const url = new URL(window.location);
  url.searchParams.set('page', page);
  if (searchQuery) {
    url.searchParams.set('q', searchQuery);
  } else {
    url.searchParams.delete('q');
  }
  window.history.pushState({}, '', url);
}

// Get page from URL
function getPageFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  return parseInt(urlParams.get('page')) || 1;
}

// Get search query from URL
function getSearchFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('q') || '';
}

// Helper function to detect and render URLs as links
function renderLinksInText(text) {
  if (!text) return '';
  
  // Regular expression to match URLs and domain names
  const urlRegex = /(https?:\/\/[^\s]+)|((?!-)[A-Za-z0-9-]{1,63}(?<!-)\.)+[A-Za-z]{2,6}/g;
  
  // Replace URLs and domains with anchor tags
  return text.replace(urlRegex, (match) => {
    const url = match.startsWith('http') ? match : `https://${match}`;
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">${match}</a>`;
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Get initial page and search from URL
  const initialPage = getPageFromUrl();
  const initialSearch = getSearchFromUrl();

  // Set initial search value
  const searchInput = document.getElementById('search-input');
  if (searchInput && initialSearch) {
    searchInput.value = initialSearch;
  }

  // Add search input event listener
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', (event) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadLeaderboard(1); // Reset to first page when searching
      }, 300); // Debounce for 300ms
    });
  }

  // Load initial data
  loadLeaderboard(initialPage);

  // Handle browser back/forward buttons
  window.addEventListener('popstate', () => {
    const page = getPageFromUrl();
    const searchQuery = getSearchFromUrl();
    loadLeaderboard(page);
  });

  // Add event listeners for pagination if elements exist
  const prevBtn = document.getElementById('prev-page');
  const nextBtn = document.getElementById('next-page');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        const newPage = currentPage - 1;
        loadLeaderboard(newPage);
        updatePageUrl(newPage, getSearchFromUrl());
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (currentPage < totalPages) {
        const newPage = currentPage + 1;
        loadLeaderboard(newPage);
        updatePageUrl(newPage, getSearchFromUrl());
      }
    });
  }

  // Add form submit event listener
  const form = document.getElementById('create-profile-form');
  if (form) {
    form.addEventListener('submit', handleCreateProfile);
  }
});
