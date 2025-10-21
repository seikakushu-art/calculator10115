import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import  Decimal from '../lib/decimal-lite'
class Calculator extends Error {
  constructor(msg = 'Error') {
    super(msg);
    this.name = 'calcError';
  }
}
class DivideByZeroError extends Calculator {
  //0で割った時のエラー
  constructor() {
    super('Error');
    this.name = 'DivideByZeroError';
  }
}
class LimitExceededError extends Calculator {
  //桁数の制限を超えた時のエラー
  constructor(msg: string) {
    super(msg);
    this.name = 'LimitExceededError';
  }
}
class DomainError extends Calculator {
  //定義域のエラー
  constructor(msg = 'Error') {
    super(msg);
    this.name = 'DomainError';
  }
}
@Component({
  selector: 'app-calculator',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calculator.component.html',
  styleUrl: './calculator.component.css',
})
export class CalculatorComponent {
  //初期表示
  display: string = '0';
  private firstvalue: Decimal | null = null; //1つ目の数値
  private lastvalue: Decimal | null = null; //2つ目の数値
  private percentvalue: Decimal | null = null; //パーセントの数値
  private operator: string | null = null; //演算子
  private waitingForSecondValue: boolean = false; //2つ目の数値入力可能のフラグ
  private isError: boolean = false; //error状態のフラグ
  private constantMode: boolean = false; //定数モードのフラグ
  private reciprocalMode: boolean = false; //逆数モードのフラグ
  private equalpressed: boolean = false; //=を押した時のフラグ
  private mulconstant: Decimal | null = null; //定数モード、乗数の時の定数
  private exactValue: Decimal = new Decimal(0); //丸め処理されていない数値
  private readonly limits = {
    //桁数の制限（整数部分10桁、小数部分8桁）
    integer: 10,
    decimal: 8,
  };

  private safely<T>(fn: () => T): T | undefined {
    try {
      return fn();
    } catch (e: unknown) {
      const msg = e instanceof Calculator ? e.message : 'Error';
      this.ErrorSet(msg);
      return undefined;
    }
  }

  get displayValue(): Decimal {
    //数値として取得
    return this.exactValue;
  }

  private showDisplay(s: Decimal): void {//表示する数値だけフォーマット処理
    this.exactValue = s;
    this.display = this.formatnumber(s);
  }

  private syncDisplay(): void {//入力したdisplayの数値と内部の数値を同期
    this.exactValue = new Decimal(this.display||'0');
  }

  private resetAllState(): void {//全ての状態をリセット
    this.isError = false;
    this.firstvalue = null;
    this.lastvalue = null;
    this.percentvalue = null;
    this.operator = null;
    this.constantMode = false;
    this.reciprocalMode = false;
    this.waitingForSecondValue = false;
    this.equalpressed = false;
    this.mulconstant = null;
  }

  private resetModes(): void {//特殊モードの状態をリセット
    this.constantMode = false;
    this.reciprocalMode = false;
    this.equalpressed = false;
    this.mulconstant = null;
  }

  private startNewCalculation(): void {//新規計算を始める
    this.lastvalue = null;
    this.operator = null;
    this.waitingForSecondValue = true;
    this.constantMode = false;
    this.reciprocalMode = false;
    this.equalpressed = false;
    this.mulconstant = null;
  }

  private ErrorSet(message: string): void {
    //error状態の設定
    this.display = message;
    this.isError = true;
  }
  private clearError(): void {
    //error状態をクリア
    if (this.isError === true) {
      this.display = '0';
      this.resetAllState();
    }
  }
  private appendDigit(digit: string): boolean {
    //桁数の制限ルール
    const integer = this.display.split('.')[0];
    const decimal = this.display.split('.')[1];
    const integerlength = integer.replace('-', '').length;
    if (decimal !== undefined) {
      return decimal.length < this.limits.decimal;
    }
    return integerlength < this.limits.integer;
  }

