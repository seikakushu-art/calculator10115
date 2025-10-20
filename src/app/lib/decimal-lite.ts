export default class Decimal {
  static ROUND_DOWN = 0; // 互換用

  // 内部小数桁（表示8桁より大きく：中間誤差を抑える）
  private static readonly INTERNAL_SCALE = 32;
  private static readonly TEN_S = Decimal.pow10(Decimal.INTERNAL_SCALE);

  private n: bigint; // 値 * 10^INTERNAL_SCALE

  constructor(v: string | number | bigint | Decimal) {
    if (v instanceof Decimal) {
      this.n = v.n;
      return;
    }
    if (typeof v === 'bigint') {
      this.n = v * Decimal.TEN_S;
      return;
    }
    if (typeof v === 'number') v = Number.isFinite(v) ? v.toString() : '0';

    const s = (v as string).trim();
    if (s === '') {
      this.n = 0n;
      return;
    } //空文字列は0
    const sign = s.startsWith('-') ? -1n : 1n; //符号を取り出す
    const abs = s.replace(/^[-+]/, ''); //絶対値を取る
    const [intPart = '0', fracRaw = ''] = abs.split('.'); //整数部と小数部を分ける
    const S = Decimal.INTERNAL_SCALE; //内部桁数

    if (fracRaw.length <= S) {
      const frac = fracRaw.padEnd(S, '0'); //小数部を0で埋める
      this.n = sign * (BigInt(intPart) * Decimal.TEN_S + BigInt(frac));
    } else {
      // 小数部が内部桁を超える分は「切り捨て」
      const keep = fracRaw.slice(0, S);
      this.n = sign * (BigInt(intPart) * Decimal.TEN_S + BigInt(keep));
    }
  }

  //四則演算（すべて 0 方向の切り捨て）
  plus(b: Decimal | number | string): Decimal {
    const x = Decimal.coerce(b);
    return Decimal.from(this.n + x.n);
  }
  minus(b: Decimal | number | string): Decimal {
    const x = Decimal.coerce(b);
    return Decimal.from(this.n - x.n);
  }
  times(b: Decimal | number | string): Decimal {
    const x = Decimal.coerce(b);
    return Decimal.from((this.n * x.n) / Decimal.TEN_S);
  }
  div(b: Decimal | number | string): Decimal {
    const x = Decimal.coerce(b);
    if (x.n === 0n) throw new Error('DivisionByZero');
    return Decimal.from((this.n * Decimal.TEN_S) / x.n);
  }

  sqrt(): Decimal {
    if (this.n < 0n) throw new Error('DomainError');
    // floor(sqrt(n/10^S)) を 10^S スケールで保持 → sqrt(n * 10^S) の整数平方根
    return Decimal.from(Decimal.isqrt(this.n * Decimal.TEN_S));
  }

  // 比較等
  eq(b: Decimal): boolean {
    return this.n === b.n;
  }
  lt(b: number | string | Decimal): boolean {
    const x = Decimal.coerce(b);
    return this.n < x.n;
  }
  isZero(): boolean {
    return this.n === 0n;
  }
  isFinite(): boolean {
    return true;
  } // BigInt なので常に有限

  // 表示系（dp 桁に切り捨て）
  toDecimalPlaces(dp: number, _mode: number): Decimal {
    const S = Decimal.INTERNAL_SCALE;
    const cut = S - Math.max(0, dp);
    if (cut <= 0) return new Decimal(this);
    const m = Decimal.pow10(cut);
    // 0方向切り捨て → 低位を潰して INTERNAL_SCALE は維持
    const q = this.n / m;
    return Decimal.from(q * m);
  }

  toFixed(dp: number, _mode: number): string {
    //文字列に整形
    const S = Decimal.INTERNAL_SCALE;
    const cut = S - Math.max(0, dp);
    const m = Decimal.pow10(cut);
    const q = this.n / m; // 0方向切り捨て済みの 10^dp スケール整数

    const sign = q < 0n ? '-' : '';
    let abs = q < 0n ? -q : q;
    const tenDp = Decimal.pow10(dp);
    const intPart = abs / tenDp;
    let frac = (abs % tenDp).toString();
    if (dp > 0) frac = frac.padStart(dp, '0');
    return dp > 0
      ? `${sign}${intPart.toString()}.${frac}`
      : `${sign}${intPart.toString()}`;
  }

  // ヘルパ
  private static from(n: bigint): Decimal {
    const d = Object.create(Decimal.prototype) as Decimal;
    (d as any).n = n;
    return d;
  }
  private static pow10(k: number): bigint {
    let p = 1n;
    for (let i = 0; i < k; i++) p *= 10n;
    return p;
  }
  private static isqrt(n: bigint): bigint {
    if (n <= 0n) return 0n;
    let x0 = n,
      x1 = (x0 + n / x0) >> 1n;
    while (x1 < x0) {
      x0 = x1;
      x1 = (x0 + n / x0) >> 1n;
    }
    return x0; // floor
  }
  private static coerce(v: Decimal | number | string): Decimal {
    //Decimalかnumberかstringかを判別してDecimalに変換する
    return v instanceof Decimal ? v : new Decimal(v as any);
  }
}
