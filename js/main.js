;(function () {

  /* Mixin helper
   *
   * Adds methods from one prototype to the other
   *
   */

  function mixin(giver, receiver) {
    for (var method in giver.prototype) {
      if (receiver.prototype[method]) return;
      receiver.prototype[method] = giver.prototype[method];
    }
  }

  /* Observer (Pub/Sub) pattern */

  function Observer() { }

  Observer.prototype.listeners = function (event) {
    this._listeners = this._listeners || {};
    this._listeners[event] = this._listeners[event] || [];
    return this._listeners[event];
  };

  Observer.prototype.on = function (event, callback, context) {
    this.listeners(event).push({callback: callback, context: context});
  };

  Observer.prototype.trigger = function (event) {
    var args = [].slice.call(arguments, 1);
    var listeners = this.listeners(event);
    setTimeout(function () {
      listeners.forEach(function (listener) {
        listener.callback.apply(listener.context, args);
      });
    }, 0);
  };

  /* Game Model */

  function Game() {
    this.modes = {
      easy: {width: 2, height: 1},
      medium: {width: 6, height: 5},
      hard: {width: 6, height: 6},
    };
    this.themes = [ {name: "pokemon", maxTiles: 151} ];
    this.scoreBoard = new ScoreBoard();
  }
  mixin(Observer, Game);

  Game.prototype.start = function (mode, theme) {
    mode = mode || "easy";
    theme = theme || "pokemon";
    var options = {
      size: this.modes[mode],
      theme: this.findTheme(theme)
    };
    var match = new Match(this, options);
    game.trigger("start", match);
  };

  Game.prototype.findTheme = function (name) {
    var themes = this.themes.filter(function (theme) {
      return theme.name === name;
    });
    return themes[0];
  };

  Game.prototype.endMatch = function (score) {
    this.scoreBoard.save(score);
  };

  /* Game View */
  function GameView(model) {
    this.model = model;
    this.model.on("start", this.renderMatch, this);
    this.scoreView = new ScoreBoardView(this.model.scoreBoard);
  }

  GameView.prototype.render = function () {
    this.el = this.el || document.querySelector("#game-menu");
    this.el.querySelector("#game-menu-options")
      .onclick = this.startMatch.bind(this);
    this.el.querySelector("#game-menu-score-board")
      .onclick = this.renderScoreBoard.bind(this);
    this.el.querySelector("#game-menu-quit")
      .onclick = this.closeGame;
  };

  GameView.prototype.startMatch = function (event) {
    var mode = event.target.dataset.mode;
    this.model.start(mode);
    return false;
  };

  GameView.prototype.closeGame = function () {
    window.open("http://www.georgebrown.ca/", "_self");
  };

  GameView.prototype.renderMatch = function (match) {
    this.hideMenu();
    var view = new MatchView(match);
    view.render();
    return false;
  };

  GameView.prototype.renderScoreBoard = function () {
    this.scoreView.render();
    return false;
  };

  GameView.prototype.hideMenu = function () {
    this.el.className = "hidden";
  };

  GameView.prototype.showMenu = function () {
    this.el.className = "";
  };

  /* Match Model */

  function Match(game, options) {
    this.game = game;
    this.timer = new Timer();
    this.hits = 0;
    this.points = 0;
    this.misses = 0;
    this.board = new Board(this, options);
  }
  mixin(Observer, Match);

  Match.prototype.end = function () {
    this.game.endMatch(this.points);
    this.trigger("end");
  };

  Match.prototype.score = function () {
    this.hits += 1;
    this.points += Math.floor((this.hits * 1000) / this.timer.ellapsed());
    this.trigger("score", this.points);
  };

  Match.prototype.miss = function () {
    this.misses += 1;
    this.trigger("miss", this.misses);
  };

  /* Match View */

  function MatchView(model) {
    this.model = model;
    this.model.on("end", this.stopTimer, this);
    this.model.on("score", this.renderScore, this);
    this.model.on("miss", this.renderMisses, this);
  }

  MatchView.prototype.render = function () {
    this.board = new BoardView(this.model.board);
    this.el = document.querySelector("#match-screen");
    this.board.render();
    this.el.className = "";
    this.updateTimer();
  };

  MatchView.prototype.renderScore = function (score) {
    this.score = this.score || this.el.querySelector("#match-score");
    this.score.textContent = score;
  };

  MatchView.prototype.renderMisses = function (misses) {
    this.misses = this.misses || this.el.querySelector("#match-misses");
    this.misses.textContent = misses;
  };

  MatchView.prototype.updateTimer = function () {
    var el = this.el.querySelector("#match-timer");
    var clock = this.model.timer;
    this.timer = setInterval(function () {
      el.textContent = clock.toString();
    }, 500);
  };

  MatchView.prototype.stopTimer = function () {
    clearInterval(this.timer);
  };

  /* Board Model */

  function Board(match, options) {
    this.match = match;
    this.width = options.size.width;
    this.height = options.size.height;
    this.theme = options.theme;
    this.selected = null;
    this.needed = (this.width * this.height) / 2;
    this.guessed = 0;
    this.assemble();
  }

  Board.prototype.createTiles = function () {
    var board = this;
    var ids = this.getRandomTileIds();
    var tiles = [];
    ids.forEach(function (id) {
      // Created two of each tile
      tiles.push(new Tile(board, id));
      tiles.push(new Tile(board, id));
    });
    return tiles;
  };

  Board.prototype.assemble =  function () {
    var tiles = this.createTiles();
    var rows = [];
    for (var i = 0; i < this.height; i++) {
      var columns = [];
      for (var j = 0; j < this.width; j++) {
        var rnd = this.random(tiles.length);
        var tile = tiles.splice(rnd, 1);
        columns.push(tile[0]);
      }
      rows.push(columns);
    }
    this.tiles = rows;
  };

  Board.prototype.random = function (max) {
    return Math.floor(Math.random() * max);
  };

  Board.prototype.getRandomTileIds = function () {
    var max = this.theme.maxTiles;
    var ids = [];
    while (ids.length < this.needed) {
      var rnd = this.random(max) + 1;
      if (ids.indexOf(rnd) === -1) ids.push(rnd);
    }
    return ids;
  };

  Board.prototype.select = function (tile) {
    if (!this.selected) {
      this.selected = tile;
      return;
    }
    if (this.selected === tile) return;
    this.compare(this.selected, tile);
    this.selected = null;
  };

  Board.prototype.compare = function (tileA, tileB) {
    var tiles = [tileA, tileB];
    if (tileA.id === tileB.id) this.hit(tiles);
    else this.miss(tiles);
  };

  Board.prototype.hit = function (tiles) {
    this.match.score();
    tiles.forEach(function (tile) {
      tile.match();
    });
    this.guessed += 1;
    if (this.guessed === this.needed) this.match.end();
  };

  Board.prototype.miss = function (tiles) {
    this.match.miss();
    tiles.forEach(function (tile) {
      tile.hide();
    });
  };

  /* Board View */

  function BoardView(model) {
    this.model = model;
  }

  BoardView.prototype.render = function () {
    var el = this.el = document.querySelector("#match-board");
    this.el.className = this.classes();
    this.model.tiles.forEach(function (column) {
      var row = document.createElement("div");
      row.className = "board-row";
      column.forEach(function (tile) {
        var view = new TileView(tile);
        row.appendChild(view.render());
      });
      el.appendChild(row);
    });
  };

  BoardView.prototype.classes = function () {
    return "theme-" + this.model.theme.name +
           " size-" + this.model.width +
           "x" + this.model.height;
  };

  function Tile(board, id) {
    this.board = board;
    this.id = id;
  }
  mixin(Observer, Tile);

  Tile.prototype.select = function () {
    this.board.select(this);
  };

  Tile.prototype.match = function () {
    this.trigger("match");
  };

  Tile.prototype.hide = function () {
    this.trigger("hide");
  };

  /* Tile View */

  function TileView(model) {
    this.model = model;
    this.model.on("match", this.match, this);
    this.model.on("hide", this.flipDown, this);
  }

  TileView.prototype.render = function () {
    this.el = document.createElement("div");
    this.el.className = "tile";
    this.el.onclick = this.flipUp.bind(this);
    return this.el;
  };

  TileView.prototype.flipUp = function () {
    var id = this.model.id;
    this.el.className = "tile tile-" + id + " active";
    this.model.select();
  };

  TileView.prototype.flipDown = function () {
    var el = this.el;
    setTimeout(function () {
      el.className = "tile";
    }, 500);
  };

  TileView.prototype.match = function () {
    var id = this.model.id;
    this.el.className = "tile tile-" + id + " frozen";
    this.el.onclick = null;
  };

  /* Timer Model */

  function Timer() {
    this.start = this.now();
  }

  Timer.prototype.now = function () {
    return new Date().getTime();
  };

  Timer.prototype.ellapsed = function () {
    return (this.now() - this.start) / 1000;
  };

  Timer.prototype.toString = function () {
    var time = this.ellapsed();
    var mins = Math.floor(time / 60);
    var secs = Math.floor(time % 60);
    if (mins < 10) mins = "0" + mins;
    if (secs < 10) secs = "0" + secs;
    return mins + ":" + secs;
  };

  /* Score Board */

  function ScoreBoard() {
    this.scores = this.parseScore();
  }
  mixin(Observer, ScoreBoard);

  ScoreBoard.prototype.save = function (score) {
    if (this.scores.indexOf(score) === -1) {
      this.scores.push(score);
      this.scores.sort();
      this.scores.reverse();
      this.scores = this.scores.slice(0, 10);
      var json = JSON.stringify(this.scores);
      localStorage.setItem("scores",json);
    }
    this.trigger("new:score", score);
  };

  ScoreBoard.prototype.parseScore = function () {
    var storage = localStorage.getItem("scores");
    var scores;
    try {
      scores = JSON.parse(storage)
    } catch (e) {
    }
    return scores || [];
  };

  /* Score Board View */

  function ScoreBoardView(model) {
    this.model = model;
    this.model.on("show:score", this.render, this);
    this.model.on("new:score", this.renderNewScore, this);
  }

  ScoreBoardView.prototype.render = function (newScore) {
    this.el = this.el || document.querySelector("#score-board");
    this.showOptions(newScore);
    this.checkList(newScore);
    this.el.className = ""
  };

  ScoreBoardView.prototype.showOptions = function (newScore) {
    var menu = this.el.querySelector("#score-board-menu");
    var close = this.el.querySelector("#score-board-close");
    if (newScore) {
      menu.className = "btn";
      close.className = "btn hidden";
    } else {
      menu.className = "btn hidden";
      close.className = "btn";
      close.onclick = this.hide.bind(this);
    }
  };

  ScoreBoardView.prototype.checkList = function (newScore) {
    var empty = this.el.querySelector("#score-board-empty");
    if (this.model.scores.length) {
      this.listScores(newScore);
      empty.className = "hidden";
    } else {
      empty.className = "";
    }
  };

  ScoreBoardView.prototype.renderNewScore = function (score) {
    var view = this;
    setTimeout(function () {
      view.render(score);
    }, 500);
  };

  ScoreBoardView.prototype.listScores = function (newScore) {
    var list = document.querySelector("ol");
    list.innerHTML = "";
    var frag = document.createDocumentFragment();
    this.model.scores.forEach(function (score) {
      var el = document.createElement("li");
      el.textContent = score;
      if (score === newScore) el.className = "highlighted";
      frag.appendChild(el);
    });
    list.appendChild(frag);
    list.className = "";
  };

  ScoreBoardView.prototype.hide = function () {
    this.el.className = "hidden";
    return false;
  };

  /* Initializing Game */

  var game = new Game();
  var view = new GameView(game);
  view.render();

}());
