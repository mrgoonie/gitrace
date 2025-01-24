// Handle form submission to create git profile
async function handleCreateProfile(event) {
  event.preventDefault();
  const username = document.getElementById('github-username').value;

  try {
    // Show loading state
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="ri-loader-4-line animate-spin"></i> Loading...`;

    // Fetch git stats
    const response = await fetch(`/api/v1/git-profile/fetch?username=${username}`);
    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || 'Failed to fetch git stats');
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
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<i class="ri-add-line"></i> Add Profile`;
  }
}

// Load leaderboard data
async function loadLeaderboard(page = 1) {
  try {
    const response = await fetch(`/api/git-profile?page=${page}&itemsPerPage=50`);
    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || 'Failed to load leaderboard');
    }

    // Sort profiles by current streak and contributions
    const sortedProfiles = result.data.sort((a, b) => {
      const aStats = a.yearlyStats[0] || { longestStreak: 0, contributions: 0 };
      const bStats = b.yearlyStats[0] || { longestStreak: 0, contributions: 0 };

      // First sort by longest streak
      if (bStats.longestStreak !== aStats.longestStreak) {
        return bStats.longestStreak - aStats.longestStreak;
      }
      // Then by contributions
      return bStats.contributions - aStats.contributions;
    });

    // Update leaderboard HTML
    const leaderboardEl = document.getElementById('leaderboard');
    leaderboardEl.innerHTML = sortedProfiles.map((profile, index) => {
      const stats = profile.yearlyStats[0] || { longestStreak: 0, contributions: 0 };
      return `
        <div class="flex items-center justify-between p-4 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
          <div class="flex items-center space-x-4">
            <span class="text-lg font-semibold ${index < 3 ? 'text-yellow-500' : 'text-gray-500'}">#${index + 1}</span>
            <a href="https://github.com/${profile.username}" target="_blank" class="flex items-center hover:text-blue-500">
              <i class="ri-github-fill mr-2"></i>
              <span>${profile.username}</span>
            </a>
          </div>
          <div class="flex items-center space-x-8">
            <div class="text-sm">
              <span class="text-gray-500 dark:text-gray-400">Streak:</span>
              <span class="ml-1 font-medium">${stats.longestStreak}</span>
            </div>
            <div class="text-sm">
              <span class="text-gray-500 dark:text-gray-400">Contributions:</span>
              <span class="ml-1 font-medium">${stats.contributions}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('Error:', error);
    showToast('error', error.message);
  }
}

// Show toast message
function showToast(type, message) {
  const toast = document.getElementById('toast');
  toast.innerHTML = `
    <div class="fixed bottom-4 right-4 px-4 py-2 rounded-lg ${type === 'error' ? 'bg-red-500' : 'bg-green-500'} text-white">
      ${message}
    </div>
  `;
  setTimeout(() => {
    toast.innerHTML = '';
  }, 3000);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Load initial leaderboard
  loadLeaderboard(1);

  // Setup form submission
  const form = document.getElementById('create-profile-form');
  form.addEventListener('submit', handleCreateProfile);
});