  inputdigit(digit: string): void {
    //数値が入力された時
    this.safely(() => {
      if (this.isError === true) {
        //errorの時
        this.clearError();
        this.display = digit;
        this.syncDisplay();
        return;
      }
      if (this.waitingForSecondValue === true) {
        //2つ目の数値入力の分岐
        if (this.percentvalue !== null) {
          this.equalpressed = false;
          this.percentvalue = null;
        }
        this.display = digit;
        this.waitingForSecondValue = false;
        this.equalpressed = false;
        this.syncDisplay();
        return;
      }
      if (this.display === '0' && digit !== '.') {
        //0の分岐
        this.display = digit;
        this.syncDisplay();
        return;
      }
      if ((this.display === '0' || this.display === '-0') && digit !== '.') {
        this.display = (this.display.startsWith('-') ? '-' : '') + digit;
        this.syncDisplay();
        return;
      }
      if (this.appendDigit(digit) === true) {
        //桁数の制限ルールに従って数値を追加
        this.display = this.display + digit;
      }
      this.syncDisplay();
    });
  }

  inputdecimal(): void {
    //小数点を入力する
    this.safely(() => {
      if (this.isError === true) {
        this.clearError();
        this.display = '0.';
        this.syncDisplay();
        return;
      }
      if (this.waitingForSecondValue === true) {
        //数値入力待ちの時
        if (this.percentvalue !== null) {
          this.percentvalue = null;
          this.equalpressed = false;
        }
        this.display = '0.';
        this.waitingForSecondValue = false;
        this.equalpressed = false;
      } else if (this.display.includes('.') === false) {
        //小数点がない時
        this.display = this.display + '.';
      }
      this.syncDisplay();
    });
  }
  handleoperator(nextOperator: string) {
    //演算子を入力する
    this.safely(() => {
      if (this.isError === true) {
        this.clearError();
        this.display = '0';
        return;
      }
      this.percentvalue = null;
      const inputvalue = this.displayValue; //数値として取得
      if (
        this.firstvalue !== null &&
        this.waitingForSecondValue === false &&
        ((this.equalpressed === true && this.constantMode === true) || //直後に演算子を入力
          (this.constantMode === true && this.lastvalue !== null)) //数字と演算子
      ) {
        //=を押した後に演算子を押したら、新規計算を始める
        this.firstvalue = inputvalue;
        this.lastvalue = null;
        this.operator = nextOperator;
        this.waitingForSecondValue = true;
        this.resetModes();
        return;
      }
      //各状態のリセット(通常計算で特殊モードに入らないように)
      this.resetModes();
      this.lastvalue = null;
    
      if (this.waitingForSecondValue === true) {
        //演算子連続押された時
        this.operator = nextOperator;
        this.reciprocalMode = false;
        return;
      }
      if (this.firstvalue !== null && this.operator) {
        //通常時
        const result = this.calculate(
          this.operator,
          this.firstvalue,
          inputvalue
        );
        this.showDisplay(result);
        this.firstvalue = result;
        this.lastvalue = nextOperator === '/' ? null : inputvalue;
      } else {
        this.firstvalue = inputvalue;
        this.lastvalue = null;
      }
      this.operator = nextOperator;
      this.constantMode = false;
      this.waitingForSecondValue = true;
    });
  }

  togglenegative(): void {
    //±を切り替える
    this.safely(() => {
      if (this.isError === true) {
        this.clearError();
        this.display = '0';
        this.syncDisplay();
        return;
      }
      const newDisplay = this.display.startsWith('-')
        ? this.display.slice(1)
        : '-' + this.display;
      const dec = new Decimal(newDisplay);
      if (!dec.isFinite()) {
        throw new DomainError();
      }
      this.showDisplay(dec);
      if (this.waitingForSecondValue && this.firstvalue !== null) {
        this.firstvalue = dec;
      }
    });
  }

