/**
 * AlignED Report 5 — DRAFT
 * Loads paired response data and renders interactive entry cards.
 * Supports filtering by transcript, match type, and student word count.
 */
document.addEventListener('DOMContentLoaded', function() {
  var entriesContainer = document.getElementById('entries');
  var filterObsid = document.getElementById('filter-obsid');
  var filterMatch = document.getElementById('filter-match');
  var filterWords = document.getElementById('filter-words');
  var countDisplay = document.getElementById('entry-count');
  var allData = [];

  // Load data
  fetch('data.json')
    .then(function(response) { return response.json(); })
    .then(function(data) {
      allData = data;
      populateObsidFilter(data);
      applyFilters();
    })
    .catch(function(err) {
      entriesContainer.innerHTML = '<p>Error loading data: ' + err.message + '</p>';
    });

  // Populate transcript filter
  function populateObsidFilter(data) {
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
      filterObsid.appendChild(option);
    });
  }

  // Wire up all filters
  filterObsid.addEventListener('change', applyFilters);
  filterMatch.addEventListener('change', applyFilters);
  filterWords.addEventListener('change', applyFilters);

  function applyFilters() {
    var obsidVal = filterObsid.value;
    var matchVal = filterMatch.value;
    var wordsVal = filterWords.value;

    var filtered = allData.filter(function(d) {
      // Transcript filter
      if (obsidVal !== 'all' && d.obsid !== obsidVal) return false;

      // Match type filter
      if (matchVal !== 'all' && d.match_type !== matchVal) return false;

      // Word count filter
      if (wordsVal !== 'all') {
        var w = d.num_words;
        if (wordsVal === '1-2' && w > 2) return false;
        if (wordsVal === '3-9' && (w < 3 || w > 9)) return false;
        if (wordsVal === '10+' && w < 10) return false;
      }

      return true;
    });

    renderEntries(filtered);
  }

  // Render entry cards
  function renderEntries(data) {
    countDisplay.textContent = 'Showing ' + data.length + ' of ' + allData.length;
    entriesContainer.innerHTML = '';

    data.forEach(function(entry) {
      var div = document.createElement('div');
      div.className = 'entry';

      var globalIndex = allData.indexOf(entry) + 1;

      // Build tags
      var tags = [];
      if (entry.match_type === 'indirect') {
        tags.push('<span class="tag tag-indirect">indirect (' + entry.intervening_students + ' students between)</span>');
      } else if (entry.match_type === 'no_response') {
        tags.push('<span class="tag tag-no-response">no teacher response</span>');
      }
      if (entry.has_inaudible) {
        tags.push('<span class="tag tag-inaudible">contains [inaudible]</span>');
      }
      tags.push('<span class="tag tag-words">' + entry.num_words + ' words</span>');
      tags.push('<span class="tag tag-context">' + entry.context_turns + ' turns of context</span>');

      var tagHtml = tags.length > 0 ? '<div class="tags">' + tags.join('') + '</div>' : '';

      div.innerHTML =
        '<div class="entry-header">' +
          '<span>OBSID ' + escapeHtml(entry.obsid) + ', turn ' + escapeHtml(String(entry.turn_idx)) + '</span>' +
          '<span class="entry-num">' + globalIndex + ' / ' + allData.length + '</span>' +
        '</div>' +

        // Tags
        (tagHtml ? '<div class="entry-section">' + tagHtml + '</div>' : '') +

        // Conversation history
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
          '<div class="section-label">Human teacher response' +
            (entry.match_type === 'indirect' ? ' <span class="match-warning">(indirect match — may not be responding to this student)</span>' : '') +
          '</div>' +
          '<div class="response-box human-box">' +
            escapeHtml(entry.human || '[no teacher response recorded]') +
          '</div>' +
        '</div>' +

        // LLM response
        '<div class="entry-section">' +
          '<div class="section-label">LLM response (GPT-5 Mini)</div>' +
          '<div class="response-box llm-box">' + escapeHtml(entry.llm) + '</div>' +
        '</div>';

      entriesContainer.appendChild(div);
    });
  }

  // Escape HTML
  function escapeHtml(text) {
    if (!text) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }
});

// Toggle conversation history
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
