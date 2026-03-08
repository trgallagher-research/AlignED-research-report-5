/**
 * AlignED Report 5 — Data Browser
 * Loads paired response data with both Gemini and GPT-5 Mini responses.
 * Supports filtering and URL parameters for deep linking.
 */
document.addEventListener('DOMContentLoaded', function() {
  var entriesContainer = document.getElementById('entries');
  var filterObsid = document.getElementById('filter-obsid');
  var filterMatch = document.getElementById('filter-match');
  var filterWords = document.getElementById('filter-words');
  var filterGemini = document.getElementById('filter-gemini');
  var countDisplay = document.getElementById('entry-count');
  var summaryBar = document.getElementById('summary-bar');
  var allData = [];

  // Load data
  fetch('data.json')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      allData = data;
      populateObsidFilter(data);
      readUrlParams();
      applyFilters();
    })
    .catch(function(err) {
      entriesContainer.innerHTML = '<p>Error loading data: ' + err.message + '</p>';
    });

  // Populate transcript filter
  function populateObsidFilter(data) {
    var seen = {};
    var obsids = [];
    data.forEach(function(d) {
      if (!seen[d.obsid]) {
        seen[d.obsid] = true;
        obsids.push(d.obsid);
      }
    });
    obsids.sort(function(a, b) { return parseInt(a) - parseInt(b); });
    obsids.forEach(function(obsid) {
      var count = data.filter(function(d) { return d.obsid === obsid; }).length;
      var opt = document.createElement('option');
      opt.value = obsid;
      opt.textContent = 'OBSID ' + obsid + ' (' + count + ' turns)';
      filterObsid.appendChild(opt);
    });
  }

  // Read URL parameters to set initial filters
  function readUrlParams() {
    var params = new URLSearchParams(window.location.search);
    if (params.get('obsid')) filterObsid.value = params.get('obsid');
    if (params.get('match')) filterMatch.value = params.get('match');
    if (params.get('words')) filterWords.value = params.get('words');
    if (params.get('gemini')) filterGemini.value = params.get('gemini');
  }

  // Wire up filters
  filterObsid.addEventListener('change', applyFilters);
  filterMatch.addEventListener('change', applyFilters);
  filterWords.addEventListener('change', applyFilters);
  filterGemini.addEventListener('change', applyFilters);

  function applyFilters() {
    var obsidVal = filterObsid.value;
    var matchVal = filterMatch.value;
    var wordsVal = filterWords.value;
    var geminiVal = filterGemini.value;

    var filtered = allData.filter(function(d) {
      if (obsidVal !== 'all' && d.obsid !== obsidVal) return false;
      if (matchVal !== 'all' && d.match_type !== matchVal) return false;
      if (geminiVal === 'yes' && !d.has_gemini) return false;
      if (geminiVal === 'no' && d.has_gemini) return false;

      if (wordsVal !== 'all') {
        var w = d.num_words;
        if (wordsVal === '1-2' && w > 2) return false;
        if (wordsVal === '3-9' && (w < 3 || w > 9)) return false;
        if (wordsVal === '10+' && w < 10) return false;
      }
      return true;
    });

    updateSummary(filtered);
    renderEntries(filtered);
  }

  // Summary statistics
  function updateSummary(data) {
    countDisplay.textContent = 'Showing ' + data.length + ' of ' + allData.length;

    var direct = data.filter(function(d) { return d.match_type === 'direct'; }).length;
    var withGemini = data.filter(function(d) { return d.has_gemini; }).length;
    var inaudible = data.filter(function(d) { return d.has_inaudible; }).length;

    summaryBar.innerHTML =
      '<span class="summary-item">' + direct + ' direct</span>' +
      '<span class="summary-item">' + (data.length - direct) + ' indirect</span>' +
      '<span class="summary-item">' + withGemini + ' with Gemini</span>' +
      '<span class="summary-item">' + inaudible + ' with [inaudible]</span>';
  }

  // Render entries
  function renderEntries(data) {
    entriesContainer.innerHTML = '';

    data.forEach(function(entry) {
      var div = document.createElement('div');
      div.className = 'entry';

      var globalIndex = allData.indexOf(entry) + 1;

      // Tags
      var tags = [];
      if (entry.match_type === 'indirect') {
        tags.push('<span class="tag tag-indirect">indirect (' + entry.intervening_students + ' students between)</span>');
      } else if (entry.match_type === 'no_response') {
        tags.push('<span class="tag tag-no-response">no teacher response</span>');
      } else {
        tags.push('<span class="tag tag-direct">direct match</span>');
      }
      if (entry.has_inaudible) {
        tags.push('<span class="tag tag-inaudible">[inaudible]</span>');
      }
      if (entry.has_gemini) {
        tags.push('<span class="tag tag-gemini">both models</span>');
      }
      tags.push('<span class="tag tag-words">' + entry.num_words + ' words</span>');
      tags.push('<span class="tag tag-context">' + entry.context_turns + ' turns context</span>');

      // Build sections
      var html =
        '<div class="entry-header">' +
          '<span>OBSID ' + esc(entry.obsid) + ', turn ' + esc(String(entry.turn_idx)) + '</span>' +
          '<span class="entry-num">' + globalIndex + ' / ' + allData.length + '</span>' +
        '</div>' +
        '<div class="entry-section"><div class="tags">' + tags.join('') + '</div></div>' +

        // History
        '<div class="entry-section">' +
          '<div class="section-label">Conversation history</div>' +
          '<button class="history-toggle" onclick="toggleHistory(this)">Show full transcript context</button>' +
          '<div class="history-content">' + esc(entry.history) + '</div>' +
        '</div>' +

        // Student
        '<div class="entry-section">' +
          '<div class="section-label">Student utterance</div>' +
          '<div class="response-box student-box">' + esc(entry.student) + '</div>' +
        '</div>' +

        // Human
        '<div class="entry-section">' +
          '<div class="section-label">Human teacher' +
            (entry.match_type === 'indirect' ? ' <span class="match-warning">(indirect — may not be responding to this student)</span>' : '') +
          '</div>' +
          '<div class="response-box human-box">' + esc(entry.human || '[no response recorded]') + '</div>' +
        '</div>';

      // GPT-5 Mini response (always present)
      html +=
        '<div class="entry-section">' +
          '<div class="section-label">GPT-5 Mini</div>' +
          '<div class="response-box llm-box">' + esc(entry.gpt5) + '</div>' +
        '</div>';

      // Gemini response (if available)
      if (entry.has_gemini) {
        html +=
          '<div class="entry-section">' +
            '<div class="section-label">Gemini 3.1 Pro <span class="prompt-note">(pilot prompt: "Respond to the student")</span></div>' +
            '<div class="response-box gemini-box">' + esc(entry.gemini) + '</div>' +
          '</div>';
      }

      div.innerHTML = html;
      entriesContainer.appendChild(div);
    });
  }

  function esc(text) {
    if (!text) return '';
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(text));
    return d.innerHTML;
  }
});

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
