// Global state for pagination
let currentPage = 1;
let totalPages = 1;
let perPage = 3;

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
      const rankEmoji = index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
      const globalRank = (currentPage - 1) * perPage + index + 1;

      return `
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
          <div class="flex items-center space-x-4 mb-2 sm:mb-0">
            <span class="${globalRank <= 3 ? 'text-2xl' : 'text-xl'} font-semibold ${globalRank <= 3 ? 'text-red-400 dark:text-yellow-500' : 'text-gray-500'}">${globalRank <= 3 ? rankEmoji : ''} #${globalRank}</span>
            <a href="https://github.com/${profile.username}" target="_blank" class="flex items-center hover:text-blue-500">
              <i class="ri-github-fill mr-2"></i>
              <span>${profile.username}</span>
            </a>
          </div>
          <div class="flex flex-wrap gap-4 sm:gap-6">
            <div class="text-sm whitespace-nowrap">
              <span class="text-gray-500 dark:text-gray-400">🔥 Current:</span>
              <span class="ml-1 font-medium">${stats.currentStreak} days</span>
            </div>
            <div class="text-sm whitespace-nowrap">
              <span class="text-gray-500 dark:text-gray-400">⚡ Best:</span>
              <span class="ml-1 font-medium">${stats.longestStreak} days</span>
            </div>
            <div class="text-sm whitespace-nowrap">
              <span class="text-gray-500 dark:text-gray-400">📊 Contributions:</span>
              <span class="ml-1 font-medium">${stats.contributions}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Update pagination info and controls if they exist
    if (paginationInfo) {
      const startRank = (currentPage - 1) * perPage + 1;
      const endRank = Math.min(startRank + profiles.length - 1, pagination.total);
      paginationInfo.textContent = `${startRank}-${endRank} of ${pagination.total} contributors`;
    }
    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
  } catch (error) {
    console.error('Error:', error);
    showToast('error', error.message);
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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Load initial leaderboard
  loadLeaderboard(1);

  // Add event listeners for pagination if elements exist
  const prevBtn = document.getElementById('prev-page');
  const nextBtn = document.getElementById('next-page');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        loadLeaderboard(currentPage - 1);
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (currentPage < totalPages) {
        loadLeaderboard(currentPage + 1);
      }
    });
  }

  // Add form submit event listener
  const form = document.getElementById('create-profile-form');
  if (form) {
    form.addEventListener('submit', handleCreateProfile);
  }
});
