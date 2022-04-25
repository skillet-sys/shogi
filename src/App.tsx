import p5 from 'p5';
import React, { useEffect } from 'react';

const App = () => {
  return (<div className="App" ><Main /></div>);
}

const width = window.innerWidth;
const height = window.innerHeight;
const device = navigator.userAgent;
const isPhone = (
  (device.indexOf('iPhone') > 0 &&
    device.indexOf('iPad') === -1) ||
  device.indexOf('iPod') > 0 ||
  device.indexOf('Android') > 0
);

const screen = Math.min(
  width, height / 13 * 9,
  isPhone ? width * height : 720
);
const halfScreen = screen / 2;
const block = screen / 9;

// 歩:P 香:L 桂:N 銀:S 金:G 飛:R 角:B
const P = 1, L = 2, N = 3, S = 4, R = 5, B = 6, G = 7;
// と:pP 成香:pL 成桂:pN 成銀:pS 竜:pR 馬:pB 王:K 玉:pK
const pP = 8, pL = 9, pN = 10, pS = 11, pR = 12, pB = 13, K = 14, pK = 15;

let board: number[][];
let isMovable: boolean[][];
let checkedPieces: number[];
let turn = +1;
let dx = [1, 1, 0, -1, -1, -1, 0, 1];
let dy = [0, 1, 1, 1, 0, -1, -1, -1];
let pieceX = 10, pieceY = 10;
let promoX = 10, promoY = 10;
let stockOrder = [0, P, L, N, S, G, R, B];

let isPromoting = false;
let gameEnds = false;
let pieces = Array(pK - P + 1);
let stocks = Array(2).fill(0).map(() => Array(8).fill(0));
let stockIndex = 0;

