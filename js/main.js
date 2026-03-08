/**
 * AlignED Report 5 — DRAFT
 * Loads paired response data and renders interactive entry cards.
 */
document.addEventListener('DOMContentLoaded', function() {
  var entriesContainer = document.getElementById('entries');
  var filterSelect = document.getElementById('filter-obsid');
  var countDisplay = document.getElementById('entry-count');
  var allData = [];

  // Load data
  fetch('data.json')
    .then(function(response) { return response.json(); })
    .then(function(data) {
      allData = data;
      populateFilter(data);
      renderEntries(data);
    })
    .catch(function(err) {
      entriesContainer.innerHTML = '<p>Error loading data: ' + err.message + '</p>';
    });

  // Populate transcript filter dropdown
  function populateFilter(data) {
    var obsids = [];
    var seen = {};
    data.forEach(function(d) {
      if (!seen[d.obsid]) {
        seen[d.obsid] = true;
        obsids.push(d.obsid);
      }
    });
    obsids.sort(function(a, b) { return parseInt(a) - parseInt(b); });

    obsids.forEach(function(obsid) {
      var count = data.filter(function(d) { return d.obsid === obsid; }).length;
      var option = document.createElement('option');
      option.value = obsid;
      option.textContent = 'OBSID ' + obsid + ' (' + count + ' turns)';
      filterSelect.appendChild(option);
    });

    filterSelect.addEventListener('change', function() {
      var val = filterSelect.value;
      if (val === 'all') {
        renderEntries(allData);
      } else {
        var filtered = allData.filter(function(d) { return d.obsid === val; });
        renderEntries(filtered);
      }
    });
  }

  // Render entry cards
  function renderEntries(data) {
    countDisplay.textContent = 'Showing ' + data.length + ' of ' + allData.length;
    entriesContainer.innerHTML = '';

    data.forEach(function(entry, index) {
      var div = document.createElement('div');
      div.className = 'entry';

      var globalIndex = allData.indexOf(entry) + 1;

      // Truncate student utterance for header
      var studentShort = entry.student.length > 80
        ? entry.student.substring(0, 80) + '...'
        : entry.student;

      div.innerHTML =
        '<div class="entry-header">' +
          '<span>OBSID ' + escapeHtml(entry.obsid) + ', turn ' + escapeHtml(entry.turn_idx) + '</span>' +
          '<span class="entry-num">' + globalIndex + ' / 142</span>' +
        '</div>' +

        // Conversation history (collapsed by default)
        '<div class="entry-section">' +
          '<div class="section-label">Conversation history (what the LLM received)</div>' +
          '<button class="history-toggle" onclick="toggleHistory(this)">Show full transcript context</button>' +
          '<div class="history-content">' + escapeHtml(entry.history) + '</div>' +
        '</div>' +

        // Student utterance
        '<div class="entry-section">' +
          '<div class="section-label">Student utterance</div>' +
          '<div class="response-box student-box">' + escapeHtml(entry.student) + '</div>' +
        '</div>' +

        // Human teacher
        '<div class="entry-section">' +
          '<div class="section-label">Human teacher response</div>' +
          '<div class="response-box human-box">' +
            escapeHtml(entry.human || '[no teacher response recorded]') +
          '</div>' +
        '</div>' +

        // LLM response
        '<div class="entry-section">' +
          '<div class="section-label">LLM response (Gemini 3.1 Pro)</div>' +
          '<div class="response-box llm-box">' + escapeHtml(entry.llm) + '</div>' +
        '</div>';

      entriesContainer.appendChild(div);
    });
  }

  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    if (!text) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }
});

// Toggle conversation history visibility
function toggleHistory(button) {
  var content = button.nextElementSibling;
  if (content.classList.contains('visible')) {
    content.classList.remove('visible');
    button.textContent = 'Show full transcript context';
  } else {
    content.classList.add('visible');
    button.textContent = 'Hide transcript context';
  }
}
