;(function () {

  /* Game Settings */

  var LEVELS = {
    easy: {width: 6, height: 4, bonusMultiplier: 1},
    medium: {width: 6, height: 5, bonusMultiplier: 1.25},
    hard: {width: 6, height: 6, bonusMultiplier: 1.5},
  };

  var THEMES = [
    {
      name: "pokemon",
      maxTiles: 151
    }
  ];

  var REVEAL_TIME = 1500; //ms

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

  function AudioPlayer() { }

  AudioPlayer.prototype.playSound = function (name) {
    var sound = this._sounds[name];
    sound.load();
    sound.play();
  };

  AudioPlayer.prototype.stopSound = function (name) {
    var sound = this._sounds[name];
    sound.pause();
    sound.currentTime = 0;
  };

  AudioPlayer.prototype.setSound = function (name, volume) {
    var sound = document.querySelector("audio#sound-" + name);
    sound.volume = volume || 1;
    this._sounds = this._sounds || {};
    this._sounds[name] = sound;
  };

  /* Game Model */

  function Game() {
    this.scoreBoard = new ScoreBoard();
  }
  mixin(Observer, Game);

  Game.prototype.start = function (level, theme) {
    level = level || "easy";
    theme = theme || "pokemon";
    var options = {
      level: LEVELS[level],
      theme: this.findTheme(theme)
    };
    var match = new Match(this, options);
    game.trigger("start", match);
  };

  Game.prototype.findTheme = function (name) {
    var themes = THEMES.filter(function (theme) {
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
    this.setSound("opening", 0.5);
  }
  mixin(AudioPlayer, GameView);

  GameView.prototype.render = function () {
    this.playSound("opening");
    var view = this;
    this.el = this.el || document.querySelector("#game-menu");
    this.bindMenuOptions();
    this.el.querySelector("#game-menu-score-board")
      .onclick = this.renderScoreBoard.bind(this);
    this.el.querySelector("#game-menu-quit")
      .onclick = this.closeGame;
  };

  GameView.prototype.bindMenuOptions = function () {
    var options = this.el.querySelectorAll("#game-menu-options a");
    for (var i = 0, l = options.length; i < l; i ++) {
      var menu = options[i];
      menu.onclick = view.startMatch.bind(view);
    }
  };

  GameView.prototype.startMatch = function (event) {
    var level = event.target.dataset.level;
    this.model.start(level);
    return false;
  };

  GameView.prototype.closeGame = function () {
    window.open("http://www.georgebrown.ca/", "_self");
  };

  GameView.prototype.renderMatch = function (match) {
    this.stopSound("opening");
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
    var level = options.level;
    this.game = game;
    this.timer = new Timer();
    this.hits = 0;
    this.points = 0;
    this.bonusMultiplier = level.bonusMultiplier;
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
    this.calcularePoints();
    this.trigger("score", this.points);
  };

  Match.prototype.calcularePoints = function () {
    var hitSpeed = (this.hits * 1000) / this.timer.ellapsed();
    this.points += Math.floor(hitSpeed * this.bonusMultiplier);
  };

  Match.prototype.miss = function () {
    this.misses += 1;
    this.trigger("miss", this.misses);
  };

  /* Match View */

  function MatchView(model) {
    this.model = model;
    this.model.on("end", this.remove, this);
    this.model.on("score", this.renderScore, this);
    this.model.on("miss", this.renderMisses, this);
    this.setSound("battle", 0.5);
  }
  mixin(AudioPlayer, MatchView);

  MatchView.prototype.render = function () {
    this.board = new BoardView(this.model.board);
    this.el = document.querySelector("#match-screen");
    this.playSound("battle");
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

  MatchView.prototype.remove = function () {
    this.stopSound("battle");
    this.stopTimer();
  };

  MatchView.prototype.stopTimer = function () {
    clearInterval(this.timer);
  };

  /* Board Model */

  function Board(match, options) {
    this.match = match;
    this.width = options.level.width;
    this.height = options.level.height;
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
  mixin(Observer, Board);

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
      this.trigger("selected");
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
    this.trigger("hit");
    if (this.guessed === this.needed) this.match.end();
  };

  Board.prototype.miss = function (tiles) {
    this.match.miss();
    tiles.forEach(function (tile) {
      tile.hide();
    });
    this.trigger("miss");
  };

  /* Board View */

  function BoardView(model) {
    this.model = model;
    this.setSound("select");
    this.setSound("hit");
    this.setSound("miss", 0.7);
    this.model.on("select", this.select, this);
    this.model.on("hit", this.hit, this);
    this.model.on("miss", this.miss, this);
  }
  mixin(AudioPlayer, BoardView);

  BoardView.prototype.render = function () {
    var el = this.el = document.querySelector("#match-board");
    var views = [];
    this.el.className = this.classes();
    this.model.tiles.forEach(function (column) {
      var row = document.createElement("div");
      row.className = "board-row";
      column.forEach(function (tile) {
        var view = new TileView(tile);
        views.push(view);
        row.appendChild(view.render());
      });
      el.appendChild(row);
    });
    this.revealTiles(views);
  };

  BoardView.prototype.revealTiles = function (views) {
    views.forEach(function (view) {
      view.flipUp();
    });
    views.forEach(function (view) {
      view.flipDown(REVEAL_TIME, true);
    });
  };

  BoardView.prototype.select = function () {
    this.playSound("select");
  };

  BoardView.prototype.hit = function () {
    this.playSound("hit");
  };

  BoardView.prototype.miss = function () {
    this.playSound("miss");
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
    this.trigger("show");
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
    this.model.on("show", this.flipUp, this);
    this.model.on("hide", this.flipDown, this);
  }

  TileView.prototype.render = function () {
    this.el = document.createElement("div");
    this.el.className = "tile";
    return this.el;
  };

  TileView.prototype.bindClick = function () {
    this.el.onclick = this.model.select.bind(this.model);
  };

  TileView.prototype.flipUp = function () {
    var id = this.model.id;
    this.el.className = "tile tile-" + id + " active";
  };

  TileView.prototype.flipDown = function (time, bind) {
    time = time || 500;
    var view = this;
    setTimeout(function () {
      view.el.className = "tile";
      if (bind) view.bindClick();
    }, time);
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
      this.scores.sort(function (a, b) {
        if (a > b) return -1;
        else return 1;
      });
      this.scores = this.scores.splice(0, 10);
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
    this.setSound("ending", 0.5);
  }
  mixin(AudioPlayer, ScoreBoardView);

  ScoreBoardView.prototype.render = function (newScore) {
    this.el = this.el || document.querySelector("#score-board");
    this.showOptions(newScore);
    this.listScores(newScore);
    this.el.className = ""
    window.scrollTo(0,0);
  };

  ScoreBoardView.prototype.showOptions = function (newScore) {
    var menu = this.el.querySelector("#score-board-menu");
    var close = this.el.querySelector("#score-board-close");
    if (newScore) {
      menu.className = "btn";
      close.className = "btn hidden";
      this.playSound("ending");
    } else {
      menu.className = "btn hidden";
      close.className = "btn";
      close.onclick = this.hide.bind(this);
    }
  };

  ScoreBoardView.prototype.renderNewScore = function (score) {
    var view = this;
    setTimeout(function () {
      view.render(score);
    }, 500);
  };

  ScoreBoardView.prototype.listScores = function (newScore) {
    var el, score;
    var list = this.el.querySelector("ol");
    var frag = document.createDocumentFragment();
    var scores = this.model.scores;
    list.innerHTML = "";
    for (var i = 0; i < 10; i++) {
      el = document.createElement("li");
      score = scores[i] || "-";
      el.textContent = score;
      if (score === newScore) el.className = "highlighted";
      frag.appendChild(el);
    }
    list.appendChild(frag);
    list.className = "";
  };

  ScoreBoardView.prototype.hide = function () {
    this.el.className = "hidden";
    this.stopSound("ending");
    return false;
  };

  /* Initializing Game */

  var game = new Game();
  var view = new GameView(game);
  view.render();

}());
