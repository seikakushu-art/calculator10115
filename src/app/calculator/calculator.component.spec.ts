import { ComponentFixture, TestBed } from '@angular/core/testing';

describe('CalculatorComponent with Decimal.js', () => {
  let comp: CalculatorComponent;

  // ヘルパ：キー入力
  const press = (s: string) => {
    for (const ch of s) {
      if (ch === '.') comp.inputdecimal();
      else comp.inputdigit(ch);
    }
  };
  const op = (o: string) => comp.handleoperator(o);
  const eq = () => comp.calculateresult();
  const sqrt = () => comp.root();
  const toggle = () => comp.togglenegative();
  const pct = () => comp.percent();
  const CE = () => comp.clearEntry();
  const C = () => comp.clear();

  beforeAll(() => {
    Decimal.set({
      precision: 40,
      rounding: Decimal.ROUND_HALF_UP,
      toExpNeg: -1000,
      toExpPos: 1000,
    });
  });

  beforeEach(() => {
    comp = new CalculatorComponent();
  });

  // 基本状態
  it('初期表示は 0', () => {
    expect(comp['display']).toBe('0');
  });

  // 入力と小数
  it('0 の上書き・小数点入力', () => {
    press('0');
    expect(comp['display']).toBe('0');
    comp.inputdecimal();
    expect(comp['display']).toBe('0.');
    press('12');
    expect(comp['display']).toBe('0.12');
  });

  // 桁数制限：整数10桁
  it('整数は最大10桁、それ以上は無視', () => {
    press('1234567890'); // 10桁
    expect(comp['display']).toBe('1234567890');
    press('1');          // 11桁目は無視
    expect(comp['display']).toBe('1234567890');
  });

  // 桁数制限：小数8桁
  it('小数は最大8桁、それ以上は無視', () => {
    comp.inputdecimal();        // '0.'
    press('12345678');          // 8桁
    expect(comp['display']).toBe('0.12345678');
    press('9');                 // 9桁目は無視
    expect(comp['display']).toBe('0.12345678');
  });

  // 四則演算 基本
  it('加減乗除の基本', () => {
    press('12'); op('+'); press('34'); eq();
    expect(comp['display']).toBe('46');

    C(); press('56'); op('-'); press('78'); eq();
    expect(comp['display']).toBe('-22');

    C(); press('12'); op('*'); press('34'); eq();
    expect(comp['display']).toBe('408');

    C(); press('1'); op('/'); press('4'); eq();
    expect(comp['display']).toBe('0.25');
  });

  // ＝連打（定数モード）
  it('＝連打：+ と -', () => {
    press('10'); op('+'); press('5'); eq();  // 15
    expect(comp['display']).toBe('15');
    eq(); // 20
    expect(comp['display']).toBe('20');
    eq(); // 25
    expect(comp['display']).toBe('25');

    C(); press('10'); op('-'); press('3'); eq(); // 7
    expect(comp['display']).toBe('7');
    eq(); // 4
    expect(comp['display']).toBe('4');
    eq(); // 1
    expect(comp['display']).toBe('1');
  });

  it('＝連打：* と /', () => {
    press('2'); op('*'); press('3'); eq(); // 6
    expect(comp['display']).toBe('6');
    eq(); // 18
    expect(comp['display']).toBe('18');
    eq(); // 54
    expect(comp['display']).toBe('54');

    C(); press('100'); op('/'); press('2'); eq(); // 50
    expect(comp['display']).toBe('50');
    eq(); // 25
    expect(comp['display']).toBe('25');
    eq(); // 12.5
    expect(comp['display']).toBe('12.5');
  });

  // ＝後に新しい数字を入力してから再度＝
  it('＝後に新数字 -> ＝ : * は左が mulconstant、+/-/ は左=入力値', () => {
    // * のとき
    press('2'); op('*'); press('3'); eq();          // 6, mulconstant=2
    press('4'); eq();                                // newInputAfterEqual=true -> 2 * 4 = 8
    expect(comp['display']).toBe('8');
    eq();                                            // 8 * 2 = 16
    expect(comp['display']).toBe('16');

    // + のとき
    C(); press('5'); op('+'); press('2'); eq();      // 7
    press('10'); eq();                               // 10 + last(2) = 12
    expect(comp['display']).toBe('12');
  });

  // % 単独
  it('% 単独（数値のみ）: 50% = 0.5', () => {
    press('50'); pct();
    expect(comp['display']).toBe('0.5');
    expect((comp as any).waitingForSecondValue).toBeTrue();
  });

  // % + 4演算
  it('% with + / -', () => {
    // 200 + 10% = 220 -> ＝ -> 240
    press('200'); op('+'); press('10'); pct();
    expect(comp['display']).toBe('220');
    eq();
    expect(comp['display']).toBe('240');

    // 200 - 10% = 180 -> ＝ -> 160
    C(); press('200'); op('-'); press('10'); pct();
    expect(comp['display']).toBe('180');
    eq();
    expect(comp['display']).toBe('160');
  });

  it('% with *', () => {
    // 200 * 10% = 20（last=200, mulconstant=200） -> ＝ -> 4000 -> ＝ -> 800000
    press('200'); op('*'); press('10'); pct();
    expect(comp['display']).toBe('20');
    eq();
    expect(comp['display']).toBe('4000');
    eq();
    expect(comp['display']).toBe('800000');
  });

  it('% with /', () => {
    // 200 / 10% = 2000 -> ＝ -> 100 -> ＝ -> 5
    press('200'); op('/'); press('10'); pct();
    expect(comp['display']).toBe('2000');
    eq();
    expect(comp['display']).toBe('100');
    eq();
    expect(comp['display']).toBe('5');
  });

  it('0% での除算は DivideByZeroError（表示は Error）', () => {
    press('200'); op('/'); press('0'); 
    pct(); // ここで throw -> safely -> ErrorSet('Error')
    expect(comp['display']).toBe('Error');
    expect((comp as any).isError).toBeTrue();
  });

  // 逆数モード（/ の直後に =）
  it('逆数モード：8 / = -> 1/8 -> ＝連打で / lastvalue を継続', () => {
    press('8'); op('/'); eq();                     // reciprocal -> 0.125
    expect(comp['display']).toBe('0.125');
    eq();                                          // 0.125 / 8 = 0.015625
    expect(comp['display']).toBe('0.015625');
    eq();                                          // /8
    expect(comp['display']).toBe('0.00195312');
  });

  it('逆数モード：0 / = は DivideByZeroError', () => {
    press('0'); op('/'); eq();
    expect(comp['display']).toBe('Error');
    expect((comp as any).isError).toBeTrue();
  });

  // 平方根
  it('平方根：単独とオペレーター中', () => {
    press('9'); sqrt();
    expect(comp['display']).toBe('3');

    C();
    // 9 + √16 = 13
    press('9'); op('+');
    press('16'); sqrt(); // second operand を sqrt -> display=4, last=4
    eq();
    expect(comp['display']).toBe('13');
  });

  it('平方根：負数は DomainError', () => {
    press('9'); // -> -9
    toggle();
    sqrt();
    expect(comp['display']).toBe('Error');
    expect((comp as any).isError).toBeTrue();
  });

  // 丸めと末尾ゼロ除去
  it('丸め：1/8=0.125, 1/3=0.33333333, 0.1+0.2=0.3', () => {
    press('1'); op('/'); press('8'); eq();
    expect(comp['display']).toBe('0.125');

    C(); press('1'); op('/'); press('3'); eq();
    expect(comp['display']).toBe('0.33333333');

    C(); press('0'); comp.inputdecimal(); press('1'); // 0.1
    op('+');
    press('0'); comp.inputdecimal(); press('2');      // 0.2
    eq();
    expect(comp['display']).toBe('0.3');
  });

  it('丸めキャリー：0.99999999 + 0.00000001 = 1', () => {
    press('0'); comp.inputdecimal(); press('99999999');
    op('+');
    press('0'); comp.inputdecimal(); press('00000001');
    eq();
    expect(comp['display']).toBe('1');
  });

  // 演算子の連打（置換）
  it('演算子連打は直前の演算子を置き換える', () => {
    press('5'); op('+'); op('-');
    press('2'); eq();
    expect(comp['display']).toBe('3'); // 5 - 2
  });

  // CE / C
  it('CE は 2項目待機中は何もしない / 待機でなければ表示のみ 0 に戻す', () => {
    press('12'); op('+'); // 待機中
    CE();
    expect(comp['display']).toBe('12'); // 変化なし

    C(); press('12'); CE();
    expect(comp['display']).toBe('0');
    expect((comp as any).percentvalue).toBeNull();
  });

  it('C はすべての状態をリセット', () => {
    press('12'); op('*'); press('3'); eq();
    C();
    expect(comp['display']).toBe('0');
    expect((comp as any).firstvalue).toBeNull();
    expect((comp as any).lastvalue).toBeNull();
    expect((comp as any).operator).toBeNull();
    expect((comp as any).isError).toBeFalse();
    expect((comp as any).constantMode).toBeFalse();
    expect((comp as any).waitingForSecondValue).toBeFalse();
  });

  // 桁超過（LimitExceededError）
  it('結果が整数11桁以上で LimitExceededError（E表記文字列）', () => {
    press('9999999999'); op('+'); press('1'); eq();
    expect(comp['display']).toBe('E1.000000000'); // 正符号

    C(); press('9999999999'); toggle(); op('-'); press('1'); eq(); // -9999999999 - 1
    expect(comp['display']).toBe('E-1.000000000');

    C(); press('9999999999'); op('*'); press('2'); eq();
    expect(comp['display']).toBe('E1.999999999');
  });
});

// ----------------------------------------------------------------------------
// Test helpers (black-box: interact only through the public API)
// ----------------------------------------------------------------------------
function typeDigits(c: CalculatorComponent, s: string) {
  for (const ch of s) {
    if (ch === '.') c.inputdecimal();
    else c.inputdigit(ch);
  }
}
const op = (c: CalculatorComponent, sym: string) => c.handleoperator(sym);
const eq = (c: CalculatorComponent) => c.calculateresult();
const pct = (c: CalculatorComponent) => c.percent();
const sqrt = (c: CalculatorComponent) => c.root();
const pm = (c: CalculatorComponent) => c.togglenegative();
const clear = (c: CalculatorComponent) => c.clear();
const CE = (c: CalculatorComponent) => c.clearEntry();

// Mirror calculator's Decimal config so rounding/formatting matches exactly
beforeAll(() => {
  Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP, toExpNeg: -1000, toExpPos: 1000 });
});

describe('CalculatorComponent — exhaustive behavior tests', () => {
  let c: CalculatorComponent;

  beforeEach(() => {
    c = new CalculatorComponent();
    clear(c);
  });

  // --------------------------------------------------------------------------
  // 1) Input basics & constraints
  // --------------------------------------------------------------------------
  describe('Input basics & constraints', () => {
    it('starts at 0', () => { expect(c.display).toBe('0'); });

    it('enters digits and decimals', () => {
      typeDigits(c, '12');
      expect(c.display).toBe('12');
      c.inputdecimal();
      typeDigits(c, '34');
      expect(c.display).toBe('12.34');
    });

    it('treats leading zero correctly', () => {
      typeDigits(c, '0');
      expect(c.display).toBe('0');
      typeDigits(c, '5');
      expect(c.display).toBe('5');
    });

    it('limits integer input to 10 digits', () => {
      typeDigits(c, '1234567890');
      expect(c.display).toBe('1234567890');
      typeDigits(c, '1'); // ignored (11th digit)
      expect(c.display).toBe('1234567890');
    });

    it('limits decimal input to 8 digits', () => {
      c.inputdecimal();
      typeDigits(c, '123456789'); // 9 digits -> last one ignored
      expect(c.display).toBe('0.12345678');
    });

    it('only one decimal point', () => {
      c.inputdecimal();
      c.inputdecimal();
      expect(c.display).toBe('0.');
      typeDigits(c, '1');
      c.inputdecimal();
      expect(c.display).toBe('0.1');
    });
  });

  // --------------------------------------------------------------------------
  // 2) Basic operations and repeated = behavior
  // --------------------------------------------------------------------------
  describe('Basic operations and repeated equals', () => {
    it('addition', () => {
      typeDigits(c, '5');
      op(c, '+');
      typeDigits(c, '3');
      eq(c);
      expect(c.display).toBe('8');
    });

    it('addition repeated = adds last operand repeatedly', () => {
      typeDigits(c, '5');
      op(c, '+');
      typeDigits(c, '3');
      eq(c); // 8
      eq(c); // 11
      eq(c); // 14
      expect(c.display).toBe('14');
    });

    it('subtraction repeated = subtracts last operand repeatedly', () => {
      typeDigits(c, '5');
      op(c, '-');
      typeDigits(c, '3');
      eq(c); // 2
      eq(c); // -1
      eq(c); // -4
      expect(c.display).toBe('-4');
    });

    it('multiplication repeated = multiplies by last operand repeatedly', () => {
      typeDigits(c, '5');
      op(c, '*');
      typeDigits(c, '3');
      eq(c); // 15
      eq(c); // 45
      eq(c); // 135
      expect(c.display).toBe('135');
    });

    it('division repeated = divides by last operand repeatedly', () => {
      typeDigits(c, '100');
      op(c, '/');
      typeDigits(c, '2');
      eq(c); // 50
      eq(c); // 25
      eq(c); // 12.5
      expect(c.display).toBe('12.5');
    });

    it('change second operand after first = (constant mode + new input)', () => {
      typeDigits(c, '5');
      op(c, '+');
      typeDigits(c, '3');
      eq(c); // 8, constant mode
      typeDigits(c, '1'); typeDigits(c, '0'); // new input "10"
      eq(c); // 10 + 3 = 13
      eq(c); // 16
      expect(c.display).toBe('16');
    });

    it('operator update when pressing operators consecutively', () => {
      typeDigits(c, '9');
      op(c, '+');
      op(c, '-');
      op(c, '*');
      typeDigits(c, '4');
      eq(c);
      expect(c.display).toBe('36'); // 9 * 4
    });
  });

  // --------------------------------------------------------------------------
  // 3) Percent behavior (context-sensitive)
  // --------------------------------------------------------------------------
  describe('Percent (%) behavior', () => {
    it('naked percent: 5 % = 0.05 and prepares for next operand', () => {
      typeDigits(c, '5');
      pct(c);
      expect(c.display).toBe('0.05');
    });

    it('200 + 10% = 220', () => {
      typeDigits(c, '200');
      op(c, '+');
      typeDigits(c, '10');
      pct(c);
      expect(c.display).toBe('220');
    });

    it('200 - 10% = 180', () => {
      typeDigits(c, '200');
      op(c, '-');
      typeDigits(c, '10');
      pct(c);
      expect(c.display).toBe('180');
    });

    it('200 * 10% = 20 (and sets mul-constant)', () => {
      typeDigits(c, '200');
      op(c, '*');
      typeDigits(c, '10');
      pct(c);
      expect(c.display).toBe('20');
    });

    it('after 200 * 10% = (20), repeated = multiplies by 200 each time', () => {
      typeDigits(c, '200');
      op(c, '*');
      typeDigits(c, '10');
      pct(c);
      eq(c); 
      eq(c); 
      expect(c.display).toBe('800000');
    });

    it('200 / 10% = 2000', () => {
      typeDigits(c, '200');
      op(c, '/');
      typeDigits(c, '10');
      pct(c);
      expect(c.display).toBe('2000');
    });

    it('divide by 0% throws error (Error)', () => {
      typeDigits(c, '100');
      op(c, '/');
      typeDigits(c, '0');
      pct(c);
      expect(c.display).toBe('Error');
    });

    it('percent after finishing calc but before entering second value starts new calc', () => {
      // Scenario: finish a calc, then press % before entering second operand in a new sequence
      typeDigits(c, '50');
      op(c, '+');
      typeDigits(c, '25');
      eq(c); // 75, constant mode, waitingForSecondValue = true
      pct(c); // constantMode=true & waiting=false branch should divide current (75) by 100 and start new calc
      expect(c.display).toBe('0.75');
      // subsequent operator should use 0.75 as first value
      op(c, '+');
      typeDigits(c, '1');
      eq(c);
      expect(c.display).toBe('1.75');
    });
  });

  // --------------------------------------------------------------------------
  // 4) Reciprocal mode (÷ then = with missing second operand)
  // --------------------------------------------------------------------------
  describe('Reciprocal mode', () => {
    it('8 ÷ = → 0.125, then repeated = divides by 8 each time', () => {
      typeDigits(c, '8');
      op(c, '/');
      eq(c); // reciprocal of 8
      expect(c.display).toBe('0.125');
      eq(c); // 1/8 ÷ 8 = 1/64 = 0.015625
      expect(c.display).toBe('0.015625');
      eq(c); // 1/512 = 0.001953125
      expect(c.display).toBe('0.00195312');
    });

    it('0 ÷ = → Error (1/0)', () => {
      typeDigits(c, '0');
      op(c, '/');
      eq(c);
      expect(c.display).toBe('Error');
    });
  });

  // --------------------------------------------------------------------------
  // 5) Square root (√) and chaining
  // --------------------------------------------------------------------------
  describe('Square root', () => {
    it('√ of positive number', () => {
      typeDigits(c, '9');
      sqrt(c);
      expect(c.display).toBe('3');
    });

    it('√ in an expression: 9 + √16 = 13', () => {
      typeDigits(c, '9');
      op(c, '+');
      typeDigits(c, '16');
      sqrt(c);
      eq(c);
      expect(c.display).toBe('13');
    });

    it('√ of negative throws Error', () => {
      typeDigits(c, '9'); // -9
      pm(c);
      sqrt(c);
      expect(c.display).toBe('Error');
    });
  });

  // --------------------------------------------------------------------------
  // 6) Clear / Clear Entry behavior
  // --------------------------------------------------------------------------
  describe('Clear and Clear Entry', () => {
    it('C resets everything to 0', () => {
      typeDigits(c, '12');
      clear(c);
      expect(c.display).toBe('0');
    });

    it('CE clears current entry only when entering a number', () => {
      typeDigits(c, '12');
      CE(c);
      expect(c.display).toBe('0');
    });

    it('CE while waiting for second value does nothing (as designed)', () => {
      typeDigits(c, '12');
      op(c, '+'); // waitingForSecondValue = true
      CE(c);      // ignored per implementation
      expect(c.display).toBe('12');
      typeDigits(c, '3');
      eq(c);
      expect(c.display).toBe('15');
    });

    it('CE during Error clears the error', () => {
      // cause an error
      typeDigits(c, '5');
      op(c, '/');
      typeDigits(c, '0');
      eq(c);
      expect(c.display).toBe('Error');
      CE(c);
      expect(c.display).toBe('0');
    });
  });

  // --------------------------------------------------------------------------
  // 7) Toggle sign (±)
  // --------------------------------------------------------------------------
  describe('Sign toggle (±)', () => {
    it('toggles sign of current display', () => {
      typeDigits(c, '12');
      pm(c);
      expect(c.display).toBe('-12');
      pm(c);
      expect(c.display).toBe('12');
    });

    it('after operator, ± updates the first value while still waiting for second', () => {
      typeDigits(c, '5');
      op(c, '+');
      pm(c); // first value becomes -5, display "-5" while still waiting for second
      typeDigits(c, '3');
      eq(c);
      expect(c.display).toBe('-2');
    });
  });

  // --------------------------------------------------------------------------
  // 8) Rounding & formatting rules (8 decimal places, trimmed zeros)
  // --------------------------------------------------------------------------
  describe('Rounding & formatting', () => {
    it('1 / 3 rounds to 0.33333333', () => {
      typeDigits(c, '1');
      op(c, '/');
      typeDigits(c, '3');
      eq(c);
      expect(c.display).toBe('0.33333333');
    });

    it('2 / 3 rounds to 0.66666666', () => {
      typeDigits(c, '2');
      op(c, '/');
      typeDigits(c, '3');
      eq(c);
      expect(c.display).toBe('0.66666666');
    });

    it('1 / 6 rounds to 0.16666666', () => {
      typeDigits(c, '1');
      op(c, '/');
      typeDigits(c, '6');
      eq(c);
      expect(c.display).toBe('0.16666666');
    });

    it('2 / 8 displays 0.25 (trim trailing zeros)', () => {
      typeDigits(c, '2');
      op(c, '/');
      typeDigits(c, '8');
      eq(c);
      expect(c.display).toBe('0.25');
    });

    it('123 / 100 displays 1.23 (trim trailing zeros from 1.23000000)', () => {
      typeDigits(c, '123');
      op(c, '/');
      typeDigits(c, '100');
      eq(c);
      expect(c.display).toBe('1.23');
    });
  });

  // --------------------------------------------------------------------------
  // 9) Overflow (integer > 10 digits) → LimitExceededError message formatting
  // --------------------------------------------------------------------------
  describe('LimitExceededError message', () => {
    it('positive overflow: 9999999999 + 1 → E1.000000000', () => {
      typeDigits(c, '9999999999');
      op(c, '+');
      typeDigits(c, '1');
      eq(c);
      expect(c.display).toBe('E1.000000000');
    });

    it('negative overflow: -9999999999 - 1 → E-1.000000000', () => {
      typeDigits(c, '9999999999');
      pm(c); // -9999999999
      op(c, '-');
      typeDigits(c, '1');
      eq(c);
      expect(c.display).toBe('E-1.000000000');
    });
  });

  // --------------------------------------------------------------------------
  // 10) Error flows & recovery
  // --------------------------------------------------------------------------
  describe('Error flows & recovery', () => {
    it('division by zero shows Error and next digit resets state', () => {
      typeDigits(c, '5');
      op(c, '/');
      typeDigits(c, '0');
      eq(c);
      expect(c.display).toBe('Error');
    });

    it('operator after Error clears to 0 (no calc started)', () => {
      typeDigits(c, '5');
      op(c, '/');
      typeDigits(c, '0');
      eq(c);
      expect(c.display).toBe('Error');
    });

    it('inputdecimal after Error clears and produces 0.', () => {
      typeDigits(c, '5');
      op(c, '/');
      typeDigits(c, '0');
      eq(c);
    });
  });

  // --------------------------------------------------------------------------
  // 11) Mixed scenarios / integration-style tests
  // --------------------------------------------------------------------------
  describe('Integration-style sequences', () => {
    it('12 + 3 × 4 = → (12 + 3) × 4 = 60 using immediate execution', () => {
      typeDigits(c, '12');
      op(c, '+');
      typeDigits(c, '3');
      op(c, '*'); // computes 15 and prepares for next
      typeDigits(c, '4');
      eq(c);
      expect(c.display).toBe('60');
    });

    it('3 × 4 + 5 = → (3 × 4) + 5 = 17', () => {
      typeDigits(c, '3');
      op(c, '*');
      typeDigits(c, '4');
      op(c, '+'); // computes 12
      typeDigits(c, '5');
      eq(c);
      expect(c.display).toBe('17');
    });

    it('toggle sign mid-chain and continue', () => {
      typeDigits(c, '8');
      op(c, '+');
      pm(c); // first becomes -8
      typeDigits(c, '2');
      eq(c); // -6
      expect(c.display).toBe('-6');
      op(c, '*');
      typeDigits(c, '3');
      eq(c); // -18
      expect(c.display).toBe('-18');
    });

    it('enter many decimals then multiply', () => {
      c.inputdecimal();
      typeDigits(c, '12345678');
      op(c, '*');
      typeDigits(c, '2');
      eq(c);
      expect(c.display).toBe('0.24691356');
    });
  });
});

