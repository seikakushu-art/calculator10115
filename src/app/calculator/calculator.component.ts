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
  private lastvalue :number | null = null;//2つ目の数値
  private percentvalue :number | null = null;//パーセントの数値
  private operator :string | null = null;//演算子
  private waitingForSecondValue :boolean = false;//2つ目の数値入力
  private isError :boolean = false;//error状態のフラグ
  private constantMode:boolean = false;//定数モードのフラグ
  private reciprocalMode:boolean = false;//逆数モードのフラグ
  private equalpressed:boolean = false;//=を押したフラグ
  private mulconstant:number | null = null;//定数モード、乗数の時の定数
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
}
private appendDigit(digit:string):boolean{//桁数の制限ルール
  const integer = this.display.split('.')[0];
  const decimal = this.display.split('.')[1];
  const integerlength = integer.replace('-','').length;
  if(decimal !== undefined){
    return decimal.length < this.limtis.decimal;
  }
  return integerlength < this.limtis.integer;
}

  
inputdigit(digit:string) :void{//数値を入力する
  console.log('数値待ち状態フラグ',this.waitingForSecondValue);
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
    this.constantMode = false;
  }else if(this.display.includes('.')===false){//小数点がない時
    this.display = this.display + '.';
  }
}
handleoperator(nextOperator:string){//演算子を入力する
  console.log('数値待ち状態フラグ',this.waitingForSecondValue);
  console.log('第一の数値',this.firstvalue);
  if(this.isError === true){
    this.clearError();
    this.display = '0';
    return;
  }
  this.constantMode = false;//各状態のリセット
  this.reciprocalMode = false;
  this.equalpressed = false;
  this.lastvalue = null;

  const inputvalue = this.displayValue;//数値として取得
  console.log('入力数値',inputvalue);
  if(this.waitingForSecondValue===true){//次の数値入力待ち
    this.operator = nextOperator;//演算子を入れ替え
    this.reciprocalMode = false;
    return;
  }
if(this.firstvalue !== null&&this.operator){//数値あり、演算子あり
  const result = this.calculate(this.operator,this.firstvalue,inputvalue);
  this.display = this.formatnumber(result);
  this.firstvalue = result;
  this.lastvalue = inputvalue;
}else{//演算子なし、数値あり
  this.firstvalue = inputvalue;
  this.lastvalue = null;
}
this.operator = nextOperator; //演算子を入れ替え
this.constantMode = false;
this.waitingForSecondValue = true; //次の数値入力待ち
}
togglenegative(){//±を切り替える
  if(this.isError === true){
    this.clearError();
    this.display = '0';
    return;
  }
  const changevalue = this.displayValue * -1;//±の切り替え
    this.display = changevalue.toString();
    if (this.waitingForSecondValue&&this.firstvalue!==null&&this.lastvalue===null&&this.operator!==null){
      this.firstvalue = changevalue;
    }
}
percent(){//パーセントを計算する
  if(this.isError === true){//errorの時
    this.clearError();
    this.display = '0';
    return;
  }
  const inputvalue = this.displayValue;
  if(isNaN(inputvalue)){//error発生条件
    this.ErrorSet('Error');
    return;
  }
    if(this.operator && this.firstvalue!==null){//演算子あり、数値あり
    let result:number;
    if(this.percentvalue === null){
      this.percentvalue = inputvalue;
    }
    const percentinput = this.percentvalue;
    switch(this.operator){
      case '+':
        result = this.firstvalue +(this.firstvalue * (percentinput / 100));
        break;
      case '-':
        result = this.firstvalue -(this.firstvalue * (percentinput / 100));
        break;
      case '*':
        result = this.firstvalue * (percentinput / 100);
        break;
      case '/':
        if(percentinput === 0){
          this.ErrorSet('Error');
          return;
        }
        result = this.firstvalue / (percentinput / 100);
        break;
        default:
          this.ErrorSet('Error');
          return;
    }
    if (!isNaN(result)){
      this.display = this.formatnumber(result);
      this.waitingForSecondValue = true;
      this.firstvalue = result;
    }
    }else{
      const result = inputvalue / 100;
      this.display = this.formatnumber(result);
      this.firstvalue = result;
      this.percentvalue = null;
      }
    }
