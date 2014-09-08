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

  /* Observer pattern */

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
      easy: {width: 6, height: 2},
      medium: {width: 6, height: 4},
      hard: {width: 6, height: 8},
    };
    this.themes = [ {name: "pokemon", maxTiles: 151} ];
    this.matches = 0;
  }
  mixin(Observer, Game);

  Game.prototype.start = function (mode, theme) {
    var options = {
      size: this.modes[mode],
      theme: this.findTheme(theme)
    };
    this.matches += 1;
    var match = new Match(this, options);
    game.trigger("start", match);
  };

  Game.prototype.findTheme = function (name) {
    var themes = this.themes.filter(function (theme) {
      return theme.name === name;
    });
    return themes[0];
  };

  /* Game View */
  function GameView(model) {
    this.model = model;
    this.model.on("start", this.renderMatch, this);
  }

  GameView.prototype.render = function () {
    this.el = this.el || document.querySelector("#game-menu");
    this.bindClick("match", this.startMatch);
    this.bindClick("rules", this.renderRules);
    this.bindClick("about", this.renderAbout);
    this.bindClick("quit", this.renderQuit);
  };

  GameView.prototype.startMatch = function () {
    var mode = this.el.querySelector("#game-mode").value;
    var theme = this.el.querySelector("#game-theme").value;
    this.model.start(mode, theme);
  };

  GameView.prototype.bindClick = function (item, fn) {
    this.el.querySelector("#game-menu-" + item).onclick = fn.bind(this);
  };

  GameView.prototype.renderMatch = function (match) {
    this.hideMenu();
    var view = new MatchView(match);
    view.render();
  };

  GameView.prototype.hideMenu = function () {
    this.el.className = "hidden";
  };

  GameView.prototype.showMenu = function () {
    this.el.className = "";
  };

  GameView.prototype.renderRules = function () {
    //TODO
  };

  GameView.prototype.renderAbout = function () {
    //TODO
  };

  GameView.prototype.renderQuit = function () {
    //TODO
  };

  /* Match Model */

  function Match(game, options) {
    this.game = game;
    this.timer = new Timer();
    this.points = 0;
    this.misses = 0;
    this.board = new Board(this, options);
  }
  mixin(Observer, Match);

  Match.prototype.end = function () {
    this.trigger("end");
  };

  Match.prototype.score = function () {
    this.points += 1;
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
      el.textContent = clock.timeSpent();
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
      tile.lock();
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

  Tile.prototype.lock = function () {
    this.trigger("lock");
  };

  Tile.prototype.hide = function () {
    this.trigger("hide");
  };

  /* Tile View */

  function TileView(model) {
    this.model = model;
    this.model.on("lock", this.freeze, this);
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

  TileView.prototype.freeze = function () {
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

  Timer.prototype.timeSpent = function () {
    var time = (this.now() - this.start) / 1000;
    var mins = Math.floor(time / 60);
    var secs = Math.floor(time % 60);
    if (mins < 10) mins = "0" + mins;
    if (secs < 10) secs = "0" + secs;
    return mins + ":" + secs;
  };

  /* Initializing Game */

  var game = new Game();
  var view = new GameView(game);
  view.render();

}());