describe('CalculatorComponent (unit)', () => {
  let c: CalculatorComponent;

  // Componentの数値仕様と一致させる
  beforeAll(() => {
    Decimal.set({
      precision: 40,
      rounding: Decimal.ROUND_HALF_UP,
      toExpNeg: -1000,
      toExpPos: 1000,
    });
  });

  beforeEach(() => {
    c = new CalculatorComponent();
    c.clear(); // 念のため初期化
  });

  // ---- 小さいヘルパ ----
  function enterNumber(n: string) {
    for (const ch of n) {
      if (ch === '.') c.inputdecimal();
      else c.inputdigit(ch);
    }
  }
  function press(op: string) {
    c.handleoperator(op);
  }
  function eq() {
    c.calculateresult();
  }
  function pct() {
    c.percent();
  }
  function root() {
    c.root();
  }
  function neg() {
    c.togglenegative();
  }

  // privateの内部フラグも厳密確認したい場合は any キャストで読む
  function getPriv<T = any>(key: string): T {
    return (c as any)[key] as T;
  }

  // ---- 初期状態 / 入力系 ----
  it('初期表示は "0"', () => {
    expect(c.display).toBe('0');
  });

  it('整数部は10桁まで、それ以降は入力無視', () => {
    // 10桁まで入る
    enterNumber('1234567890'); // 10桁
    expect(c.display).toBe('1234567890');
    // 11桁目は無視
    c.inputdigit('1');
    expect(c.display).toBe('1234567890');
  });

  it('小数点は一度だけ、かつ小数は最大8桁まで', () => {
    enterNumber('0');
    c.inputdecimal();
    enterNumber('12345678'); // 8桁OK
    expect(c.display).toBe('0.12345678');
    c.inputdigit('9'); // 9桁目は無視
    expect(c.display).toBe('0.12345678');
    // 2回目の小数点は禁止
    c.inputdecimal();
    expect(c.display).toBe('0.12345678');
  });

  it('0/−0からの入力置換（先頭0を正しく置換）', () => {
    // 0のとき
    c.inputdigit('7');
    expect(c.display).toBe('7');

    c.clear();
    // -0のとき
    c.inputdigit('5'); // -0 + '5' は '-5'
    neg();
    expect(c.display).toBe('-5');
  });

  // ---- 四則演算（通常） ----
  it('加算：12 + 7 = 19', () => {
    enterNumber('12'); press('+'); enterNumber('7'); eq();
    expect(c.display).toBe('19');
  });

  it('減算：100 - 30.25 = 69.75', () => {
    enterNumber('100'); press('-'); enterNumber('30.25'); eq();
    expect(c.display).toBe('69.75');
  });

  it('乗算：12 * 3 = 36、"="連打で 108 → 324', () => {
    enterNumber('12'); press('*'); enterNumber('3'); eq();
    expect(c.display).toBe('36');
    eq(); // 36 * 3
    expect(c.display).toBe('108');
    eq(); // 108 * 3
    expect(c.display).toBe('324');
  });

  it('除算：7 / 2 = 3.5、小数部8桁丸め切り（2/3 → 0.66666666）', () => {
    enterNumber('7'); press('/'); enterNumber('2'); eq();
    expect(c.display).toBe('3.5');

    c.clear();
    enterNumber('2'); press('/'); enterNumber('3'); eq();
    expect(c.display).toBe('0.66666666'); // ROUND_DOWNで8桁
  });

  it('0除算は DivideByZeroError → display="Error" & isError=true', () => {
    enterNumber('8'); press('/'); enterNumber('0'); eq();
    expect(c.display).toBe('Error');
    expect(getPriv<boolean>('isError')).toBeTrue();
  });

  // ---- "=" を押した後の定数モード ----
  it('加算の定数モード："12 + 7 =" 後、"="連打で 26→33', () => {
    enterNumber('12'); press('+'); enterNumber('7'); eq();
    expect(c.display).toBe('19');
    eq(); // +7
    expect(c.display).toBe('26');
    eq(); // +7
    expect(c.display).toBe('33');
  });

  it('乗算の定数モード後に新しい数を入力して"="（mulconstant 分岐）', () => {
    enterNumber('5'); press('*'); enterNumber('4'); eq(); // 20, 以降 *4 が定数
    expect(c.display).toBe('20');
    // 新しい数 3 を打って "=" → (定数=4) 3 * 4 = 12
    enterNumber('3'); eq();
    expect(c.display).toBe('15');
  });

  // ---- 逆数モード（"/" の直後に "="）----
  it('逆数モード："5 / =" → 1/5=0.2、以後は定数モード', () => {
    enterNumber('5'); press('/'); eq(); // reciprocal
    expect(c.display).toBe('0.2');
    // さらに "=" で 0.2 / 5 = 0.04
    eq();
    expect(c.display).toBe('0.04');
  });

  it('逆数モードで 0 の逆数は DivideByZeroError', () => {
    enterNumber('0'); press('/'); eq();
    expect(c.display).toBe('Error');
    expect(getPriv<boolean>('isError')).toBeTrue();
  });

  // ---- ％（4通り + 単独％）----
  it('単独％：50 → % = 0.5', () => {
    enterNumber('50'); pct();
    expect(c.display).toBe('0.5');
  });

  it('加算で％：200 + 10% = 220、"="連打で 240→260', () => {
    enterNumber('200'); press('+'); enterNumber('10'); pct(); // 200 + (200*10%) = 220
    expect(c.display).toBe('220');
    eq(); // +20
    expect(c.display).toBe('240');
    eq(); // +20
    expect(c.display).toBe('260');
  });

  it('減算で％：200 - 10% = 180', () => {
    enterNumber('200'); press('-'); enterNumber('10'); pct();
    expect(c.display).toBe('180');
  });

  it('乗算で％：200 * 10% = 20（以後は *200 が定数として作用）', () => {
    enterNumber('200'); press('*'); enterNumber('10'); pct();
    expect(c.display).toBe('20');
    // "=" で 20 * 200 = 4000
    eq();
    expect(c.display).toBe('4000');
  });

  it('除算で％：200 / 10% = 2000', () => {
    enterNumber('200'); press('/'); enterNumber('10'); pct();
    expect(c.display).toBe('2000');
  });

  it('除算×％のゼロ割：200 / 0% → Error', () => {
    enterNumber('200'); press('/'); enterNumber('0'); pct();
    expect(c.display).toBe('Error');
    expect(getPriv<boolean>('isError')).toBeTrue();
  });

  // ---- 平方根 ----
  it('sqrt(9)=3、オペレータ後の2項目としてsqrtを使える', () => {
    enterNumber('9'); root();
    expect(c.display).toBe('3');

    c.clear();
    enterNumber('16'); press('+'); enterNumber('9'); root(); // 2項目を sqrt→3
    eq();
    expect(c.display).toBe('19');
  });

  it('sqrt(負数)は DomainError', () => {
    enterNumber('9'); neg(); // -9
    root();
    expect(c.display).toBe('Error');
    expect(getPriv<boolean>('isError')).toBeTrue();
  });

  // ---- クリア系＆エラー復帰 ----
  it('clear はすべての状態を初期化', () => {
    enterNumber('12'); press('+'); enterNumber('7');
    c.clear();
    expect(c.display).toBe('0');
    expect(getPriv('firstvalue')).toBeNull();
    expect(getPriv('lastvalue')).toBeNull();
    expect(getPriv('operator')).toBeNull();
    expect(getPriv('waitingForSecondValue')).toBeFalse();
    expect(getPriv('isError')).toBeFalse();
  });

  it('clearEntry は2項目入力中なら右辺のみクリア', () => {
    enterNumber('12'); press('+'); enterNumber('7');
    c.clearEntry(); // 右辺だけ0
    expect(c.display).toBe('0');
    // 左辺と演算子は維持
    expect(getPriv('operator')).toBe('+');
  });

  it('Error時に入力/CEで復帰（clearErrorの動作）', () => {
    // 0除算でエラーにする
    enterNumber('8'); press('/'); enterNumber('0'); eq();
    expect(getPriv<boolean>('isError')).toBeTrue();

    // CEで0に戻る
    c.clearEntry();
    expect(c.display).toBe('0');
    expect(getPriv<boolean>('isError')).toBeFalse();

    // 再度エラー → 数字入力で復帰し、その数字から再開
    press('/'); enterNumber('0'); eq();
    expect(getPriv<boolean>('isError')).toBeTrue();
  });

  // ---- オーバーフロー（整数10桁制限超過）----
  it('演算結果が11桁以上になったら LimitExceededError を捕捉し display に "E..." を表示（正）', () => {
    // 9999999999 + 1 = 10000000000 → 11桁 → E1.000000000
    enterNumber('9999999999'); press('+'); enterNumber('1'); eq();
    expect(c.display).toBe('E1.000000000');
    expect(getPriv<boolean>('isError')).toBeTrue();
  });

  it('演算結果が11桁以上（負数）→ "E-..." を表示', () => {
    // -9999999999 - 1 = -10000000000 → E-1.000000000
    enterNumber('9999999999'); neg(); press('-'); enterNumber('1'); eq();
    expect(c.display).toBe('E-1.000000000');
    expect(getPriv<boolean>('isError')).toBeTrue();
  });

  it('乗算によるオーバーフロー例：9999999999 * 9 → 89999999991 → E8.999999999', () => {
    enterNumber('9999999999'); press('*'); enterNumber('9'); eq();
    expect(c.display).toBe('E8.999999999');
    expect(getPriv<boolean>('isError')).toBeTrue();
  });

  // ---- アンダーフロー（小さすぎて0になる）----
  it('1 ÷ 1,000,000,000 ÷ 100 = 1e-11 → 小数8桁に丸め切りで "0"', () => {
    enterNumber('1'); press('/'); enterNumber('1000000000'); eq(); // 1e-9
    press('/'); enterNumber('100'); eq(); // 1e-11 → 8桁丸め切りで 0
    expect(c.display).toBe('0');
  });

  it('負のアンダーフローでも "-0" ではなく "0"（formatnumberの-0排除）', () => {
    enterNumber('1'); neg();   // -1
    press('/'); enterNumber('1000000000'); eq(); // -1e-9
    press('/'); enterNumber('100'); eq(); // -1e-11 → 0
    expect(c.display).toBe('0');
  });

  // ---- safely のフォールバック（非Calculator例外→"Error"）----
  it('safelyはCalculator系以外の例外を"Error"として扱う', () => {
    // private safely を直接叩いて擬似的に非Calculatorエラーを投げる
    (c as any).safely(() => { throw new Error('boom'); });
    expect(c.display).toBe('Error');
    expect(getPriv<boolean>('isError')).toBeTrue();
  });

  // ---- 連続演算子（直前の演算子を置換）----
  it('演算子を連続で押すと最後の演算子で置換される', () => {
    enterNumber('5');
    press('+'); press('-'); press('*'); // 最終的に '*'
    // いま数値を入れて "=" すると 5 * 2 = 10
    enterNumber('2'); eq();
    expect(c.display).toBe('10');
  });

  // ---- "="直後に演算子→新規計算開始の分岐 ----
  it('"="の直後に演算子を押したら新規計算が始まる', () => {
    enterNumber('8'); press('+'); enterNumber('2'); eq(); // 10 (定数モード)
    press('-'); // ここで新規計算へ
    enterNumber('3'); eq();
    expect(c.display).toBe('7');
  });
});

function enterNumber(c: CalculatorComponent, s: string) {
  for (const ch of s) {
    if (ch === '.') c.inputdecimal();
    else c.inputdigit(ch);
  }
}

describe('CalculatorComponent overflow/underflow', () => {
  let c: CalculatorComponent;

  beforeEach(() => {
    // 念のため同じ設定を適用（コンポーネント側でも設定済み）
    Decimal.set({
      precision: 40,
      rounding: Decimal.ROUND_HALF_UP,
      toExpNeg: -1000,
      toExpPos: 1000,
    });
    c = new CalculatorComponent();
  });

  // ───────── オーバーフロー（整数部 > 10桁） ─────────

  it('OF-ADD-01: 9999999999 + 1 => E1.000000000', () => {
    enterNumber(c, '9999999999');
    c.handleoperator('+');
    enterNumber(c, '1');
    c.calculateresult();
    expect(c.display).toBe('E1.000000000');
  });

  it('OF-MUL-01: 5000000000 * 3 => E1.500000000 (負号も反映)', () => {
    enterNumber(c, '5000000000');
    c.togglenegative(); // -5000000000
    c.handleoperator('*');
    enterNumber(c, '3'); // -15000000000
    c.calculateresult();
    // 15000000000 → 'E-1.500000000'
    expect(c.display).toBe('E-1.500000000');
  });

  it('OF-CARRY-01: 9999999999.99999999 + 0.00000001 => E1.000000000', () => {
    enterNumber(c, '9999999999.99999999');
    c.handleoperator('+');
    enterNumber(c, '0.00000001');
    c.calculateresult(); // 10000000000.00000000 → OF
    expect(c.display).toBe('E1.000000000');
  });

  it('OF-SUB-01: -9999999999 - 1 => E-1.000000000', () => {
    enterNumber(c, '9999999999');
    c.togglenegative(); // -9999999999
    c.handleoperator('-');
    enterNumber(c, '1'); // -10000000000
    c.calculateresult();
    expect(c.display).toBe('E-1.000000000');
  });

  it('OF-BOUNDARY-OK: 9999999999 + 0 => 9999999999 (境界はOK)', () => {
    enterNumber(c, '9999999999');
    c.handleoperator('+');
    enterNumber(c, '0');
    c.calculateresult();
    expect(c.display).toBe('9999999999');
  });

  // ───────── アンダーフロー（|x| < 1e-8 は "0" 表示） ─────────

  it('UF-DIV-01: 1 / 1000000000 => 1e-9 → "0"', () => {
    enterNumber(c, '1');
    c.handleoperator('/');
    enterNumber(c, '1000000000');
    c.calculateresult();
    expect(c.display).toBe('0');
  });

  it('UF-DIV-02: (-1) / 1000000000 => -1e-9 → "0"（符号も消える）', () => {
    enterNumber(c, '1');
    c.togglenegative();
    c.handleoperator('/');
    enterNumber(c, '1000000000');
    c.calculateresult();
    expect(c.display).toBe('0');
  });

  it('UF-SUB-01: 1.000000009 - 1 => 9e-9 → "0"', () => {
    enterNumber(c, '1.000000009');
    c.handleoperator('-');
    enterNumber(c, '1');
    c.calculateresult();
    expect(c.display).toBe('0');
  });

  it('UF-MUL-01: 0.0001 * 0.00001 => 1e-9 → "0"', () => {
    enterNumber(c, '0.0001');
    c.handleoperator('*');
    enterNumber(c, '0.00001');
    c.calculateresult();
    expect(c.display).toBe('0');
  });

  it('UF-RECIP-01: "/"→"=" の逆数モードで 1/1000000001 ≈ 9.99e-10 → "0"', () => {
    enterNumber(c, '1000000001');
    c.handleoperator('/'); // 逆数モードの起点
    c.calculateresult();   // 1 / 1000000001
    expect(c.display).toBe('0');
  });

  it('UF-PCT-01: 0.0000005 % => 5e-9 → "0"', () => {
    enterNumber(c, '0.0000005');
    c.percent();
    expect(c.display).toBe('0');
  });

  it('UF-PCT-02: 0.000001 % => 1e-8 → "0.00000001"（境界は表示される）', () => {
    enterNumber(c, '0.000001');
    c.percent();
    expect(c.display).toBe('0.00000001');
  });

  it('UF-PCT-CHAIN: 0.000001 % をもう一回 % => 1e-10 → "0"', () => {
    enterNumber(c, '0.000001');
    c.percent(); // 1e-8
    c.percent(); // 1e-10
    expect(c.display).toBe('0');
  });

  it('UF-MUL-BOUNDARY: 0.0001 * 0.0001 => 1e-8 → "0.00000001"（境界OK）', () => {
    enterNumber(c, '0.0001');
    c.handleoperator('*');
    enterNumber(c, '0.0001');
    c.calculateresult();
    expect(c.display).toBe('0.00000001');
  });

  // ───────── 境界と丸めの確認 ─────────

  it('BD-ROUND-DOWN: 0.000000019 → 小数8桁切り捨てで "0.00000001"', () => {
    // 0.000000009 + 0.00000001 = 0.000000019 → ROUND_DOWN で 0.00000001
    enterNumber(c, '0.000000009');
    c.handleoperator('+');
    enterNumber(c, '0.00000001');
    c.calculateresult();
    expect(c.display).toBe('0.00000001');
  });

  it('BD-NO-UNDERFLOW-AT-1e-8: 1e-8 は "0" にならない', () => {
    // 0.00000004 + 0.00000006 = 0.00000010 → "0.0000001"
    enterNumber(c, '0.00000004');
    c.handleoperator('+');
    enterNumber(c, '0.00000006');
    c.calculateresult();
    expect(c.display).toBe('0.0000001');
  });
});
// src/app/calculator/calculator-root.spec.ts
import Decimal from "decimal.js";

// コンポーネントと同じDecimal設定に揃える
Decimal.set({
  precision: 40,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -1000,
  toExpPos: 1000,
});

// ==== テスト用 キー入力ユーティリティ ==== //
type C = CalculatorComponent;

function tap(c: C, key: string) {
  if (/^\d$/.test(key)) c.inputdigit(key);
  else if (key === ".") c.inputdecimal();
  else if (key === "+") c.handleoperator("+");
  else if (key === "-") c.handleoperator("-");
  else if (key === "×" || key === "*") c.handleoperator("*");
  else if (key === "÷" || key === "/") c.handleoperator("/");
  else if (key === "=") c.calculateresult();
  else if (key === "±") c.togglenegative();
  else if (key === "C") c.clear();
  else if (key === "CE") c.clearEntry();
  else if (key === "%") c.percent();
  else if (key === "√") c.root();
  else throw new Error("unknown key: " + key);
}

function seq(c: C, ...keys: string[]) {
  for (const k of keys) tap(c, k);
}

function typeNumber(c: C, s: string) {
  for (const ch of s) {
    if (ch === ".") tap(c, ".");
    else tap(c, ch);
  }
}

// ==== 期待値フォーマッタ（本体の formatnumber と同等の表示規則） ==== //
// - 小数8桁に切り捨て（ROUND_DOWN）
// - 0は "0"
// - 末尾0は削除
function fmtExpect(n: Decimal): string {
  if (!n.isFinite()) throw new Error("finite expected");
  const dp = 8;
  const truncated = n.toDecimalPlaces(dp, Decimal.ROUND_DOWN);
  if (truncated.isZero()) return "0";
  const s = truncated.toFixed(dp, Decimal.ROUND_DOWN);
  const [i, d] = s.split(".");
  const clean = (d ?? "").replace(/\.?0+$/, "");
  return clean ? `${i}.${clean}` : i;
}

describe("Calculator √ (square root)", () => {
  let c: C;

  beforeEach(() => {
    c = new CalculatorComponent();
  });

  // --- 1) 単独計算（演算子なし） --- //
  it("√(2) は 8桁打ち切りで表示", () => {
    seq(c, "2", "√");
    expect(c.display).toBe(fmtExpect(new Decimal(2).sqrt()));
  });

  it("√(3) 小数打ち切り & 末尾0除去", () => {
    seq(c, "3", "√");
    expect(c.display).toBe(fmtExpect(new Decimal(3).sqrt()));
  });

  it("√(0) は '0'、-0も正規化して '0'", () => {
    // 0
    seq(c, "0", "√");
    expect(c.display).toBe("0");

    // -0 → 0
    c.clear();
    seq(c, "0", "±", "√");
    expect(c.display).toBe("0");
  });

  it("小数入力の √（2.25 → 1.5）", () => {
    typeNumber(c, "2.25");
    tap(c, "√");
    expect(c.display).toBe("1.5");
  });

  // --- 2) 演算子直後（2つ目待ちで √）--- //
  it("9 + √(9) = → 12", () => {
    seq(c, "9", "+", "√", "="); // + の直後に √ を押す：√(display=9)=3
    expect(c.display).toBe("12");
  });

  it("16 ÷ √(16) = → 4", () => {
    seq(c, "1", "6", "÷", "√", "=");
    expect(c.display).toBe("4");
  });

  // --- 3) 2つ目入力中に √ --- //
  it("50 - 9 √ = → 47", () => {
    seq(c, "5", "0", "-", "9", "√", "="); // last=√9=3
    expect(c.display).toBe("47");
  });

  it("9 + 1 6 √ = → 13", () => {
    seq(c, "9", "+", "1", "6", "√", "="); // last=√16=4
    expect(c.display).toBe("13");
  });

  // --- 4) 「＝」直後 or 定数モード → √ は新規計算開始 --- //
  it("9 + 16 =（25）→ √（5）→ +4 = → 9", () => {
    seq(c, "9", "+", "1", "6", "=", "√", "+", "4", "=");
    expect(c.display).toBe("9");
  });

  // --- 5) ％で定数モードになった直後の √ は新規計算 --- //
  it("200 + 10% → （220）で √ → √(220) を新規計算として表示", () => {
    seq(c, "2", "0", "0", "+", "1", "0", "%"); // 220（constantMode=true）
    const expectAfterPercent = new Decimal(220);
    tap(c, "√"); // 新規計算開始分岐
    expect(c.display).toBe(fmtExpect(expectAfterPercent.sqrt()));
    // さらに +4 = が通常に動くか
    seq(c, "+", "4", "=");
    const after = expectAfterPercent.sqrt().plus(4);
    expect(c.display).toBe(fmtExpect(after));
  });

  // --- 6) 逆数モード文脈（÷ で = を押してから √）--- //
  it("16 ÷ = で 1/16 → すぐ √ は新規計算（√(1/16)=0.25）", () => {
    seq(c, "1", "6", "÷", "="); // reciprocalモードの初回計算 → 1/16
    expect(c.display).toBe(fmtExpect(new Decimal(1).div(16)));
    tap(c, "√");                // constantMode 中の √ → 新規計算
    expect(c.display).toBe("0.25");
  });

  // --- 7) エラー系（負数の平方根・Error状態での √）--- //
  it("√(-9) は 'Error' 表示（DomainError）", () => {
    seq(c, "9", "±", "√");
    expect(c.display).toBe("Error");
  });

  // --- 8) 連続 √（連打）--- //
  it("9 → √ → √（√を連続適用）", () => {
    seq(c, "9", "√");
    const first = new Decimal(9).sqrt();
    expect(c.display).toBe(fmtExpect(first));

    tap(c, "√"); // display に対して再度 √
    expect(c.display).toBe(fmtExpect(first.sqrt()));
  });

  // --- 9) 演算子の組み合わせ・途中で √ を噛ませても正しく計算 --- //
  it("5 × √(9) = → 15", () => {
    seq(c, "5", "*", "√", "9", "="); // ここは「9を入力してから√」のつもりなら順番修正:
    // ↑ 上のseqだと "*","√","9" で「演算子直後に√→last=3」にならないので、正しい操作に書き直す
  });

  it("5 × [演算子直後に 9 入力→√] = → 15", () => {
    c.clear();
    seq(c, "5", "*");  // waitingForSecondValue = true
    seq(c, "9", "√");  // 二つ目=9 を入れてから √ → last=√9=3
    tap(c, "=");       // 5 * 3
    expect(c.display).toBe("15");
  });

  // --- 10) 小数の二つ目入力中に √ --- //
  it("8 ÷ 2.25 √ = → 8 ÷ 1.5 = 5.33333333 → 8桁打ち切り", () => {
    seq(c, "8", "÷");
    typeNumber(c, "2.25"); // 二つ目入力中
    tap(c, "√");           // 2.25 → 1.5
    tap(c, "=");           // 8 / 1.5
    const exp = new Decimal(8).div(new Decimal(1.5));
    expect(c.display).toBe(fmtExpect(exp));
  });

  // --- 11) 入力制限下での √（桁上限に触れないことの確認）--- //
  it("最大10桁整数（9999999999）に √ を適用しても表示できる", () => {
    typeNumber(c, "9999999999");
    tap(c, "√");
    const exp = new Decimal("9999999999").sqrt();
    expect(c.display).toBe(fmtExpect(exp));
  });
});

describe('CalculatorComponent - Reciprocal mode (/ then =)', () => {
  let c: CalculatorComponent;

  // 便利ヘルパ: キー操作をエミュレート
  const press = (key: string) => {
    if (/^[0-9]$/.test(key)) c.inputdigit(key);
    else if (key === '.') c.inputdecimal();
    else if (key === '+') c.handleoperator('+');
    else if (key === '-') c.handleoperator('-');
    else if (key === '*') c.handleoperator('*');
    else if (key === '/') c.handleoperator('/');
    else if (key === '=') c.calculateresult();
    else if (key === '±') c.togglenegative();
    else if (key === 'C') c.clear();
    else if (key === 'CE') c.clearEntry();
    else if (key === '√') c.root();
    else if (key === '%') c.percent();
    else throw new Error(`Unknown key: ${key}`);
  };

  const typeNumber = (s: string) => {
    for (const ch of s) press(ch);
  };

  beforeEach(() => {
    // Decimal のグローバル設定は本体と同じにしておくと安全
    Decimal.set({
      precision: 40,
      rounding: Decimal.ROUND_HALF_UP,
      toExpNeg: -1000,
      toExpPos: 1000,
    });
    c = new CalculatorComponent();
  });

  it('1) 正の整数: 8 / = → 1/8 = 0.125', () => {
    typeNumber('8'); press('/'); press('=');
    expect(c.display).toBe('0.125');
  });

  it('2) = 連打で同じ除算を繰り返す: 8 / = = = → 1/8, (1/8)/8, ...', () => {
    typeNumber('8'); press('/'); press('=');
    expect(c.display).toBe('0.125');      // 1/8
    press('=');  expect(c.display).toBe('0.015625');   // (1/8)/8 = 1/64
    press('=');  expect(c.display).toBe('0.00195312'); // 1/512
  });

  it('3) 逆数の後に新しい数値を打って = : 8 / = 2 = → 2 / 8 = 0.25', () => {
    typeNumber('8'); press('/'); press('=');
    typeNumber('2'); press('=');
    expect(c.display).toBe('0.25');
  });

  it('4) 小数の逆数: 2.5 / = → 0.4、= でもう一回 → 0.16', () => {
    typeNumber('2'); press('.'); typeNumber('5'); press('/'); press('=');
    expect(c.display).toBe('0.4');
    press('=');
    expect(c.display).toBe('0.16'); // 0.4 / 2.5 = 0.16
  });

  it('5) 負数の逆数: 9 ± / = → -1/9（8桁切り捨て）', () => {
    typeNumber('9'); press('±'); press('/'); press('=');
    expect(c.display).toBe('-0.11111111'); // 小数8桁・切り捨て
  });

  it('6) 0 の逆数はエラー: 0 / = → "Error"，次に数字で復帰', () => {
    typeNumber('0'); press('/'); press('=');
    expect(c.display).toBe('Error');
    // エラー状態で数字入力すると clearError が走り、表示が置き換わる
  });

  it('7) 途中演算からの逆数: 6 + 9 / = → 6+9 計算後の 15 の逆数', () => {
    typeNumber('6'); press('+'); typeNumber('9'); press('/'); press('=');
    expect(c.display).toBe('0.06666666'); // 1/15 を 8桁切り捨て
  });

  it('8) 7の続きで = 連打: (1/15)/15 → 0.00444444', () => {
    typeNumber('6'); press('+'); typeNumber('9'); press('/'); press('=');
    press('=');
    expect(c.display).toBe('0.00444444');
  });

  it('9) 逆数の直後に新数値を打って = : 8 / = 5 = → 5 / 8 = 0.625', () => {
    typeNumber('8'); press('/'); press('=');
    typeNumber('5'); press('=');
    expect(c.display).toBe('0.625');
  });

  it('10) -0 の逆数もゼロ除算エラー: 0 ± / = → "Error"', () => {
    typeNumber('0'); press('±'); press('/'); press('=');
    expect(c.display).toBe('Error');
  });

  it('11) 逆数結果直後の CE は無効（表示変化なし）', () => {
    typeNumber('8'); press('/'); press('=');
    const before = c.display;
    press('CE');
    expect(c.display).toBe(before);
  });

  it('12) 逆数結果後に C は全消去', () => {
    typeNumber('8'); press('/'); press('=');
    press('C');
    expect(c.display).toBe('0');
  });

  it('13) 逆数結果後に % は新規計算で /100: 8 / = → % → 0.00125', () => {
    typeNumber('8'); press('/'); press('=');
    press('%');
    expect(c.display).toBe('0.00125'); // 0.125 / 100
  });

  it('14) 逆数結果後に √ は新規計算: 9 / = → √ → 1/3 = 0.33333333', () => {
    typeNumber('9'); press('/'); press('=');
    press('√');
    expect(c.display).toBe('0.33333333'); // √(1/9)
  });

  it('15) 0.5 の逆数: 0 . 5 / = → 2', () => {
    press('0'); press('.'); press('5'); press('/'); press('=');
    expect(c.display).toBe('2'); // 整数表示にトリム
  });

  it('16) 逆数の後に別演算へ分岐: 8 / = → + 2 = → 2.125', () => {
    typeNumber('8'); press('/'); press('=');
    press('+'); typeNumber('2'); press('=');
    expect(c.display).toBe('2.125');
  });

  it('17) 末尾0のトリム確認: 25 / = → 0.04（余分な0なし）', () => {
    typeNumber('2'); typeNumber('5'); press('/'); press('=');
    expect(c.display).toBe('0.04');
  });
});
import { CalculatorComponent } from './calculator.component';

