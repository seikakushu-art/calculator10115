import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-calculator',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calculator.component.html',
  styleUrl: './calculator.component.css'
})
export class CalculatorComponent {//初期表示
  display :string = '0';
  private firstvalue :number | null = null;//1つ目の数値
  private operator :string | null = null;//演算子
  private waitingForSecondValue :boolean = false;//2つ目の数値入力
  private isError :boolean = false;//error状態のフラグ
  private readonly limtis ={//桁数の制限
    integer:10,
    decimal:8
  }

  get displayValue():number{//数値として取得
    return parseFloat(this.display);
  }

private ErrorSet(message:string):void{//error状態の設定
  this.display = message;
  this.isError = true;
}
private clearError():void{//error状態のクリア
  if(this.isError === true){
  this.display = '0';
  this.isError = false;
  }
}
private appendDigit(digit:string):boolean{//桁数の制限ルール
  const integer = this.display.split('.')[0];
  const decimal = this.display.split('.')[1];
  if(decimal !== undefined){
    return decimal.length < this.limtis.decimal;
  }
  return integer.length < this.limtis.integer;
}
  
inputdigit(digit:string) :void{//数値を入力する
  if(this.isError === true){//errorの時
    this.clearError();
    this.display = digit;
    return;
  }
  if(this.waitingForSecondValue===true){//2つ目の数値入力の分岐
    this.display = digit;
    this.waitingForSecondValue = false;
    return;
  }
  if(this.display === '0'&&digit!=='.'){//0の分岐
      this.display = digit;
      return;
    }
  if (this.appendDigit(digit)===true){//桁数の制限ルールに従って数値を追加
    this.display = this.display + digit;
  }
}
inputdecimal():void{//小数点を入力する
  if(this.isError === true){
    this.clearError();
    this.display = '0.';
    return;
  }
  if(this.waitingForSecondValue===true){//数値入力待ちの時
    this.display = '0.';
    this.waitingForSecondValue = false;
  }else if(this.display.includes('.')===false){//小数点がない時
    this.display = this.display + '.';
  }
}
handleoperator(nextOperator:string){//演算子を入力する
  if(this.isError === true){
    this.clear();
    this.display = '0';
    return;
  }
  const inputvalue = this.displayValue;//数値として取得
  if(this.waitingForSecondValue===true){//次の数値入力待ち
    this.operator = nextOperator;//演算子を入れ替え
    return;
  }
if(this.firstvalue !== null&&this.operator){//数値あり、演算子あり
  const result = this.calculate(this.operator,this.firstvalue,inputvalue);
  this.display = this.formatnumber(result);
  this.firstvalue = result;
}else{//数値なし、演算子あり
  this.firstvalue = inputvalue;
}
this.operator = nextOperator; //演算子を入れ替え
this.waitingForSecondValue = true; //次の数値入力待ち
}
togglenegative(){//±を切り替える
  if(this.isError === true){
    this.clearError();
    this.display = '0';
    return;
  }
    this.display = (this.displayValue * -1).toString();
}
percent(){//パーセントを計算する
  if(this.isError === true){
    this.clearError();
    this.display = '0';
    return;
  }
  const inputvalue = this.displayValue;
  if(isNaN(inputvalue)){//errorが発生した時
    this.ErrorSet('Error');
  }else{
    const result = inputvalue / 100;
    this.display = this.formatnumber(result);
  }
}
root(){//平方根を計算する
  if(this.isError === true){
    this.clearError();
    this.display = '0';
    return;
  }
  const inputvalue = this.displayValue;
  if(isNaN(inputvalue)||inputvalue<0){//errorが発生した時と0以下の時
    this.ErrorSet('Error');
  }else{
    this.display =this.formatnumber(Math.sqrt(inputvalue));
  }
}
calculateresult(){//＝を押した時の処理
    if(this.isError === true){
    this.clearError();
    this.display = '0';
    return;
  }
  if(this.operator && this.firstvalue!==null){
    const inputvalue = this.displayValue;
    const result = this.calculate(this.operator,this.firstvalue,inputvalue);
    this.display = this.formatnumber(result);
    this.firstvalue = null;
    this.operator = null;
    this.waitingForSecondValue = false;
  }
}
clear(){//クリアを押した時の処理
  this.display = '0';
  this.firstvalue = null;
  this.operator = null;
  this.waitingForSecondValue = false;
}
private calculate(operator:string,a:number,b:number){//四則演算をする
  switch(operator){
    case '+':
      return a + b;
    case '-':
      return a - b;
    case '*':
      return a * b;
    case '/':
      if(b===0){
        this.ErrorSet('Error');
        return NaN;
      }
      return a / b;
    default:
      this.ErrorSet('Error');
      return NaN;
  }
}
private formatnumber(num:number):string{//結果のフォーマットを整える
  if(isNaN(num) || !isFinite(num)){
    this.ErrorSet('Error');
    return 'Error';
  }
  const strnum =num.toFixed(this.limtis.decimal);//小数を8桁にする
  const integer = strnum.split('.')[0];//整数部分
  const decimal = strnum.split('.')[1];//小数部分
  if(integer.length > this.limtis.integer){//整数部分が10桁を超えていた時
    this.ErrorSet('Error');
    return '計算できる桁数を超えています';
  }
  const  cleandecimal = decimal.replace(/\.?0+$/, '');//小数部分の余計な0を削除
  return cleandecimal ? `${integer}.${cleandecimal}` : integer;
}
}