const sketch = (p: p5): void => {
  const isOutOfRange = (w: number, h: number): boolean => {
    return (w < 0 || h < 0 || w >= 9 || h >= 9);
  }

  const pieceType = (w: number, h: number): number => {
    return p.abs(board[h][w]);
  }

  const pieceSign = (w: number, h: number): number => {
    return Math.sign(board[h][w]);
  }

  const initMovable = (): void => {
    isMovable = Array(9).fill(false).map(() => Array(9).fill(false));
  }

  const showStock = (n: number): void => {
    p.push();
    const isSelf = n === 1;
    p.translate((isSelf ? 0 : 8 * block) + block / 2,
      isSelf ? screen + block * 5 / 2 : block * 3 / 2);
    p.rotate(isSelf ? 0 : p.PI);
    p.image(pieces[isSelf ? K : pK], 0, 0);
    p.fill('black');
    p.stroke('white');
    p.textSize(block / 4);
    for (let i = P; i <= G; i++) {
      const order = stockOrder[i];
      const stock = stocks[p.int(isSelf)][order];
      if (!stock) continue;
      p.image(pieces[order], (i + 1) * block, 0);
      p.text("×" + stock, i * block + block * 5 / 4, block / 4);
    }
    p.pop();
  }

  const showTurn = (): void => {
    const message = (turn === 1 ? "王" : "玉") +
      (gameEnds ? "の勝ちです" : "のターンです") +
      (isChecked() ? "\n王手されています" : "");
    p.push();
    p.noStroke();
    p.rectMode(p.CORNER);
    p.textSize(block / 2.75);
    p.textAlign(p.LEFT, p.TOP);
    p.fill('black');
    p.text(message, 0, 0);
    p.pop();
  }

  const promote = (w: number, h: number, sign: number): void => {
    const type = pieceType(w, h);
    if (type >= P && type <= B) {
      board[h][w] = sign * (type + 7);
    }
  }

  const askPromote = (): void => {
    if (window.confirm("成りますか？")) {
      promote(promoX, promoY, -turn);
      promoX = promoY = 10;
    }
    isPromoting = false;
    p.redraw();
  }

  const updatePlacable = (w: number, h: number): void => {
    initMovable();
    const type = pieceType(w, h);
    const sign = pieceSign(w, h);

    if (type === P) {
      if (pieceSign(w, h - sign) !== turn) {
        isMovable[h - sign][w] = true;
      }
    }

    if (type === L) {
      for (let i = h - sign; sign === 1 ? i >= 0 : i < 9; i -= sign) {
        if (pieceSign(w, i) === turn) break;
        isMovable[i][w] = true;
        if (pieceSign(w, i) !== 0) break;
      }
    }

    if (type === N) {
      for (let i = 1; i <= 3; i += 2) {
        const r = -sign * dx[i] + w;
        const c = -sign * dy[i] * 2 + h;

        if (isOutOfRange(r, c) || pieceSign(r, c) === sign) continue;
        isMovable[c][r] = true;
      }
    }

    if (type === S) {
      for (let i = 0; i < 8; i++) {
        if ([0, 4, 6].includes(i)) continue;
        const r = -sign * dx[i] + w;
        const c = -sign * dy[i] + h;

        if (isOutOfRange(r, c) || pieceSign(r, c) === sign) continue;
        isMovable[c][r] = true;
      }
    }

    if ([R, pR].includes(type)) {
      for (let i = 0; i < 8; i += 2) {
        for (let j = 1; j < 9; j++) {
          const r = j * dx[i] + w;
          const c = j * dy[i] + h;

          if (isOutOfRange(r, c) || pieceSign(r, c) === sign) break;
          isMovable[c][r] = true;
          if (pieceSign(r, c) !== 0) break;
        }
      }
    }

    if ([B, pB].includes(type)) {
      for (let i = 1; i < 9; i += 2) {
        for (let j = 1; j < p.floor(9 * p.sqrt(2)); j++) {
          const r = j * dx[i] + w;
          const c = j * dy[i] + h;

          if (isOutOfRange(r, c) || pieceSign(r, c) === sign) break;
          isMovable[c][r] = true;
          if (pieceSign(r, c) !== 0) break;
        }
      }
    }

    if ([G, pP, pL, pN, pS].includes(type)) {
      for (let i = 0; i < 8; i++) {
        if ([5, 7].includes(i)) continue;
        const r = -sign * dx[i] + w;
        const c = -sign * dy[i] + h;

        if (isOutOfRange(r, c) || pieceSign(r, c) === sign) continue;
        isMovable[c][r] = true;
      }
    }

    if ([pR, pB, K, pK].includes(type)) {
      for (let i = 0; i < 8; i++) {
        const r = dx[i] + w;
        const c = dy[i] + h;

        if (isOutOfRange(r, c) || pieceSign(r, c) === sign) continue;
        isMovable[c][r] = true;
      }
    }

    pieceX = w; pieceY = h;
  }

  const checkPiece = (w: number, h: number): void => {
    const type = pieceType(w, h);
    const sign = pieceSign(w, h);

    if (type === P) {
      if (pieceSign(w, h - sign) === turn) {
        checkedPieces.push(board[h - sign][w]);
      }
    }

    if (type === L) {
      for (let i = h - sign; sign === 1 ? i >= 0 : i < 9; i -= sign) {
        if (pieceSign(w, i) !== turn) break;
        checkedPieces.push(board[i][w]);
        if (pieceSign(w, i) !== 0) break;
      }
    }

    if (type === N) {
      for (let i = 1; i <= 3; i += 2) {
        const r = -sign * dx[i] + w;
        const c = -sign * dy[i] * 2 + h;

        if (isOutOfRange(r, c) || pieceSign(r, c) === sign) continue;
        checkedPieces.push(board[c][r]);
      }
    }

    if (type === S) {
      for (let i = 0; i < 8; i++) {
        if ([0, 4, 6].includes(i)) continue;
        const r = -sign * dx[i] + w;
        const c = -sign * dy[i] + h;

        if (isOutOfRange(r, c) || pieceSign(r, c) === sign) continue;
        checkedPieces.push(board[c][r]);
      }
    }

    if ([R, pR].includes(type)) {
      for (let i = 0; i < 8; i += 2) {
        for (let j = 1; j < 9; j++) {
          const r = j * dx[i] + w;
          const c = j * dy[i] + h;

          if (isOutOfRange(r, c) || pieceSign(r, c) === sign) break;
          checkedPieces.push(board[c][r]);
          if (pieceSign(r, c) !== 0) break;
        }
      }
    }

    if ([B, pB].includes(type)) {
      for (let i = 1; i < 9; i += 2) {
        for (let j = 1; j < p.floor(9 * p.sqrt(2)); j++) {
          const r = j * dx[i] + w;
          const c = j * dy[i] + h;

          if (isOutOfRange(r, c) || pieceSign(r, c) === sign) break;
          checkedPieces.push(board[c][r]);
          if (pieceSign(r, c) !== 0) break;
        }
      }
    }

    if ([G, pP, pL, pN, pS].includes(type)) {
      for (let i = 0; i < 8; i++) {
        if ([5, 7].includes(i)) continue;
        const r = -sign * dx[i] + w;
        const c = -sign * dy[i] + h;

        if (isOutOfRange(r, c) || pieceSign(r, c) === sign) continue;
        checkedPieces.push(board[c][r]);
      }
    }

    if ([pR, pB, K, pK].includes(type)) {
      for (let i = 0; i < 8; i++) {
        const r = dx[i] + w;
        const c = dy[i] + h;

        if (isOutOfRange(r, c) || pieceSign(r, c) === sign) continue;
        checkedPieces.push(board[c][r]);
      }
    }
  }

  const isChecked = (): boolean => {
    checkedPieces = [];
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (pieceSign(i, j) !== turn) {
          checkPiece(i, j);
        }
      }
    }
    return checkedPieces.includes(K) || checkedPieces.includes(-pK);
  }

  const putStock = (): void => {
    const piece = stockOrder[stockIndex];

    if (stocks[p.int(turn === 1)][piece] === 0)
      return;

    initMovable();
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        isMovable[j][i] = board[j][i] === 0;
      }
    }

    if (piece === P) {
      const b = JSON.parse(JSON.stringify(board));
      for (let i = 0; i < 9; i++) {
        for (let j = i; j < 9; j++) {
          const tmp = b[j][i];
          b[j][i] = b[i][j];
          b[i][j] = tmp;
        }
      }
      for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
          if (b[i].includes(turn * P)) {
            isMovable[j][i] = false;
          }
        }
        const k = turn === 1 ? 0 : 8;
        isMovable[k][i] = false;
      }
    }
    else if (piece === L) {
      for (let i = 0; i < 9; i++) {
        const j = turn === 1 ? 0 : 8;
        isMovable[j][i] = false;
      }
    }
    else if (piece === N) {
      for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 2; j++) {
          const k = turn === 1 ? j : 8 - j;
          isMovable[k][i] = false;
        }
      }
    }

    pieceX = pieceY = 10;
  }

  p.preload = (): void => {
    const paths = [
      "https://1.bp.blogspot.com/-53589yGRcUU/U82w_DNh1RI/AAAAAAAAjGU/0ve7q56YmcI/s800/syougi14_fuhyou.png",
      "https://3.bp.blogspot.com/-DUYCLVKvQO4/U82w-FvvaZI/AAAAAAAAjGE/zju84-vpMTQ/s800/syougi12_kyousya.png",
      "https://1.bp.blogspot.com/-Zujkkwua1iU/U82w9TIVPLI/AAAAAAAAjGM/-8QboZWuOcc/s800/syougi10_keima.png",
      "https://4.bp.blogspot.com/-CHmBXtrO_zc/U82w8BF3O-I/AAAAAAAAjFs/eHbceViqSes/s800/syougi08_ginsyou.png",
      "https://1.bp.blogspot.com/-52sD36-S3nQ/U82w4zREVII/AAAAAAAAjEw/HzythHxpYYM/s800/syougi03_hisya.png",
      "https://3.bp.blogspot.com/-bq3gmx2ylTA/U82w53WmfHI/AAAAAAAAjFA/n0ha_4JYOIc/s800/syougi05_gakugyou.png",
      "https://3.bp.blogspot.com/-ljsFK13guAo/U82w7BfkkdI/AAAAAAAAjFU/V0sajYGvgZU/s800/syougi07_kinsyou.png",
      "https://2.bp.blogspot.com/-amjFdOxkQjI/U82w_lwHJNI/AAAAAAAAjGg/mk5j9lbp5DA/s800/syougi15_tokin.png",
      "https://3.bp.blogspot.com/--DfrQ-6ac0E/U82w-wFYrlI/AAAAAAAAjGo/OBgDkPX6mpw/s800/syougi13_narikyou.png",
      "https://3.bp.blogspot.com/-9gpvNiM7nrM/U82w9twJotI/AAAAAAAAjGY/FmHCAQlKgUc/s800/syougi11_narikei.png",
      "https://3.bp.blogspot.com/-GW2BKIP77pI/U82w8XOtiJI/AAAAAAAAjFw/2ACHTS2thfQ/s800/syougi09_narigin.png",
      "https://1.bp.blogspot.com/-5N26c_Qz-S8/U82w5qZvpwI/AAAAAAAAjFE/A0efCoYymKI/s800/syougi04_ryuuou.png",
      "https://1.bp.blogspot.com/-n9yzuJR_EZU/U82w69_r1uI/AAAAAAAAjFY/_89I2XToJxA/s800/syougi06_ryuuma.png",
      "https://4.bp.blogspot.com/-fFzYwmdMYPE/U82w35c5DnI/AAAAAAAAjEs/CrITxcRP29w/s150/syougi01_ousyou.png",
      "https://2.bp.blogspot.com/-T6I2J8xV6Jo/U82w4ZPbWQI/AAAAAAAAjE8/IBiAdKwv3EA/s150/syougi02_gyokusyou.png",
    ];
    for (let i = P; i <= pK; i++) {
      pieces[i] = p.loadImage(paths[i - 1]);
    }
  }

  p.setup = (): void => {
    p.createCanvas(screen, 12 * block).parent('main');
    p.rectMode(p.CENTER);
    p.imageMode(p.CENTER);
    p.textSize(block * 3 / 4);
    p.textAlign(p.CENTER, p.CENTER);

    board = [
      [-L, -N, -S, -G, -pK, -G, -S, -N, -L],
      [0, -R, 0, 0, 0, 0, 0, -B, 0],
      [-P, -P, -P, -P, -P, -P, -P, -P, -P],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [+P, +P, +P, +P, +P, +P, +P, +P, +P],
      [0, +B, 0, 0, 0, 0, 0, +R, 0],
      [+L, +N, +S, +G, +K, +G, +S, +N, +L]
    ];
    turn = +1;
    initMovable();
    isPromoting = gameEnds = false;

    for (let i = P; i <= pK; i++) {
      pieces[i].resize(block - 10, block - 10);
    }

    p.noLoop();
  }

  p.draw = (): void => {
    (p as any).clear();

    p.fill('green');
    p.noStroke();
    p.rect(halfScreen, 1.5 * block, screen + 2, block);
    p.rect(halfScreen, 11.5 * block, screen + 2, block);
    showStock(1);
    showStock(-1);

    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        p.push();
        p.translate(i * block + block / 2, (j + 2) * block + block / 2);
        p.fill((i === pieceX && j === pieceY) || isMovable[j][i]
          ? 'forestgreen' : 'goldenrod');
        p.stroke('black');
        p.rect(0, 0, block, block);
        let k = board[j][i];
        if (k === 0) {
          p.pop();
          continue;
        }
        else if (k <= 0) {
          p.rotate(p.PI);
          k = -k;
        }
        p.image(pieces[k], 0, 0);
        p.pop();
      }
    }

    p.noFill();
    p.square(pieceX * block + block / 2,
      (pieceY + 2) * block + block / 2, block);

    showTurn();
  }

  p.mousePressed = (): void => {
    if (gameEnds || isPromoting) return;

    const r = p.floor(p.mouseX / block);
    const c = p.floor(p.mouseY / block) - 2;

    const selectedIndex = c === -1 ? p.abs(r - 8) - 1 : r - 1;
    if (((turn === 1 && c === 9) || (turn === -1 && c === -1)) &&
      stocks[p.int(turn === 1)][stockOrder[selectedIndex]] > 0) {
      stockIndex = selectedIndex;
      putStock();
      p.redraw();
      p.push();
      p.noFill();
      p.stroke('blue');
      p.square(r * block + block / 2, (c + 2) * block + block / 2, block);
      p.pop();
    }

    if (isOutOfRange(r, c)) return;

    if (board[c][r] !== 0 &&
      pieceSign(r, c) === turn) {
      updatePlacable(r, c);
    }

    if (isMovable[c][r]) {
      if (board[c][r] !== 0) {
        let type = pieceType(r, c);
        if (type >= pP && type <= pB) {
          type -= 7;
        }
        stocks[p.int(turn === 1)][type]++;
      }

      if (!isOutOfRange(pieceX, pieceY) &&
        board[pieceY][pieceX] !== 0) {
        if (pieceType(pieceX, pieceY) <= B &&
          ((turn === 1 && c <= 2) || (turn === -1 && c >= 6))) {
          isPromoting = true;
          promoX = r; promoY = c;
        }
      }

      gameEnds = pieceType(r, c) >= K;
      initMovable();

      if (isOutOfRange(pieceX, pieceY)) {
        const piece = turn * stockOrder[stockIndex];
        board[c][r] = piece;
        stocks[p.int(turn === 1)][p.abs(piece)]--;
      }
      else {
        board[c][r] = board[pieceY][pieceX];
        board[pieceY][pieceX] = 0;
        pieceX = pieceY = 10;
      }

      const piece = board[c][r];
      if (([+P, +L].includes(piece) && c === 0) ||
        ([-P, -L].includes(piece) && c === 8) ||
        (piece === +N && c <= 1) || (piece === -N && c >= 7)) {
        promote(r, c, turn);
        isPromoting = false;
      }

      if (!gameEnds && !isPromoting) turn = -turn;
    }

    p.redraw();

    if (!gameEnds && isPromoting) {
      turn = -turn;
      askPromote();
    }
  }
}

const Main: React.FC = () => {
  useEffect(() => { new p5(sketch) }, []);
  return (<div style={{
    textAlign: 'center',
    marginTop: (height - 13 * block) / 2,
  }} id='main' />);
}

export default App;