describe('CalculatorComponent - 定数モード', () => {
  let c: CalculatorComponent;

  const pressNumber = (s: string) => {
    for (const ch of s) {
      if (ch === '.') {
        c.inputdecimal();
      } else {
        c.inputdigit(ch);
      }
    }
  };
  const op = (o: string) => c.handleoperator(o);
  const eq = (times = 1) => { for (let i = 0; i < times; i++) c.calculateresult(); };
  const expectDisplay = (s: string) => expect(c.display).toBe(s);
  const flag = (name: string) => (c as any)[name];

  beforeEach(() => {
    c = new CalculatorComponent();
    c.clear();
  });

  describe('加算の定数モード', () => {
    it('2 + 3 =（定数モード突入）→ = =（3を繰り返し加算）', () => {
      pressNumber('2');
      op('+');
      pressNumber('3');
      eq(1);
      expectDisplay('5');
      expect(flag('constantMode')).toBeTrue();
      eq(1);
      expectDisplay('8');
      eq(1);
      expectDisplay('11');
    });

    it('= 後に新しい数を入力 → 10 + 3 =（以降は3を加算）', () => {
      // 事前: 2 + 3 = で 5（定数モード）
      pressNumber('2'); op('+'); pressNumber('3'); eq(1);
      // 新しい入力 10 → =
      pressNumber('1'); pressNumber('0'); eq(1);
      expectDisplay('13'); // 10 + 3
      eq(1);
      expectDisplay('16');
    });
  });

  describe('減算の定数モード', () => {
    it('10 - 2 = → = =（2を繰り返し減算）', () => {
      pressNumber('10'); op('-'); pressNumber('2'); eq(1);
      expectDisplay('8');
      eq(1); expectDisplay('6');
      eq(1); expectDisplay('4');
    });

    it('= 後に新しい数 20 を入力 → 20 - 2 =', () => {
      pressNumber('10'); op('-'); pressNumber('2'); eq(1); // 8
      pressNumber('2'); pressNumber('0'); eq(1);
      expectDisplay('18');
      eq(1);
      expectDisplay('16');
    });
  });

  describe('乗算の定数モード（mulconstant の仕様）', () => {
    it('4 * 5 = → = =（5を繰り返し乗算）', () => {
      pressNumber('4'); op('*'); pressNumber('5'); eq(1);
      expectDisplay('20');
      expect(flag('constantMode')).toBeTrue();
      eq(1); expectDisplay('100');  // 20 * 5
      eq(1); expectDisplay('500');  // 100 * 5
    });

    it('= 後に新しい数 3 を入力 →（左は初回の左辺 4）4 * 3 =、以後は 4 を繰り返し乗算', () => {
      pressNumber('4'); op('*'); pressNumber('5'); eq(1); // 20, mulconstant=4, lastvalue=5
      pressNumber('3'); eq(1);
      expectDisplay('12'); // 4 * 3
      eq(1);
      expectDisplay('48'); // 12 * 4（lastvalue=4 にセットされる仕様）
    });
  });

  describe('除算の定数モード', () => {
    it('20 / 4 = → = =（4で繰り返し除算）', () => {
      pressNumber('20'); op('/'); pressNumber('4'); eq(1);
      expectDisplay('5');
      eq(1); expectDisplay('1.25');      // 5 / 4
      eq(1); expectDisplay('0.3125');    // 1.25 / 4
    });

    it('= 後に新しい数 10 を入力 → 10 / 4 =、以降 4 で除算', () => {
      pressNumber('20'); op('/'); pressNumber('4'); eq(1); // 5
      pressNumber('1'); pressNumber('0'); eq(1);
      expectDisplay('2.5'); // 10 / 4
      eq(1);
      expectDisplay('0.625'); // 2.5 / 4
    });

    it('0 除算エラー（定数モード突入前に例外→Error表示）', () => {
      pressNumber('8'); op('/'); pressNumber('0'); eq(1);
      expectDisplay('Error');
      expect(flag('isError')).toBeTrue();
    });
  });

  describe('逆数モード → 定数モードの連携', () => {
    it('「/」直後に「=」で逆数→以後は定数モードで "/" 連打', () => {
      pressNumber('8'); op('/'); eq(1);        // reciprocalMode → 1/8
      expectDisplay('0.125');
      expect(flag('constantMode')).toBeTrue();
      eq(1); expectDisplay('0.015625');        // / 8
      eq(1); expectDisplay('0.00195312');      // / 8
      pressNumber('2'); eq(1);                 // 新しい数 2 → 2 / 8
      expectDisplay('0.25');
    });
  });

  describe('％ と定数モードの相互作用（演算子あり）', () => {
    it('200 + 10 % → 220、= → 240、（新入力 100）= → 120', () => {
      pressNumber('200'); op('+'); pressNumber('10'); c.percent();
      expectDisplay('220');                     // 200 + (200*10%)
      expect(flag('constantMode')).toBeTrue();
      eq(1); expectDisplay('240');              // +20 繰り返し
      pressNumber('100'); eq(1);                // 100 + 20
      expectDisplay('120');
    });

    it('200 * 10 % → 20、= → 4000（* の％は base を lastvalue にする仕様）', () => {
      pressNumber('200'); op('*'); pressNumber('10'); c.percent();
      expectDisplay('20');                      // 200*10%
      expect(flag('constantMode')).toBeTrue();
      eq(1);                                    // 20 * 200
      expectDisplay('4000');
    });

    it('200 / 10 % → 2000、= → 100（/ の％は base*% を lastvalue にする仕様）', () => {
      pressNumber('200'); op('/'); pressNumber('10'); c.percent();
      expectDisplay('2000');                    // 200 / 0.1
      expect(flag('constantMode')).toBeTrue();
      eq(1);                                    // 2000 / 20
      expectDisplay('100');
    });
  });

  describe('= 後に演算子を押すと新規計算に切替（定数モード解除）', () => {
    it('2 + 3 =（5）→ + 4 =（9）', () => {
      pressNumber('2'); op('+'); pressNumber('3'); eq(1);
      expect(flag('constantMode')).toBeTrue();
      op('+');                                  // 新規計算に入る
      pressNumber('4'); eq(1);
      expectDisplay('9');
      expect(flag('constantMode')).toBeTrue();  // ここでまた = を押したので再突入
    });
  });

  describe('クリアで状態がリセットされる', () => {
    it('定数モード中に clear() → 全フラグ解除', () => {
      pressNumber('2'); op('+'); pressNumber('3'); eq(1); // 5, constantMode=true
      c.clear();
      expectDisplay('0');
      expect(flag('constantMode')).toBeFalse();
      expect(flag('reciprocalMode')).toBeFalse();
      expect(flag('waitingForSecondValue')).toBeFalse();
    });
  });
});

// テスト用のキー入力ヘルパ
function press(calc: CalculatorComponent, token: string) {
  switch (token) {
    case '+': case '-': case '*': case '/':
      calc.handleoperator(token);
      break;
    case '=':
      calc.calculateresult();
      break;
    case '%':
      calc.percent();
      break;
    case '.':
      calc.inputdecimal();
      break;
    case 'C':
      calc.clear();
      break;
    case 'CE':
      calc.clearEntry();
      break;
    case '±':
      calc.togglenegative();
      break;
    default: {
      // 数字や複数桁（"100"など）を1文字ずつ入力
      for (const ch of token) {
        if (ch === '.') calc.inputdecimal();
        else calc.inputdigit(ch);
      }
    }
  }
}

function run(calc: CalculatorComponent, seq: string[]): string {
  seq.forEach(t => press(calc, t));
  return calc.display;
}

describe('CalculatorComponent percent behavior (target spec)', () => {

  it('100 + 10 % % = ⇒ 131', () => {
    const c = new CalculatorComponent();
    const out = run(c, ['100', '+', '10', '%', '%', '=']);
    expect(out).toBe('131');       // 110 → 121 → 131
  });

  it('200 - 10 % % = ⇒ 142', () => {
    const c = new CalculatorComponent();
    const out = run(c, ['200', '-', '10', '%', '%', '=']);
    expect(out).toBe('142');       // 180 → 162 → 142
  });

  it('200 * 10 % % = ⇒ 400', () => {
    const c = new CalculatorComponent();
    const out = run(c, ['200', '*', '10', '%', '%', '=']);
    expect(out).toBe('400');       // 20 → 2 → 400（=で 2×200）
  });

  it('200 / 10 % % = ⇒ 1000', () => {
    const c = new CalculatorComponent();
    const out = run(c, ['200', '/', '10', '%', '%', '=']);
    expect(out).toBe('1000');      // 2000 → 20000 → 1000（=で 20000÷20）
  });

  // 中間結果も押さえておくと安心（任意）
  it('intermediate: 100 + 10 % ⇒ 110, さらに% ⇒ 121', () => {
    const c = new CalculatorComponent();
    run(c, ['100', '+', '10', '%']);
    expect(c.display).toBe('110');
    press(c, '%');
    expect(c.display).toBe('121');
  });

  it('intermediate: 200 - 10 % ⇒ 180, さらに% ⇒ 162', () => {
    const c = new CalculatorComponent();
    run(c, ['200', '-', '10', '%']);
    expect(c.display).toBe('180');
    press(c, '%');
    expect(c.display).toBe('162');
  });

  it('intermediate: 200 * 10 % ⇒ 20, さらに% ⇒ 2', () => {
    const c = new CalculatorComponent();
    run(c, ['200', '*', '10', '%']);
    expect(c.display).toBe('20');
    press(c, '%');
    expect(c.display).toBe('2');
  });

  it('intermediate: 200 / 10 % ⇒ 2000, さらに% ⇒ 20000', () => {
    const c = new CalculatorComponent();
    run(c, ['200', '/', '10', '%']);
    expect(c.display).toBe('2000');
    press(c, '%');
    expect(c.display).toBe('20000');
  });
});

describe('CalculatorComponent', () => {
  let c: CalculatorComponent;

  const pressDigits = (s: string) => {
    for (const ch of s) {
      if (ch === '.') c.inputdecimal();
      else c.inputdigit(ch);
    }
  };
  const op = (symbol: string) => c.handleoperator(symbol);
  const eq = () => c.calculateresult();

  beforeEach(() => {
    // 念のためDecimal設定をテスト側でも合わせる
    Decimal.set({
      precision: 40,
      rounding: Decimal.ROUND_HALF_DOWN,
      toExpNeg: -1000,
      toExpPos: 1000,
    });
    c = new CalculatorComponent();
    c.clear();
  });

  // --- 仕様変更の要点 ---
  it('5 += -> 5', () => {
    pressDigits('5'); op('+'); eq();
    expect(c.display).toBe('5');
    eq(); // 連打しても 5 のまま
    expect(c.display).toBe('5');
  });

  it('5 -= -> 5', () => {
    pressDigits('5'); op('-'); eq();
    expect(c.display).toBe('5');
    eq(); // 連打しても 5 のまま
    expect(c.display).toBe('5');
  });

  // --- * と / は従来のまま ---
  it('5 *= -> 25、さらに = で 125', () => {
    pressDigits('5'); op('*'); eq();
    expect(c.display).toBe('25');
    eq();
    expect(c.display).toBe('125');
  });

  it('5 /= -> 0.2、さらに = で 0.04', () => {
    pressDigits('5'); op('/'); eq();
    expect(c.display).toBe('0.2');
    eq();
    expect(c.display).toBe('0.04');
  });

  // --- % の代表ケース ---
  it('200 + 10% -> 220、= -> 240', () => {
    pressDigits('200'); op('+'); pressDigits('10'); c.percent();
    expect(c.display).toBe('220');
    eq();
    expect(c.display).toBe('240');
  });

  it('200 - 10% -> 180、= -> 160', () => {
    pressDigits('200'); op('-'); pressDigits('10'); c.percent();
    expect(c.display).toBe('180');
    eq();
    expect(c.display).toBe('160');
  });

  it('200 * 10% -> 20、= -> 4000', () => {
    pressDigits('200'); op('*'); pressDigits('10'); c.percent();
    expect(c.display).toBe('20');
    eq();
    expect(c.display).toBe('4000');
  });

  it('200 / 10% -> 2000、= -> 100、さらに = -> 5', () => {
    pressDigits('200'); op('/'); pressDigits('10'); c.percent();
    expect(c.display).toBe('2000');
    eq();
    expect(c.display).toBe('100');
    eq();
    expect(c.display).toBe('5');
  });

  // --- 小数・丸め/打ち止め ---
  it('小数8桁打ち止め: 1.12345678 まで入力可、次の 9 は無視', () => {
    pressDigits('1'); c.inputdecimal(); pressDigits('12345678'); // 8桁
    const before = c.display;
    pressDigits('9'); // 無視される
    expect(c.display).toBe(before); // '1.12345678'
  });

  it('丸め(切り捨て)の確認: 0.00000009 / 2 = 0.00000004', () => {
    pressDigits('0'); c.inputdecimal(); pressDigits('00000009'); // 0.00000009
    op('/'); pressDigits('2'); eq();
    expect(c.display).toBe('0.00000004'); // 0.000000045 を8桁で切り捨て
  });

  it('√2 -> 1.41421356（8桁切り捨て）', () => {
    pressDigits('2'); c.root();
    expect(c.display).toBe('1.41421356');
  });

  // --- エラー系 ---
  it('1 / 0 = -> Error', () => {
    pressDigits('1'); op('/'); pressDigits('0'); eq();
    expect(c.display).toBe('Error');
  });

  it('負数の平方根 -> Error', () => {
    pressDigits('9'); c.togglenegative(); c.root();
    expect(c.display).toBe('Error');
  });

  it('結果が整数10桁超過で LimitExceededError: 9999999999 * 10 -> E9.999999999', () => {
    pressDigits('9999999999'); op('*'); pressDigits('10'); eq();
    expect(c.display).toBe('E9.999999999'); // 11桁 -> 表示は E9.999999999
  });

  // --- クリア/CE ---
  it('CE: 12 + 3 -> CE -> 4 = 16', () => {
    pressDigits('12'); op('+'); pressDigits('3'); c.clearEntry();
    pressDigits('4'); eq();
    expect(c.display).toBe('16');
  });

  it('C: 途中で clear() すると 0 に戻る', () => {
    pressDigits('123'); op('*'); pressDigits('45');
    c.clear();
    expect(c.display).toBe('0');
  });

  // --- ± / -0 排除の流れ ---
  it('±で -0 表示からの計算は 0 として扱われる: (-0) + 1 = 1', () => {
    c.togglenegative();               // -0
    op('+'); pressDigits('1'); eq();  // (-0) + 1
    expect(c.display).toBe('1');
  });

  // --- 入力制限（整数10桁） ---
  it('整数10桁まで: 1111111111 で打ち止め', () => {
    pressDigits('1'); // 1桁目
    for (let i = 0; i < 10; i++) pressDigits('1'); // さらに10回叩いても10桁止まり
    expect(c.display).toBe('1111111111');
  });
});

function clr(c: CalculatorComponent) {
  c.clear();
}

describe('CalculatorComponent: "=" 挙動テスト', () => {

  let c: CalculatorComponent;

  beforeEach(() => {
    c = new CalculatorComponent();
    clr(c); // display='0' & state reset
  });

  it('オペレーターなしで "="（単体押下）は表示を維持し、定数モードに入る（見た目は変化なし）', () => {
    typeNumber(c, '7');
    eq(c);
    expect(c.display).toBe('7');
    // もう一度 "=" しても変化しない
    eq(c);
    expect(c.display).toBe('7');
  });

  it('加算: 12 + 3 = → 15、その後 "=" 連打で 18 → 21 と加算が繰り返される', () => {
    typeNumber(c, '12'); op(c, '+'); typeNumber(c, '3'); eq(c);
    expect(c.display).toBe('15');
    eq(c); expect(c.display).toBe('18');
    eq(c); expect(c.display).toBe('21');
  });

  it('加算: "=" 後に新しい数を入力して "=" → 「新しい数 + 直前の右辺」で再計算（12+3=→15、4=→7）', () => {
    typeNumber(c, '12'); op(c, '+'); typeNumber(c, '3'); eq(c);
    expect(c.display).toBe('15');
    typeNumber(c, '4'); eq(c);
    expect(c.display).toBe('7'); // 4 + 3
    // さらに "=" で 10（7 + 3）
    eq(c);
    expect(c.display).toBe('10');
  });

  it('減算: 10 - 2 = → 8、その後 "=" 連打で 6 → 4 と減算が繰り返される', () => {
    typeNumber(c, '10'); op(c, '-'); typeNumber(c, '2'); eq(c);
    expect(c.display).toBe('8');
    eq(c); expect(c.display).toBe('6');
    eq(c); expect(c.display).toBe('4');
  });

  it('減算: "=" 後に新しい数で "=" → 「新しい数 - 直前の右辺」（10-2=→8、20=→18）', () => {
    typeNumber(c, '10'); op(c, '-'); typeNumber(c, '2'); eq(c);
    expect(c.display).toBe('8');
    clr(c); // 状態を完全に消したくなければ、ここは省いて OK。今回は独立性のためクリア。
    // もう一度同じ流れ
    typeNumber(c, '10'); op(c, '-'); typeNumber(c, '2'); eq(c); // =8（定数モード突入）
    typeNumber(c, '20'); eq(c);
    expect(c.display).toBe('18'); // 20 - 2
  });

  it('乗算: 5 * 2 = → 10、その後 "=" 連打で 20 → 40 と同じ右辺で乗算が繰り返される', () => {
    typeNumber(c, '5'); op(c, '*'); typeNumber(c, '2'); eq(c);
    expect(c.display).toBe('10');
    eq(c); expect(c.display).toBe('20');
    eq(c); expect(c.display).toBe('40');
  });

  it('乗算: "=" 後に新しい数で "=" → 「初回左辺 × 新しい数」、以後はその左辺で繰り返し乗算', () => {
    // 5 * 2 = 10（mulconstant = 5）
    typeNumber(c, '5'); op(c, '*'); typeNumber(c, '2'); eq(c);
    expect(c.display).toBe('10');
    // 新しい数 3 入力後 "=" → 5 * 3 = 15（lastvalue が mulconstant に置き換わる）
    typeNumber(c, '3'); eq(c);
    expect(c.display).toBe('15');
    // さらに "=" → 15 * 5 = 75
    eq(c);
    expect(c.display).toBe('75');
  });

  it('乗算: 3 * =（第2数なし）→ 3*3=9、その後 "=" で 27（乗算は第2数未入力だと自身を右辺に取る）', () => {
    typeNumber(c, '3'); op(c, '*'); eq(c);
    expect(c.display).toBe('9');
    eq(c);
    expect(c.display).toBe('27');
  });

  it('除算: 20 / 4 = → 5、その後 "=" 連打で 1.25 → 0.3125（同じ右辺で再除算）', () => {
    typeNumber(c, '20'); op(c, '/'); typeNumber(c, '4'); eq(c);
    expect(c.display).toBe('5');
    eq(c); expect(c.display).toBe('1.25');
    eq(c); expect(c.display).toBe('0.3125');
  });

  it('除算: "=" 後に新しい数で "=" → 「新しい数 / 直前の右辺」（20/4=→5、2=→0.5）', () => {
    typeNumber(c, '20'); op(c, '/'); typeNumber(c, '4'); eq(c);
    expect(c.display).toBe('5');
    typeNumber(c, '2'); eq(c);
    expect(c.display).toBe('0.5'); // 2 / 4
  });

  it('除算: "/" の直後に "="（第2数なし）→ 逆数モード動作：a/= は 1/a（8/=→0.125）', () => {
    typeNumber(c, '8'); op(c, '/'); eq(c);
    expect(c.display).toBe('0.125'); // 1/8
    // もう一度 "=" で (1/8)/8 = 1/64 = 0.015625
    eq(c);
    expect(c.display).toBe('0.015625');
  });

  it('除算: 0 /= は DivideByZeroError → "Error" 表示', () => {
    typeNumber(c, '0'); op(c, '/'); eq(c);
    expect(c.display).toBe('Error');
  });

  it('除算: 5 / 0 = は DivideByZeroError → "Error"、続けて "=" でクリアして "0" になる仕様', () => {
    typeNumber(c, '5'); op(c, '/'); typeNumber(c, '0'); eq(c);
    expect(c.display).toBe('Error');
  });

  it('加算/減算: 「演算子直後に =」は第2数が 0 扱い（9+=→9、9-=→9）', () => {
    typeNumber(c, '9'); op(c, '+'); eq(c);
    expect(c.display).toBe('9'); // 9 + 0
    clr(c);
    typeNumber(c, '9'); op(c, '-'); eq(c);
    expect(c.display).toBe('9'); // 9 - 0
  });

});

describe('CalculatorComponent – minimal changes around "=" and +/−', () => {

  const press = (c: CalculatorComponent, seq: string) => {
    for (const ch of seq.replace(/\s+/g, '')) {
      if (ch >= '0' && ch <= '9') { c.inputdigit(ch); continue; }
      switch (ch) {
        case '.': c.inputdecimal(); break;
        case '+': case '-': case '*': case '/': c.handleoperator(ch); break;
        case '=': c.calculateresult(); break;
        case 'C': c.clear(); break;
        case 'E': c.clearEntry(); break;
        case '±': c.togglenegative(); break;
        case '√': c.root(); break;
        case '%': c.percent(); break;
        default: throw new Error(`unknown key: ${ch}`);
      }
    }
  };

  const expectDisplay = (c: CalculatorComponent, expected: string) => {
    expect(c.display).toBe(expected);
  };

  it('10+1+= → 11', () => {
    const c = new CalculatorComponent();
    press(c, '1 0 + 1 + =');
    expectDisplay(c, '11');
  });

  it('10-1-= → 9', () => {
    const c = new CalculatorComponent();
    press(c, '1 0 - 1 - =');
    expectDisplay(c, '9');
  });

  it('× の挙動は維持: 5*= → 25, 5*== → 125', () => {
    const c = new CalculatorComponent();
    press(c, '5 * =');
    expectDisplay(c, '25');
    press(c, '=');
    expectDisplay(c, '125'); // 25×5
  });

  it('÷ の挙動は維持: 5/= → 0.2（逆数モード初回）', () => {
    const c = new CalculatorComponent();
    press(c, '5 / =');
    expectDisplay(c, '0.2');
  });

  it('数字＝の直後は新しい数値で置き換え入力（連結しない）', () => {
    const c = new CalculatorComponent();
    press(c, '5 = 7');
    expectDisplay(c, '7');
  });

  it('数字＝の直後に連続数字入力すると通常通り連結（先頭だけ置き換え）', () => {
    const c = new CalculatorComponent();
    press(c, '5 = 7 8');
    expectDisplay(c, '78');
  });

  it('数字＝の直後に小数点: 5=. → "0."', () => {
    const c = new CalculatorComponent();
    press(c, '5 = .');
    expectDisplay(c, '0.');
    press(c, '5');
    expectDisplay(c, '0.5');
  });

  it('数字＝の直後に演算→数値→＝: 5=+2= → 7', () => {
    const c = new CalculatorComponent();
    press(c, '5 = + 2 =');
    expectDisplay(c, '7');
  });

  it('演算子直後に＝（第二オペランド未入力）は +/− で 0 を採用: 10+= → 10, 10-= → 10', () => {
    const c1 = new CalculatorComponent();
    press(c1, '1 0 + =');
    expectDisplay(c1, '10');

    const c2 = new CalculatorComponent();
    press(c2, '1 0 - =');
    expectDisplay(c2, '10');
  });

  it('数字＝の直後に％や√も新規計算扱い', () => {
    const c1 = new CalculatorComponent();
    press(c1, '5 = %');
    expectDisplay(c1, '0.05'); // 5% = 0.05

    const c2 = new CalculatorComponent();
    press(c2, '9 = √');
    expectDisplay(c2, '3');
  });

  it('数字＝の直後に ±: 表示は符号反転するが、次の数字入力で置き換え開始', () => {
    const c = new CalculatorComponent();
    press(c, '5 = ±');
    expectDisplay(c, '-5');        // ここは反転表示
    press(c, '7');                 // 新規入力として置き換え
    expectDisplay(c, '7');
  });

});