  percent() {
    //パーセントを計算する
    this.safely(() => {
      if (this.isError === true) {
        //errorの時
        this.clearError();
        this.display = '0';
        return;
      }
      const inputvalue = this.displayValue;
      if (!inputvalue.isFinite()) throw new DomainError();
      //計算結果後に新規計算を始める
      if (
        this.constantMode === true &&
        this.equalpressed === false &&
        this.waitingForSecondValue === false
      ) {
        const result = inputvalue.div(100);
        this.showDisplay(result);
        this.firstvalue = result;
        this.waitingForSecondValue = true;
        this.percentvalue = null;
        this.reciprocalMode = false;
        return;
      }
      //特殊モード中に％を押した場合は新規計算を始める
      if (
        (this.constantMode === true && this.equalpressed === true) ||
        this.reciprocalMode === true
      ) {
        const result = inputvalue.div(100);
        this.showDisplay(result);
        //状態をクリア
        this.firstvalue = result;
        this.percentvalue = null;
        this.startNewCalculation();
        return;
      }
      if (this.operator && this.firstvalue !== null) {
        //演算子押された後に％計算をする時
        if (this.percentvalue === null) {
          this.percentvalue = inputvalue;
        }
        const percentinput = this.percentvalue;
        const basevalue = this.firstvalue;
        let result: Decimal;
        let newLastvalue: Decimal | null = null;

        switch (this.operator) {
          case '+':
            newLastvalue = basevalue.times(percentinput).div(100);
            result = basevalue.plus(newLastvalue);
            break;
          case '-':
            newLastvalue = basevalue.times(percentinput).div(100);
            result = basevalue.minus(newLastvalue);
            break;
          case '*':
            result = basevalue.times(percentinput).div(100);
            newLastvalue = this.mulconstant ?? basevalue;
            this.mulconstant = this.mulconstant ?? basevalue;
            break;
          case '/':
            if (percentinput.isZero()) {
              throw new DivideByZeroError();
            }
            result = basevalue.div(percentinput.div(100));
            newLastvalue = basevalue.times(percentinput).div(100);
            break;
          default:
            throw new Calculator('Error');
        }
        this.showDisplay(result);
        this.waitingForSecondValue = true;
        this.firstvalue = result;
        this.lastvalue =
          this.operator === '*' ? newLastvalue : this.lastvalue ?? newLastvalue;
        this.constantMode = true;
        this.equalpressed = false;
        return;
      }
      const result = inputvalue.div(100); //数値だけ％計算をする時
      this.showDisplay(result);
      this.firstvalue = result;
      this.waitingForSecondValue = true;
      this.percentvalue = null;
      this.lastvalue = null;
      this.constantMode = false;
    });
  }

  root() {
    //平方根を計算する
    this.safely(() => {
      if (this.isError === true) {
        //errorの時
        this.clearError();
        this.display = '0';
        return;
      }
      const inputvalue = this.displayValue;
      if (inputvalue.lt(0)) {
        //error発生条件
        throw new DomainError();
      }
      const rootvalue = inputvalue.sqrt(); //平方根計算式
      this.showDisplay(rootvalue);
      if (this.equalpressed === true || this.constantMode === true) {
        //直前＝を押した時(特殊モード用)、新規計算を始める
        this.showDisplay(rootvalue);
        this.firstvalue = rootvalue;
        this.waitingForSecondValue = true;
        this.equalpressed = false;
        return;
      }
      if (this.operator !== null) {
        //通常時
        if (this.waitingForSecondValue === true) {
          this.showDisplay(rootvalue);
          this.lastvalue = rootvalue;
          this.waitingForSecondValue = false;
        } else {
          this.showDisplay(rootvalue);
          this.lastvalue = rootvalue;
        }
        this.equalpressed = false;
        return;
      }
      //個別計算
      this.showDisplay(rootvalue);
      this.firstvalue = rootvalue;
      this.lastvalue = null;
      this.waitingForSecondValue = true;
      this.equalpressed = false;
    });
  }
  calculateresult() {
    //＝を押した時の処理
    this.safely(() => {
      if (this.isError === true) {
        //errorの時
        this.clearError();
        this.display = '0';
        return;
      }
      const inputvalue = this.displayValue; //数値として取得
      if (
        this.operator === '/' &&
        this.waitingForSecondValue === true &&
        this.reciprocalMode === false &&
        this.lastvalue === null
      ) {
        //逆数モードの判定
        this.reciprocalMode = true;
      }
      this.equalpressed = true;

      if (this.reciprocalMode === true) {
        //逆数モード処理
        if (inputvalue.isZero()) {
          throw new DivideByZeroError();
        }
        //逆数モードは初回のみ以下で計算
        const result = new Decimal(1).div(inputvalue);
        this.showDisplay(result);
        this.firstvalue = result;
        this.operator = '/';
        this.lastvalue = inputvalue;
        this.waitingForSecondValue = true;
        this.constantMode = true;
        this.reciprocalMode = false;
        return;
      }

      if (this.operator && this.firstvalue !== null) {
        //通常の計算＆定数モード
        const newInputAfterEqual =
          this.constantMode && !inputvalue.eq(this.firstvalue); //「＝を押した後に新しい数字を打って、さらに＝を押した」かを検出
        if (this.constantMode === false) {
          let secondvalue: Decimal;
          if (this.waitingForSecondValue === true) {//+-の時だけ第二の数値は0
            if(this.operator === '+'||this.operator === '-'){
              secondvalue = new Decimal(0);
            }else{
              secondvalue = inputvalue;
            }
          }else{
            secondvalue = inputvalue;
          }
          //一回目の＝を押した時
          this.lastvalue = secondvalue;
          if (this.operator === '*') {
            //乗数の時だけ行う処理（乗数モードだけ左側の数値は定数）
            this.mulconstant = this.firstvalue;
          } else {
            this.mulconstant = null;
          }
          const result = this.calculate(
            this.operator,
            this.firstvalue,
            secondvalue
          );
          this.showDisplay(result);
          this.firstvalue = result;
          this.waitingForSecondValue = true;
          this.constantMode = true;
          this.equalpressed = true;
          return;
        }

        let left: Decimal; //定数モード
        let right: Decimal;
        if (this.operator === '*') {
          if (newInputAfterEqual === true) {
            left = this.mulconstant ?? this.firstvalue;
            right = inputvalue;
            this.lastvalue = left;
          } else {
            //=を連打した時
            left = this.firstvalue;
            right = this.lastvalue ?? inputvalue;
          }
        } else {
          //+-/の時
          if (newInputAfterEqual === true) {
            left = inputvalue;
            right = this.lastvalue ?? inputvalue;
          } else {
            //=を連打した時
            left = this.firstvalue;
            right = this.lastvalue ?? inputvalue;
          }
        }
        const result = this.calculate(this.operator, left, right);
        this.showDisplay(result);
        this.firstvalue = result;
        this.waitingForSecondValue = true;
        this.equalpressed = true;
        return;
      }
      this.constantMode = true;
      this.waitingForSecondValue = true;
      this.firstvalue = inputvalue;
    });
  }

