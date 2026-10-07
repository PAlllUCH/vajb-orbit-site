(function () {
  "use strict";

  var STATUS_LABEL = {
    "planned": "Planned",
    "in-progress": "In progress",
    "shipped": "Shipped"
  };

  var grid = document.getElementById("vote-grid");
  var loadNote = document.getElementById("load-note");
  var shippedSection = document.getElementById("shipped-section");
  var shippedList = document.getElementById("shipped-list");
  var countsNote = document.getElementById("counts-note");
  var updatedLine = document.getElementById("updated-line");
  var cycleName = document.getElementById("cycle-name");
  var cycleNote = document.getElementById("cycle-note");
  var cycleStamp = document.getElementById("cycle-stamp");

  function fail(message) {
    grid.hidden = true;
    loadNote.hidden = false;
    loadNote.textContent = "The candidate list failed to load: " + message;
  }

  function validateManifest(data) {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return "manifest is not an object";
    }
    if (typeof data.cycle !== "number" || data.cycle < 1) {
      return "cycle is missing or invalid";
    }
    if (typeof data.repo !== "string" || data.repo.indexOf("/") < 1) {
      return "repo is missing or malformed";
    }
    if (!Array.isArray(data.candidates)) {
      return "candidates is not a list";
    }
    var seen = {};
    for (var i = 0; i < data.candidates.length; i++) {
      var c = data.candidates[i];
      var where = "candidate " + (i + 1);
      if (!c || typeof c !== "object" || Array.isArray(c)) {
        return where + " is not an object";
      }
      if (typeof c.slug !== "string" || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(c.slug)) {
        return where + " has a bad slug";
      }
      if (seen[c.slug]) {
        return where + " repeats slug " + c.slug;
      }
      seen[c.slug] = true;
      if (typeof c.title !== "string" || !c.title) {
        return where + " has no title";
      }
      if (typeof c.blurb !== "string") {
        return where + " has no blurb";
      }
      if (!STATUS_LABEL[c.status]) {
        return where + " has an unknown status";
      }
      if (c.issue !== null && (typeof c.issue !== "number" || c.issue < 1 || c.issue % 1 !== 0)) {
        return where + " has a bad issue number";
      }
      if (typeof c.votes_cached !== "number" || c.votes_cached < 0 || c.votes_cached % 1 !== 0) {
        return where + " has a bad cached count";
      }
    }
    return null;
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) {
      node.className = className;
    }
    if (text !== undefined) {
      node.textContent = text;
    }
    return node;
  }

  function buildPanel(candidate, repo) {
    var panel = el("article", "panel");
    panel.id = "candidate-" + candidate.slug;
    panel.dataset.votes = String(candidate.votes_cached);
    if (candidate.issue !== null) {
      panel.dataset.issue = String(candidate.issue);
    }

    var head = el("div", "panel-head");
    head.appendChild(el("span", "rank"));
    head.appendChild(el("span", "status-chip status-" + candidate.status, STATUS_LABEL[candidate.status]));
    panel.appendChild(head);

    panel.appendChild(el("h2", "panel-title", candidate.title));
    panel.appendChild(el("p", "panel-blurb", candidate.blurb));

    var foot = el("div", "panel-foot");
    var votes = el("span", "votes");
    votes.appendChild(el("span", "vote-count", String(candidate.votes_cached)));
    votes.appendChild(document.createTextNode(" votes"));
    foot.appendChild(votes);

    if (candidate.issue !== null) {
      var link = el("a", "vote-link", "Vote \uD83D\uDC4D");
      link.href = "https://github.com/" + repo + "/issues/" + candidate.issue;
      link.target = "_blank";
      link.rel = "noopener";
      link.setAttribute("aria-label", "Vote for " + candidate.title + " on GitHub");
      foot.appendChild(link);
    } else {
      foot.appendChild(el("span", "issue-pending", "Issue pending"));
    }

    panel.appendChild(foot);
    return panel;
  }

  function applyRanks() {
    var panels = Array.prototype.slice.call(grid.querySelectorAll(".panel"));
    panels.sort(function (a, b) {
      return Number(b.dataset.votes) - Number(a.dataset.votes);
    });
    var top = panels.length ? Number(panels[0].dataset.votes) : 0;
    for (var i = 0; i < panels.length; i++) {
      panels[i].querySelector(".rank").textContent = String(i + 1);
      panels[i].classList.toggle("is-leader", i === 0 && top > 0);
      grid.appendChild(panels[i]);
    }
  }

  function fetchLiveCounts(repo) {
    var url = "https://api.github.com/repos/" + repo + "/issues?labels=vote-candidate&state=all&per_page=100";
    return fetch(url, { headers: { "Accept": "application/vnd.github+json" } })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("HTTP " + response.status);
        }
        return response.json();
      })
      .then(function (issues) {
        var byIssue = {};
        for (var i = 0; i < issues.length; i++) {
          var n = issues[i].number;
          if (!(n in byIssue)) {
            var reactions = issues[i].reactions || {};
            byIssue[n] = reactions["+1"] || 0;
          }
        }
        var panels = grid.querySelectorAll(".panel");
        var changed = false;
        for (var j = 0; j < panels.length; j++) {
          var panel = panels[j];
          if (panel.dataset.issue === undefined) {
            continue;
          }
          var number = Number(panel.dataset.issue);
          if (!(number in byIssue)) {
            continue;
          }
          var value = byIssue[number];
          if (value !== Number(panel.dataset.votes)) {
            panel.dataset.votes = String(value);
            panel.querySelector(".vote-count").textContent = String(value);
            changed = true;
          }
        }
        if (changed) {
          applyRanks();
        }
      });
  }

  fetch("data/candidates.json")
    .then(function (response) {
      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }
      return response.json();
    })
    .then(function (data) {
      var problem = validateManifest(data);
      if (problem) {
        throw new Error(problem);
      }
      cycleStamp.textContent = "CYCLE " + data.cycle;
      cycleName.textContent = data.cycle_name || "";
      cycleNote.textContent = data.cycle_note || "";
      updatedLine.textContent = "Candidate list updated " + data.updated + " \u00B7 github.com/" + data.repo;

      var shipped = [];
      for (var i = 0; i < data.candidates.length; i++) {
        var c = data.candidates[i];
        if (c.status === "shipped") {
          shipped.push(c);
        } else {
          grid.appendChild(buildPanel(c, data.repo));
        }
      }
      if (shipped.length) {
        shipped.sort(function (a, b) {
          return a.updated < b.updated ? 1 : -1;
        });
        for (var s = 0; s < shipped.length; s++) {
          var item = el("li", "shipped-item");
          item.appendChild(el("span", "shipped-title", shipped[s].title));
          item.appendChild(el("span", "shipped-date", shipped[s].updated));
          shippedList.appendChild(item);
        }
        shippedSection.hidden = false;
      }
      applyRanks();
      fetchLiveCounts(data.repo).catch(function () {
        countsNote.hidden = false;
      });
    })
    .catch(function (error) {
      fail(String(error && error.message ? error.message : error));
    });
})();