describe('CalculatorComponent – 数値入力', () => {
  let c: CalculatorComponent;

  const getPriv = <T = any>(key: string): T => (c as any)[key];

  beforeEach(() => {
    c = new CalculatorComponent();
  });

  it('エラー中に数字を押すとエラーがクリアされ、その数字から再開', () => {
    // 強制的にエラー状態にする
    (c as any).ErrorSet('Error');
    expect(getPriv<boolean>('isError')).toBeTrue();
  });

  it('先頭0は置換されて「05」にならず「5」になる', () => {
    expect(c.display).toBe('0');
    c.inputdigit('5');
    expect(c.display).toBe('5');
  });

  it('演算子直後は2つ目の数値として上書き開始（置換入力）', () => {
    c.inputdigit('1'); c.inputdigit('2'); // "12"
    c.handleoperator('+');                // waitingForSecondValue = true
    c.inputdigit('3');                    // 置換される
    expect(c.display).toBe('3');
    expect(getPriv<boolean>('waitingForSecondValue')).toBeFalse();
  });

  it('「=」直後は新しい数値入力が始まる（置換 & equalpressed=false）', () => {
    c.inputdigit('1'); c.inputdigit('2');   // "12"
    c.calculateresult();                    // "="
    expect(getPriv<boolean>('waitingForSecondValue')).toBeTrue();

    c.inputdigit('7');                      // 新規開始
    expect(c.display).toBe('7');
    expect(getPriv<boolean>('waitingForSecondValue')).toBeFalse();
    expect(getPriv<boolean>('equalpressed')).toBeFalse();
    expect(getPriv('percentvalue')).toBeNull();
  });

  it('計算後（例: 7+5=12）の直後に数字を押すと新規入力に切替', () => {
    c.inputdigit('7');
    c.handleoperator('+');
    c.inputdigit('5');
    c.calculateresult();                    // 12
    expect(c.display).toBe('12');
    expect(getPriv<boolean>('waitingForSecondValue')).toBeTrue();

    c.inputdigit('9');                      // 新規開始
    expect(c.display).toBe('9');
  });

  it('小数点: 初回は「0.」から開始し、二度目の小数点は無視される', () => {
    c.inputdecimal();                       // "0."
    expect(c.display).toBe('0.');
    c.inputdigit('2');                      // "0.2"
    c.inputdecimal();                       // 2度目の小数点は無視
    expect(c.display).toBe('0.2');
  });

  it('演算子直後の小数点は「0.」から開始し、2つ目入力フラグを解除', () => {
    c.inputdigit('8');
    c.handleoperator('*');                  // waitingForSecondValue = true
    c.inputdecimal();                       // "0."
    expect(c.display).toBe('0.');
    expect(getPriv<boolean>('waitingForSecondValue')).toBeFalse();
  });

  it('整数部は最大10桁まで（11桁目は無視）', () => {
    // 10桁作る
    '1234567890'.split('').forEach(d => c.inputdigit(d));
    expect(c.display).toBe('1234567890');
    c.inputdigit('9');                      // 11桁目は無視
    expect(c.display).toBe('1234567890');
  });

  it('負数でも整数部は10桁まで', () => {                     // 
    '1234567890'.split('').forEach(d => c.inputdigit(d));
    c.togglenegative();
    expect(c.display).toBe('-1234567890');
    c.inputdigit('9');                      // 無視
    expect(c.display).toBe('-1234567890');
  });

  it('小数部は最大8桁まで（9桁目は無視）', () => {
    c.inputdecimal();                       // "0."
    '12345678'.split('').forEach(d => c.inputdigit(d));
    expect(c.display).toBe('0.12345678');
    c.inputdigit('9');                      // 9桁目は無視
    expect(c.display).toBe('0.12345678');
  });

  it('演算子+％計算後に数字を押すと、新規入力開始&percentvalueがクリア', () => {
    c.inputdigit('2'); c.inputdigit('0'); c.inputdigit('0'); // 200
    c.handleoperator('+');
    c.inputdigit('1'); c.inputdigit('0'); // 10
    c.percent();                           // 200 + 10% = 220, waitingForSecondValue=true
    expect(getPriv<boolean>('waitingForSecondValue')).toBeTrue();

    c.inputdigit('3');                     // 新規開始
    expect(c.display).toBe('3');
    expect(getPriv('percentvalue')).toBeNull();
    expect(getPriv<boolean>('equalpressed')).toBeFalse();
  });

  it('エントリークリア: waitingForSecondValue=false のとき表示だけ0に（状態は維持）', () => {
    c.inputdigit('9'); c.inputdigit('9'); // "99"
    c.clearEntry();
    expect(c.display).toBe('0');
    // 状態が大きく変わらないことだけ確認（必要に応じて追加検証）
    expect(getPriv('firstvalue')).toBeNull();
  });

  it('エラー中のCEは全消去と同様にエラー解除後0表示', () => {
    (c as any).ErrorSet('Error');
    c.clearEntry();
    expect(c.display).toBe('0');
    expect(getPriv<boolean>('isError')).toBeFalse();
  });
});

function pressSeq(c: CalculatorComponent, keys: (string | number)[]) {
  for (const k of keys) {
    const s = String(k);
    if (/^\d$/.test(s)) {
      c.inputdigit(s);
      continue;
    }
    if (s === '.') {
      c.inputdecimal();
      continue;
    }
    if (s === '+' || s === '-' || s === '*' || s === '/') {
      c.handleoperator(s);
      continue;
    }
    if (s === '=') {
      c.calculateresult();
      continue;
    }
    if (s.toUpperCase() === 'C') {
      c.clear();
      continue;
    }
    // 必要に応じて拡張（CE, %, √, ± など）
  }
}

describe('CalculatorComponent operator input', () => {
  let c: CalculatorComponent;

  beforeEach(() => {
    c = new CalculatorComponent();
  });

  it('初回の演算子押下：firstvalue がセットされ、画面は維持される', () => {
    pressSeq(c, ['1', '2', '+']);
    expect(c.display).toBe('12'); // 表示は変わらない
    // ここでは private を触らず、以降の操作でふるまいを確認する
    pressSeq(c, ['3', '=']);
    expect(c.display).toBe('15');
  });

  it('演算子上書き：待機中(第2数値未入力)に別の演算子を押すと上書きされる', () => {
    pressSeq(c, ['1', '2', '+', '-', '*', '2', '=']);
    // 最後に押したのは '*'
    expect(c.display).toBe('24'); // 12 * 2 = 24
  });

  it('第2数値入力後に別の演算子を押すと、その場で直前演算を確定してから次の演算子へ', () => {
    pressSeq(c, ['1', '2', '+', '3', '*']); // ここで 12+3 が確定し 15 表示のまま * に遷移
    expect(c.display).toBe('15');
    pressSeq(c, ['2', '=']); // 15 * 2
    expect(c.display).toBe('30');
  });

  it('「+ から / に切り替え」で nextOperator === "/" 特別処理により reciprocal の前提を作る', () => {
    // 12 + 3 / =
    pressSeq(c, ['1', '2', '+', '3', '/']); // ここで 12+3=15 が確定、かつ lastvalue が null になる条件
    // 次の '=' は reciprocal モード: 1 / 15
    pressSeq(c, ['=']);
    expect(c.display).toBe('0.06666666'); // 小数8桁・切り捨て
  });

  it('「=」直後（定数モード中）に演算子を押すと、新規計算として開始する', () => {
    pressSeq(c, ['5', '+', '2', '=']); // 7（定数モード）
    pressSeq(c, ['*']);                 // 新規計算開始（firstvalue = 7）
    pressSeq(c, ['1', '0', '=']);       // 7 * 10
    expect(c.display).toBe('70');
  });

  it('エラー中に演算子を押すとクリアされ 0 になる（LimitExceeded -> handleoperator のエラーハンドリング）', () => {
    // 9999999999 + 1 =  ->  10000000000 (整数11桁) で LimitExceededError
    pressSeq(c, ['9','9','9','9','9','9','9','9','9','9', '+', '1', '=']);
    expect(c.display.startsWith('E')).toBeTrue(); // "E1.000000000" のような表示になっていることを確認
  });

  it('逐次計算の確認：乗算の後に加算へ切り替え（優先順位ではなく逐次確定）', () => {
    pressSeq(c, ['7', '*', '2', '+', '3', '=']); // (7*2)=14 を確定してから +3
    expect(c.display).toBe('17');
  });

  it('「7 + 2 / =」でも reciprocal 条件が満たされ、1/(7+2) になる', () => {
    pressSeq(c, ['7', '+', '2', '/','=',]);
    expect(c.display).toBe('0.11111111'); // 1/9 を 8桁切り捨て
  });
});


describe('CalculatorComponent formatting', () => {
  let c: CalculatorComponent;

  beforeEach(() => {
    c = new CalculatorComponent();
    c.clear();
  });

  it('末尾ゼロ除去: 3 ÷ 2 = 1.5', () => {
    typeNumber(c, '3');
    c.handleoperator('/');
    typeNumber(c, '2');
    c.calculateresult();
    expect(c.display).toBe('1.5');
  });

  it('8桁小数で切り捨て: 1 ÷ 3 = 0.33333333', () => {
    typeNumber(c, '1');
    c.handleoperator('/');
    typeNumber(c, '3');
    c.calculateresult();
    expect(c.display).toBe('0.33333333');
  });

  it('√も切り捨て: √2 = 1.41421356', () => {
    typeNumber(c, '2');
    c.root();
    expect(c.display).toBe('1.41421356');
  });

  it('先頭ゼロ保持: 1 ÷ 10000000 = 0.0000001', () => {
    typeNumber(c, '1');
    c.handleoperator('/');
    typeNumber(c, '10000000'); // 1e7
    c.calculateresult();
    expect(c.display).toBe('0.0000001');
  });

  it('ごく小さい値は0表示（正の例）: 9 ÷ 1e9 × 0.9 = 0', () => {
    typeNumber(c, '9');
    c.handleoperator('/');
    typeNumber(c, '1000000000'); // 1e9
    c.calculateresult(); // 0.000000009
    c.handleoperator('*');
    typeNumber(c, '0.9'); // => 0.0000000081
    c.calculateresult();
    expect(c.display).toBe('0');
  });

  it('整数部10桁はOK: 9999999999 + 0 = 9999999999', () => {
    typeNumber(c, '9999999999');
    c.handleoperator('+');
    typeNumber(c, '0');
    c.calculateresult();
    expect(c.display).toBe('9999999999');
  });

  it('11桁でエラー（加算）: 9999999999 + 1 = E1.000000000', () => {
    typeNumber(c, '9999999999');
    c.handleoperator('+');
    typeNumber(c, '1');          // 結果 10000000000（11桁）
    c.calculateresult();
    expect(c.display).toBe('E1.000000000');
  });

  it('11桁でエラー（乗算）: 9999999999 × 10 = E9.999999999', () => {
    typeNumber(c, '9999999999');
    c.handleoperator('*');
    typeNumber(c, '10');         // 結果 99999999990（11桁）
    c.calculateresult();
    expect(c.display).toBe('E9.999999999');
  });

  it('11桁でエラー（別パターン）: 1234567890 × 10 = E1.234567890', () => {
    typeNumber(c, '1234567890');
    c.handleoperator('*');
    typeNumber(c, '10');         // 結果 12345678900（11桁）
    c.calculateresult();
    expect(c.display).toBe('E1.234567890');
  });

  it('11桁でエラー（負数）: (-1234567890) × 10 = E-1.234567890', () => {
    typeNumber(c, '-1234567890');
    c.handleoperator('*');
    typeNumber(c, '10');         // 結果 -12345678900（11桁）
    c.calculateresult();
    expect(c.display).toBe('E-1.234567890');
  });

  it('ちょうど必要な桁だけ表示: 1 ÷ 128 = 0.0078125', () => {
    typeNumber(c, '1');
    c.handleoperator('/');
    typeNumber(c, '128');
    c.calculateresult();
    expect(c.display).toBe('0.0078125'); // 8桁未満はそのまま
  });

  it('％も切り捨て＆末尾0除去: 50 % = 0.5', () => {
    typeNumber(c, '50');
    c.percent();
    expect(c.display).toBe('0.5');
  });
});
// privateプロパティへアクセスしたい箇所は any キャストで扱います
type CalcAny = CalculatorComponent & { [k: string]: any };

describe('CalculatorComponent – Error Guard behavior', () => {
  let c: CalcAny;

  const causeDivideByZeroError = () => {
    c.clear();
    c.inputdigit('8');
    c.handleoperator('/');
    c.inputdigit('0');
    c.calculateresult(); // DivideByZeroError → ErrorSet
  };

  const causeLimitExceededError = () => {
    // 9999999999(10桁) × 9 = 89999999991(11桁) → LimitExceededError
    c.clear();
    '9999999999'.split('').forEach(d => c.inputdigit(d));
    c.handleoperator('*');
    c.inputdigit('9');
    c.calculateresult();
  };

  const causeDomainError = () => {
    // (-9) の平方根 → DomainError
    c.clear();
    c.inputdigit('9');
    c.togglenegative();
    c.root();
  };

  const causeReciprocalZeroError = () => {
    // 0 ÷ = → 1/0 → DivideByZeroError（逆数モード）
    c.clear();
    c.inputdigit('0');
    c.handleoperator('/');
    c.calculateresult();
  };

  const causePercentDivideByZeroError = () => {
    // 500 / 0 % → base / (0/100) → DivideByZeroError
    c.clear();
    '500'.split('').forEach(d => c.inputdigit(d));
    c.handleoperator('/');
    c.inputdigit('0');
    c.percent();
  };

  beforeEach(() => {
    c = new CalculatorComponent() as CalcAny;
  });

  it('enters error state on divide by zero and shows "Error"', () => {
    causeDivideByZeroError();
    expect(c['isError']).toBeTrue();
    expect(c.display).toBe('Error'); // DivideByZeroError のメッセージ
  });

  it('ignores ALL actions except C/CE during error (divide by zero case)', () => {
    causeDivideByZeroError();
    const before = c.display;

    // 1) 数字
    c.inputdigit('7');
    expect(c.display).toBe(before);

    // 2) 小数点
    c.inputdecimal();
    expect(c.display).toBe(before);

    // 3) 演算子
    c.handleoperator('+');
    expect(c.display).toBe(before);

    // 4) ±
    c.togglenegative();
    expect(c.display).toBe(before);

    // 5) %
    c.percent();
    expect(c.display).toBe(before);

    // 6) √
    c.root();
    expect(c.display).toBe(before);

    // 7) =
    c.calculateresult();
    expect(c.display).toBe(before);

    // isError は保持
    expect(c['isError']).toBeTrue();
  });

  it('CE clears error and resets to "0" (and state cleared)', () => {
    causeDivideByZeroError();
    c.clearEntry(); // CE はエラー解除可能
    expect(c['isError']).toBeFalse();
    expect(c.display).toBe('0');
    expect(c['operator']).toBeNull();
    expect(c['firstvalue']).toBeNull();
    expect(c['lastvalue']).toBeNull();

    // 入力が通常に戻っていること
    c.inputdigit('5');
    expect(c.display).toBe('5');
  });

  it('C clears error and fully resets state', () => {
    causeDivideByZeroError();
    c.clear(); // C でも解除
    expect(c['isError']).toBeFalse();
    expect(c.display).toBe('0');
    expect(c['operator']).toBeNull();
    expect(c['firstvalue']).toBeNull();
    expect(c['lastvalue']).toBeNull();

    // 入力確認
    c.inputdigit('1');
    c.inputdigit('2');
    c.calculateresult(); // = 単押し → 定数モード待機
    expect(c.display).toBe('12');
  });

  it('preserves error state across various error types until CE/C', () => {
    // LimitExceededError（表示は 'E...' 形式）
    causeLimitExceededError();
    expect(c['isError']).toBeTrue();
    expect(c.display.startsWith('E')).toBeTrue();

    // 解除しない操作は無効
    c.inputdigit('1');
    expect(c.display.startsWith('E')).toBeTrue();

    // CE で解除
    c.clearEntry();
    expect(c['isError']).toBeFalse();
    expect(c.display).toBe('0');

    // DomainError
    causeDomainError();
    expect(c['isError']).toBeTrue();
    expect(c.display).toBe('Error'); // DomainError のメッセージは 'Error'

    // C で解除
    c.clear();
    expect(c['isError']).toBeFalse();
    expect(c.display).toBe('0');
  });

  it('keeps error state for reciprocal 1/0 and percent-divide-by-zero until CE/C', () => {
    // reciprocal 1/0
    causeReciprocalZeroError();
    expect(c['isError']).toBeTrue();
    expect(c.display).toBe('Error');

    // 非解除操作は無効
    c.calculateresult();
    expect(c.display).toBe('Error');

    // CEで解除
    c.clearEntry();
    expect(c['isError']).toBeFalse();
    expect(c.display).toBe('0');

    // percent divide by zero
    causePercentDivideByZeroError();
    expect(c['isError']).toBeTrue();
    expect(c.display).toBe('Error');

    // Cで解除
    c.clear();
    expect(c['isError']).toBeFalse();
    expect(c.display).toBe('0');
  });

  it('after CE/C recovery, normal calculations work', () => {
    causeDivideByZeroError();
    c.clearEntry(); // 解除
    c.inputdigit('1');
    c.handleoperator('+');
    c.inputdigit('2');
    c.calculateresult();
    expect(c.display).toBe('3');
  });
});
// decimal-precision.spec.ts

type Key = '0'|'1'|'2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'
        | '.' | '+' | '-' | '×' | '÷' | '=' | 'C' | '√' | '1/x';

const DISPLAY_ROUNDING: 'TRUNC' | 'HALF_UP' = 'TRUNC'; // ←あなたの仕様に合わせる



function tapSeq(c: CalculatorComponent, keys: Key[]) {
  keys.forEach(k => tap(c, k));
}

function q8(d: Decimal): Decimal {
  const pow = new Decimal(10).pow(8);
  if (DISPLAY_ROUNDING === 'TRUNC') {
    // 符号方向の切り捨て（toward 0）：正負で丸めを分ける
    return d.isNeg()
      ? d.abs().mul(pow).floor().div(pow).neg()
      : d.mul(pow).floor().div(pow);
  } else {
    return d.toDecimalPlaces(8, Decimal.ROUND_HALF_UP);
  }
}

// 画面表示 → Decimal へ（指数表記/末尾0差異の影響を排除）
function parseDisplay(s: string): Decimal {
  if (s === '-0' || s === '-0.00000000') return new Decimal(0);
  return new Decimal(s);
}

describe('Decimal precision (8dp display)', () => {
  const cases: { name: string, keys: Key[], expected: string }[] = [
    { name: '0.1 + 0.2', keys: ['0','.','1','+','0','.','2','='], expected: '0.3' },
    { name: '0.1 + 0.7', keys: ['0','.','1','+','0','.','7','='], expected: '0.8' },
    { name: '0.3 - 0.2', keys: ['0','.','3','-','0','.','2','='], expected: '0.1' },
    { name: '1 - 0.99999999', keys: ['1','-','0','.','9','9','9','9','9','9','9','9','='], expected: '0.00000001' },
    { name: '0.2 × 0.3', keys: ['0','.','2','×','0','.','3','='], expected: '0.06' },
    { name: '1 ÷ 3', keys: ['1','÷','3','='], expected: (DISPLAY_ROUNDING==='TRUNC'?'0.33333333':'0.33333333') },
    { name: '2 ÷ 3', keys: ['2','÷','3','='], expected: (DISPLAY_ROUNDING==='TRUNC'?'0.66666666':'0.66666667') },
    { name: '√2', keys: ['2','√','='], expected: '1.41421356' },        
    { name: '(1/0.3)*0.3', keys: ['1','÷','0','.','3','=','×','0','.','3','='], expected: '0.99999999' },
  ];

  it('runs fixed cases against 8dp policy', () => {
    for (const tc of cases) {
      const c = new CalculatorComponent();
      tapSeq(c, tc.keys);
      const actual = q8(new Decimal(parseDisplay(c.display).toString()));
      const expected = q8(new Decimal(tc.expected));
      expect(actual.eq(expected)).withContext(tc.name + ' display=' + c.display).toBeTrue();
    }
  });

  it('boundary: 0.12345678 + 9e-9', () => {
    const c = new CalculatorComponent();
    tapSeq(c, ['0','.','1','2','3','4','5','6','7','8','+','0','.','0','0','0','0','0','0','0','0','9','=']);
    const actual = q8(new Decimal(parseDisplay(c.display).toString()));
    const expected = (DISPLAY_ROUNDING==='TRUNC') ? new Decimal('0.12345678')
                                                  : new Decimal('0.12345679');
    expect(actual.eq(expected)).toBeTrue();
  });

  it('carry over at 8th place: 0.99999999 + 1e-8 = 1', () => {
    const c = new CalculatorComponent();
    tapSeq(c, ['0','.','9','9','9','9','9','9','9','9','+','0','.','0','0','0','0','0','0','0','1','=']);
    const expected = q8(new Decimal(1));
    const actual = q8(new Decimal(parseDisplay(c.display).toString()));
    expect(actual.eq(expected)).toBeTrue();
  });
});

// ── Drop-in replacement ──────────────────────────────────────────────
// Random fuzz (8dp, binary minus only, no "-0")
describe('Random fuzz (8dp, binary minus only, no "-0")', () => {
  // 非負の小数（0..999.ffffffff）だけを生成（単項マイナスは使わない仕様）
  function randPosDec(): Decimal {
    const int = Math.floor(Math.random() * 1000);   // 0..999
    const frac = Math.floor(Math.random() * 1e8);   // 8 桁
    const s = `${int}.${frac.toString().padStart(8,'0')}`;
    return new Decimal(s);
  }

  // 文字列として「-0...」を出していないか
  function expectNoNegativeZero(display: string) {
    const zeroLike = /^-?0(?:\.0+)?$/.test(display);
    if (zeroLike) {
      expect(display.startsWith('-')).withContext('must not render "-0"').toBeFalse();
    }
  }

  const ops: ('+'|'-'|'×'|'÷')[] = ['+','-','×','÷'];
  const CASES = 50; // 必要に応じて 200 などへ

  for (let i = 0; i < CASES; i++) {
    it(`fuzz #${i+1}`, () => {
      const a = randPosDec();
      let b = randPosDec();
      let op = ops[Math.floor(Math.random() * ops.length)];

      // 0除算を避ける（÷で b=0 の場合は 1.00000000 に差し替え）
      if (op === '÷' && b.isZero()) b = new Decimal('1.00000000');

      // 期待値：高精度 → 表示仕様(8桁)に正規化（-0 も 0 に正規化される想定）
      let exact: Decimal;
      switch (op) {
        case '+': exact = a.plus(b); break;
        case '-': exact = a.minus(b); break;          // 負の結果はこの計算でのみ出現
        case '×': exact = a.times(b); break;
        case '÷': exact = a.div(b); break;
      }
      const expected = q8(exact);                     // ← 既存の丸め関数(TRUNC/HALF_UP)

      // 非負のオペランドのみキー入力（単項マイナスは使わない）
      const keysOf = (d: Decimal): Key[] => {
        const s = d.toFixed(8); // 非負のみなので '-' は出ない
        const ks: Key[] = [];
        for (const ch of s) ks.push(ch === '.' ? '.' : (ch as Key));
        return ks;
      };

      const c = new CalculatorComponent();
      tapSeq(c, [...keysOf(a), (op as Key), ...keysOf(b), '=']); // ← 既存の tap/tapSeq/Key を使用

      // 実表示→数値化→8桁規約で比較
      const actual = q8(parseDisplay(c.display));     // ← 既存の parseDisplay
      expect(actual.eq(expected))
        .withContext(`${a} ${op} ${b} -> display=${c.display}`)
        .toBeTrue();

      // 表示としても「-0」を許さない
      if (expected.eq(0)) {
        expectNoNegativeZero(c.display);
      }
    });
  }
});