  clear(): void {
    //クリアを押した時の処理
    this.display = '0';
    this.exactValue = new Decimal(0);
    this.resetAllState();
  }
  clearEntry(): void {
    //クリアエントリーキー
    if (this.isError === true) {
      this.clearError();
      this.display = '0';
      return;
    }

    if (!this.waitingForSecondValue) {
      this.display = '0';
      this.exactValue = new Decimal(0);
      this.percentvalue = null;
    }
  }

  private calculate(operator: string, a: Decimal, b: Decimal): Decimal {
    //四則演算をする
    switch (operator) {
      case '+':
        return a.plus(b);
      case '-':
        return a.minus(b);
      case '*':
        return a.times(b);
      case '/':
        if (b.isZero()) {
          throw new DivideByZeroError();
        }
        return a.div(b);
      default:
        throw new Calculator('Error');
    }
  }
  private formatnumber(num: Decimal): string {
    //結果のフォーマットを整える
    if (!num.isFinite()) throw new DomainError();
    const dp = this.limits.decimal;
    const truncated = num.toDecimalPlaces(dp, Decimal.ROUND_DOWN); //-0を排除
    if (truncated.isZero()) {
      return '0';
    }
    const strnum = truncated.toFixed(dp, Decimal.ROUND_DOWN);
    const integer = strnum.split('.')[0]; //整数部分
    const decimal = strnum.split('.')[1]; //小数部分
    const isNegative = integer.startsWith('-');
    const integerDigits = integer.replace('-', ''); //-を削除
    const integerlength = integerDigits.length; //整数部分の桁数
    if (integerlength > this.limits.integer) {
      //整数部分が10桁を超えていた時
      const L = integerDigits.length; //整数部分の桁数
      const left = integerDigits.slice(0, this.limits.integer); //左から10桁を取得
      const boundary = L - this.limits.integer; //10桁目の位置
      const inserPos = Math.min(Math.max(boundary, 1), left.length - 1); //百億と十億の桁の間
      const withDot = left.slice(0, inserPos) + '.' + left.slice(inserPos); //小数点を追加

      const message = 'E' + (isNegative ? '-' : '') + withDot;
      throw new LimitExceededError(message);
    }
    const cleandecimal = decimal.replace(/\.?0+$/, ''); //小数部分の余計な0を削除
    return cleandecimal ? `${integer}.${cleandecimal}` : integer;
  }
}
