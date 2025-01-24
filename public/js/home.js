// Global state for pagination
let currentPage = 1;
let totalPages = 1;
let perPage = 50;

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
    if (!leaderboardEl) {
      console.error('Leaderboard element not found');
      return;
    }

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

    const response = await fetch(`/api/v1/git-profile?page=${page}&perPage=${perPage}`);
    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || 'Failed to load leaderboard');
    }

    // Update pagination state from API response
    const { list: profiles, pagination } = result.data;
    currentPage = pagination.page;
    totalPages = Math.ceil(pagination.total / pagination.perPage);

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
    leaderboardEl.innerHTML = sortedProfiles.map((profile, index) => {
      const stats = profile.yearlyStats[0] || { currentStreak: 0, longestStreak: 0, contributions: 0 };
      const globalRank = (currentPage - 1) * perPage + index + 1;

      return renderLeaderboardItem(profile, stats, globalRank);
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

      // Render contribution graph with dates data
      renderContributionGraph(profile.yearlyStats[0].dates, `graph-container-${username}`);
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

// dailyStats = {
//   "2025-01-01": 2,
//   "2025-01-02": 25,
//   "2025-01-03": 1,
//   "2025-01-04": 2,
//   "2025-01-05": 9,
//   "2025-01-06": 1,
//   "2025-01-07": 1,
//   "2025-01-08": 6,
//   ...
// }
function renderContributionGraph(dailyStats, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Calculate color intensity based on contributions
  const getColor = (count) => {
    if (count === 0) return 'bg-gray-100 dark:bg-gray-800';
    if (count <= 5) return 'bg-green-100 dark:bg-green-900';
    if (count <= 10) return 'bg-green-300 dark:bg-green-700';
    if (count <= 20) return 'bg-green-500 dark:bg-green-500';
    return 'bg-green-700 dark:bg-green-300';
  };

  // Process daily stats object and sort by date
  const sortedDates = Object.entries(dailyStats)
    .sort(([dateA], [dateB]) => dayjs(dateA).diff(dayjs(dateB)))
    .reduce((acc, [date, count]) => {
      acc[date] = count;
      return acc;
    }, {});

  // Create week columns
  const weeks = [];
  let currentWeek = {};

  // Find the start date (should be the earliest date in the data)
  const startDate = dayjs(Object.keys(sortedDates)[0]);
  const endDate = dayjs(Object.keys(sortedDates)[Object.keys(sortedDates).length - 1]);
  const currentYear = dayjs().year();
  let currentDate = startDate;

  // Fill in the days before the start date to complete the first week
  const firstDayOfWeek = startDate.day();
  if (firstDayOfWeek !== 1) { // If not Monday
    const daysToFill = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    let fillDate = startDate.subtract(daysToFill, 'day');
    for (let i = 0; i < daysToFill; i++) {
      const dayIndex = fillDate.day();
      const adjustedDayIndex = dayIndex === 0 ? 6 : dayIndex - 1;
      currentWeek[adjustedDayIndex] = {
        date: fillDate.format('YYYY-MM-DD'),
        count: 0,
        isToday: false,
        isFuture: false,
        hidden: fillDate.year() !== currentYear
      };
      fillDate = fillDate.add(1, 'day');
    }
  }

  while (currentDate.isBefore(endDate) || currentDate.isSame(endDate, 'day')) {
    const dateStr = currentDate.format('YYYY-MM-DD');
    const dayOfWeek = currentDate.day();
    const adjustedDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const isToday = currentDate.isSame(dayjs(), 'day');
    const isFuture = currentDate.isAfter(dayjs(), 'day');

    if (adjustedDayIndex === 0 && Object.keys(currentWeek).length > 0) {
      weeks.push(currentWeek);
      currentWeek = {};
    }

    currentWeek[adjustedDayIndex] = {
      date: dateStr,
      count: sortedDates[dateStr] || 0,
      isToday,
      isFuture,
      hidden: currentDate.year() !== currentYear
    };

    currentDate = currentDate.add(1, 'day');
  }

  // Fill in remaining days of the last week if needed
  const lastDayIndex = (currentDate.day() + 6) % 7;
  if (lastDayIndex !== 0) {
    for (let i = lastDayIndex; i < 7; i++) {
      currentWeek[i] = {
        date: currentDate.format('YYYY-MM-DD'),
        count: 0,
        isToday: false,
        isFuture: false,
        hidden: currentDate.year() !== currentYear
      };
      currentDate = currentDate.add(1, 'day');
    }
  }

  if (Object.keys(currentWeek).length > 0) {
    weeks.push(currentWeek);
  }

  // Create week columns
  const graphHtml = `
    <div class="flex gap-1 p-4 overflow-auto">
      <div class="flex flex-col gap-1">
        ${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => `
          <div class="h-3 w-3 flex items-center justify-center text-xs text-gray-400">
            ${day}
          </div>
        `).join('')}
      </div>

      ${weeks.map(week => `
        <div class="flex flex-col gap-1">
          ${[0, 1, 2, 3, 4, 5, 6].map(dayIndex => {
    const day = week[dayIndex] || { date: '', count: 0, isToday: false, isFuture: false, hidden: true };
    const formattedDate = day.date ? dayjs(day.date).format('ddd, MMM D, YYYY') : '';
    const tooltipText = formattedDate && !day.hidden ? `${formattedDate}: ${day.count} contribution${day.count !== 1 ? 's' : ''}` : '';
    const colorClass = day.hidden ? 'invisible' : (day.isFuture ? 'bg-gray-50 dark:bg-gray-950' : getColor(day.count));
    const todayClass = day.isToday ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900' : '';
    return `
              <div 
                class="w-3 h-3 rounded-sm ${colorClass} ${todayClass} relative group cursor-pointer" 
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
  const rankEmoji = globalRank === 1 ? '👑' : globalRank === 2 ? '🥈' : globalRank === 3 ? '🥉' : '';

  return `
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
      <div class="flex items-center space-x-4 mb-2 sm:mb-0">
        <span class="${globalRank <= 3 ? 'text-2xl' : 'text-xl'} font-semibold ${globalRank <= 3 ? 'text-red-400 dark:text-yellow-500' : 'text-gray-500'}">${globalRank <= 3 ? rankEmoji : ''} #${globalRank}</span>
        <a href="https://github.com/${profile.username}" target="_blank" class="flex items-center hover:text-blue-500">
          ${profile.avatar ? `<img src="${profile.avatar}" alt="${profile.username}" class="w-6 h-6 rounded-full mr-2" />` : '<i class="ri-github-fill mr-2"></i>'}
          <strong>${profile.username}</strong>
        </a>
        <button onclick="toggleContributionGraph('${profile.username}')" class="text-gray-500 hover:text-blue-500">
          <i class="ri-bar-chart-fill"></i>
        </button>
      </div>
      <div class="flex flex-col gap-2 sm:flex-row sm:gap-4 sm:flex-wrap">
        <div class="text-sm whitespace-nowrap">
          <span class="text-gray-500 dark:text-gray-400">🔥 Current streak:</span>
          <span class="ml-1 font-medium">${stats.currentStreak} days</span>
        </div>
        <div class="text-sm whitespace-nowrap">
          <span class="text-gray-500 dark:text-gray-400">⚡ Longest streak:</span>
          <span class="ml-1 font-medium">${stats.longestStreak} days</span>
        </div>
        <div class="text-sm whitespace-nowrap">
          <span class="text-gray-500 dark:text-gray-400">📊 Contributions:</span>
          <span class="ml-1 font-medium">${stats.contributions}</span>
        </div>
      </div>
    </div>
    <div id="graph-${profile.username}" class="hidden">
      <div id="graph-container-${profile.username}"></div>
    </div>
  `;
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

// Update URL with current page
function updatePageUrl(page) {
  const url = new URL(window.location);
  if (page === 1) {
    url.searchParams.delete('page');
  } else {
    url.searchParams.set('page', page);
  }
  window.history.pushState({}, '', url);
}

// Get page from URL
function getPageFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const page = parseInt(urlParams.get('page')) || 1;
  return page;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Get initial page from URL
  const initialPage = getPageFromUrl();

  // Load initial leaderboard
  loadLeaderboard(initialPage);

  // Add event listeners for pagination if elements exist
  const prevBtn = document.getElementById('prev-page');
  const nextBtn = document.getElementById('next-page');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        const newPage = currentPage - 1;
        loadLeaderboard(newPage);
        updatePageUrl(newPage);
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (currentPage < totalPages) {
        const newPage = currentPage + 1;
        loadLeaderboard(newPage);
        updatePageUrl(newPage);
      }
    });
  }

  // Add form submit event listener
  const form = document.getElementById('create-profile-form');
  if (form) {
    form.addEventListener('submit', handleCreateProfile);
  }
});