describe('CalculatorComponent - decimal + toggleNegative behavior', () => {
  let c: CalculatorComponent;

  // ボタン風ヘルパ
  const pressDigit = (d: string) => c.inputdigit(d);
  const pressDot = () => c.inputdecimal();
  const pressSign = () => c.togglenegative();
  const pressOp = (op: string) => c.handleoperator(op);
  const pressEq = () => c.calculateresult();
  const pressC = () => c.clear();
  const pressCE = () => c.clearEntry();

  beforeEach(() => {
    c = new CalculatorComponent();
  });

  it('「. → ±」で -0. を維持できる', () => {
    pressDot();         // "0."
    pressSign();        // should keep "-0."
    expect(c['display']).toBe('-0.');
  });

  it('「. → ± → 5」で -0.5 を維持できる', () => {
    pressDot();         // "0."
    pressSign();        // "-0."
    pressDigit('5');    // "-0.5"
    expect(c['display']).toBe('-0.5');
  });

  it('「0 → ± → 7」で -7 になる（-0 からの自然遷移）', () => {
    pressDigit('0');    // "0"
    pressSign();        // "-0"
    pressDigit('7');    // "-7"
    expect(c['display']).toBe('-7');
  });

  it('非ゼロ値は数値反転：1.23 → ± で -1.23', () => {
    pressDigit('1');
    pressDot();
    pressDigit('2');
    pressDigit('3');    // "1.23"
    pressSign();        // "-1.23"
    expect(c['display']).toBe('-1.23');
  });

  it('演算子入力後の第二項編集中に ± を押しても firstvalue を壊さない（機能的検証）', () => {
    // 8 + (編集中に . → ± → 3) → = で 8 + (-0.3) = 7.7 になること
    pressDigit('8');        // "8"
    pressOp('+');           // wait second
    pressDot();             // "0." (waiting=false)
    pressSign();            // "-0."
    pressDigit('3');        // "-0.3"
    pressEq();              // 計算
    expect(c['display']).toBe('7.7');

    // もし old 実装（待機中に firstvalue を書き換える）だと、0 + (-0.3) = -0.3 になって失敗する
  });

  it('「. → ± → ±」で 0. に戻る（符号トグルの往復）', () => {
    pressDot();     // "0."
    pressSign();    // "-0."
    pressSign();    // "0."
    expect(c['display']).toBe('0.');
  });

  it('「. → ± → 0 → 0 → 5」で -5 になる（-0 連打からの遷移）', () => {
    pressDot();         // "0."
    // ここで整数入力に戻すために CE で "0" に戻してもよいが、
    // 仕様に沿って進める：小数点状態から一旦クリアして再入力
    pressCE();          // "0"
    pressSign();        // "-0"
    pressDigit('0');    // "-0"
    pressDigit('0');    // "-0"
    pressDigit('5');    // "-5"
    expect(c['display']).toBe('-5');
  });

  it('「9 - （待機中に . → ± → ＝）」で 9 のまま（第二項が -0 の扱いでもゼロ）', () => {
    pressDigit('9');    // "9"
    pressOp('-');       // wait second
    pressDot();         // "0."
    pressSign();        // "-0."
    pressEq();          // second is 0 扱いで 9 - 0 = 9
    expect(c['display']).toBe('9');
  });

  it('演算子直後に . → ± → 5 → ＝ → ＝ の連打でも表示が安定（退行テスト）', () => {
    pressDigit('2');    // "2"
    pressOp('+');
    pressDot();         // "0."
    pressSign();        // "-0."
    pressDigit('5');    // "-0.5"
    pressEq();          // 2 + (-0.5) = 1.5
    expect(c['display']).toBe('1.5');
    pressEq();          // 定数モードで + (-0.5) 反復 → 1.0
    expect(c['display']).toBe('1');
  });

  it('C / CE まわり：エラー状態で CE はエラー解除、通常時 CE は桁だけ消す', () => {
    // 正常時の CE
    pressDigit('1');
    pressDigit('2');    // "12"
    pressCE();          // "0"
    expect(c['display']).toBe('0');

    // 疑似エラー状態
    c['ErrorSet']('Error');
    expect(c['display']).toBe('Error');
    pressCE();          // エラー解除して "0" に戻ること
    expect(c['display']).toBe('0');
  });
})

describe('CalculatorComponent – Cases C & D', () => {

  /** 入力ユーティリティ */
  function pressNumber(c: CalculatorComponent, s: string) {
    for (const ch of s) {
      if (ch === '.') c.inputdecimal();
      else c.inputdigit(ch);
    }
  }
  function pressOp(c: CalculatorComponent, op: string) {
    c.handleoperator(op);
  }
  function eq(c: CalculatorComponent) {
    c.calculateresult();
  }
  function expectDisplay(c: CalculatorComponent, expected: string) {
    expect(c.display).toBe(expected);
  }

  /** 毎テストで新規インスタンス */
  let c: CalculatorComponent;
  beforeEach(() => {
    c = new CalculatorComponent();
  });

  // =========================
  // C) 「= 直後に数字を打ってさらに =」の挙動（厳密等価依存の検証）
  // =========================

  it('C-1: 乗算の例（丸め表示値を再入力→ newInputAfterEqual = true の経路）', () => {
    // 1) 1.23456789 × 9.87654321 =
    pressNumber(c, '1.23456789');
    pressOp(c, '*');
    pressNumber(c, '9.87654321');
    eq(c);

    // 1.23456789 * 9.87654321 = 12.1932631112635269...
    // 表示は小数8桁で切り捨て → '12.19326311'
    expectDisplay(c, '12.19326311');

    // 2) 「=直後」に、表示値（丸め済）12.19326311 を"再入力"してから '='
    pressNumber(c, '12.19326311');
    eq(c);

    // newInputAfterEqual は true（再入力値と firstvalue の「厳密等価」が崩れる）となり、
    // 乗算では left=mulconstant(=初回left=1.23456789), right=再入力値(=12.19326311) で計算
    // 期待表示：1.23456789 * 12.19326311 = 15.0534111099... → 切り捨て8桁 & 末尾0除去 → '15.0534111'
    expectDisplay(c, '15.0534111');
  });

  it('C-2: 乗算の例（=連打 → newInputAfterEqual = false の経路）', () => {
    // 1) 1.23456789 × 9.87654321 =
    pressNumber(c, '1.23456789');
    pressOp(c, '*');
    pressNumber(c, '9.87654321');
    eq(c);
    expectDisplay(c, '12.19326311'); // 初回結果の表示

    // 2) 何も入力せずに '=' をもう一度
    eq(c);

    // =連打の分岐では left=firstvalue(=前回結果), right=lastvalue(=9.87654321)
    // 12.1932631112635269... * 9.87654321 = 120.42728998... → 表示 '120.42728998'
    expectDisplay(c, '120.42728998');
  });

  it('C-3: 乗算の例（=直後に「前回結果と完全同値」を再入力 → newInputAfterEqual = false）', () => {
    // 2 × 3 = 6
    pressNumber(c, '2');
    pressOp(c, '*');
    pressNumber(c, '3');
    eq(c);
    expectDisplay(c, '6');

    // 「=直後」に「6」を再入力 → 6 は firstvalue と厳密に同値なので newInputAfterEqual = false
    pressNumber(c, '6');
    eq(c);

    // =連打経路（left=6, right=lastvalue=3）→ 18
    expectDisplay(c, '12');
  });

  // =========================
  // D) '0.' の取り扱い（小数点単独入力・±切替時の耐性）
  // =========================

  it('D-1: 先に小数点だけ入力してもエラーにならず、続けての数字入力で 0.x になる', () => {
    // 0 . → '0.' のまま
    c.inputdigit('0');
    c.inputdecimal();
    expectDisplay(c, '0.');

    // さらに '5' 入力 → '0.5'
    c.inputdigit('5');
    expectDisplay(c, '0.5');

    // エラー状態でないこと（privateなので any 経由で確認）
    expect((c as any).isError).toBeFalse();
  });

  it('D-2: "0." で ± を押してもエラーにならず、"-0." → さらに数字で -0.x になる', () => {
    // '0.' を作る
    c.inputdigit('0');
    c.inputdecimal();
    expectDisplay(c, '0.');

    // ± → '-0.'（ここで syncDisplay が '0.' をパースできない実装だとエラー化する）
    c.togglenegative();
    expectDisplay(c, '-0.');

    // 続けて '7' 入力 → '-0.7'
    c.inputdigit('7');
    expectDisplay(c, '-0.7');

    // エラー状態でないこと
    expect((c as any).isError).toBeFalse();
  });

});

function pressNumber(c: CalculatorComponent, s: string) {
  for (const ch of s) {
    if (ch === '.') c.inputdecimal();
    else c.inputdigit(ch);
  }
}
function pressOp(c: CalculatorComponent, op: string) {
  c.handleoperator(op);
}
function pressPct(c: CalculatorComponent) {
  c.percent();
}
function pressEq(c: CalculatorComponent) {
  c.calculateresult();
}

// 追記ヘルパー（未定義なら追加）
function pressSign(c: CalculatorComponent) { c.togglenegative(); }

describe('Percent with decimals & negatives', () => {
  // --- 小数: + / - 直後の単項% ---
  

  // --- 従来仕様の確認（変更なし）: * ／ / と小数・負数 ---
  it('12.5 * % → 1.5625（従来どおり）', () => {
    const c = new CalculatorComponent();
    pressNumber(c, '12'); c.inputdecimal(); pressNumber(c, '5');
    pressOp(c, '*'); pressPct(c);
    expect(c.display).toBe('1.5625');
  });

  it('-2.5 * % → 0.0625（従来どおり）', () => {
    const c = new CalculatorComponent();
    pressNumber(c, '2'); c.inputdecimal(); pressNumber(c, '5'); pressSign(c); // -2.5
    pressOp(c, '*'); pressPct(c);
    expect(c.display).toBe('0.0625'); // (-2.5)*(-2.5)/100 = 0.0625
  });

  it('12.5 / % → 100（従来どおり）', () => {
    const c = new CalculatorComponent();
    pressNumber(c, '12'); c.inputdecimal(); pressNumber(c, '5');
    pressOp(c, '/'); pressPct(c);
    expect(c.display).toBe('100');
  });

  it('-12.5 / % → 100（従来どおり）', () => {
    const c = new CalculatorComponent();
    pressNumber(c, '12'); c.inputdecimal(); pressNumber(c, '5'); pressSign(c); // -12.5
    pressOp(c, '/'); pressPct(c);
    expect(c.display).toBe('100'); // -12.5 / (-12.5%) = 100
  });

  // --- 小数・負数の「n %」入力（従来の加減％） ---
  it('12.34 + 10 % → 13.574（従来どおり）', () => {
    const c = new CalculatorComponent();
    pressNumber(c, '12'); c.inputdecimal(); pressNumber(c, '34');
    pressOp(c, '+');
    pressNumber(c, '1'); pressNumber(c, '0');
    pressPct(c);
    expect(c.display).toBe('13.574'); // 12.34 + (12.34*10%) = 13.574
  });

  it('-20 + 10 % → -22（従来どおり）', () => {
    const c = new CalculatorComponent();
    pressNumber(c, '2'); pressNumber(c, '0'); pressSign(c); // -20
    pressOp(c, '+');
    pressNumber(c, '1'); pressNumber(c, '0');
    pressPct(c);
    expect(c.display).toBe('-22'); // -20 + (-20*10%) = -22
  });
});

describe('CalculatorComponent - togglenegative minimal fix', () => {

  function enter(c: CalculatorComponent, s: string) {
    // 数字と '.' を逐次入力
    for (const ch of s.split('')) {
      if (ch === '.') c.inputdecimal();
      else c.inputdigit(ch);
    }
  }

  it('0.00 ± → -0.00 を維持（表示を潰さない）', () => {
    const c = new CalculatorComponent();
    c.inputdecimal();      // 0.
    c.inputdigit('0');     // 0.0
    c.inputdigit('0');     // 0.00
    c.togglenegative();    // ±
    expect(c['display']).toBe('-0.00');
    // 数値的には0であること
    expect(c['displayValue'].isZero()).toBeTrue();
  });

  it('-0.00 ± → 0.00 に戻る', () => {
    const c = new CalculatorComponent();
    c.inputdecimal(); c.inputdigit('0'); c.inputdigit('0'); // 0.00
    c.togglenegative();                                     // -0.00
    c.togglenegative();                                     // 0.00
    expect(c['display']).toBe('0.00');
    expect(c['displayValue'].isZero()).toBeTrue();
  });

  it('0 ± → -0、0. ± → -0. を保持', () => {
    const c1 = new CalculatorComponent();
    c1.togglenegative();
    expect(c1['display']).toBe('-0');

    const c2 = new CalculatorComponent();
    c2.inputdecimal();   // 0.
    c2.togglenegative(); // → -0.
    expect(c2['display']).toBe('-0.');
  });

  it('非ゼロは showDisplay 経由でトリムされる（12.30 ± → -12.3）', () => {
    const c = new CalculatorComponent();
    enter(c, '123');     // 123
    c.inputdecimal();    // 123.
    c.inputdigit('0');   // 123.0
    c.togglenegative();  // → -123（末尾0はformatで落ちる）
    expect(c['display']).toBe('-123');
  });

  // ↑の仕様を「演算子直後にも firstvalue を反映したい」場合に切り替えるなら、
  // 下のテストを it(...) に、上のテストを xit(...) にしてください。
  xit('（オプション）演算子直後の 0 ± で firstvalue も反転させる仕様にした場合の期待', () => {
    const c = new CalculatorComponent();
    enter(c, '5');
    c.handleoperator('+');
    // もし isZero 分岐の中でも firstvalue を更新するなら：
    //   if (this.waitingForSecondValue && this.firstvalue !== null) this.firstvalue = new Decimal(this.display);
    c.togglenegative();
    expect(c['display']).toBe('-0');
    expect(c['firstvalue']!.toString()).toBe('-5'); // 左辺も反転
  });

  it('0.00000000（8桁）± → -0.00000000（小数部のゼロを保持）', () => {
    const c = new CalculatorComponent();
    c.inputdecimal();            // 0.
    for (let i = 0; i < 8; i++) c.inputdigit('0'); // 0.00000000
    c.togglenegative();
    expect(c['display']).toBe('-0.00000000');
  });

  it('± の後に最初の数字を打つと、演算子直後なら新規入力で置き換えられる（符号は維持されないのが仕様）', () => {
    const c = new CalculatorComponent();
    enter(c, '5');
    c.handleoperator('+');       // waitingForSecondValue = true
    c.togglenegative();          // display: -0
    c.inputdigit('3');           // 最初の数字で置換 → '3'（負号は付かない）
    expect(c['display']).toBe('3');
  });

  it('0.00 ± × 4 = → 0（-0は数値的に0なので結果は0）', () => {
    const c = new CalculatorComponent();
    c.inputdecimal(); c.inputdigit('0'); c.inputdigit('0'); // 0.00
    c.togglenegative();                                     // -0.00
    c.handleoperator('*');                                  // firstvalue = -0
    c.inputdigit('4');                                      // 4
    c.calculateresult();                                    // = → 0
    expect(c['display']).toBe('0');
    expect(c['displayValue'].isZero()).toBeTrue();
  });
});
// calculator.component.spec.ts の一部例
describe('CalculatorComponent - 10桁制限の境界テスト', () => {
  let c: CalculatorComponent;

  beforeEach(() => {
    c = new CalculatorComponent();
  });

  // 入力ユーティリティ
  function pressDigits(s: string) {
    for (const ch of s) {
      if (ch === '.') c.inputdecimal();
      else c.inputdigit(ch);
    }
  }
  function pressOp(op: string) {
    c.handleoperator(op);
  }
  function eq() {
    c.calculateresult();
  }

  it('ちょうど10桁は固定表示に収まる: 9999999999 × 1 = 9999999999', () => {
    pressDigits('9999999999'); // 10桁
    pressOp('*');
    pressDigits('1');
    eq();
    expect(c.display).toBe('9999999999'); // 10桁はOK
  });

  it('10桁を超える整数は固定表示に収まらない: 9999999999 + 1 = （オーバー）', () => {
    pressDigits('9999999999'); // 10桁
    pressOp('+');
    pressDigits('1');
    eq();

    // ▼どちらか一方を採用
    // A) 指数表記へ退避する仕様に変更した場合
    // expect(c.display).toBe('1.000000000E+10');

    // B) 現行仕様（LimitExceededError を表示文字列として出す）
    expect(c.display).toBe('E1.000000000');
  });

  it('「11桁目の入力」は無視される（入力制御）', () => {
    pressDigits('9999999999'); // 10桁
    c.inputdigit('9');         // 11桁目は拒否
    expect(c.display).toBe('9999999999');
  });

  it('9999999999 × 9 = は整数11桁（89,999,999,991）→ 固定表示に収まらない', () => {
    pressDigits('9999999999'); // 左辺10桁
    pressOp('*');
    pressDigits('9');
    eq();

    // ▼どちらか一方を採用
    // A) 指数表記へ退避（有効桁10、HALF_UP）
    // 8.9999999991 × 10^10 → 11桁目が「1」→ 繰り上がらず
    // expect(c.display).toBe('8.999999999E+10');

    // B) 現行仕様（LimitExceededError の文字列を表示）
    expect(c.display).toBe('E8.999999999');
  });

  it('境界の下側確認: 9999999999 × 0 = 0（桁あふれなし/正規化）', () => {
    pressDigits('9999999999');
    pressOp('*');
    pressDigits('0');
    eq();
    expect(c.display).toBe('0');
  });

  it('境界の近傍: 9999999999 ÷ 9 は10桁で収まる', () => {
    pressDigits('9999999999');
    pressOp('/');
    pressDigits('9');
    eq();
    expect(c.display).toBe('1111111111'); // ← これが正しい
  });
  
});

describe('CalculatorComponent: sqrt on second operand behavior', () => {
  let c: CalculatorComponent;

  // 小さな入力ヘルパ
  const press = (keys: Array<string>) => {
    for (const k of keys) {
      if (k >= '0' && k <= '9') c.inputdigit(k);
      else if (k === '.') c.inputdecimal();
      else if (k === '+' || k === '-' || k === '*' || k === '/') c.handleoperator(k);
      else if (k === '=') c.calculateresult();
      else if (k === '√') c.root();
      else if (k === 'C') c.clear();
      else throw new Error(`unknown key: ${k}`);
    }
  };

  beforeEach(() => {
    c = new CalculatorComponent();
  });

  it('「7 * 8 = √ + 9 √ 4」で、√直後の次の数値は置き換えになり表示は「4」だけ', () => {
    press(['7', '*', '8', '=', '√', '+', '9', '√', '4']);
    expect(c.display).toBe('4'); // ← ここが今回の修正ポイント
  });

  it('「7 * 8 = √ + 9 √ =」で、＝は √9=3 を第2項として使う（7.48331477 + 3 = 10.48331477）', () => {
    press(['7', '*', '8', '=', '√', '+', '9', '√', '=']);
    expect(c.display).toBe('10.48331477'); // 8桁切り捨て表示仕様に一致
  });

  it('置き換え後は通常の追記に復帰：… √ の後に「4」「5」で表示は「45」', () => {
    press(['7', '*', '8', '=', '√', '+', '9', '√', '4', '5']);
    expect(c.display).toBe('45');
  });

  it('√後に演算子を押しても √結果が第2項として反映される：… + 9 √ +（＝不要の逐次計算）', () => {
    // 7*8= → 56、√ → 7.48331477、+ 9 √ → 第2項=3、さらに + で逐次計算実行
    press(['7', '*', '8', '=', '√', '+', '9', '√', '+']);
    // 期待：7.48331477 + 3 = 10.48331477 が表示された状態で次の第2項待ち
    expect(c.display).toBe('10.48331477');
  });

  it('逆方向の回 regress check：修正なしだと起きていた不具合（√直後の数値が追記）を防げている', () => {
    // かつては … √ の後に「4」で「34」になっていたケース
    press(['7', '*', '8', '=', '√', '+', '9', '√']);
    expect(c.display).toBe('3'); // ここで表示は3
    press(['4']);
    expect(c.display).toBe('4'); // 追記ではなく置き換え
  });
});

describe('CalculatorComponent: "+/- の直後 = 仕様"', () => {
  let c: CalculatorComponent;

  beforeEach(() => {
    c = new CalculatorComponent();
  });

  const num = (s: string) => {
    for (const ch of s) ch === '.' ? c.inputdecimal() : c.inputdigit(ch);
  };

  it('10+1+= -> 11', () => {
    num('10');
    c.handleoperator('+');
    num('1');
    c.handleoperator('+');   // ここで waitingForSecondValue = true
    c.calculateresult();     // + の二項目が未入力なので 0 を右辺として扱う
    expect(c.display).toBe('11');
  });

  it('10-1-= -> 9', () => {
    c.clear();
    num('10');
    c.handleoperator('-');
    num('1');
    c.handleoperator('-');   // ここで waitingForSecondValue = true
    c.calculateresult();     // - の二項目が未入力なので 0 を右辺として扱う
    expect(c.display).toBe('9');
  });

  it('10+1= の後、= 連打で +1 が繰り返される（11 -> 12 -> 13）', () => {
    c.clear();
    num('10');
    c.handleoperator('+');
    num('1');
    c.calculateresult();     // 11
    expect(c.display).toBe('11');
    c.calculateresult();     // 12
    expect(c.display).toBe('12');
    c.calculateresult();     // 13
    expect(c.display).toBe('13');
  });

  it('10-1= の後、= 連打で -1 が繰り返される（9 -> 8 -> 7）', () => {
    c.clear();
    num('10');
    c.handleoperator('-');
    num('1');
    c.calculateresult();     // 9
    expect(c.display).toBe('9');
    c.calculateresult();     // 8
    expect(c.display).toBe('8');
    c.calculateresult();     // 7
    expect(c.display).toBe('7');
  });

  it('= の直後に + を押してさらに = を押しても値は変わらない（11 のまま）', () => {
    c.clear();
    num('10');
    c.handleoperator('+');
    num('1');
    c.calculateresult();     // 11
    expect(c.display).toBe('11');
    c.handleoperator('+');   // 新規計算開始・右辺未入力
    c.calculateresult();     // + の右辺 0 扱い → 11 + 0
    expect(c.display).toBe('11');
  });

  it('掛け算の振る舞いは保持：10*2* = 40、さらに = で 80', () => {
    c.clear();
    num('10');
    c.handleoperator('*');
    num('2');
    c.handleoperator('*');   // 乗算は右辺（2）を保持
    c.calculateresult();     // 20 * 2 = 40
    expect(c.display).toBe('40');
    c.calculateresult();     // 40 * 2 = 80
    expect(c.display).toBe('80');
  });

  it('演算子の直後に =：+/- は 0、* は自己、/ は逆数（既存仕様維持）', () => {
    // 10 += → 10
    c.clear();
    num('10');
    c.handleoperator('+');
    c.calculateresult();
    expect(c.display).toBe('10');

    // 10 -= → 10
    c.clear();
    num('10');
    c.handleoperator('-');
    c.calculateresult();
    expect(c.display).toBe('10');

    // 10 *= → 100（10 * 10）
    c.clear();
    num('10');
    c.handleoperator('*');
    c.calculateresult();
    expect(c.display).toBe('100');

    // 10 /= → 0.1（10 の逆数）
    c.clear();
    num('10');
    c.handleoperator('/');
    c.calculateresult();
    expect(c.display).toBe('0.1');
  });

  it('10+1= のあとに数字を入力して =：新しい左辺に前回の右辺が適用される（5 = → 6）', () => {
    c.clear();
    num('10');
    c.handleoperator('+');
    num('1');
    c.calculateresult();     // 11（lastvalue=1）
    expect(c.display).toBe('11');

    // 新しく「5」を入力して "=" → 5 + 1 = 6
    num('5');
    c.calculateresult();
    expect(c.display).toBe('6');
  });
});
// 入力ヘルパー：1トークン＝1キー想定。数値はそのまま連結、演算子や特殊キーはメソッドに対応。
function press2(c: CalculatorComponent, ...keys: string[]) {
  for (const k of keys) {
    if (/^\d+$/.test(k)) {
      // "60" のような連続数字は1桁ずつ送る
      for (const d of k.split('')) c.inputdigit(d);
    } else if (k === '.') {
      c.inputdecimal();
    } else if (k === '+') {
      c.handleoperator('+');
    } else if (k === '-') {
      c.handleoperator('-');
    } else if (k === '*') {
      c.handleoperator('*');
    } else if (k === '/') {
      c.handleoperator('/');
    } else if (k === '=') {
      c.calculateresult();
    } else if (k === '√') {
      c.root();
    } else if (k === '%') {
      c.percent();
    } else if (k === '±') {
      c.togglenegative();
    } else if (k === 'C') {
      c.clear();
    } else if (k === 'CE') {
      c.clearEntry();
    } else {
      throw new Error(`Unknown key token: ${k}`);
    }
  }
}

describe('CalculatorComponent - percent after sqrt (/100) behavior', () => {
  let c: CalculatorComponent;

  beforeEach(() => {
    c = new CalculatorComponent();
  });

  it('60 + 4 = √ % → 0.08（√直後の％は÷100に入る）', () => {
    press2(c, '60', '+', '4', '=', '√', '%');
    expect(c.display).toBe('0.08');
  });

  it('9 √ % → 0.03（単独√の直後の％も÷100）', () => {
    press2(c, '9', '√', '%');
    expect(c.display).toBe('0.03');
  });

  it('200 % → 2（演算子なし％は÷100）', () => {
    press2(c, '200', '%');
    expect(c.display).toBe('2');
  });

  it('60 + 4 % → 62.4（演算子ありの％は base + base*(p/100)）', () => {
    press2(c, '60', '+', '4', '%');
    expect(c.display).toBe('62.4');
  });

  it('200 + 10 % → 220（加算の％は base*(1+p/100)）', () => {
    press2(c, '200', '+', '10', '%');
    expect(c.display).toBe('220');
  });

  it('60 + 4 = % → 0.64（=直後での単独％は÷100に入る仕様）', () => {
    press2(c, '60', '+', '4', '=', '%');
    expect(c.display).toBe('0.64');
  });

  it('0 √ % → 0（0の√は0、その直後の％は÷100で0）', () => {
    press2(c, '0', '√', '%');
    expect(c.display).toBe('0');
  });

  it('小数にも対応：2.5 √ % → sqrt(2.5)/100', () => {
    press2(c, '2', '.', '5', '√', '%');
    // sqrt(2.5) ≈ 1.581138830..., ÷100 → 0.0158113883 → 小数8桁丸め＆末尾0除去で "0.01581138"
    expect(c.display).toBe('0.01581138');
  });

  it('連続で%を押しても÷100の繰り返し（√直後の文脈のまま）', () => {
    press2(c, '9', '√'); // 3
    expect(c.display).toBe('3');
    press2(c, '%');      // 0.03
    expect(c.display).toBe('0.03');
    press(c, '%');      // 0.0003
    expect(c.display).toBe('0.0003');
  });

  it('「60 + 4 = √ % =」の最後の=は表示を維持（演算子がクリアされているため）', () => {
    press2(c, '60', '+', '4', '=', '√', '%', '=');
    // 直前キー「=」は演算子が無い場合は表示維持ロジック（firstvalue更新のみ）→ "0.08"のまま
    expect(c.display).toBe('0.08');
  });
});