root(){//平方根を計算する
  if(this.isError === true){//errorの時
    this.clearError();
    this.display = '0';
    return;
  }
  const inputvalue = this.displayValue;
  if(isNaN(inputvalue)||inputvalue<0){//error発生条件
    this.ErrorSet('Error');
    return;
  }
  const rootvalue = Math.sqrt(inputvalue);
  this.display = this.formatnumber(rootvalue);
  this.equalpressed = false;//定数モードのリセット
  if(this.operator!==null){
    if(this.waitingForSecondValue===true){
      this.firstvalue =rootvalue;
      this.waitingForSecondValue = true;
    }else{
      this.lastvalue = rootvalue;
      this.waitingForSecondValue = false;
    }
  }else{//個別計算
    this.firstvalue = rootvalue;
    this.waitingForSecondValue = false;
  }
   this.lastvalue = rootvalue;
  }
calculateresult(){//＝を押した時の処理
  console.log('数値待ち状態フラグ',this.waitingForSecondValue);
  console.log('第一の数値',this.firstvalue);
  console.log('lastvalue',this.lastvalue);
  console.log('演算子',this.operator);
  console.log('定数モード',this.constantMode);
  console.log('等号押下フラグ',this.equalpressed);
  console.log('逆数モードフラグ',this.reciprocalMode);
  console.log('乗数定数',this.mulconstant);


  if(this.isError === true){//errorの時
    this.clearError();
    this.display = '0';
    return;
  }
  const inputvalue = this.displayValue;//数値として取得
  console.log('入力数値',inputvalue);
  if(this.operator==='/'&&this.waitingForSecondValue===true&&this.reciprocalMode===false&& this.lastvalue===null){//逆数モードの判定
    this.reciprocalMode = true;
  }
  this.equalpressed = true;
  if(this.reciprocalMode===true){//逆数モード処理
    if(inputvalue===0){
      this.ErrorSet('Error');
      return;
    }
    if (this.firstvalue!==null&&this.constantMode){//逆数計算を定数モードで計算
    const result = this.firstvalue*inputvalue;
    this.display = this.formatnumber(result);
    this.firstvalue = result;
    }else{//初回の逆数モード
      const result = 1/inputvalue;
      this.display = this.formatnumber(result);
      this.firstvalue = result;
    }
    this.waitingForSecondValue = true;
    this.constantMode = true;
    return;
  }

  if(this.operator && this.firstvalue!==null){//通常の計算
    const newInputAfterEqual = this.constantMode&&this.equalpressed&&(inputvalue!==this.firstvalue);//「＝を押した後に新しい数字を打って、さらに＝を押した」かを検出
    if(this.constantMode===false){//二つ目の数値を取得
      const secondvalue = inputvalue;
      this.lastvalue = secondvalue;
      if(this.operator==='*'){//乗数の時だけ行う処理
        this.mulconstant = this.firstvalue;
      }else{
        this.mulconstant = null;
      }
      const result = this.calculate(this.operator,this.firstvalue,secondvalue);
      this.display = this.formatnumber(result);
      this.firstvalue = result;
      this.waitingForSecondValue = true;
      this.constantMode = true;
      this.equalpressed = true;
      return;
    }

    let left:number;//定数モード
    let right:number;
    if(this.operator==='*'){
      if(newInputAfterEqual===true){
        left = (this.mulconstant??this.firstvalue);
        right = inputvalue;
        this.lastvalue = right;
      }else{//=を連打した時
        left = this.firstvalue;
        right = this.lastvalue??inputvalue;
      }
    }else{//+-/の時
      if(newInputAfterEqual===true){
        left = inputvalue;
        right = this.lastvalue??inputvalue;
      }else{//=を連打した時
        left = this.firstvalue;
        right = this.lastvalue??inputvalue;
      }
    }
    const result = this.calculate(this.operator,left,right);
    this.display = this.formatnumber(result);
    this.firstvalue = result;
    this.waitingForSecondValue = true;
    this.equalpressed = true;
    return;
  }
   this.constantMode = true;
  }
 
clear(){//クリアを押した時の処理
  this.display = '0';
  this.firstvalue = null;
  this.lastvalue = null;
  this.operator = null;
  this.waitingForSecondValue = false;
  this.percentvalue = null;
  this.isError = false;
  this.constantMode = false;
  this.reciprocalMode = false;
  this.equalpressed = false;
  this.mulconstant = null;
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
  const integerlength = integer.replace('-','').length;
  if(integerlength > this.limtis.integer){//整数部分が10桁を超えていた時
    this.ErrorSet('Error');
    return '桁数上限を超過';
  }
  const  cleandecimal = decimal.replace(/\.?0+$/, '');//小数部分の余計な0を削除
  return cleandecimal ? `${integer}.${cleandecimal}` : integer;
}
}