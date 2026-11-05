/* Slot logic — symbols s1..s9 (nilai tertinggi = s1). Dipakai browser + tools/test_slot.js */
(function (root) {
  // pay = kelipatan taruhan per line untuk 3 / 4 / 5 simbol
  var PAY = {
    s1: [200, 1000, 5000],
    s2: [100, 500, 2000],
    s3: [60, 250, 900],
    s4: [40, 150, 600],
    s5: [22, 90, 350],
    s6: [12, 45, 160]
  };
  var WEIGHT = { s1: 1, s2: 2, s3: 3, s4: 5, s5: 6, s6: 8 };
  var IDS = Object.keys(PAY);
  var TOTAL = IDS.reduce(function (a, k) { return a + WEIGHT[k]; }, 0);

  // 5 lines on 5x3: 3 horizontal + 2 diagonal
  var LINES = [
    [1, 1, 1, 1, 1],
    [0, 0, 0, 0, 0],
    [2, 2, 2, 2, 2],
    [0, 1, 2, 1, 0],
    [2, 1, 0, 1, 2]
  ];
  var REELS = 5, ROWS = 3;

  function pick(rnd) {
    var r = (rnd || Math.random)() * TOTAL, acc = 0;
    for (var i = 0; i < IDS.length; i++) {
      acc += WEIGHT[IDS[i]];
      if (r < acc) return IDS[i];
    }
    return IDS[IDS.length - 1];
  }

  function spinGrid(rnd) {
    var g = [];
    for (var c = 0; c < REELS; c++) {
      var col = [];
      for (var r = 0; r < ROWS; r++) col.push(pick(rnd));
      g.push(col);
    }
    return g;
  }

  function evalLines(grid) {
    var out = [];
    LINES.forEach(function (rows, li) {
      var first = grid[0][rows[0]], n = 1;
      for (var c = 1; c < REELS; c++) {
        if (grid[c][rows[c]] !== first) break;
        n++;
      }
      if (n >= 3) {
        var cells = [];
        for (var i = 0; i < n; i++) cells.push([i, rows[i]]);
        out.push({ line: li, symbol: first, count: n, pay: PAY[first][n - 3], cells: cells });
      }
    });
    return out;
  }

  var api = { PAY: PAY, WEIGHT: WEIGHT, LINES: LINES, IDS: IDS, REELS: REELS, ROWS: ROWS,
    pick: pick, spinGrid: spinGrid, evalLines: evalLines };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.SLOT = api;
})(this);