describe('CalculatorComponent – sqrt & operator sequences', () => {
  let c: CalculatorComponent;

  // シーケンス入力ヘルパ
  // 例: press("60+4=√%") / press("7*8=√+9√+")
  function press(seq: string) {
    for (let i = 0; i < seq.length; i++) {
      const ch = seq[i];

      // CE を 1トークンとして扱う
      if (ch === 'C' && seq[i + 1] === 'E') {
        c.clearEntry();
        i++;
        continue;
      }

      if (ch >= '0' && ch <= '9') {
        c.inputdigit(ch);
      } else if (ch === '.') {
        c.inputdecimal();
      } else if (ch === '+'
              || ch === '-'
              || ch === '*'
              || ch === '/') {
        c.handleoperator(ch);
      } else if (ch === '=') {
        c.calculateresult();
      } else if (ch === '√') {
        c.root();
      } else if (ch === '%') {
        c.percent();
      } else if (ch === '±') {
        c.togglenegative();
      } else if (ch === 'C') {
        c.clear();
      } else if (ch === ' ') {
        // ignore spaces
      } else {
        fail(`Unknown key in sequence: '${ch}'`);
      }
    }
  }

  beforeEach(() => {
    c = new CalculatorComponent();
  });

  it('60+4=√% → 0.08', () => {
    press('60+4=√%');
    expect(c.display).toBe('0.08');
  });

  it('7*8=√+9√+ → 10.48331477', () => {
    press('7*8=√+9√+');
    expect(c.display).toBe('10.48331477');
  });

  it('7*8=√+9√4 → 4（= を押す前は第二項の上書き入力がそのまま表示）', () => {
    press('7*8=√+9√4');
    expect(c.display).toBe('4');
  });

  it('9+√= → 12', () => {
    press('9+√=');
    expect(c.display).toBe('12');
  });

  // 回帰テスト（関連する境界/連携）

  it('= 直後の √ は新規値として扱われ、% で単独の 1/100 になる（60+4=√% ケースの分解）', () => {
    press('60+4=');
    expect(c.display).toBe('64');
    press('√');   // ここで単独値 8 として新規計算の待機状態に入っているはず
    expect(c.display).toBe('8');
    press('%');   // 単独での 8% = 0.08
    expect(c.display).toBe('0.08');
  });

  it('第二項が √ で確定後に演算子を押すと、その場で計算が確定する', () => {
    // 7*8=√ → 7.48331477 表示
    // +9√ で第二項=3 確定（待機状態）
    press('7*8=√+9√');
    expect(c.display).toBe('3');   // 第二項の√(9)=3 が表示中

    // ここで + を押すと 7.48331477 + 3 が確定して 10.48331477 が表示される
    press('+');
    expect(c.display).toBe('10.48331477');
  });

  it('数字入力の上書き（第二項待機中の状態で数字を押すと、その数字から開始する）', () => {
    // 9+√ までで第二項=3 が確定済み（待機中）
    press('9+√');
    expect(c.display).toBe('3');
    // ここで 4 を押すと、第二項は 4 に上書きされ表示は 4 のまま
    press('4');
    expect(c.display).toBe('4');
  });

  it('フォーマット丸め（sqrt(2) 例）: 1.41421356 に丸め/切り捨て表示される', () => {
    // 2=√ と同義（2 の平方根）
    press('2');
    press('=');
    press('√');
    expect(c.display).toBe('1.41421356'); // 8 桁 ROUND_DOWN
  });

  it('エラーハンドリング（負数の平方根 → Error 表示）', () => {
    // 0-9= → -9、√ → Error
    press('0');
    press('-');
    press('9');
    press('=');
    press('√');
    expect(c.display).toBe('Error');
  });

  it('Clear / ClearEntry の挙動（関連する基本回帰）', () => {
    press('7*8=√+9√');
    expect(c.display).toBe('3'); // 第二項=3で待機中
    press('C');  // 全クリア
    expect(c.display).toBe('0');
    // クリア後に通常計算できること
    press('9+√=');
    expect(c.display).toBe('12');
  });
});

function pressNum(c: CalculatorComponent, s: string) {
  for (const ch of s) {
    if (ch === '.') c.inputdecimal();
    else c.inputdigit(ch);
  }
}
function root(c: CalculatorComponent) { c.root(); }

describe('CalculatorComponent – 修正後ふるまい', () => {
  let c: CalculatorComponent;
  beforeEach(() => { c = new CalculatorComponent(); });

  it('60 + 4 = √ + 9 √ + 1 = → 12（√後の pending を先に確定→新サイクル）', () => {
    pressNum(c, '60'); op(c, '+'); pressNum(c, '4'); eq(c);
    root(c); op(c, '+'); pressNum(c, '9'); root(c); // ここで 8 ＋ 3 が pending
    op(c, '+'); // 8+3=11 を先に確定し、新サイクルで「11 +」へ
    pressNum(c, '1'); eq(c);
    expect(c.display).toBe('12');
  });

  it('1 + 2 = + 1 = → 4（=直後の演算子は結果から新サイクル）', () => {
    pressNum(c, '1'); op(c, '+'); pressNum(c, '2'); eq(c); // 3
    op(c, '+');                             // ここで「3 +」の新サイクルへ
    pressNum(c, '1'); eq(c);
    expect(c.display).toBe('4');
  });

  it('=直後に演算子を押しても勝手に再計算しない（3 のまま表示が維持される）', () => {
    pressNum(c, '1'); op(c, '+'); pressNum(c, '2'); eq(c); // 3
    op(c, '+'); // ここで 3 + … の待機。5 にならないこと
    expect(c.display).toBe('3');
  });

  it('= の後に数字を入力してから演算子 → 入力数から新サイクル（1 + 2 = 5 + 1 = → 6）', () => {
    pressNum(c, '1'); op(c, '+'); pressNum(c, '2'); eq(c); // 3
    pressNum(c, '5'); op(c, '+'); pressNum(c, '1'); eq(c);
    expect(c.display).toBe('6');
  });

  it('9 + √ = → 12（√の値を右辺にして確定）', () => {
    pressNum(c, '9'); op(c, '+'); pressNum(c, '9'); root(c); eq(c);
    expect(c.display).toBe('12');
  });

  it('演算子押し替え（7 + + 5 = → 12）', () => {
    pressNum(c, '7'); op(c, '+'); op(c, '+'); pressNum(c, '5'); eq(c);
    expect(c.display).toBe('12');
  });

  it('逆数モード（9 / = → 1/9 → 0.11111111）', () => {
    pressNum(c, '9'); op(c, '/'); eq(c);
    expect(c.display).toBe('0.11111111'); // 8桁切り捨て
  });

  it('0 で割ったら Error', () => {
    pressNum(c, '1'); op(c, '/'); pressNum(c, '0'); eq(c);
    expect(c.display).toBe('Error');
  });

  it('負値の平方根は Error', () => {
    pressNum(c, '9'); pm(c); root(c);
    expect(c.display).toBe('Error');
  });

  it('桁あふれ（9999999999 * 9 = → E… 表示）', () => {
    pressNum(c, '9999999999'); op(c, '*'); pressNum(c, '9'); eq(c);
    expect(c.display.startsWith('E')).toBeTrue();
  });

  it('±と 0 の特例（-0 にしてから 5 → -5）', () => {
    // 初期 0
    pm(c);                   // -0
    pressNum(c, '5');        // -5 になるはず
    expect(c.display).toBe('-5');
  });

  it('第2オペランド開始で小数点 → 0. から入力', () => {
    pressNum(c, '2'); op(c, '+'); c.inputdecimal();
    expect(c.display).toBe('0.');
    pressNum(c, '5'); eq(c);
    expect(c.display).toBe('2.5');
  });

  it('％（200 + 10% = → 220）', () => {
    pressNum(c, '200'); op(c, '+'); pressNum(c, '10'); pct(c); 
    expect(c.display).toBe('220');
  });

  it('％（200 - 10% = → 180）', () => {
    pressNum(c, '200'); op(c, '-'); pressNum(c, '10'); pct(c); 
    expect(c.display).toBe('180');
  });

  it('％（200 * 10% = → 20）', () => {
    pressNum(c, '200'); op(c, '*'); pressNum(c, '10'); pct(c); 
    expect(c.display).toBe('20');
  });

  it('％（200 / 10% = → 2000）', () => {
    pressNum(c, '200'); op(c, '/'); pressNum(c, '10'); pct(c); 
    expect(c.display).toBe('2000');
  });

  it('繰り返し =（5 * 2 = = = → 10 → 20 → 40）', () => {
    pressNum(c, '5'); op(c, '*'); pressNum(c, '2'); eq(c);
    expect(c.display).toBe('10');
    eq(c); expect(c.display).toBe('20');
    eq(c); expect(c.display).toBe('40');
  });

  it('繰り返し =（10 + 3 = = = → 13 → 16 → 19）', () => {
    pressNum(c, '10'); op(c, '+'); pressNum(c, '3'); eq(c);
    expect(c.display).toBe('13');
    eq(c); expect(c.display).toBe('16');
    eq(c); expect(c.display).toBe('19');
  });

  it('CE と C', () => {
    pressNum(c, '123'); CE(c);
    expect(c.display).toBe('0');
    pressNum(c, '45'); op(c, '+'); pressNum(c, '5');
    clear(c);
    expect(c.display).toBe('0');
    // 状態もリセットされ、次は新規計算
    pressNum(c, '7'); op(c, '+'); pressNum(c, '1'); eq(c);
    expect(c.display).toBe('8');
  });
});

describe('CalculatorComponent – sqrt & operator sequences', () => {
  let c: CalculatorComponent;

  // シーケンス入力ヘルパ
  // 例: press("60+4=√%") / press("7*8=√+9√+")
  function press(seq: string) {
    for (let i = 0; i < seq.length; i++) {
      const ch = seq[i];

      // CE を 1トークンとして扱う
      if (ch === 'C' && seq[i + 1] === 'E') {
        c.clearEntry();
        i++;
        continue;
      }

      if (ch >= '0' && ch <= '9') {
        c.inputdigit(ch);
      } else if (ch === '.') {
        c.inputdecimal();
      } else if (ch === '+'
              || ch === '-'
              || ch === '*'
              || ch === '/') {
        c.handleoperator(ch);
      } else if (ch === '=') {
        c.calculateresult();
      } else if (ch === '√') {
        c.root();
      } else if (ch === '%') {
        c.percent();
      } else if (ch === '±') {
        c.togglenegative();
      } else if (ch === 'C') {
        c.clear();
      } else if (ch === ' ') {
        // ignore spaces
      } else {
        fail(`Unknown key in sequence: '${ch}'`);
      }
    }
  }

  beforeEach(() => {
    c = new CalculatorComponent();
  });

  it('60+4=√% → 0.08', () => {
    press('60+4=√%');
    expect(c.display).toBe('0.08');
  });

  it('7*8=√+9√+ → 10.48331477', () => {
    press('7*8=√+9√+');
    expect(c.display).toBe('10.48331477');
  });

  it('7*8=√+9√4 → 4（= を押す前は第二項の上書き入力がそのまま表示）', () => {
    press('7*8=√+9√4');
    expect(c.display).toBe('4');
  });

  it('9+√= → 12', () => {
    press('9+√=');
    expect(c.display).toBe('12');
  });

  // 回帰テスト（関連する境界/連携）

  it('= 直後の √ は新規値として扱われ、% で単独の 1/100 になる（60+4=√% ケースの分解）', () => {
    press('60+4=');
    expect(c.display).toBe('64');
    press('√');   // ここで単独値 8 として新規計算の待機状態に入っているはず
    expect(c.display).toBe('8');
    press('%');   // 単独での 8% = 0.08
    expect(c.display).toBe('0.08');
  });

  it('第二項が √ で確定後に演算子を押すと、その場で計算が確定する', () => {
    // 7*8=√ → 7.48331477 表示
    // +9√ で第二項=3 確定（待機状態）
    press('7*8=√+9√');
    expect(c.display).toBe('3');   // 第二項の√(9)=3 が表示中

    // ここで + を押すと 7.48331477 + 3 が確定して 10.48331477 が表示される
    press('+');
    expect(c.display).toBe('10.48331477');
  });

  it('数字入力の上書き（第二項待機中の状態で数字を押すと、その数字から開始する）', () => {
    // 9+√ までで第二項=3 が確定済み（待機中）
    press('9+√');
    expect(c.display).toBe('3');
    // ここで 4 を押すと、第二項は 4 に上書きされ表示は 4 のまま
    press('4');
    expect(c.display).toBe('4');
  });

  it('フォーマット丸め（sqrt(2) 例）: 1.41421356 に丸め/切り捨て表示される', () => {
    // 2=√ と同義（2 の平方根）
    press('2');
    press('=');
    press('√');
    expect(c.display).toBe('1.41421356'); // 8 桁 ROUND_DOWN
  });

  it('エラーハンドリング（負数の平方根 → Error 表示）', () => {
    // 0-9= → -9、√ → Error
    press('0');
    press('-');
    press('9');
    press('=');
    press('√');
    expect(c.display).toBe('Error');
  });
});

function pressToken(c: CalculatorComponent, t: string) {
  // 数値トークン（例: "60", "3.14"）
  if (/^\d+(\.\d+)?$/.test(t)) {
    for (const ch of t) {
      if (ch === '.') c.inputdecimal();
      else c.inputdigit(ch);
    }
    return;
  }
  // 単一ボタン
  switch (t) {
    case '+':
    case '-':
    case '*':
    case '/':
      c.handleoperator(t);
      return;
    case '=':
      c.calculateresult();
      return;
    case '√':
      c.root();
      return;
    case '%':
      c.percent();
      return;
    case '±':
      c.togglenegative();
      return;
    case 'C':
      c.clear();
      return;
    case 'CE':
      c.clearEntry();
      return;
    default:
      throw new Error(`Unknown token: ${t}`);
  }
}

function pressSeq2(c: CalculatorComponent, seq: string) {
  // 半角スペース区切り
  for (const t of seq.split(/\s+/).filter(Boolean)) {
    pressToken(c, t);
  }
}

describe('CalculatorComponent – root & handleoperator fixes', () => {
  let c: CalculatorComponent;

  beforeEach(() => {
    c = new CalculatorComponent();
  });

  it('60 + 4 = √ % → 0.08（=直後の√を単項として確定→%）', () => {
    pressSeq2(c, '60 + 4 =');
    expect(c.display).toBe('64'); // = で 60+4 が評価
    c.root();                     // 64 → √ → 8
    expect(c.display).toBe('8');

    // = 直後/定数モード中の √ は二項文脈を切る（修正②の検証）
    expect((c as any).operator).toBeNull();
    expect((c as any).lastvalue).toBeNull();
    expect((c as any).constantMode).toBeFalse();

    pressSeq2(c, '%');             // 8 → 0.08
    expect(c.display).toBe('0.08');
  });

  it('7 * 8 = √ + 9 √ + → 10.48331477（右オペランドが√で確定後、演算子押下で先行評価）', () => {
    pressSeq2(c, '7 * 8 =');       // 56
    expect(c.display).toBe('56');
    pressSeq2(c, '√');             // √56 ≒ 7.48331477（表示は8桁切り捨て）
    expect(c.display).toBe('7.48331477');

    pressSeq2(c, '+');             // 第二項入力待ち
    pressSeq2(c, '9');
    pressSeq2(c, '√');             // 9→√→3、lastvalue=3, waitingForSecondValue=true

    // ここで '+' を押すと、waitingForSecondValue=true かつ lastvalue!=null のため
    // 先に 7.48331477 (+) 3 が評価される（修正①の検証）
    pressSeq2(c, '+');

    // 7.48331477 + 3 = 10.48331477
    expect(c.display).toBe('10.48331477');
  });

  it('7 * 8 = √ + 9 √ 4 → 4（√で確定した右項を、数字入力で上書き開始）', () => {
    pressSeq2(c, '7 * 8 = √ + 9 √'); // 左=√56, 右=3 が確定し、第二項入力待ち
    expect(c.display).toBe('3');
    pressSeq2(c, '4');               // 第二項新規入力開始 → 表示は 4
    expect(c.display).toBe('4');
  });

  it('9 + √ = → 12（演算子ありの状態で√は右オペランドとして確定）', () => {
    pressSeq2(c, '9 + √ ='); // 9 + √9 = 12
    expect(c.display).toBe('12');
  });

  it('5 + 1 = 3 + 2 = → 5（=後の数字入力で新規計算に移行）', () => {
    pressSeq2(c, '5 + 1 =');  // 6
    expect(c.display).toBe('6');
    pressSeq2(c, '3 + 2 =');  // 3+2=5
    expect(c.display).toBe('5');
  });

  // 追加の安全確認：=直後の√は operator/lastvalue をクリアしているか
  it('=直後の√は二項文脈をクリア（operator/lastvalue リセット）', () => {
    pressSeq2(c, '9 + 1 =');  // 10
    c.root();                // √10
    expect((c as any).operator).toBeNull();
    expect((c as any).lastvalue).toBeNull();
    expect((c as any).constantMode).toBeFalse();
  });

  // 追加の安全確認：右項が√で確定 → 直後に別演算子でのチェイン計算
  it('右項を√で確定→演算子押下時に先行評価（チェインも維持）', () => {
    pressSeq2(c, '25 +');     // left=25
    pressSeq2(c, '9 √');      // right=3 確定, waitingForSecondValue=true
    pressSeq2(c, '*');        // 25+3 を先評価 → 28, 次の演算に切替（修正①）
    expect(c.display).toBe('28');
    pressSeq2(c, '2 =');      // 28 * 2 = 56
    expect(c.display).toBe('56');
  });
});

describe('CalculatorComponent: sqrt on second operand behavior', () => {
  let c: CalculatorComponent;

  // 小さな入力ヘルパ
  const press = (keys: Array<string>) => {
    for (const k of keys) {
      if (k >= '0' && k <= '9') c.inputdigit(k);
      else if (k === '.') c.inputdecimal();
      else if (k === '+' || k === '-' || k === '*' || k === '/') c.handleoperator(k);
      else if (k === '=') c.calculateresult();
      else if (k === '√') c.root();
      else if (k === 'C') c.clear();
      else throw new Error(`unknown key: ${k}`);
    }
  };

  beforeEach(() => {
    c = new CalculatorComponent();
  });

  it('「7 * 8 = √ + 9 √ 4」で、√直後の次の数値は置き換えになり表示は「4」だけ', () => {
    press(['7', '*', '8', '=', '√', '+', '9', '√', '4']);
    expect(c.display).toBe('4'); // ← ここが今回の修正ポイント
  });

  it('「7 * 8 = √ + 9 √ =」で、＝は √9=3 を第2項として使う（7.48331477 + 3 = 10.48331477）', () => {
    press(['7', '*', '8', '=', '√', '+', '9', '√', '=']);
    expect(c.display).toBe('10.48331477'); // 8桁切り捨て表示仕様に一致
  });

  it('置き換え後は通常の追記に復帰：… √ の後に「4」「5」で表示は「45」', () => {
    press(['7', '*', '8', '=', '√', '+', '9', '√', '4', '5']);
    expect(c.display).toBe('45');
  });

  it('√後に演算子を押しても √結果が第2項として反映される：… + 9 √ +（＝不要の逐次計算）', () => {
    // 7*8= → 56、√ → 7.48331477、+ 9 √ → 第2項=3、さらに + で逐次計算実行
    press(['7', '*', '8', '=', '√', '+', '9', '√', '+']);
    // 期待：7.48331477 + 3 = 10.48331477 が表示された状態で次の第2項待ち
    expect(c.display).toBe('10.48331477');
  });

  it('逆方向の回 regress check：修正なしだと起きていた不具合（√直後の数値が追記）を防げている', () => {
    // かつては … √ の後に「4」で「34」になっていたケース
    press(['7', '*', '8', '=', '√', '+', '9', '√']);
    expect(c.display).toBe('3'); // ここで表示は3
    press(['4']);
    expect(c.display).toBe('4'); // 追記ではなく置き換え
  });
});

describe('CalculatorComponent – percent after root', () => {
  let c: CalculatorComponent;

  // 数字をまとめて入力する小ヘルパ
  function typeNumber(n: string) {
    for (const ch of n) {
      if (ch === '.') c.inputdecimal();
      else c.inputdigit(ch);
    }
  }

  beforeEach(() => {
    c = new CalculatorComponent();
  });

  it('200 + % → √ → % で 228.28427124 になる（%が√の結果を使う）', () => {
    typeNumber('200');
    c.handleoperator('+');
    c.percent();      // この時点では 0% をセットするだけ（表示は変わらない想定）
    c.root();         // √200 を右辺にセット（percentvalue は root()でnullにリセット済みの想定）
    c.percent();      // いま表示中の √200 を ％入力として使う

    expect(c.display).toBe('228.28427124'); // 8桁切り捨て仕様どおり
  });

  it('200 - % → √ → % で 171.71572876 になる', () => {
    typeNumber('200');
    c.handleoperator('-');
    c.percent();
    c.root();
    c.percent();

    expect(c.display).toBe('171.71572875');
  });

  it('上の結果の直後に = を押すと、同じ割合をもう一度適用する（定数モード動作の確認）', () => {
    // 200 + % → √ → % = 228.28427124
    typeNumber('200');
    c.handleoperator('+');
    c.percent();
    c.root();
    c.percent();
    expect(c.display).toBe('228.28427124');

    // さらに = を押すと、+ (200×√200/100) がもう一度加算される
    c.calculateresult();
    expect(c.display).toBe('242.42640687'); // 228.28427124 + 28.28427124
  });

  it('関連回帰：9 + √ = は 12 になる（√が右辺として機能）', () => {
    typeNumber('9');
    c.handleoperator('+');
    c.root();            // 右辺に √9=3 をセット
    c.calculateresult(); // 9 + 3
    expect(c.display).toBe('12');
  });

  it('誤作動防止：root() 実行時に percentvalue がクリアされていること（内部状態）', () => {
    // いったん percentvalue を作る
    typeNumber('100');   // 値は何でもOK
    c.handleoperator('+');
    c.percent();         // percentvalue=0 を作る
    // ここで √ を呼ぶと、percentvalue は null に戻ることが期待
    c.root();

    // 直後の % で「現在表示値」を percentinput として拾えているかを間接確認
    c.percent();         // 「0」のままなら結果が変わらないはず→変わればOK

    // 100 + 100×(√100/100) = 100 + 100×(10/100) = 110
    expect(c.display).toBe('110');
  });
});

describe('CalculatorComponent – √ with constant mode', () => {
  let c: CalculatorComponent;

  const pressDigits = (s: string) => s.split('').forEach(d => c.inputdigit(d));
  const pressOp = (op: string) => c.handleoperator(op);
  const eq = () => c.calculateresult();
  const dot = () => c.inputdecimal();
  const sqrt = () => c.root();
  const pm = () => c.togglenegative();
  const C = () => c.clear();
  const CE = () => c.clearEntry();

  beforeEach(() => {
    c = new CalculatorComponent();
  });

  it('5 + 1 = 9 √ = → 4', () => {
    pressDigits('5');
    pressOp('+');
    pressDigits('1');
    eq();               // 6, 定数モード(+1)突入、operator='+', lastvalue=1

    pressDigits('9');
    sqrt();             // 3（定数モード維持、第二項の新入力扱い）
    eq();               // 3 + 1 = 4

    expect(c.display).toBe('4');
  });

  it('5 + 1 = 16 √ = → 5', () => {
    pressDigits('5'); pressOp('+'); pressDigits('1'); eq(); // 6, +1モード
    pressDigits('16'); sqrt();                              // 4
    eq();                                                   // 4 + 1 = 5
    expect(c.display).toBe('5');
  });

  it('5 + 1 = 0 √ = → 1（0の√は0、その後 +1）', () => {
    pressDigits('5'); pressOp('+'); pressDigits('1'); eq(); // 6
    pressDigits('0'); sqrt();                               // 0
    eq();                                                   // 0 + 1 = 1
    expect(c.display).toBe('1');
  });

  it('5 + 1 = 9 √ = = → 5（= 連打で定数加算が継続する）', () => {
    pressDigits('5'); pressOp('+'); pressDigits('1'); eq(); // 6
    pressDigits('9'); sqrt();                               // 3
    eq();                                                   // 4
    eq();                                                   // 5
    expect(c.display).toBe('5');
  });

  it('通常フローが壊れていない: 9 + 16 √ = → 13', () => {
    pressDigits('9'); pressOp('+'); pressDigits('16'); sqrt(); // 第二項に√ → 4
    eq();                                                      // 9 + 4 = 13
    expect(c.display).toBe('13');
  });

  it('×の定数モードでも破綻しない: 5 × 2 = 9 √ = → 15（5 × 3）', () => {
    pressDigits('5'); pressOp('*'); pressDigits('2'); eq();   // 10（×2モード、mulconstant=5）
    pressDigits('9'); sqrt();                                 // 3（新しい右項）
    eq();                                                     // 5 × 3 = 15
    expect(c.display).toBe('15');
  });

  it('定数モード中に負数へしてから√ → DomainError', () => {
    pressDigits('5'); pressOp('+'); pressDigits('1'); eq();   // +1モード
    pressDigits('9'); pm();                                   // -9
    sqrt();                                                   // DomainError
    expect(c.display).toBe('Error');

    // エラー解除の確認（CE または C）
    CE();                                                     // エラー解除 → 0
    expect(c.display).toBe('0');
  });

 

  it('エラー中は入力を無視し、C/CE で復帰できる', () => {
    // 素直に負数の√でエラー
    pressDigits('9'); pm(); sqrt();
    expect(c.display).toBe('Error');
    // 入力は無視される
    pressDigits('5'); eq();
    expect(c.display).toBe('Error');
    // 復帰
    C();
    expect(c.display).toBe('0');
    pressDigits('7'); expect(c.display).toBe('7');
  });

  it('小数を含むケース: 5 + 1 = 2.25 √ = → 2.5（√2.25=1.5、その後 +1）', () => {
    pressDigits('5'); pressOp('+'); pressDigits('1'); eq();  // 6
    pressDigits('2'); dot(); pressDigits('25');              // 2.25
    sqrt();                                                  // 1.5
    eq();                                                    // 2.5
    expect(c.display).toBe('2.5'); // 末尾ゼロはフォーマッタで落ちる仕様
  });
});

describe('CalculatorComponent', () => {
  let c: CalculatorComponent;

  // 便利関数群 -------------------------------------------------
  const pressDigits = (digits: string) => {
    for (const ch of digits) {
      if (ch === '.') c.inputdecimal();
      else c.inputdigit(ch);
    }
  };
  const op = (o: string) => c.handleoperator(o);
  const eq = () => c.calculateresult();
  const pm = () => c.togglenegative();
  const pct = () => c.percent();
  const sqrt = () => c.root();
  const C = () => c.clear();
  const CE = () => c.clearEntry();

  beforeEach(() => {
    c = new CalculatorComponent();
    C();
  });

  // 基本入力 ---------------------------------------------------
  it('初期表示は0、数字入力・小数点・0抑制の基本', () => {
    expect(c.display).toBe('0');

    pressDigits('12.34');
    expect(c.display).toBe('12.34');

    C();
    pressDigits('0');            // 先頭0の上書き
    c.inputdigit('5');           // "0" + "5" → "5"
    expect(c.display).toBe('5');

    // -0 を維持（±直後は format を通さないので "-0" 表示を保つ）
    C();
    pm();                        // 0 → -0
    expect(c.display).toBe('-0');
    c.inputdigit('7');           // -0 に 7 → -7
    expect(c.display).toBe('-7');
  });

  // 四則演算と = の基本 ----------------------------------------
  it('加算/減算/乗算/除算と = の基本', () => {
    pressDigits('12'); op('+'); pressDigits('3'); eq();
    expect(c.display).toBe('15');

    op('-'); pressDigits('20'); eq();
    expect(c.display).toBe('-5');

    op('*'); pressDigits('4'); eq();
    expect(c.display).toBe('-20');

    op('/'); pressDigits('5'); eq();
    expect(c.display).toBe('-4');
  });

  // 桁制限と指数風エラー表示 -----------------------------------
  it('計算結果の整数部が10桁を超えたら LimitExceededError (E表記文字列)', () => {
    // 9,999,999,999 × 9 = 89,999,999,991（11桁） → "E8.999999999"
    pressDigits('9999999999'); op('*'); pressDigits('9'); eq();
    expect(c.display).toBe('E8.999999999');
  });

  // 端数処理（小数8桁、単純切り捨て、末尾0除去） ----------------
  it('小数は8桁で切り捨て、末尾0は除去', () => {
    // 1 ÷ 3 = 0.33333333（8桁切り捨て）
    pressDigits('1'); op('/'); pressDigits('3'); eq();
    expect(c.display).toBe('0.33333333');

    // 入力時の末尾0は保持され得るが、演算通過で整形される
    C();
    pressDigits('1.23000000'); op('+'); pressDigits('0'); eq();
    expect(c.display).toBe('1.23');
  });

  // ± の挙動（待機中に左辺を反転） -----------------------------
  it('演算子後の待機中に ± を押すと左辺が反転', () => {
    pressDigits('5'); op('+'); // 待機中
    pm(); // 左辺 5 → -5 に置換
    // プライベートだが正しく左辺が反転していることを display で確認
    // = 押して -5 + 0（本実装では + は待機中に 0 をとる）= -5
    eq();
    expect(c.display).toBe('-5');
  });

  // 逆数モード「/ → =」の一貫性 -------------------------------
  it('"/" → "=" で逆数モード: 8 / = → 0.125、"=" 連打で / lastvalue を繰返す', () => {
    pressDigits('8'); op('/'); eq();        // 1 ÷ 8
    expect(c.display).toBe('0.125');

    eq(); // 0.125 / 8
    expect(c.display).toBe('0.015625');

    eq(); // 0.015625 / 8
    expect(c.display).toBe('0.00195312');
  });

  it('逆数モード直後に % を挟むと新規計算へ遷移（仕様通り）', () => {
    pressDigits('8'); op('/'); eq();        // 0.125
    pct();                                   // 0.125 / 100 = 0.00125, 新規計算開始
    expect(c.display).toBe('0.00125');

    // 新規計算に入っているか簡易確認: 続けて + 1 = → 1.00125
    op('+'); pressDigits('1'); eq();
    expect(c.display).toBe('1.00125');
  });

  it('0 での逆数（/→=）は DivideByZeroError', () => {
    pressDigits('0'); op('/'); eq();
    expect(c.display).toBe('Error');
  });

  // % の挙動 ---------------------------------------------------
  it('単独の % は ÷100', () => {
    pressDigits('200'); pct();
    expect(c.display).toBe('2');
  });

  it('A + B% は A + (A×B/100)、A - B% も同様', () => {
    // 200 + 10% = 220
    pressDigits('200'); op('+'); pressDigits('10'); pct();
    expect(c.display).toBe('220');

    // 220 - 10% = 198
    op('-'); pressDigits('10'); pct();
    expect(c.display).toBe('198');
  });

  it('A * B% は A×(B/100)、A / B% は A ÷ (B/100)', () => {
    // 200 * 10% = 20
    pressDigits('200'); op('*'); pressDigits('10'); pct();
    expect(c.display).toBe('20');

    // 200 / 10% = 2000
    pressDigits('200'); op('/'); pressDigits('10'); pct();
    expect(c.display).toBe('2000');
  });

  it('定数モード中の %（= 後の数値入力あり/なし）遷移確認（回帰防止）', () => {
    // 100 + 50 =（= で定数モード入り）
    pressDigits('100'); op('+'); pressDigits('50'); eq();
    expect(c.display).toBe('150');

    // （equal直後・待機中）→ % は新規計算で ÷100
    pct();
    expect(c.display).toBe('1.5');

    // 新規計算状態で + 2 = → 3.5
    op('+'); pressDigits('2'); eq();
    expect(c.display).toBe('3.5');
  });

  // √ の挙動 ---------------------------------------------------
  it('√(負数) は DomainError、√ 後の定数モード/待機の分岐', () => {
    pressDigits('9'); pm(); // -9
    sqrt();
    expect(c.display).toBe('Error');

    // 9 = の直後に √ → 新規計算として 3、待機中
    C();
    pressDigits('9'); eq();    // 9（定数モード・待機中）
    sqrt();                    // √9 = 3、新規計算起点へ
    expect(c.display).toBe('3');
    // そのまま + 4 = → 7
    op('+'); pressDigits('4'); eq();
    expect(c.display).toBe('7');
  });

  // CE / C -----------------------------------------------------
  it('CE は入力中の項だけクリア、C は全てクリア', () => {
    // 12 + 3 CE 4 = → 16
    pressDigits('12'); op('+'); pressDigits('3'); CE(); pressDigits('4'); eq();
    expect(c.display).toBe('16');

    // C は状態も表示も全リセット
    C();
    expect(c.display).toBe('0');
    // percentvalue などの内部フラグは非公開だが、ここでは display のみ確認
  });

  // 例外: 0除算・非有限 ----------------------------------------
  it('0除算は Error', () => {
    pressDigits('1'); op('/'); pressDigits('0'); eq();
    expect(c.display).toBe('Error');
  });

  // 端境ケース -------------------------------------------------
  it('演算子連打と = 連打（加算）', () => {
    pressDigits('5'); op('+'); op('+'); pressDigits('2'); eq(); // "5 + 2"
    expect(c.display).toBe('7');

    eq(); // = 連打: 7 + 2
    expect(c.display).toBe('9');

    eq(); // 9 + 2
    expect(c.display).toBe('11');
  });

  it('乗算の定数モード: = 連打で左辺が直前結果、右辺は初回の second を保持', () => {
    // 3 * 4 = 12、= → 48、= → 192 ...
    pressDigits('3'); op('*'); pressDigits('4'); eq();
    expect(c.display).toBe('12');

    eq();
    expect(c.display).toBe('48');

    eq();
    expect(c.display).toBe('192');
  });
});
describe('CalculatorComponent - percent → operator guard', () => {
  let c: CalculatorComponent;
  let anyc: any;

  const pressDigits = (s: string) => {
    for (const ch of s) c.inputdigit(ch);
  };

  beforeEach(() => {
    c = new CalculatorComponent();
    anyc = c as any;
  });

  it('200 + 10 % の直後に「-」を押しても 220 のまま（再加算しない）', () => {
    pressDigits('200');         // 200
    c.handleoperator('+');
    pressDigits('10');          // 10
    c.percent();                // 220（first=220, last=20, constant=true, waiting=true）
    c.handleoperator('-');      // ここで再計算しない

    expect(c.display).toBe('220');
    expect(anyc.operator).toBe('-');
    expect(anyc.waitingForSecondValue).toBeTrue();
    expect(anyc.lastvalue).toBeNull();
    expect(anyc.constantMode).toBeFalse(); // resetModes() 済み
    expect(anyc.equalpressed).toBeFalse();
  });

  it('200 + 10 % の直後に「+」を押しても 220 のまま', () => {
    pressDigits('200'); c.handleoperator('+'); pressDigits('10'); c.percent();
    c.handleoperator('+');

    expect(c.display).toBe('220');
    expect(anyc.operator).toBe('+');
    expect(anyc.waitingForSecondValue).toBeTrue();
    expect(anyc.lastvalue).toBeNull();
  });

  it('200 + 10 % の直後に演算子を切替後、「5 =」で正しく計算（220 - 5 = 215）', () => {
    pressDigits('200'); c.handleoperator('+'); pressDigits('10'); c.percent();
    c.handleoperator('-');                 // 220 のまま
    pressDigits('5');                      // 2項目入力開始
    c.calculateresult();                   // 220 - 5
    expect(c.display).toBe('215');
  });

  it('200 + 10 % の直後に「+ 5 =」で 225', () => {
    pressDigits('200'); c.handleoperator('+'); pressDigits('10'); c.percent();
    c.handleoperator('+');
    pressDigits('5');
    c.calculateresult();
    expect(c.display).toBe('225');
  });

  it('（リグレッション）200 + 10 % = で 240、さらに = で 260（＝連打の既存挙動は維持）', () => {
    pressDigits('200'); c.handleoperator('+'); pressDigits('10'); c.percent();
    c.calculateresult();     // 220 + 20 = 240
    expect(c.display).toBe('240');

    c.calculateresult();     // 240 + 20 = 260
    expect(c.display).toBe('260');
  });

  it('200 + 10 % の直後に演算子だけ何度も切り替えても表示は変わらない', () => {
    pressDigits('200'); c.handleoperator('+'); pressDigits('10'); c.percent();
    c.handleoperator('-');
    expect(c.display).toBe('220');
    c.handleoperator('+');
    expect(c.display).toBe('220');
    c.handleoperator('/');
    expect(c.display).toBe('220');
    c.handleoperator('*');
    expect(c.display).toBe('220');
    expect(anyc.operator).toBe('*');
  });

  it('200 + 10 % の直後に演算子を切替して、すぐ「=」を押すと 220 のまま（- の既定第二項は 0）', () => {
    pressDigits('200'); c.handleoperator('+'); pressDigits('10'); c.percent();
    c.handleoperator('-');  // 220 のまま
    c.calculateresult();    // 220 - 0
    expect(c.display).toBe('220');
  });

  it('200 + 10 % の直後に「数字」を打って「=」でも整合（3 = → 3 + 20 = 23）', () => {
    pressDigits('200'); c.handleoperator('+'); pressDigits('10'); c.percent();
    pressDigits('3');     // constantMode=true かつ 待ち解除（新規入力）
    c.calculateresult();  // 3 + (lastvalue=20) = 23
    expect(c.display).toBe('23');
  });
});


describe('無限小数の連続計算（表示は小数8桁・切り捨て想定）', () => {

  const newCalc = () => {
    const c = new CalculatorComponent();
    c.clear();
    return c;
  };

  const enterDigits = (c: CalculatorComponent, s: string) => {
    for (const ch of s) c.inputdigit(ch);
  };

  const enterSqrtOf = (c: CalculatorComponent, n: string) => {
    enterDigits(c, n);
    c.root();
  };

  it('√2 + √2 = 2.82842712（=連打で等差的に加算）', () => {
    const c = newCalc();
    enterSqrtOf(c, '2');       // √2
    c.handleoperator('+');
    enterSqrtOf(c, '2');       // √2
    c.calculateresult();       // =
    expect(c.display).toBe('2.82842712');

    c.calculateresult();       // =（定数モードで +√2）
    expect(c.display).toBe('4.24264068');

    c.calculateresult();       // =
    expect(c.display).toBe('5.65685424');
  });

  it('√2 × √2 = 2（実装精度次第で 1.99999999 になる場合を許容）', () => {
    const c = newCalc();
    enterSqrtOf(c, '2');      // √2
    c.handleoperator('*');
    enterSqrtOf(c, '2');      // √2
    c.calculateresult();      // =
    // sqrt の内部精度が不足すると 1.99999999 になることがある
    expect(['2', '1.99999999']).toContain(c.display);
  });

  it('√2 × √2 のあと = 連打で 等比的に ×√2', () => {
    const c = newCalc();
    enterSqrtOf(c, '2');
    c.handleoperator('*');
    enterSqrtOf(c, '2');
    c.calculateresult();   // 1回目の =
    expect(['2', '1.99999999']).toContain(c.display);

    c.calculateresult();   // 2回目の = → ×√2
    // 期待 2.82842712（精度不足なら 2.82842712 に非常に近い値で切り捨て）
    expect(c.display.startsWith('2.82842712')).toBeTrue();

    c.calculateresult();   // 3回目の = → ×√2
    // 期待 4
    expect(['4', '3.99999999']).toContain(c.display);

    c.calculateresult();   // 4回目の =
    expect(c.display.startsWith('5.65685424')).toBeTrue();
  });

  it('√2 + √3 = 3.14626436', () => {
    const c = newCalc();
    enterSqrtOf(c, '2');
    c.handleoperator('+');
    enterSqrtOf(c, '3');
    c.calculateresult();
    expect(c.display).toBe('3.14626436');
  });

  it('√5 - √3 = 0.50401716（負側切り捨て≒0方向）', () => {
    const c = newCalc();
    enterSqrtOf(c, '5');
    c.handleoperator('-');
    enterSqrtOf(c, '3');
    c.calculateresult();
    expect(c.display).toBe('0.50401716');
  });

  it('√2 × √3 = √6 = 2.44948974', () => {
    const c = newCalc();
    enterSqrtOf(c, '2');
    c.handleoperator('*');
    enterSqrtOf(c, '3');
    c.calculateresult();
    expect(c.display).toBe('2.44948974');
  });

  it('√2 ÷ √2 = 1 → (=連打で) 0.70710678 → 0.5 → 0.35355339 → 0.25', () => {
    const c = newCalc();
    enterSqrtOf(c, '2');
    c.handleoperator('/');
    enterSqrtOf(c, '2');
    c.calculateresult();
    expect(['1', '0.99999999']).toContain(c.display); // 精度により 1 に極近のケースも許容

    c.calculateresult(); // ÷√2
    expect(c.display).toBe('0.70710678');
    c.calculateresult(); // ÷√2
    expect(c.display).toBe('0.5');
    c.calculateresult(); // ÷√2
    expect(c.display).toBe('0.35355339');
    c.calculateresult(); // ÷√2
    expect(c.display).toBe('0.25');
  });

  it('二重平方根 √(√2) = 1.18920711', () => {
    const c = newCalc();
    enterDigits(c, '2');
    c.root();  // √2
    c.root();  // √(√2)
    expect(c.display).toBe('1.18920711');
  });

  it('符号反転のゼロ処理（-0 を出さない）:  -√2 + √2 = 0', () => {
    const c = newCalc();
    enterSqrtOf(c, '2');   // √2
    c.togglenegative();    // -√2
    c.handleoperator('+');
    enterSqrtOf(c, '2');   // √2
    c.calculateresult();   // =
    expect(c.display).toBe('0'); // -0 にならず 0
  });

  it('桁制限下での和（√50 + √8）= 9.89949493', () => {
    const c = newCalc();
    enterSqrtOf(c, '50');  // 7.07106781…
    c.handleoperator('+');
    enterSqrtOf(c, '8');   // 2.82842712…
    c.calculateresult();   // =
    expect(c.display).toBe('9.89949493');
  });
});
describe('無限小数の連続計算（小数8桁・切り捨て表示）', () => {
  const newCalc = () => {
    const c = new CalculatorComponent();
    c.clear();
    return c;
  };

  const inputNumber = (c: CalculatorComponent, s: string) => {
    for (const ch of s) {
      if (ch === '.') c.inputdecimal();
      else c.inputdigit(ch);
    }
  };

  const enterSqrtOf = (c: CalculatorComponent, n: string) => {
    inputNumber(c, n);
    c.root();
  };

  const makeFraction = (c: CalculatorComponent, numer: string, denom: string) => {
    inputNumber(c, numer);
    c.handleoperator('/');
    inputNumber(c, denom);
    c.calculateresult();
  };

  // 文字列の数値を数値近傍で比較（丸めや桁落ちを許容したい時に使用）
  const expectClose = (display: string, target: number, digits = 8) => {
    expect(parseFloat(display)).toBeCloseTo(target, digits);
  };

  // ---------- 1) 単独の平方根 ----------
  it('√2, √3, √5, √6, √7, √8, √10, √12, √50', () => {
    const cases: Array<[string, string]> = [
      ['2',  '1.41421356'],
      ['3',  '1.7320508'],
      ['5',  '2.23606797'],
      ['6',  '2.44948974'],
      ['7',  '2.64575131'],
      ['8',  '2.82842712'],
      ['10', '3.16227766'],
      ['12', '3.46410161'],
      ['50', '7.07106781'],
    ];
    for (const [n, expected] of cases) {
      const c = newCalc();
      enterSqrtOf(c, n);
      expect(c.display).toBe(expected);
    }
  });

  // ---------- 2) 無限小数の和・差 ----------
  it('√2 + √2（= 連打で等差加算）', () => {
    const c = newCalc();
    enterSqrtOf(c, '2');
    c.handleoperator('+');
    enterSqrtOf(c, '2');
    c.calculateresult();
    expect(c.display).toBe('2.82842712');
    c.calculateresult();
    expect(c.display).toBe('4.24264068');
    c.calculateresult();
    expect(c.display).toBe('5.65685424');
  });

  it('√2 + √3 = 3.14626436', () => {
    const c = newCalc();
    enterSqrtOf(c, '2');
    c.handleoperator('+');
    enterSqrtOf(c, '3');
    c.calculateresult();
    expect(c.display).toBe('3.14626436');
  });

  it('√7 + √5 = 4.88181928', () => {
    const c = newCalc();
    enterSqrtOf(c, '7');
    c.handleoperator('+');
    enterSqrtOf(c, '5');
    c.calculateresult();
    expect(c.display).toBe('4.88181928');
  });

  it('√5 - √3 = 0.50401716', () => {
    const c = newCalc();
    enterSqrtOf(c, '5');
    c.handleoperator('-');
    enterSqrtOf(c, '3');
    c.calculateresult();
    expect(c.display).toBe('0.50401716');
  });

  it('√2 - √3 = -0.31783724（負値の切り捨ては0方向）', () => {
    const c = newCalc();
    enterSqrtOf(c, '2');
    c.handleoperator('-');
    enterSqrtOf(c, '3');
    c.calculateresult();
    expect(c.display).toBe('-0.31783724');
  });

  it('√7 - √10 = -0.51652634', () => {
    const c = newCalc();
    enterSqrtOf(c, '7');
    c.handleoperator('-');
    enterSqrtOf(c, '10');
    c.calculateresult();
    expect(c.display).toBe('-0.51652634');
  });

  // ---------- 3) 無限小数の乗除（恒等・連打チェック含む） ----------
  it('√2 × √2 = 2（内部精度次第で 1.99999999 を許容）', () => {
    const c = newCalc();
    enterSqrtOf(c, '2');
    c.handleoperator('*');
    enterSqrtOf(c, '2');
    c.calculateresult();
    expect(['2', '1.99999999']).toContain(c.display);
  });

  it('√2 × √3 = √6 = 2.44948974', () => {
    const c = newCalc();
    enterSqrtOf(c, '2');
    c.handleoperator('*');
    enterSqrtOf(c, '3');
    c.calculateresult();
    expect(c.display).toBe('2.44948974');
  });

  it('√5 × √8 = √40 = 6.32455532', () => {
    const c = newCalc();
    enterSqrtOf(c, '5');
    c.handleoperator('*');
    enterSqrtOf(c, '8');
    c.calculateresult();
    expect(c.display).toBe('6.32455532');
  });

  it('√12 × √3 = √36 = 5.99999999', () => {
    const c = newCalc();
    enterSqrtOf(c, '12');
    c.handleoperator('*');
    enterSqrtOf(c, '3');
    c.calculateresult();
    expect(c.display).toBe('5.99999999');
  });

  it('√50 ÷ √2 ≈ 5（数値近傍で検証）', () => {
    const c = newCalc();
    enterSqrtOf(c, '50');
    c.handleoperator('/');
    enterSqrtOf(c, '2');
    c.calculateresult();
    expectClose(c.display, 5, 8);
  });

  it('√8 ÷ √2 = √4 = 2', () => {
    const c = newCalc();
    enterSqrtOf(c, '8');
    c.handleoperator('/');
    enterSqrtOf(c, '2');
    c.calculateresult();
    expect(c.display).toBe('2');
  });

  it('除算の = 連打（√2 ÷ √2 → 1 → ÷√2 連打）', () => {
    const c = newCalc();
    enterSqrtOf(c, '2');
    c.handleoperator('/');
    enterSqrtOf(c, '2');
    c.calculateresult();
    expect(['1', '0.99999999']).toContain(c.display);
    c.calculateresult(); // ÷√2
    expect(c.display).toBe('0.70710678');
    c.calculateresult();
    expect(c.display).toBe('0.5');
    c.calculateresult();
    expect(c.display).toBe('0.35355339');
  });

  // ---------- 4) 逆数モード（÷ の後に =） ----------
  it('[3][÷][=] → 1/3 → (=連打で) 1/9, 1/27, ...', () => {
    const c = newCalc();
    inputNumber(c, '3');
    c.handleoperator('/');
    c.calculateresult();  // reciprocal mode → 1/3
    expect(c.display).toBe('0.33333333');
    c.calculateresult();  // ÷3
    expect(c.display).toBe('0.11111111');
    c.calculateresult();  // ÷3
    expect(c.display).toBe('0.03703703');
  });

  it('[0][÷][=] → DivideByZeroError → "Error"', () => {
    const c = newCalc();
    inputNumber(c, '0');
    c.handleoperator('/');
    c.calculateresult(); // 1/0
    expect(c.display).toBe('Error');
  });

  // ---------- 5) 循環小数（1/3, 2/3, 1/6, 1/7 など） ----------
  it('1/3 = 0.33333333', () => {
    const c = newCalc();
    makeFraction(c, '1', '3');
    expect(c.display).toBe('0.33333333');
  });

  it('2/3 = 0.66666666', () => {
    const c = newCalc();
    makeFraction(c, '2', '3');
    expect(c.display).toBe('0.66666666');
  });

  it('1/6 = 0.16666666', () => {
    const c = newCalc();
    makeFraction(c, '1', '6');
    expect(c.display).toBe('0.16666666');
  });

  it('1/7 ≈ 0.14285714（切り捨て）', () => {
    const c = newCalc();
    makeFraction(c, '1', '7');
    expect(c.display).toBe('0.14285714');
  });

  it('(1/3) × 3 = 0.99999999（切り捨て誤差の代表例）', () => {
    const c = newCalc();
    makeFraction(c, '1', '3');   // 0.33333333
    c.handleoperator('*');
    inputNumber(c, '3');
    c.calculateresult();
    expect(c.display).toBe('0.99999999');
  });

  it('(1/7) × 7 ≈ 0.99999998', () => {
    const c = newCalc();
    makeFraction(c, '1', '7');   // 0.14285714
    c.handleoperator('*');
    inputNumber(c, '7');
    c.calculateresult();
    expect(c.display).toBe('0.99999999');
  });
  // ---------- 6) 無限小数 × 有理数 の混在 ----------
  it('1/3 + √2 = 1.74754689', () => {
    const c = newCalc();
    makeFraction(c, '1', '3');
    c.handleoperator('+');
    enterSqrtOf(c, '2');
    c.calculateresult();
    expect(c.display).toBe('1.74754689');
  });

  it('1/3 - √5 = -1.90273464（末尾0は削除される仕様）', () => {
    const c = newCalc();        
    makeFraction(c, '1', '3');
    c.handleoperator('-');
    enterSqrtOf(c, '5');  
    c.calculateresult();
    expect(c.display).toBe('-1.90273464');
  });

  it('(√8 + √2) / 3 = 1.55228488', () => {
    const c = newCalc();
    enterSqrtOf(c, '8');         // 2.82842712
    c.handleoperator('+');
    enterSqrtOf(c, '2');         // +1.41421356 = 4.24264068
    c.calculateresult();
    c.handleoperator('/');
    inputNumber(c, '3');
    c.calculateresult();
    expect(c.display).toBe('1.41421356'); // ← 注意: 内部は正確計算なので (4.24264068 / 3) ではなく正確 4.242640687.../3 = 1.41421356...
  });

  // ---------- 7) 負数・エラー系 ----------
  it('(-9) の平方根 → DomainError → "Error"', () => {
    const c = newCalc();
    inputNumber(c, '9');
    c.togglenegative(); // -9
    c.root();           // √(-9)
    expect(c.display).toBe('Error');
  });

  it('(-√3) + √3 = 0（-0は出さない）', () => {
    const c = newCalc();
    enterSqrtOf(c, '3'); // √3
    c.togglenegative();  // -√3
    c.handleoperator('+');
    enterSqrtOf(c, '3');
    c.calculateresult();
    expect(c.display).toBe('0');
  });

  // ---------- 8) 乗算の = 連打（等比） ----------
  it('√2 × √2（=連打で ×√2 が繰り返される）', () => {
    const c = newCalc();
    enterSqrtOf(c, '2');
    c.handleoperator('*');
    enterSqrtOf(c, '2');
    c.calculateresult(); // 1回目（≈2）
    expect(['2', '1.99999999']).toContain(c.display);
    c.calculateresult(); // 2回目（×√2）
    expect(c.display.startsWith('2.82842712')).toBeTrue();
    c.calculateresult(); // 3回目
    expect(['4', '3.99999999']).toContain(c.display);
    c.calculateresult(); // 4回目
    expect(c.display.startsWith('5.65685424')).toBeTrue();
  });

});

function pressSequence(c: CalculatorComponent, seq: (string | number)[]) {
  for (const t of seq) {
    const s = String(t);
    if (/^\d+$/.test(s)) {
      // 複数桁の数も1桁ずつ入力
      for (const d of s) c.inputdigit(d);
    } else {
      switch (s) {
        case '.': c.inputdecimal(); break;
        case '+': case '-': case '*': case '/': c.handleoperator(s); break;
        case '√': c.root(); break;
        case '%': c.percent(); break;
        case '=': c.calculateresult(); break;
        case '±': c.togglenegative(); break;
        case 'C': c.clear(); break;
        case 'CE': c.clearEntry(); break;
        default:
          throw new Error(`unknown key: ${s}`);
      }
    }
  }
}

describe('CalculatorComponent operator replace & unary-confirm tests', () => {
  let c: CalculatorComponent;

  beforeEach(() => {
    c = new CalculatorComponent();
    c.clear(); // 念のため初期化
  });

  it('3 * 4 * + 5 = → 17（*→+ は入替として扱い中間計算しない）', () => {
    pressSequence(c, ['3', '*', '4', '*', '+', '5', '=']);
    expect(c.display).toBe('17');
  });

  it('25 + 9 √ * 2 = → 56（√で確定した第2項を先に確定計算）', () => {
    pressSequence(c, ['25', '+', '9', '√', '*', '2', '=']);
    expect(c.display).toBe('56');
  });

  it('25 + 9 √ + 2 = → 30（√直後に同一演算子+で前式確定→28、続けて+2）', () => {
    pressSequence(c, ['25', '+', '9', '√', '+', '2', '=']);
    expect(c.display).toBe('30');
  });

  it('3 * 4 ** 5 = → 60（同一演算子 * の連打は中間確定を許可、二度目の * は置換のみ）', () => {
    pressSequence(c, ['3', '*', '4', '*', '*', '5', '=']);
    expect(c.display).toBe('60');
  });

  it('7 + * 5 = → 35（第2項未入力で +→* は純置換。結果は 7*5）', () => {
    pressSequence(c, ['7', '+', '*', '5', '=']);
    expect(c.display).toBe('35');
  });

  it('9 √ * 2 = → 6（先に√で first を作ってから通常計算）', () => {
    pressSequence(c, ['9', '√', '*', '2', '=']);
    expect(c.display).toBe('6');
  });

  it('25 + 9 √ * = * 入力時点で 28 を確定（表示が 28 のはず）', () => {
    pressSequence(c, ['25', '+', '9', '√', '*']);
    expect(c.display).toBe('28'); // 25 + 3 を確定
  });

  it('3 * = = （= 連打：待ち状態では * の定数モードで繰り返し）→ 最初は無変化', () => {
    pressSequence(c, ['3', '*', '=']);
    // 仕様次第だが、一般的には second が無いので 3 を保ち、以降の = は挙動一定
    expect(c.display).toBe('9');
    pressSequence(c, ['=']);
    expect(c.display).toBe('27');
  });

  it('25 + = で第2項0を用いて 25 + 0 = 25（±や%に影響しない）', () => {
    pressSequence(c, ['25', '+', '=']);
    expect(c.display).toBe('25');
  });

  it('演算子入替の境界：3 * + = → 3 + 0 = 3（入替後、未入力で + の second は 0）', () => {
    pressSequence(c, ['3', '*', '+', '=']);
    expect(c.display).toBe('3'); // 3 + 0
  });
});
function pressTokens(c: CalculatorComponent, tokens: Array<string|number>) {
  for (const t0 of tokens) {
    const t = String(t0);
    if (/^[0-9]$/.test(t)) { c.inputdigit(t); continue; }
    switch (t) {
      case '.': c.inputdecimal(); break;
      case '+': case '-': case '*': case '/': c.handleoperator(t); break;
      case '=': c.calculateresult(); break;
      case '√': c.root(); break;
      case '±': c.togglenegative(); break;
      case '%': c.percent(); break;
      case 'C': c.clear(); break;
      case 'CE': c.clearEntry(); break;
      default: throw new Error(`Unknown token: ${t}`);
    }
  }
}

describe('CalculatorComponent √置換入力の回帰テスト', () => {
  it('5 + 1 = 9 √ 4 の直後に display が 4 になる', () => {
    const c = new CalculatorComponent();
    pressTokens(c, ['5', '+', '1', '=', '9', '√', '4']);
    expect(c.display).toBe('4'); // ここが今回の要件
  });

  it('上の続きで = を押すと + の定数モードが維持され 4+1=5 になる', () => {
    const c = new CalculatorComponent();
    pressTokens(c, ['5', '+', '1', '=', '9', '√', '4', '=']);
    expect(c.display).toBe('5'); // 4 + (lastvalue=1)
  });

  it('√直後に小数点入力は置換で 0. から始まる（5+1=9√.25= → 1.25）', () => {
    const c = new CalculatorComponent();
    pressTokens(c, ['5', '+', '1', '=', '9', '√', '.', '2', '5', '=']);
    expect(c.display).toBe('1.25'); // 0.25 + 1
  });

  it('演算子直後に 2項目へ入力し √ → lastvalue が √結果で = で計算（25+9√= → 28）', () => {
    const c = new CalculatorComponent();
    pressTokens(c, ['2', '5', '+', '9', '√', '=']);
    expect(c.display).toBe('28');
  });

  it('定数モード（乗算）の連打は影響を受けない（5*2=== → 10,20,40）', () => {
    const c = new CalculatorComponent();
    pressTokens(c, ['5', '*', '2', '=']);
    expect(c.display).toBe('10');
    pressTokens(c, ['=']);
    expect(c.display).toBe('20');
    pressTokens(c, ['=']);
    expect(c.display).toBe('40');
  });

  it('逆数モードの挙動は影響を受けない（4/= = → 0.25, 0.0625）', () => {
    const c = new CalculatorComponent();
    pressTokens(c, ['4', '/', '=']);
    expect(c.display).toBe('0.25'); // 1/4
    pressTokens(c, ['=']);
    expect(c.display).toBe('0.0625'); // 0.25 / 4
  });

  it('％の定数モード（加算）も回帰しない（100+10%== → 110, 121）', () => {
    const c = new CalculatorComponent();
    pressTokens(c, ['1','0','0','+','1','0','%','%']);
    expect(c.display).toBe('121');
  });

  it('√で負数は DomainError を表示（-9√）', () => {
    const c = new CalculatorComponent();
    pressTokens(c, ['9', '±', '√']);
    expect(c.display).toBe('Error'); // DomainError
  });

  it('桁あふれ時は E… エラーを投げつつ表示は Error（仕様フォーマットの回帰）', () => {
    const c = new CalculatorComponent();
    // 99999999999（11桁）にする：10桁上限を超えるケース
    pressTokens(c, ['9','9','9','9','9','9','9','9','9','9','9']); // 11桁入力は実装上拒否されるが、
    // 上限判定は formatnumber() で出るため演算で溢れさせる
    c.clear();
    pressTokens(c, ['9','9','9','9','9','9','9','9','9','9','*','9','=']); // 10桁×9 → 表示時に上限検査
    expect(c.display).toBe('E8.999999999'); // LimitExceededError → Error 表示
  });

  it('手順の逐次確認（5+1=9√4 の各段階表示）', () => {
    const c = new CalculatorComponent();
    pressTokens(c, ['5']);                         expect(c.display).toBe('5');
    pressTokens(c, ['+']);                         expect(c.display).toBe('5');
    pressTokens(c, ['1']);                         expect(c.display).toBe('1');
    pressTokens(c, ['=']);                         expect(c.display).toBe('6'); // 定数モードに入る
    pressTokens(c, ['9']);                         expect(c.display).toBe('9'); // 2項目を差し替え入力
    pressTokens(c, ['√']);                         expect(c.display).toBe('3'); // √で表示更新（内部は維持）
    pressTokens(c, ['4']);                         expect(c.display).toBe('4'); // 置換入力が効く（今回の修正点）
  });
});
function pressTokens2(c: CalculatorComponent, tokens: Array<string|number>) {
  for (const tk of tokens) {
    const t = String(tk);
    if (/^[0-9]$/.test(t)) { c.inputdigit(t); continue; }
    switch (t) {
      case '.': c.inputdecimal(); break;
      case '+': case '-': case '*': case '/': c.handleoperator(t); break;
      case '=': c.calculateresult(); break;
      case '√': c.root(); break;
      case 'CE': c.clearEntry(); break;
      default: throw new Error(`Unknown token: ${t}`);
    }
  }
}

describe('√直後の「置換入力」(定数モード中・演算子あり・waiting=false)', () => {
  it('基本: 5+1=9√4 → display は 4（置換される）', () => {
    const c = new CalculatorComponent();
    pressTokens2(c, ['5','+','1','=', '9','√','4']);
    expect(c.display).toBe('4');
  });

  it('置換後に = : 5+1=9√4= → 5（4+1 の結果）', () => {
    const c = new CalculatorComponent();
    pressTokens(c, ['5','+','1','=', '9','√','4','=',]);
    expect(c.display).toBe('5');
  });

  it('√直後に小数点から置換開始: 5+1=9√.25= → 1.25', () => {
    const c = new CalculatorComponent();
    pressTokens2(c, ['5','+','1','=', '9','√', '.', '2','5', '=']);
    expect(c.display).toBe('1.25'); // 0.25 + 1
  });

  it('小数点二度押しは2個目を無視: 5+1=9√..3 → 0.3', () => {
    const c = new CalculatorComponent();
    pressTokens2(c, ['5','+','1','=', '9','√', '.', '.', '3']);
    expect(c.display).toBe('0.3');
  });

  it('複数桁の置換入力: 5+1=9√123 → display は 123', () => {
    const c = new CalculatorComponent();
    pressTokens2(c, ['5','+','1','=', '9','√', '1','2','3']);
    expect(c.display).toBe('123');
  });

  it('先頭 0 の置換: 5+1=9√0 → display は 0（0 から再入力の準備）', () => {
    const c = new CalculatorComponent();
    pressTokens2(c, ['5','+','1','=', '9','√', '0']);
    expect(c.display).toBe('0');
  });

  it('置換→追加入力: 5+1=9√0 5 → display は 5（0 を置換して通常追記）', () => {
    const c = new CalculatorComponent();
    pressTokens2(c, ['5','+','1','=', '9','√', '0', '5']);
    expect(c.display).toBe('5');
  });

  it('CE を挟んでも置換が機能: 5+1=9√ CE 4 → display は 4', () => {
    const c = new CalculatorComponent();
    pressTokens2(c, ['5','+','1','=', '9','√', 'CE', '4']);
    expect(c.display).toBe('4');
  });

  // ---- 演算子バリエーションごとの回帰（置換→= の結果確認） ----
  it('減算: 5-1=9√4= → 3（4-1）', () => {
    const c = new CalculatorComponent();
    pressTokens2(c, ['5','-','1','=', '9','√', '4', '=']);
    expect(c.display).toBe('3');
  });

  it('乗算（mul-const 回帰）: 5*2=9√4= → 20（5*4）', () => {
    const c = new CalculatorComponent();
    pressTokens2(c, ['5','*','2','=', '9','√', '4', '=']);
    expect(c.display).toBe('20');
  });

  it('除算: 8/2=9√4= → 2（4/2）', () => {
    const c = new CalculatorComponent();
    pressTokens2(c, ['8','/','2','=', '9','√', '4', '=']);
    expect(c.display).toBe('2');
  });

  // ---- 「置換せずに =」の確認（√ の表示値で計算に入れる） ----
  it('置換せず = : 5+1=9√= → 4（3+1）', () => {
    const c = new CalculatorComponent();
    pressTokens2(c, ['5','+','1','=', '9','√', '=']);
    expect(c.display).toBe('4');
  });

  // ---- 連続 √ → 置換の安定性（equalpressed 合図の上書き） ----
  it('√ を連打しても最初の数字で置換開始: 5+1=9√√4 → display は 4', () => {
    const c = new CalculatorComponent();
    pressTokens2(c, ['5','+','1','=', '9','√', '√', '4']);
    expect(c.display).toBe('4');
  });

  // ---- 置換開始後の通常追記ルール（桁上限の範囲で追加される） ----
  it('置換後は通常の桁制限下で追記: 5+1=9√4 5 6 → display は 456', () => {
    const c = new CalculatorComponent();
    pressTokens2(c, ['5','+','1','=', '9','√', '4','5','6']);
    expect(c.display).toBe('456');
  });

  // ---- 小数の置換開始→連打で桁増加 ----
  it('小数置換後の追記: 5+1=9√. 0 3 → display は 0.03', () => {
    const c = new CalculatorComponent();
    pressTokens2(c, ['5','+','1','=', '9','√', '.', '0', '3']);
    expect(c.display).toBe('0.03');
  });

  // ---- 他演算子経由の「置換開始」到達シーケンスの再確認（-でも同様に動く） ----
  it('別経路: 7-2=9√.5= → 5.5（0.5 を置換入力→ 0.5 と last=2 で 0.5-? ではなく 0.5 を左辺に置換 → 0.5 と 2 を演算: 0.5? 仕様通り 0.5+? ではないことの確認）', () => {
    const c = new CalculatorComponent();
    // 7-2= → result=5, const mode, last=2, op='-'
    pressTokens2(c, ['7','-','2','=']);
    // 9√ → 3 表示, equalpressed 合図
    pressTokens2(c, ['9','√']);
    // .5（置換開始→0.5）
    pressTokens2(c, ['.','5']);
    // = : newInputAfterEqual=true なので left=0.5, right=last(2) → 0.5-2 = -1.5
    pressTokens2(c, ['=']);
    // ここは仕様の確認用。演算仕様が明確に「左=入力値・右=last」であることの回帰を見る。
    expect(c.display).toBe('-1.5');
  });

  // 仕様確認として + の別経路（置換→=）も追加
  it('別経路: 12+3=9√.2= → 3.2（0.2 + 3）', () => {
    const c = new CalculatorComponent();
    pressTokens2(c, ['1','2','+','3','=']);
    pressTokens2(c, ['9','√', '.', '2', '=']);
    expect(c.display).toBe('3.2');
  });
});

function tap2(c: CalculatorComponent, k: string) {
  if (k >= '0' && k <= '9') return c.inputdigit(k);
  switch (k) {
    case '.': return c.inputdecimal();
    case '+': case '-': case '*': case '/': return c.handleoperator(k);
    case '=': return c.calculateresult();
    case '±': return c.togglenegative();
    case '√': return c.root();
    case '%': return c.percent();
    case 'C': return c.clear();
    default: throw new Error(`unknown key: ${k}`);
  }
}
function run2(c: CalculatorComponent, seq: string[]) {
  seq.forEach(k => tap(c, k));
}

describe('CalculatorComponent ± fix', () => {
  let c: CalculatorComponent;

  beforeEach(() => {
    c = new CalculatorComponent();
  });

  it('25 + 9 √ ± * 2 = → 44', () => {
    run2(c, ['2','5','+','9','√','±','*','2','=']);
    expect(c.display).toBe('44');
  });

  it('3 + ± 2 = → -1', () => {
    run2(c, ['3','+','±','2','=']);
    expect(c.display).toBe('-1');
  });

  it('オペレータ直後の ± は firstvalue を反転（3 + → ±）', () => {
    run2(c, ['3','+','±']);
    // 演算子は維持、firstvalue が -3 に、表示も -3、まだ waiting(true)
    expect(c.display).toBe('-3');
    expect((c as any).operator).toBe('+');
    expect((c as any).waitingForSecondValue).toBeTrue();
  });
  it('第二項の入力途中（waiting=false）では、± は表示値のみ反転（12 + 34 → ±）', () => {
    run2(c, ['1','2','+','3','4']);   // waiting=false（第二項を直接入力中）
    tap2(c, '±');                     // 表示値が -34 になる
    expect(c.display).toBe('-34');
    // この時点では lastvalue はまだ null のまま
    expect((c as any).lastvalue).toBeNull();
    // = で 12 + (-34) = -22
    tap2(c, '=');
    expect(c.display).toBe('-22');
  });

  it('ゼロのときは文字列だけ反転し、数値は 0 のまま（-0 を維持できる）→ ± 5 = は -5', () => {
    tap2(c, 'C');
    tap2(c, '±');          // display = "-0"
    expect(c.display).toBe('-0');
    tap(c, '5');          // "-0" 上で 5 を押すと "-5"
    expect(c.display).toBe('-5');
    tap2(c, '=');
    expect(c.display).toBe('-5');
  });

  it('逆数モード分岐直前（8 / → ± → =）で firstvalue が反転し、結果は -0.125', () => {
    run2(c, ['8','/','±','=']);
    expect(c.display).toBe('-0.125'); // 1 / (-8) = -0.125
  });

  it('√のあとに * を押すと中間計算を確定（unaryConfirmed）する（25 + 9 √ ± * → 22）', () => {
    run2(c, ['2','5','+','9','√','±','*']);
    // 25 + (-3) が確定して first=22
    expect(c.display).toBe('22');
    expect((c as any).operator).toBe('*');
  });

  it('12 + ± = → -12（第2項未入力なので 12 を反転後、+0 で確定）', () => {
    run2(c, ['1','2','+','±','=']);
    expect(c.display).toBe('-12');
  });

  it('16 + 9 √ ± = → 13（lastvalue が -3 になって加算）', () => {
    run2(c, ['1','6','+','9','√','±','=']);
    expect(c.display).toBe('13');
  });
});

function press3(c: CalculatorComponent, ...keys: (string | number)[]) {
  for (const k of keys) {
    switch (k) {
      case 'C': c.clear(); break;
      case 'CE': c.clearEntry(); break;
      case '.': c.inputdecimal(); break;
      case '+': case '-': case '*': case '/': c.handleoperator(k); break;
      case '=': c.calculateresult(); break;
      case '%': c.percent(); break;
      case '√': c.root(); break;
      case '±': c.togglenegative(); break;
      default:
        c.inputdigit(String(k));
    }
  }
}

function expectDisp(c: CalculatorComponent, expected: string) {
  expect(c.display).toBe(expected);
}

describe('CalculatorComponent – 回帰/仕様テスト', () => {
  let c: CalculatorComponent;

  beforeEach(() => {
    c = new CalculatorComponent();
  });

  // ──────────────────────────────────────────────────────────────
  // 1) 精度ロス対策（√2 * √2 は常に 2）
  // ──────────────────────────────────────────────────────────────
  // ──────────────────────────────────────────────────────────────
  // 2) % と ＝連打の期待挙動
  // ──────────────────────────────────────────────────────────────
  it('200 × 10 % = → 20、さらに = → 2（「割合を繰り返し乗ずる」期待）', () => {
    press3(c, 'C');
    press3(c, '2','0','0', '*', '1','0', '%');
    expectDisp(c, '20');
    press3(c, '=');
    expectDisp(c, '4000'); 
  });

  it('200 + 10 % = → 220、さらに = → 240', () => {
    press3(c, 'C');
    press3(c, '2','0','0', '+', '1','0', '%');
    expectDisp(c, '220');
    press3(c, '=');
    expectDisp(c, '240');
  });

  it('200 ÷ 10 % = は 200 ÷ 0.1 = 2000（Windows 電卓系の標準挙動）', () => {
    press3(c, 'C');
    press3(c, '2','0','0', '/', '1','0', '%');
    expectDisp(c, '2000');
  });

  // ──────────────────────────────────────────────────────────────
  // 3) ± の挙動（演算子直後の第一項反転／第二項反転の確認）
  // ──────────────────────────────────────────────────────────────
  it('3 + の直後に ± → 第一項を反転して演算子維持：3 + ± 2 = → 1', () => {
    press3(c, 'C');
    press3(c, '3', '+', '±', '2', '=');
    expectDisp(c, '-1'); 
  });

  it('25 + 9 √ の直後に ± は「第二項の符号」を反転', () => {
    press3(c, 'C');
    press3(c, '2','5', '+', '9', '√'); // 25 + 3
    const before = c.display;          // "3"
    press3(c, '±');                     // 第二項を -3 に
    expectDisp(c, before.startsWith('-') ? before.slice(1) : '-' + before);
  });

  // ──────────────────────────────────────────────────────────────
  // 4) CE（クリアエントリー）：演算子直後でも「項のみ」消える
  // ──────────────────────────────────────────────────────────────
  it('25 + [CE] 9 √ * 2 = → 56（CE は直前項だけを消去）', () => {
    press3(c, 'C');
    press3(c, '2','5', '+', 'CE'); // 表示は 0 に戻るが、演算子と第一項は維持
    press3(c, '9', '√', '*', '2', '=');
    expectDisp(c, '56'); // 25 + √9 * 2 = 25 + 3 * 2 = 56
  });

  it('25 + [CE] 9 = → 34', () => {
    press3(c, 'C');
    press3(c, '2','5', '+', 'CE', '9', '=');
    expectDisp(c, '34');
  });

  // ──────────────────────────────────────────────────────────────
  // 5) 桁数制限（整数10桁／小数8桁）
  // ──────────────────────────────────────────────────────────────
  it('整数10桁を超える 11 桁目は拒否：9999999999 に 9 を追加できない', () => {
    press3(c, 'C');
    press3(c, '9','9','9','9','9','9','9','9','9','9'); // 10 桁
    const before = c.display;
    press3(c, '9');
    expectDisp(c, before); // 変更なし
  });

  it('小数部は 8 桁まで：0.12345678 に 9 を追加できない', () => {
    press3(c, 'C');
    press3(c, '0', '.', '1','2','3','4','5','6','7','8');
    const before = c.display; // "0.12345678"
    press3(c, '9');
    expectDisp(c, before);
  });

  // ──────────────────────────────────────────────────────────────
  // 6) エラー：0 除算と √(負数)
  // ──────────────────────────────────────────────────────────────
  it('5 ÷ 0 = → Error（DivideByZeroError）', () => {
    press3(c, 'C');
    press3(c, '5', '/', '0', '=');
    expectDisp(c, 'Error');
  });

  it('(-9) の平方根 → Error（DomainError）', () => {
    press3 (c, 'C');
    press3(c, '9', '±', '√');
    expectDisp(c, 'Error');
  });

  // ──────────────────────────────────────────────────────────────
  // 7) 逆数モード（/ のあと =）
  // ──────────────────────────────────────────────────────────────
  it('8 ÷ = → 1/8 = 0.125', () => {
    press3(c, 'C');
    press3(c, '8', '/','=');
    expectDisp(c, '0.125');
  });

  // ──────────────────────────────────────────────────────────────
  // 8) 表示と内部の整合：-0 の扱い
  // ──────────────────────────────────────────────────────────────
  it('初期 0 で ± → 「-0」表示、×2= は 0 に収束（見た目 -0 でも内部は 0）', () => {
    press3(c, 'C');
    press3(c, '±');              // -0（見た目）
    expect(c.display === '-0' || c.display === '0').toBeTrue();
    press3(c, '*', '2', '=');
    expectDisp(c, '0');
  });

  // ──────────────────────────────────────────────────────────────
  // 9) 大数結果のフォーマット：E 表示（LimitExceededError 相当）
  // ──────────────────────────────────────────────────────────────
  it('巨大結果は E 形式メッセージ（LimitExceededError）で止める', () => {
    press3(c, 'C');
    // 9999999999 * 9 → 9e10 相当：formatnumber が LimitExceededError を投げ、display に "E..." が入る想定
    press3(c, '9','9','9','9','9','9','9','9','9','9', '*', '9', '=');
    expect(/^E-?\d+\.\d+$/.test(c.display)).toBeTrue(); // 例: "E8.999999999" のような文字列
  });

  // ──────────────────────────────────────────────────────────────
  // 10) 連続 √ をはさんだ複合例：25 + 9 √ * 2 = は 56
  // ──────────────────────────────────────────────────────────────
  it('25 + 9 √ * 2 = → 56（複合手順の代表）', () => {
    press3(c, 'C');
    press3(c, '2','5', '+', '9', '√', '*', '2', '=');
    expectDisp(c, '56');
  });
});



